import React from "react";
import Bowtie from "../components/Bowtie.jsx";
import { ME, personId } from "../lib/messaging.js";
import { useConversations, clockTime } from "../lib/useMessaging.js";

/** Every conversation you have started, most recent first. */
export default function Messages({ people, onOpenThread }) {
  const conversations = useConversations(ME);
  const byId = new Map(people.map((p) => [personId(p.id), p]));

  return (
    <div className="ks">
      <h1 className="ks-mark">Messages</h1>
      <p className="ks-sub">Conversations with the people your cards put you near.</p>

      {conversations && conversations.length === 0 && (
        <div className="callout">
          <b>No conversations yet.</b> Open anyone in Matches and say hello.
        </div>
      )}

      {conversations && conversations.length > 0 && (
        <ul className="feed">
          {conversations.map((c) => {
            const p = byId.get(c.participantIds.find((id) => id !== ME));
            if (!p) return null;
            const last = c.lastMessage;
            return (
              <li key={c.id}>
                <button className="row" onClick={() => onOpenThread(p.id, c.id)}>
                  <Bowtie bowtie={p.bowtie} size="sm" />
                  <span className="who">
                    <span className="nm">{p.name}</span>
                    <span className="why">
                      {last
                        ? `${last.senderId === ME ? "You: " : ""}${last.text}`
                        : "Nothing sent yet."}
                    </span>
                  </span>
                  {last && <span className="when">{clockTime(last.sentAt)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
