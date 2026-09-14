import React, { useMemo, useState, useCallback } from "react";
import { forecast } from "../engine/kindredEngine.js";
import { readProfiles } from "./fixtures/profiles.js";
import { rank } from "./lib/ranking.js";
import { DEFAULT_BOWTIE } from "./lib/bowtie.js";
import { ME, personId, startConversation } from "./lib/messaging.js";

import Onboarding, { parseDate } from "./screens/Onboarding.jsx";
import Reveal from "./screens/Reveal.jsx";
import Matches from "./screens/Matches.jsx";
import MatchReading from "./screens/MatchReading.jsx";
import AboutYou from "./screens/AboutYou.jsx";
import Messages from "./screens/Messages.jsx";
import Thread from "./screens/Thread.jsx";
import Community from "./screens/Community.jsx";
import BowtieEditor from "./screens/BowtieEditor.jsx";
import Tabs, { TAB_LABEL } from "./components/Tabs.jsx";

export default function App() {
  const [user, setUser] = useState(null);          // { name, birthdate, business }
  const [stage, setStage] = useState("onboarding");
  const [tab, setTab] = useState("matches");
  const [openId, setOpenId] = useState(null);
  const [thread, setThread] = useState(null);      // { id, conversationId }
  const [bowtie, setBowtie] = useState(DEFAULT_BOWTIE);
  const [editingBowtie, setEditingBowtie] = useState(false);

  // docs/DESIGN.md leaves this open for the client: is the reading the hook on
  // the feed, or the reward for connecting? Both are built; this switches
  // between them live in the review.
  const [upfront, setUpfront] = useState(true);
  const [connected, setConnected] = useState(() => new Set());

  const fc = useMemo(() => {
    if (!user) return null;
    const [m, d, y] = parseDate(user.birthdate);
    return forecast(m, d, y, user.business);
  }, [user]);

  const ranked = useMemo(
    () => (fc ? rank(fc, readProfiles(user.business)) : []),
    [fc, user],
  );

  // The wall and the inbox are not ranked, so they read people by name.
  const everyone = useMemo(
    () => ranked.map((r) => r.profile).sort((a, b) => a.name.localeCompare(b.name)),
    [ranked],
  );

  const connect = useCallback((id) => {
    setConnected((prev) => new Set(prev).add(id));
  }, []);

  const sayHello = useCallback(async (id) => {
    const c = await startConversation(ME, personId(id));
    setThread({ id, conversationId: c.id });
  }, []);

  if (stage === "onboarding") {
    return <Onboarding onSubmit={(u) => { setUser(u); setStage("reveal"); }} />;
  }

  if (stage === "reveal") {
    return (
      <Reveal fc={fc} name={user.name.split(" ")[0]}
        onContinue={() => setStage("app")} />
    );
  }

  if (editingBowtie) {
    return (
      <BowtieEditor bowtie={bowtie}
        onSave={(b) => { setBowtie(b); setEditingBowtie(false); }}
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

  return (
    <>
      {open
        ? <MatchReading me={fc} match={open} business={user.business}
            unlocked={upfront || connected.has(open.profile.id)}
            onConnect={() => connect(open.profile.id)}
            onSayHello={() => sayHello(open.profile.id)}
            backLabel={TAB_LABEL[tab]}
            onBack={() => setOpenId(null)} />
        : tab === "matches"
          ? <Matches me={fc} name={user.name} ranked={ranked}
              business={user.business} upfront={upfront}
              connected={connected} onOpen={setOpenId} />
          : tab === "messages"
            ? <Messages people={everyone}
                onOpenThread={(id, conversationId) => setThread({ id, conversationId })} />
            : tab === "bowties"
              ? <Community name={user.name} bowtie={bowtie} people={everyone}
                  onEdit={() => setEditingBowtie(true)} onOpen={setOpenId} />
              : <AboutYou fc={fc} name={user.name} business={user.business}
                  bowtie={bowtie} onEditBowtie={() => setEditingBowtie(true)} />}

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
