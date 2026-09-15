import React, { useCallback, useEffect, useMemo, useState } from "react";
import { rank } from "./lib/ranking.js";
import { readingFor } from "./lib/reading.js";
import { DEMO, signOut } from "./lib/supabase.js";
import {
  block, connect, loadCandidates, loadConnected, loadMe, report, saveBowtie,
  saveOnboarding, watchConnections,
} from "./lib/people.js";
import { ME, personId, startConversation } from "./lib/messaging.js";

import Onboarding from "./screens/Onboarding.jsx";
import Reveal from "./screens/Reveal.jsx";
import Matches from "./screens/Matches.jsx";
import MatchReading from "./screens/MatchReading.jsx";
import AboutYou from "./screens/AboutYou.jsx";
import Messages from "./screens/Messages.jsx";
import Thread from "./screens/Thread.jsx";
import Community from "./screens/Community.jsx";
import BowtieEditor from "./screens/BowtieEditor.jsx";
import Tabs, { TAB_LABEL } from "./components/Tabs.jsx";

/**
 * The screens and the state between them.
 *
 * `memberId` is the signed-in member, or null in demo mode. AuthGate keys this
 * component by it, so a different member always starts from nothing. People
 * come from src/lib/people.js and messages from src/lib/messaging.js; readings
 * and ranking come from the engine, here, on this device.
 */
