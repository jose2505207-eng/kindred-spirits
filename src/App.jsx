import React, { useMemo, useState, useCallback } from "react";
import { forecast } from "../engine/kindredEngine.js";
import { readProfiles } from "./fixtures/profiles.js";
import { rank } from "./lib/ranking.js";

import Onboarding, { parseDate } from "./screens/Onboarding.jsx";
import Reveal from "./screens/Reveal.jsx";
import Matches from "./screens/Matches.jsx";
import MatchReading from "./screens/MatchReading.jsx";
import AboutYou from "./screens/AboutYou.jsx";
import Tabs from "./components/Tabs.jsx";

export default function App() {
  const [user, setUser] = useState(null);          // { name, birthdate, business }
  const [stage, setStage] = useState("onboarding");
  const [tab, setTab] = useState("matches");
  const [openId, setOpenId] = useState(null);

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

  const connect = useCallback((id) => {
    setConnected((prev) => new Set(prev).add(id));
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

  const open = openId === null ? null : ranked.find((r) => r.profile.id === openId);

  return (
    <>
      {open
        ? <MatchReading me={fc} match={open} business={user.business}
            unlocked={upfront || connected.has(open.profile.id)}
            onConnect={() => connect(open.profile.id)}
            onBack={() => setOpenId(null)} />
        : tab === "matches"
          ? <Matches me={fc} name={user.name} ranked={ranked}
              business={user.business} upfront={upfront}
              connected={connected} onOpen={setOpenId} />
          : <AboutYou fc={fc} name={user.name} business={user.business} />}

      {!open && <Tabs tab={tab} setTab={setTab} />}

      {!open && (
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
