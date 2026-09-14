import React, { useEffect, useRef, useState } from "react";
import Bowtie from "../components/Bowtie.jsx";
import { ME, sendMessage } from "../lib/messaging.js";
import { useMessages, clockTime } from "../lib/useMessaging.js";

/** One conversation. Talks only to src/lib/messaging.js. */
export default function Thread({ person, conversationId, onBack }) {
  const messages = useMessages(conversationId);
  const [draft, setDraft] = useState("");
  const [failed, setFailed] = useState(false);
  const end = useRef(null);
  const first = person.name.split(" ")[0];

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  const send = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setFailed(false);
    try {
      await sendMessage(conversationId, ME, text);
    } catch {
      setDraft(text);
      setFailed(true);
    }
  };

  return (
    <div className="ks">
      <button className="back" onClick={onBack}>‹ Back</button>
      <div className="thread-who">
        <Bowtie bowtie={person.bowtie} size="sm" />
        <div>
          <b>{person.name}</b>
          <span>{person.bowtie.caption}</span>
        </div>
      </div>

      <ol className="thread" aria-live="polite">
        {messages && messages.length === 0 && (
          <li className="thread-empty">You opened this conversation. Say hello to {first}.</li>
        )}
        {messages?.map((m) => (
          <li key={m.id} className={`msg ${m.senderId === ME ? "mine" : "theirs"}`}>
            <p>{m.text}</p>
            <time dateTime={m.sentAt}>{clockTime(m.sentAt)}</time>
          </li>
        ))}
        <li ref={end} className="thread-end" aria-hidden="true" />
      </ol>
      {failed && <p className="problem" role="alert">That did not send. Try again.</p>}

      <form className="composer" onSubmit={send}>
        <div>
          <input value={draft} onChange={(e) => setDraft(e.target.value)}
            aria-label={`Message ${first}`} placeholder={`Message ${first}`}
            maxLength={1000} autoComplete="off" />
          <button className="ks-go" type="submit" disabled={!draft.trim()}>Send</button>
        </div>
      </form>
    </div>
  );
}
