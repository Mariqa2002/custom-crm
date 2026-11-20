// Loaded only on demand from the Reports page (dynamic import), so
// @react-pdf/renderer never ships in the main bundle.
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { fmt } from "@/lib/dates";
import { EMPTY, transitionLines, type ReportContent } from "@/lib/report";

// Light theme only. Built-in Helvetica: embedding Manrope would mean shipping
// a TTF file with the app (react-pdf can't read the woff2 that next/font uses).
// Colours are the hex equivalents of the OKLCH tokens in globals.css
// (react-pdf doesn't understand oklch()).
const C = { text: "#0F1828", muted: "#546175", line: "#E1E7EE", head: "#F5F7FA", orange: "#9B4F03", accent: "#0660CD" };

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: C.text, fontFamily: "Helvetica", lineHeight: 1.4 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.accent },
  meta: { marginTop: 6, color: C.muted },
  metaRow: { flexDirection: "row", marginTop: 1 },
  metaKey: { width: 100, color: C.muted },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 4, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: C.line },
  group: { fontFamily: "Helvetica-Bold", marginTop: 4 },
  li: { flexDirection: "row", marginTop: 2 },
  bullet: { width: 10 },
  liText: { flex: 1 },
  muted: { color: C.muted },
  table: { marginTop: 4, borderWidth: 1, borderColor: C.line },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.line },
  th: { padding: 4, fontFamily: "Helvetica-Bold", backgroundColor: C.head, fontSize: 8.5 },
  td: { padding: 4, fontSize: 8.5 },
  changed: { color: C.orange, fontFamily: "Helvetica-Bold" },
});

function Li({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.li} wrap={false}>
      <Text style={s.bullet}>•</Text>
      <Text style={s.liText}>{children}</Text>
    </View>
  );
}

function ReportDocument({ content: c, summary }: { content: ReportContent; summary: string | null }) {
  const h = c.header;
  const transition = transitionLines(c);
  const cols = [
    { label: "Website / Project", w: 15 },
    { label: "Ministry / Department", w: 15 },
    { label: "Status", w: 13 },
    { label: "Outstanding tasks", w: 20 },
    { label: "Target date", w: 11 },
    { label: "Remarks", w: c.showPriority ? 20 : 26 },
    ...(c.showPriority ? [{ label: "Priority", w: 6 }] : []),
  ];
  return (
    <Document title={`${h.title} ${h.periodStart} to ${h.periodEnd}`} author={h.name}>
      <Page size="A4" orientation="portrait" style={s.page}>
        <Text style={s.title}>{h.title}</Text>
        <View style={s.meta}>
          <View style={s.metaRow}><Text style={s.metaKey}>Prepared by</Text><Text>{h.name}, {h.jobTitle}, {h.unit}</Text></View>
          <View style={s.metaRow}><Text style={s.metaKey}>To</Text><Text>{h.to}</Text></View>
          <View style={s.metaRow}><Text style={s.metaKey}>Reporting period</Text><Text>{fmt(h.periodStart, "EEE, MMM d")} – {fmt(h.periodEnd, "EEE, MMM d, yyyy")}</Text></View>
          <View style={s.metaRow}><Text style={s.metaKey}>Prepared</Text><Text>{fmt(h.preparedOn, "MMMM d, yyyy")}</Text></View>
        </View>

        <Text style={s.h2}>Summary</Text>
        <Text style={summary?.trim() ? undefined : s.muted}>{summary?.trim() || EMPTY.summary}</Text>

        {transition && (
          <>
            <Text style={s.h2}>Transition status</Text>
            <Text>{transition.status}</Text>
            {transition.phases.map((line) => (
              <Li key={line}>{line}</Li>
            ))}
          </>
        )}

        <Text style={s.h2}>Completed this week</Text>
        {c.completed.length === 0 ? <Text style={s.muted}>{EMPTY.completed}</Text> : c.completed.map((g) => (
          <View key={g.group}>
            <Text style={s.group}>{g.group}</Text>
            {g.items.map((t, i) => <Li key={i}>{t.title} ({fmt(t.completedOn, "MMM d")})</Li>)}
          </View>
        ))}

        <Text style={s.h2}>In progress and planned next week</Text>
        {c.upcoming.length === 0 ? <Text style={s.muted}>{EMPTY.upcoming}</Text> : c.upcoming.map((t, i) => (
          <Li key={i}>{t.title} ({t.group}{t.dueDate ? `, due ${fmt(t.dueDate, "MMM d")}` : ""}{t.inProgress ? ", in progress" : ""})</Li>
        ))}

        <Text style={s.h2}>Assignment Register</Text>
        {c.register.length === 0 ? <Text style={s.muted}>{EMPTY.register}</Text> : (
          <View style={s.table}>
            <View style={s.tr} fixed>
              {cols.map((col) => <Text key={col.label} style={[s.th, { width: `${col.w}%` }]}>{col.label}</Text>)}
            </View>
            {c.register.map((r, i) => {
              const cells = [r.name, r.client ?? "—", r.status, r.outstanding ?? "—", r.targetDate ? fmt(r.targetDate, "MMM d, yyyy") : "—", r.remarks ?? "—", ...(c.showPriority ? [r.priority ? String(r.priority) : "—"] : [])];
              return (
                <View key={i} style={s.tr} wrap={false}>
                  {cells.map((cell, j) => (
                    <Text key={j} style={[s.td, { width: `${cols[j].w}%` }]}>
                      {cell}
                      {j === 2 && r.changed ? <Text style={s.changed}> (changed)</Text> : null}
                    </Text>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        <Text style={s.h2}>Updates</Text>
        {c.updates.length === 0 ? <Text style={s.muted}>{EMPTY.updates}</Text> : c.updates.map((g) => (
          <View key={g.group}>
            <Text style={s.group}>{g.group}</Text>
            {g.items.map((u, i) => <Li key={i}>{fmt(u.date, "MMM d")}: {u.body}</Li>)}
          </View>
        ))}

        <Text style={s.h2}>Risks and issues</Text>
        {c.risks.length === 0 ? <Text style={s.muted}>{EMPTY.risks}</Text> : c.risks.map((r, i) => <Li key={i}>{r.body} ({r.project ?? "General"}, {fmt(r.date, "MMM d")})</Li>)}

        <Text style={s.h2}>Waiting on client</Text>
        {c.waiting.length === 0 ? <Text style={s.muted}>{EMPTY.waiting}</Text> : c.waiting.map((r, i) => <Li key={i}>{r.body} ({r.project ?? "General"}, {fmt(r.date, "MMM d")})</Li>)}

        <Text style={s.h2}>Support needed</Text>
        <Text style={c.supportNeeded.trim() ? undefined : s.muted}>{c.supportNeeded.trim() || EMPTY.support}</Text>

        <Text style={{ position: "absolute", bottom: 20, right: 40, fontSize: 8, color: C.muted }} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}

export async function renderReportPdf(content: ReportContent, summary: string | null): Promise<Blob> {
  return pdf(<ReportDocument content={content} summary={summary} />).toBlob();
}
