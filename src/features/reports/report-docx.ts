// Loaded only on demand from the Reports page (dynamic import).
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { fmt } from "@/lib/dates";
import { EMPTY, transitionLines, type ReportContent } from "@/lib/report";

const MUTED = "546175";
const ORANGE = "9B4F03";

const h2 = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 100 } });
const p = (text: string, opts: { muted?: boolean; bold?: boolean } = {}) =>
  new Paragraph({ children: [new TextRun({ text, color: opts.muted ? MUTED : undefined, bold: opts.bold })] });
const li = (text: string) => new Paragraph({ text, bullet: { level: 0 } });
const meta = (k: string, v: string) =>
  new Paragraph({ children: [new TextRun({ text: `${k}: `, color: MUTED }), new TextRun(v)] });

const border = { style: BorderStyle.SINGLE, size: 4, color: "E1E7EE" };
const cellBorders = { top: border, bottom: border, left: border, right: border };

function cell(text: string, header = false, extra?: TextRun) {
  return new TableCell({
    borders: cellBorders,
    shading: header ? { type: ShadingType.CLEAR, color: "auto", fill: "F5F7FA" } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text, bold: header, size: 18 }), ...(extra ? [extra] : [])] })],
  });
}

export async function renderReportDocx(c: ReportContent, summary: string | null): Promise<Blob> {
  const h = c.header;
  const transition = transitionLines(c);
  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: h.title, heading: HeadingLevel.TITLE, alignment: AlignmentType.LEFT }),
    meta("Prepared by", `${h.name}, ${h.jobTitle}, ${h.unit}`),
    meta("To", h.to),
    meta("Reporting period", `${fmt(h.periodStart, "EEE, MMM d")} – ${fmt(h.periodEnd, "EEE, MMM d, yyyy")}`),
    meta("Prepared", fmt(h.preparedOn, "MMMM d, yyyy")),

    h2("Summary"),
    summary?.trim() ? p(summary.trim()) : p(EMPTY.summary, { muted: true }),

    ...(transition ? [h2("Transition status"), p(transition.status), ...transition.phases.map((line) => li(line))] : []),

    h2("Completed this week"),
    ...(c.completed.length === 0
      ? [p(EMPTY.completed, { muted: true })]
      : c.completed.flatMap((g) => [p(g.group, { bold: true }), ...g.items.map((t) => li(`${t.title} (${fmt(t.completedOn, "MMM d")})`))])),

    h2("In progress and planned next week"),
    ...(c.upcoming.length === 0
      ? [p(EMPTY.upcoming, { muted: true })]
      : c.upcoming.map((t) =>
          li(`${t.title} (${t.group}${t.dueDate ? `, due ${fmt(t.dueDate, "MMM d")}` : ""}${t.inProgress ? ", in progress" : ""})`),
        )),

    h2("Assignment Register"),
  ];

  if (c.register.length === 0) {
    children.push(p(EMPTY.register, { muted: true }));
  } else {
    const headers = ["Website / Project", "Ministry / Department", "Status", "Outstanding tasks", "Target date", "Remarks", ...(c.showPriority ? ["Priority"] : [])];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ tableHeader: true, children: headers.map((x) => cell(x, true)) }),
          ...c.register.map(
            (r) =>
              new TableRow({
                children: [
                  cell(r.name),
                  cell(r.client ?? "—"),
                  cell(r.status, false, r.changed ? new TextRun({ text: " (changed)", bold: true, color: ORANGE, size: 18 }) : undefined),
                  cell(r.outstanding ?? "—"),
                  cell(r.targetDate ? fmt(r.targetDate, "MMM d, yyyy") : "—"),
                  cell(r.remarks ?? "—"),
                  ...(c.showPriority ? [cell(r.priority ? String(r.priority) : "—")] : []),
                ],
              }),
          ),
        ],
      }),
    );
  }

  children.push(
    h2("Updates"),
    ...(c.updates.length === 0
      ? [p(EMPTY.updates, { muted: true })]
      : c.updates.flatMap((g) => [p(g.group, { bold: true }), ...g.items.map((u) => li(`${fmt(u.date, "MMM d")}: ${u.body}`))])),
    h2("Risks and issues"),
    ...(c.risks.length === 0 ? [p(EMPTY.risks, { muted: true })] : c.risks.map((r) => li(`${r.body} (${r.project ?? "General"}, ${fmt(r.date, "MMM d")})`))),
    h2("Waiting on client"),
    ...(c.waiting.length === 0 ? [p(EMPTY.waiting, { muted: true })] : c.waiting.map((r) => li(`${r.body} (${r.project ?? "General"}, ${fmt(r.date, "MMM d")})`))),
    h2("Support needed"),
    c.supportNeeded.trim() ? p(c.supportNeeded.trim()) : p(EMPTY.support, { muted: true }),
  );

  const doc = new Document({
    creator: h.name,
    title: h.title,
    styles: { default: { document: { run: { font: "Calibri", size: 21 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT, width: 11906, height: 16838 }, // A4
            margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
          },
        },
        children,
      },
    ],
  });
  return Packer.toBlob(doc);
}
