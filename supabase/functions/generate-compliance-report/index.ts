// Generates a simple PDF compliance report for a venue's organization,
// summarizing donations in a chosen year and citing the applicable state law.
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const BodySchema = z.object({
  organization_id: z.string().uuid(),
  year: z.number().int().min(2020).max(2100),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
  const userId = claims?.claims?.sub;
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    // Authorization: caller must be an admin or belong to the org
    const { data: profile } = await admin.from("profiles").select("organization_id").eq("id", userId).maybeSingle();
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin && profile?.organization_id !== parsed.data.organization_id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { data: org } = await admin.from("organizations").select("name, state").eq("id", parsed.data.organization_id).single();
    const { data: state } = await admin.from("compliance_states").select("*").eq("state_code", org.state ?? "").maybeSingle();

    const start = `${parsed.data.year}-01-01`;
    const end = `${parsed.data.year + 1}-01-01`;
    const { data: listings } = await admin
      .from("food_listings")
      .select("pounds, estimated_donation_value, food_type, picked_up_at")
      .eq("organization_id", parsed.data.organization_id)
      .in("status", ["picked_up", "pending_impact_report", "completed"])
      .gte("picked_up_at", start).lt("picked_up_at", end);

    const totalPounds = (listings ?? []).reduce((s, l: any) => s + Number(l.pounds ?? 0), 0);
    const totalValue = (listings ?? []).reduce((s, l: any) => s + Number(l.estimated_donation_value ?? 0), 0);
    const donations = (listings ?? []).length;

    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    let y = 750;
    const draw = (t: string, opts: { size?: number; f?: any } = {}) => {
      page.drawText(t, { x: 50, y, size: opts.size ?? 11, font: opts.f ?? font, color: rgb(0, 0, 0) });
      y -= (opts.size ?? 11) + 6;
    };
    draw(`Compliance Summary Report — ${parsed.data.year}`, { size: 20, f: bold });
    y -= 6;
    draw(`Organization: ${org.name}`, { size: 12, f: bold });
    draw(`State: ${org.state ?? "—"}`);
    if (state) {
      y -= 6;
      draw(`Applicable Law: ${state.law_name}`, { f: bold });
      const desc = state.description ?? "";
      // simple wrap
      const words = desc.split(" ");
      let line = "";
      for (const w of words) {
        if ((line + " " + w).length > 92) { draw(line); line = w; } else { line = line ? line + " " + w : w; }
      }
      if (line) draw(line);
    } else {
      draw("No state-level food-recovery statute is tracked for this state.");
    }
    y -= 12;
    draw("Diversion Totals", { f: bold, size: 14 });
    draw(`Donations recorded: ${donations}`);
    draw(`Pounds diverted from landfill: ${totalPounds.toFixed(1)} lbs`);
    draw(`Fair market value of donated food: $${totalValue.toFixed(2)}`);
    draw(`Estimated CO2e avoided: ${(totalPounds * 2.5).toFixed(0)} lb`);
    y -= 12;
    draw("This report is generated from primary donation records maintained in", { size: 9 });
    draw("Hariet.AI and reflects donations picked up during the calendar year.", { size: 9 });
    draw("Retain alongside internal ESG and municipal filings as required.", { size: 9 });

    const bytes = await doc.save();
    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="compliance-${parsed.data.year}.pdf"`,
      },
    });
  } catch (e) {
    console.error("generate-compliance-report", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
