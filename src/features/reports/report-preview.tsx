import { fmt } from "@/lib/dates";
import { EMPTY, transitionLines, type ReportContent } from "@/lib/report";

const h2 = "mt-6 mb-2 border-b border-line pb-1 text-base font-bold";
const muted = "text-sm text-muted";

/** On-screen preview. Mirrors the PDF/Word layout section for section. */
export function ReportPreview({ content: c, summary }: { content: ReportContent; summary: string | null }) {
  const h = c.header;
  const transition = transitionLines(c);
  return (
    <article aria-label="Report preview" className="text-sm leading-relaxed">
      <header>
        <h2 className="text-xl font-extrabold">{h.title}</h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-sm">
          <dt className="text-muted">Prepared by</dt>
          <dd>
            {h.name}, {h.jobTitle}, {h.unit}
          </dd>
          <dt className="text-muted">To</dt>
          <dd>{h.to}</dd>
          <dt className="text-muted">Reporting period</dt>
          <dd>
            {fmt(h.periodStart, "EEE, MMM d")} – {fmt(h.periodEnd, "EEE, MMM d, yyyy")}
          </dd>
          <dt className="text-muted">Prepared</dt>
          <dd>{fmt(h.preparedOn, "MMMM d, yyyy")}</dd>
        </dl>
      </header>

      <h3 className={h2}>Summary</h3>
      {summary?.trim() ? <p className="whitespace-pre-wrap">{summary}</p> : <p className={muted}>{EMPTY.summary}</p>}

      {transition && (
        <>
          <h3 className={h2}>Transition status</h3>
          <p>{transition.status}</p>
          <ul className="mt-2 list-disc pl-5">
            {transition.phases.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}

      <h3 className={h2}>Completed this week</h3>
      {c.completed.length === 0 ? (
        <p className={muted}>{EMPTY.completed}</p>
      ) : (
        c.completed.map((g) => (
          <div key={g.group} className="mb-2">
            <p className="font-semibold">{g.group}</p>
            <ul className="list-disc pl-5">
              {g.items.map((t, i) => (
                <li key={i}>
                  {t.title} <span className="text-muted">({fmt(t.completedOn, "MMM d")})</span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      <h3 className={h2}>In progress and planned next week</h3>
      {c.upcoming.length === 0 ? (
        <p className={muted}>{EMPTY.upcoming}</p>
      ) : (
        <ul className="list-disc pl-5">
          {c.upcoming.map((t, i) => (
            <li key={i}>
              {t.title} <span className="text-muted">({t.group}{t.dueDate ? `, due ${fmt(t.dueDate, "MMM d")}` : ""}{t.inProgress ? ", in progress" : ""})</span>
            </li>
          ))}
        </ul>
      )}

      <h3 className={h2}>Assignment Register</h3>
      {c.register.length === 0 ? (
        <p className={muted}>{EMPTY.register}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <caption className="sr-only">Assignment Register</caption>
            <thead>
              <tr className="bg-surface-2 text-left">
                {["Website / Project", "Ministry / Department", "Status", "Outstanding tasks", "Target date", "Remarks", ...(c.showPriority ? ["Priority"] : [])].map((col) => (
                  <th key={col} scope="col" className="border border-line px-2 py-1.5 font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.register.map((r, i) => (
                <tr key={i}>
                  <th scope="row" className="border border-line px-2 py-1.5 text-left font-semibold">
                    {r.name}
                  </th>
                  <td className="border border-line px-2 py-1.5">{r.client ?? "—"}</td>
                  <td className="border border-line px-2 py-1.5">
                    {r.status}
                    {r.changed && <strong className="ml-1 text-orange-text">(changed)</strong>}
                  </td>
                  <td className="border border-line px-2 py-1.5">{r.outstanding ?? "—"}</td>
                  <td className="border border-line px-2 py-1.5 whitespace-nowrap">{r.targetDate ? fmt(r.targetDate, "MMM d, yyyy") : "—"}</td>
                  <td className="border border-line px-2 py-1.5">{r.remarks ?? "—"}</td>
                  {c.showPriority && <td className="border border-line px-2 py-1.5">{r.priority ?? "—"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className={h2}>Updates</h3>
      {c.updates.length === 0 ? (
        <p className={muted}>{EMPTY.updates}</p>
      ) : (
        c.updates.map((g) => (
          <div key={g.group} className="mb-2">
            <p className="font-semibold">{g.group}</p>
            <ul className="list-disc pl-5">
              {g.items.map((u, i) => (
                <li key={i} className="whitespace-pre-wrap">
                  <span className="text-muted">{fmt(u.date, "MMM d")}:</span> {u.body}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      <h3 className={h2}>Risks and issues</h3>
      <LineList items={c.risks} empty={EMPTY.risks} />

      <h3 className={h2}>Waiting on client</h3>
      <LineList items={c.waiting} empty={EMPTY.waiting} />

      <h3 className={h2}>Support needed</h3>
      {c.supportNeeded.trim() ? <p className="whitespace-pre-wrap">{c.supportNeeded}</p> : <p className={muted}>{EMPTY.support}</p>}
    </article>
  );
}

function LineList({ items, empty }: { items: ReportContent["risks"]; empty: string }) {
  if (!items.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="list-disc pl-5">
      {items.map((r, i) => (
        <li key={i} className="whitespace-pre-wrap">
          {r.body} <span className="text-muted">({r.project ?? "General"}, {fmt(r.date, "MMM d")})</span>
        </li>
      ))}
    </ul>
  );
}