export default function App({ memberId }) {
  const [me, setMe] = useState(undefined);         // undefined while loading
  const [stage, setStage] = useState("loading");
  const [tab, setTab] = useState("matches");
  const [openId, setOpenId] = useState(null);
  const [thread, setThread] = useState(null);      // { id, conversationId }
  const [editingBowtie, setEditingBowtie] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [connected, setConnected] = useState(() => new Set());
  const [problem, setProblem] = useState(null);
  const [helloProblem, setHelloProblem] = useState(null);

  // docs/DESIGN.md leaves this open for the client: is the reading the hook on
  // the feed, or the reward for connecting? Both are built; this switches
  // between them live in the review.
  const [upfront, setUpfront] = useState(true);

  useEffect(() => {
    let live = true;
    loadMe(memberId)
      .then((profile) => {
        if (!live) return;
        setMe(profile);
        setStage(profile?.onboardedAt ? "app" : "onboarding");
      })
      .catch((e) => { if (live) setProblem(e.message); });
    return () => { live = false; };
  }, [memberId]);

  const onboarded = Boolean(me?.onboardedAt);
  const business = me?.business ?? false;

  const refresh = useCallback(async () => {
    const [people, links] = await Promise.all([loadCandidates(business), loadConnected(memberId)]);
    setCandidates(people);
    setConnected(links);
  }, [business, memberId]);

  // Reload people when someone connects with you, and whenever the app comes
  // back into view, which is also how a block by the other person shows up.
  useEffect(() => {
    if (!onboarded) return undefined;
    const run = () => refresh().catch((e) => setProblem(e.message));
    run();
    const stopWatching = watchConnections(memberId, run);
    const onVisible = () => { if (document.visibilityState === "visible") run(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopWatching();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [onboarded, refresh, memberId]);

  const fc = useMemo(
    () => (me?.birthdate ? readingFor(me.birthdate, business) : null),
    [me?.birthdate, business],
  );

  const ranked = useMemo(() => (fc ? rank(fc, candidates) : []), [fc, candidates]);

  // The wall and the inbox are not ranked, so they read people by name.
  const everyone = useMemo(
    () => ranked.map((r) => r.profile).sort((a, b) => a.name.localeCompare(b.name)),
    [ranked],
  );

  const onConnect = useCallback(async (id) => {
    try {
      await connect(id);
      setConnected((prev) => new Set(prev).add(id));
    } catch (e) {
      setProblem(e.message);
    }
  }, []);

  const sayHello = useCallback(async (id) => {
    setHelloProblem(null);
    try {
      const c = await startConversation(ME, personId(id));
      setThread({ id, conversationId: c.id });
    } catch (e) {
      setHelloProblem(e.message);
    }
  }, []);

  const onBlock = useCallback(async (id) => {
    await block(id);
    setOpenId(null);
    setThread(null);
    await refresh();
  }, [refresh]);

  if (me === undefined) {
    return problem ? <Trouble message={problem} /> : <div className="ks flat" aria-busy="true" />;
  }

  if (stage === "onboarding") {
    return (
      <Onboarding onSubmit={async (u) => {
        setMe(await saveOnboarding(memberId, u));
        setStage("reveal");
      }} />
    );
  }

  if (stage === "reveal") {
    return (
      <Reveal fc={fc} name={me.name.split(" ")[0]}
        onContinue={() => setStage("app")} />
    );
  }

  if (editingBowtie) {
    return (
      <BowtieEditor bowtie={me.bowtie}
        onSave={async (b) => {
          const bowtie = await saveBowtie(memberId, b, me.bowtie);
          setMe((m) => ({ ...m, bowtie }));
          setEditingBowtie(false);
        }}
        onCancel={() => setEditingBowtie(false)} />
    );
  }

  const talking = thread && everyone.find((p) => p.id === thread.id);
  if (talking) {
    return (
      <Thread person={talking} conversationId={thread.conversationId}
        onBack={() => setThread(null)} />
    );
  }

  const open = openId === null ? null : ranked.find((r) => r.profile.id === openId);
  const closeReading = () => { setOpenId(null); setHelloProblem(null); };

  return (
    <>
      {problem && (
        <div className="notice" role="alert">
          <span>{problem}</span>
          <button className="linkish" onClick={() => setProblem(null)}>Dismiss</button>
        </div>
      )}

      {open
        ? <MatchReading me={fc} match={open} business={business}
            unlocked={upfront || connected.has(open.profile.id)}
            onConnect={() => onConnect(open.profile.id)}
            onSayHello={() => sayHello(open.profile.id)}
            helloProblem={helloProblem}
            onBlock={DEMO ? undefined : () => onBlock(open.profile.id)}
            onReport={DEMO ? undefined : (reason) => report(open.profile.id, reason)}
            backLabel={TAB_LABEL[tab]}
            onBack={closeReading} />
        : tab === "matches"
          ? <Matches me={fc} name={me.name} ranked={ranked}
              business={business} upfront={upfront}
              connected={connected} onOpen={setOpenId} />
          : tab === "messages"
            ? <Messages people={everyone}
                onOpenThread={(id, conversationId) => setThread({ id, conversationId })} />
            : tab === "bowties"
              ? <Community name={me.name} bowtie={me.bowtie} people={everyone}
                  onEdit={() => setEditingBowtie(true)} onOpen={setOpenId} />
              : <AboutYou fc={fc} name={me.name} business={business}
                  bowtie={me.bowtie} onEditBowtie={() => setEditingBowtie(true)}
                  memberId={DEMO ? null : memberId}
                  onSignOut={DEMO ? undefined : signOut} />}

      {!open && <Tabs tab={tab} setTab={setTab} />}

      {!open && tab === "matches" && (
        <div className="devbar">
          <button onClick={() => setUpfront((v) => !v)}
            title="docs/DESIGN.md open question — switch the feed's whole premise">
            Reading: <b>{upfront ? "shown upfront" : "after connecting"}</b>
          </button>
        </div>
      )}
    </>
  );
}

function Trouble({ message }) {
  return (
    <div className="ks flat">
      <h1 className="ks-mark">Kindred Spirits</h1>
      <div className="callout" style={{ marginBottom: 16 }}>
        <b>Your profile could not be loaded.</b> {message}
      </div>
      <div className="actions">
        <button className="ks-ghost" onClick={() => window.location.reload()}>Try again</button>
        {!DEMO && <button className="ks-ghost" onClick={signOut}>Sign out</button>}
      </div>
    </div>
  );
}
