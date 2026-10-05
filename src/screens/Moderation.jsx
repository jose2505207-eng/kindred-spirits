import React, { useCallback, useEffect, useState } from "react";
import { listReports, reviewReport, setSuspended } from "../lib/moderation.js";

const FILTERS = [
  ["open", "Open"],
  ["actioned", "Actioned"],
  ["dismissed", "Dismissed"],
];

/**
 * The moderator's screen. Nothing routes here: About you shows the way in, and
 * only to a member the moderators table names.
 *
 * It is deliberately plain. Every rule it depends on is in the database — a
 * non-moderator opening this by other means reads no reports and can suspend
 * nobody — so this is a view onto those rules, not a place that enforces them.
 */
export default function Moderation({ memberId, onBack }) {
  const [filter, setFilter] = useState("open");
  const [reports, setReports] = useState(null);
  const [problem, setProblem] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setReports(await listReports(filter));
      setProblem(null);
    } catch (e) {
      setProblem(e.message);
    }
  }, [filter]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="ks">
      <button className="back" onClick={onBack}>‹ About you</button>
      <h1 className="ks-mark">Moderation</h1>
      <p className="ks-sub">
        Reports members have filed. Suspending somebody takes them out of every
        feed, stops them messaging, and tells them why when they next open the
        app.
      </p>

      <div className="ks-seg" role="group" aria-label="Which reports">
        {FILTERS.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={filter === id}
            onClick={() => { setFilter(id); setReports(null); }}>
            <b>{label}</b>
            {id === "open" ? "not yet looked at" : id === "actioned" ? "acted on" : "no action taken"}
          </button>
        ))}
      </div>

      {problem && <p className="problem" role="alert">{problem}</p>}

      {reports === null && <p className="ks-note">Reading reports…</p>}

      {reports?.length === 0 && (
        <div className="callout">
          <b>Nothing here.</b> No {filter} reports.
        </div>
      )}

      {reports?.map((r) => (
        <Report key={r.id} report={r} memberId={memberId} onDone={refresh} />
      ))}
    </div>
  );
}

function Report({ report, memberId, onDone }) {
  const [note, setNote] = useState(report.actionNote);
  const [reason, setReason] = useState("");
  const [suspending, setSuspending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  const them = report.reported;
  const gone = Boolean(report.reportedDeletedAt);
  const suspended = Boolean(them?.suspendedAt);

  const run = async (fn) => {
    setBusy(true);
    setProblem(null);
    try {
      await fn();
      await onDone();
    } catch (e) {
      setProblem(e.message);
    }
    setBusy(false);
  };

  return (
    <article className="report">
      <header>
        <b>
          {gone ? "An account that has since been deleted" : them?.name ?? "Somebody"}
          {suspended && <em className="flag">suspended</em>}
        </b>
        <span>
          reported by {report.reporter?.name ?? "a member who has since left"} ·{" "}
          {new Date(report.createdAt).toLocaleDateString()}
        </span>
      </header>

      <p className="why">{report.reason}</p>

      {report.status !== "open" && (
        <p className="ks-note" style={{ margin: "0 0 10px" }}>
          {report.status === "actioned" ? "Acted on" : "Dismissed"}
          {report.reviewedAt ? ` on ${new Date(report.reviewedAt).toLocaleDateString()}` : ""}
          {report.actionNote ? ` — ${report.actionNote}` : ""}
        </p>
      )}

      {report.status === "open" && (
        <>
          <label className="ks-field">
            <span>A note for the record</span>
            <input value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)}
              placeholder="What you decided, and why" />
          </label>

          <div className="report-actions">
            <button type="button" className="linkish" disabled={busy}
              onClick={() => run(() => reviewReport(report.id, { status: "dismissed", note }, memberId))}>
              Dismiss
            </button>
            <button type="button" className="linkish" disabled={busy}
              onClick={() => run(() => reviewReport(report.id, { status: "actioned", note }, memberId))}>
              Mark actioned
            </button>
            {them && !gone && !suspended && (
              <button type="button" className="linkish danger" disabled={busy}
                onClick={() => setSuspending(true)}>
                Suspend {them.name.split(" ")[0]}
              </button>
            )}
            {them && suspended && (
              <button type="button" className="linkish" disabled={busy}
                onClick={() => run(() => setSuspended(them.id, { suspended: false }))}>
                Lift the suspension
              </button>
            )}
          </div>
        </>
      )}

      {suspending && them && (
        <form onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await setSuspended(them.id, { suspended: true, reason });
            await reviewReport(report.id, { status: "actioned", note: note || `Suspended: ${reason}` }, memberId);
            setSuspending(false);
          });
        }}>
          <label className="ks-field">
            <span>What {them.name.split(" ")[0]} will be told</span>
            <textarea value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
          </label>
          <div className="actions">
            <button type="button" className="ks-ghost" disabled={busy}
              onClick={() => setSuspending(false)}>
              Cancel
            </button>
            <button type="submit" className="ks-go" disabled={busy || !reason.trim()}>
              Suspend and mark actioned
            </button>
          </div>
        </form>
      )}

      {problem && <p className="problem" role="alert">{problem}</p>}
    </article>
  );
}
