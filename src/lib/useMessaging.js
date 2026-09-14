import { useEffect, useState } from "react";
import { listConversations, listMessages, subscribe } from "./messaging.js";

/**
 * React bindings for src/lib/messaging.js. Kept apart from the transport so
 * the transport can be swapped without touching React.
 */
function useLive(read, key) {
  const [value, setValue] = useState(null);
  useEffect(() => {
    let live = true, latest = 0;
    const load = () => {
      const n = ++latest;
      read().then((v) => { if (live && n === latest) setValue(v); });
    };
    load();
    const off = subscribe(load);
    return () => { live = false; off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return value;
}

export const useConversations = (memberId) =>
  useLive(() => listConversations(memberId), memberId);

export const useMessages = (conversationId) =>
  useLive(() => listMessages(conversationId), conversationId);

export const clockTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
