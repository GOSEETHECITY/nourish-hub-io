import { jsPDF } from "jspdf";
import { METHODOLOGY_SHORT, METHODOLOGY_SOURCES } from "./impactMethodology";

export type TrendPoint = { month: string; pounds: number; meals: number };
export type GovPdfInput = {
  jurisdiction: string;
  regionLabel: string;
  generatedAt: Date;
  metrics: { label: string; value: string }[];
  trend: TrendPoint[];
  organizations: { name: string; pounds: number }[];
  goal?: { goalLbs: number; progressLbs: number; periodStart: string; periodEnd: string } | null;
};

/** Grant-ready impact report: headline metrics, monthly trend charts, participating organizations, methodology. */
export function downloadGovImpactPdf(d: GovPdfInput) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = M;

  const ensure = (h: number) => { if (y + h > doc.internal.pageSize.getHeight() - M) { doc.addPage(); y = M; } };

  doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text("Food Rescue Impact Report", M, y); y += 22;
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.text(d.jurisdiction, M, y); y += 14;
  doc.setTextColor(110); doc.text(`${d.regionLabel}  ·  Generated ${d.generatedAt.toLocaleDateString()}`, M, y); doc.setTextColor(0); y += 24;

  // Metrics grid
  const colW = (W - M * 2) / 3;
  d.metrics.forEach((m, i) => {
    const cx = M + (i % 3) * colW; const cy = y + Math.floor(i / 3) * 52;
    doc.setDrawColor(220); doc.roundedRect(cx, cy, colW - 8, 44, 4, 4);
    doc.setFontSize(9); doc.setTextColor(110); doc.text(m.label, cx + 8, cy + 15);
    doc.setFontSize(14); doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.text(m.value, cx + 8, cy + 34); doc.setFont("helvetica", "normal");
  });
  y += Math.ceil(d.metrics.length / 3) * 52 + 12;

  if (d.goal) {
    ensure(50);
    const pct = Math.min(100, Math.round((d.goal.progressLbs / d.goal.goalLbs) * 100));
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("Waste-reduction goal", M, y); doc.setFont("helvetica", "normal"); y += 14;
    doc.setFontSize(10);
    doc.text(`${d.goal.progressLbs.toLocaleString()} of ${d.goal.goalLbs.toLocaleString()} lbs (${pct}%) · ${d.goal.periodStart} to ${d.goal.periodEnd}`, M, y); y += 8;
    doc.setFillColor(230, 230, 230); doc.rect(M, y, W - M * 2, 8, "F");
    doc.setFillColor(60, 120, 80); doc.rect(M, y, (W - M * 2) * pct / 100, 8, "F"); y += 24;
  }

  const chart = (title: string, key: "pounds" | "meals") => {
    ensure(170);
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text(title, M, y); doc.setFont("helvetica", "normal"); y += 10;
    const h = 120, w = W - M * 2, pts = d.trend;
    const max = Math.max(1, ...pts.map((p) => p[key]));
    doc.setDrawColor(200); doc.line(M, y + h, M + w, y + h);
    const bw = pts.length ? w / pts.length : w;
    pts.forEach((p, i) => {
      const bh = (p[key] / max) * (h - 12);
      doc.setFillColor(60, 120, 80); doc.rect(M + i * bw + 4, y + h - bh, Math.max(2, bw - 8), bh, "F");
      doc.setFontSize(7); doc.setTextColor(110); doc.text(p.month, M + i * bw + 4, y + h + 10); doc.setTextColor(0);
    });
    doc.setFontSize(8); doc.text(`max ${max.toLocaleString()}`, M + w - 50, y + 8);
    y += h + 26;
  };
  chart("Pounds diverted per month", "pounds");
  chart("Estimated meals per month", "meals");

  ensure(40);
  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text(`Participating organizations (${d.organizations.length})`, M, y); doc.setFont("helvetica", "normal"); y += 16;
  doc.setFontSize(10);
  d.organizations.forEach((o, i) => {
    ensure(14);
    doc.text(`${i + 1}. ${o.name}`, M, y); doc.text(`${o.pounds.toLocaleString()} lbs`, W - M, y, { align: "right" }); y += 14;
  });
  if (!d.organizations.length) { doc.text("No participating organizations in this period.", M, y); y += 14; }

  ensure(90); y += 10;
  doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("Methodology", M, y); doc.setFont("helvetica", "normal"); y += 12;
  doc.setFontSize(8);
  const lines = doc.splitTextToSize(`All environmental figures are estimates. ${METHODOLOGY_SHORT}`, W - M * 2);
  doc.text(lines, M, y); y += lines.length * 10 + 4;
  METHODOLOGY_SOURCES.forEach((s) => { ensure(10); doc.text(`• ${s.label}`, M, y); y += 10; });

  doc.save(`impact-report-${d.generatedAt.toISOString().slice(0, 10)}.pdf`);
}

export function monthlyTrend(rows: { date: string | null | undefined; pounds: number }[], mealsPerLb: number, months = 12): TrendPoint[] {
  const now = new Date();
  const buckets: TrendPoint[] = [];
  const idx: Record<string, number> = {};
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    idx[key] = buckets.length;
    buckets.push({ month: d.toLocaleDateString([], { month: "short", year: "2-digit" }), pounds: 0, meals: 0 });
  }
  for (const r of rows) {
    if (!r.date) continue;
    const d = new Date(r.date);
    const k = idx[`${d.getFullYear()}-${d.getMonth()}`];
    if (k == null) continue;
    buckets[k].pounds += r.pounds || 0;
  }
  for (const b of buckets) { b.pounds = Math.round(b.pounds); b.meals = Math.round(b.pounds * mealsPerLb); }
  return buckets;
}
