// Generates a year-end tax summary letter (PDF) aggregating all donations
// from a venue organization to a specific nonprofit (or all nonprofits) in
// a given tax year. Streams PDF bytes back to the caller.
// Auth: caller must belong to the venue organization or be admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const admin = createClient(url, service);

    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const year = Number(body.year);
    const nonprofit_id: string | null = body.nonprofit_id || null;
    const venue_organization_id: string = body.venue_organization_id;
    if (!year || year < 2000 || year > 2100) return json({ error: "invalid year" }, 400);
    if (!venue_organization_id) return json({ error: "venue_organization_id required" }, 400);

    // Authorize
    const [{ data: profile }, { data: adminRow }] = await Promise.all([
      admin.from("profiles").select("organization_id").eq("id", user.id).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
    ]);
    const isAdmin = !!adminRow;
    const isVenueMember = profile?.organization_id === venue_organization_id;
    if (!isAdmin && !isVenueMember) return json({ error: "forbidden" }, 403);

    const start = `${year}-01-01T00:00:00Z`;
    const end = `${year + 1}-01-01T00:00:00Z`;

    let q = admin
      .from("food_listings")
      .select("id, food_type, pounds, estimated_donation_value, created_at, picked_up_at, nonprofit_claimed_id")
      .eq("organization_id", venue_organization_id)
      .not("nonprofit_claimed_id", "is", null)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: true });
    if (nonprofit_id) q = q.eq("nonprofit_claimed_id", nonprofit_id);

    const { data: listings, error: lErr } = await q;
    if (lErr) return json({ error: lErr.message }, 500);

    const npIds = Array.from(new Set((listings || []).map((l) => l.nonprofit_claimed_id).filter(Boolean)));
    const [{ data: nps }, { data: org }] = await Promise.all([
      npIds.length
        ? admin.from("nonprofits").select("id, organization_name, ein, address, city, state, zip_code").in("id", npIds)
        : Promise.resolve({ data: [] as any[] }),
      admin.from("organizations").select("name, business_bio").eq("id", venue_organization_id).maybeSingle(),
    ]);
    const npMap = new Map((nps || []).map((n: any) => [n.id, n]));

    // Aggregate totals
    const totalPounds = (listings || []).reduce((s, l) => s + Number(l.pounds || 0), 0);
    const totalValue = (listings || []).reduce((s, l) => s + Number(l.estimated_donation_value || 0), 0);
    const totalCount = (listings || []).length;

    // ---------- Build PDF ----------
    const pdf = await PDFDocument.create();
    let page = pdf.addPage([612, 792]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const gold = rgb(0.83, 0.68, 0.21);
    const bronze = rgb(0.43, 0.25, 0.16);
    const dark = rgb(0.10, 0.10, 0.10);
    const muted = rgb(0.35, 0.35, 0.35);

    page.drawRectangle({ x: 0, y: 732, width: 612, height: 60, color: dark });
    page.drawText("Hariet.AI", { x: 40, y: 758, size: 22, font: bold, color: gold });
    page.drawText(`Year-End Donation Summary · ${year}`, { x: 40, y: 742, size: 10, font, color: rgb(1, 1, 1) });
    page.drawRectangle({ x: 0, y: 728, width: 612, height: 4, color: gold });

    let y = 700;
    const wrap = (text: string, maxChars: number) => {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        if ((cur + " " + w).trim().length > maxChars) { lines.push(cur); cur = w; } else { cur = (cur ? cur + " " : "") + w; }
      }
      if (cur) lines.push(cur);
      return lines;
    };
    const ensure = (needed: number) => {
      if (y - needed < 60) {
        page = pdf.addPage([612, 792]);
        y = 760;
      }
    };
    const line = (label: string, value: string) => {
      ensure(18);
      page.drawText(label, { x: 40, y, size: 9, font: bold, color: muted });
      page.drawText(value || "—", { x: 200, y, size: 10, font, color: dark });
      y -= 16;
    };
    const section = (title: string) => {
      ensure(28);
      y -= 8;
      page.drawText(title, { x: 40, y, size: 12, font: bold, color: bronze });
      y -= 4;
      page.drawLine({ start: { x: 40, y }, end: { x: 572, y }, thickness: 0.6, color: gold });
      y -= 14;
    };

    const issuedOn = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    section("Donor");
    line("Organization", org?.name || "—");
    line("Letter issued", issuedOn);
    line("Tax year", String(year));

    if (nonprofit_id) {
      const np: any = npMap.get(nonprofit_id);
      section("Recipient (Nonprofit)");
      line("Organization", np?.organization_name || "—");
      line("EIN", np?.ein || "—");
      const addr = [np?.address, [np?.city, np?.state].filter(Boolean).join(", "), np?.zip_code].filter(Boolean).join(" · ");
      line("Address", addr);
    } else {
      section("Recipients");
      line("Nonprofits", `${npIds.length} organization(s)`);
    }

    section("Summary");
    line("Total donations", String(totalCount));
    line("Total weight", `${totalPounds.toFixed(1)} lbs`);
    line("Total estimated FMV", `$${totalValue.toFixed(2)}`);

    // Body paragraph
    ensure(80);
    y -= 6;
    const para = nonprofit_id
      ? `On behalf of ${org?.name || "our organization"}, thank you for receiving food donations in ${year}. Below is a consolidated summary of every donation made to your organization during the tax year. Please retain this letter for your records.`
      : `This letter summarizes all charitable food donations made by ${org?.name || "our organization"} in ${year} across every partner nonprofit. Please retain this letter for your records.`;
    for (const l of wrap(para, 95)) {
      ensure(14);
      page.drawText(l, { x: 40, y, size: 10, font, color: dark });
      y -= 13;
    }

    // Table
    section("Itemized donations");
    ensure(20);
    page.drawText("Date", { x: 40, y, size: 9, font: bold, color: muted });
    if (!nonprofit_id) page.drawText("Nonprofit", { x: 110, y, size: 9, font: bold, color: muted });
    page.drawText("Food type", { x: 300, y, size: 9, font: bold, color: muted });
    page.drawText("Lbs", { x: 430, y, size: 9, font: bold, color: muted });
    page.drawText("FMV", { x: 500, y, size: 9, font: bold, color: muted });
    y -= 12;
    page.drawLine({ start: { x: 40, y }, end: { x: 572, y }, thickness: 0.4, color: muted });
    y -= 10;
    for (const l of listings || []) {
      ensure(14);
      const d = l.created_at ? new Date(l.created_at).toLocaleDateString("en-US") : "—";
      const npName = (npMap.get(l.nonprofit_claimed_id!) as any)?.organization_name || "—";
      page.drawText(d, { x: 40, y, size: 9, font, color: dark });
      if (!nonprofit_id) page.drawText(String(npName).slice(0, 28), { x: 110, y, size: 9, font, color: dark });
      page.drawText(String(l.food_type || "").replace(/_/g, " ").slice(0, 20), { x: 300, y, size: 9, font, color: dark });
      page.drawText(Number(l.pounds || 0).toFixed(1), { x: 430, y, size: 9, font, color: dark });
      page.drawText(`$${Number(l.estimated_donation_value || 0).toFixed(2)}`, { x: 500, y, size: 9, font, color: dark });
      y -= 12;
    }

    // IRS footer language
    ensure(70);
    y -= 10;
    page.drawLine({ start: { x: 40, y }, end: { x: 572, y }, thickness: 0.6, color: gold });
    y -= 14;
    const irsLines = [
      "No goods or services were provided in exchange for these contributions.",
      "This letter is intended as a summary of charitable food contributions for the tax year noted above.",
      "Please retain this letter with your records for tax purposes.",
    ];
    for (const l of irsLines) {
      page.drawText(l, { x: 40, y, size: 9, font, color: dark });
      y -= 12;
    }

    // Footer band on last page
    page.drawRectangle({ x: 0, y: 0, width: 612, height: 28, color: dark });
    page.drawText("Powered by Hariet.AI · hariet.ai", { x: 40, y: 10, size: 8, font, color: gold });

    const pdfBytes = await pdf.save();
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="year-end-summary-${year}.pdf"`,
      },
    });
  } catch (e) {
    return json({ error: (e as Error).message || "unknown error" }, 500);
  }
});
