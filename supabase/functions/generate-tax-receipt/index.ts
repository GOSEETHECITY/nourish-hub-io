// Generates a branded tax receipt PDF for a donation, uploads it to the
// private `tax-receipts` bucket, and inserts a row in `tax_receipts`.
// Auth: caller must be authenticated and be a member of the nonprofit that
// claimed the donation (or an admin).
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

    const { food_listing_id } = await req.json();
    if (!food_listing_id) return json({ error: "food_listing_id required" }, 400);

    // Load donation + venue + nonprofit context using service role.
    const { data: listing, error: lErr } = await admin
      .from("food_listings")
      .select("*")
      .eq("id", food_listing_id)
      .maybeSingle();
    if (lErr || !listing) return json({ error: "listing not found" }, 404);
    if (!listing.nonprofit_claimed_id) return json({ error: "listing has no nonprofit claim" }, 400);

    // Authorize: user must belong to the claiming nonprofit or be admin.
    const [{ data: profile }, { data: adminRow }] = await Promise.all([
      admin.from("profiles").select("nonprofit_id, organization_id").eq("id", user.id).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
    ]);
    const { data: nonprofitOwned } = await admin
      .from("nonprofits").select("id").eq("id", listing.nonprofit_claimed_id).eq("user_id", user.id).maybeSingle();
    const isAdmin = !!adminRow;
    const isNpMember = profile?.nonprofit_id === listing.nonprofit_claimed_id || !!nonprofitOwned;
    if (!isAdmin && !isNpMember) return json({ error: "forbidden" }, 403);

    const [{ data: np }, { data: org }, { data: loc }, { data: lineItems }] = await Promise.all([
      admin.from("nonprofits").select("id, organization_name, ein, address, city, state, zip_code, logo_url").eq("id", listing.nonprofit_claimed_id).maybeSingle(),
      admin.from("organizations").select("id, name, business_bio, logo_url").eq("id", listing.organization_id).maybeSingle(),
      admin.from("locations").select("name, address, city, state, zip_code").eq("id", listing.location_id).maybeSingle(),
      admin.from("donation_line_items").select("description, quantity, unit_value, total_value").eq("food_listing_id", food_listing_id),
    ]);

    // ---------- Build PDF (Hariet.AI palette: gold, bronze, dark) ----------
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]); // US Letter
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const gold = rgb(0.83, 0.68, 0.21);   // #D4AE36
    const bronze = rgb(0.43, 0.25, 0.16); // #6d412a (brand brown)
    const dark = rgb(0.10, 0.10, 0.10);
    const muted = rgb(0.35, 0.35, 0.35);

    // Dark header bar
    page.drawRectangle({ x: 0, y: 732, width: 612, height: 60, color: dark });
    page.drawText("Hariet.AI", { x: 40, y: 758, size: 22, font: bold, color: gold });
    page.drawText("Tax Donation Receipt", { x: 40, y: 742, size: 10, font, color: rgb(1, 1, 1) });
    // Gold accent line
    page.drawRectangle({ x: 0, y: 728, width: 612, height: 4, color: gold });

    let y = 700;
    const line = (label: string, value: string) => {
      page.drawText(label, { x: 40, y, size: 9, font: bold, color: muted });
      page.drawText(value || "—", { x: 180, y, size: 10, font, color: dark });
      y -= 16;
    };
    const section = (title: string) => {
      y -= 8;
      page.drawText(title, { x: 40, y, size: 12, font: bold, color: bronze });
      y -= 4;
      page.drawLine({ start: { x: 40, y }, end: { x: 572, y }, thickness: 0.6, color: gold });
      y -= 14;
    };

    const fullNpAddr = [np?.address, [np?.city, np?.state].filter(Boolean).join(", "), np?.zip_code].filter(Boolean).join(" · ");
    const fullVenueAddr = [loc?.address, [loc?.city, loc?.state].filter(Boolean).join(", "), loc?.zip_code].filter(Boolean).join(" · ");
    const issuedOn = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const donationOn = listing.created_at
      ? new Date(listing.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "—";

    section("Recipient (Nonprofit)");
    line("Organization", np?.organization_name || "—");
    line("EIN", np?.ein || "—");
    line("Address", fullNpAddr);

    section("Donor");
    line("Organization", org?.name || "—");
    line("Location", loc?.name || "—");
    line("Address", fullVenueAddr);

    section("Donation");
    line("Date of donation", donationOn);
    line("Receipt issued", issuedOn);
    line("Food type", (listing.food_type || "—").replace(/_/g, " "));
    line("Estimated weight", listing.pounds != null ? `${listing.pounds} lbs` : "—");
    line("Estimated fair market value", listing.estimated_donation_value != null ? `$${Number(listing.estimated_donation_value).toFixed(2)}` : "—");

    if (lineItems && lineItems.length > 0) {
      section("Itemized breakdown");
      page.drawText("Description", { x: 40, y, size: 9, font: bold, color: muted });
      page.drawText("Qty", { x: 340, y, size: 9, font: bold, color: muted });
      page.drawText("Unit $", { x: 400, y, size: 9, font: bold, color: muted });
      page.drawText("Total $", { x: 480, y, size: 9, font: bold, color: muted });
      y -= 14;
      for (const li of lineItems) {
        if (y < 160) break;
        page.drawText(String(li.description || "").slice(0, 55), { x: 40, y, size: 10, font, color: dark });
        page.drawText(String(li.quantity), { x: 340, y, size: 10, font, color: dark });
        page.drawText(`$${Number(li.unit_value).toFixed(2)}`, { x: 400, y, size: 10, font, color: dark });
        page.drawText(`$${Number(li.total_value).toFixed(2)}`, { x: 480, y, size: 10, font, color: dark });
        y -= 14;
      }
    }

    // IRS language + signature block
    y = Math.min(y, 200);
    page.drawLine({ start: { x: 40, y }, end: { x: 572, y }, thickness: 0.6, color: gold });
    y -= 16;
    const irsLines = [
      "No goods or services were provided in exchange for this contribution.",
      "This organization is a 501(c)(3) tax-exempt organization.",
      "This receipt is valid for tax purposes and should be retained with your records.",
    ];
    for (const l of irsLines) {
      page.drawText(l, { x: 40, y, size: 9, font, color: dark });
      y -= 12;
    }
    y -= 20;
    page.drawLine({ start: { x: 40, y }, end: { x: 280, y }, thickness: 0.6, color: dark });
    page.drawText("Authorized nonprofit representative", { x: 40, y: y - 12, size: 8, font, color: muted });
    page.drawLine({ start: { x: 320, y }, end: { x: 500, y }, thickness: 0.6, color: dark });
    page.drawText("Date", { x: 320, y: y - 12, size: 8, font, color: muted });

    // Footer band
    page.drawRectangle({ x: 0, y: 0, width: 612, height: 28, color: dark });
    page.drawText("Powered by Hariet.AI · hariet.ai", { x: 40, y: 10, size: 8, font, color: gold });

    const pdfBytes = await pdf.save();

    // Upload
    const receiptId = crypto.randomUUID();
    const path = `${listing.organization_id}/${listing.nonprofit_claimed_id}/${food_listing_id}-${receiptId}.pdf`;
    const { error: upErr } = await admin.storage.from("tax-receipts").upload(path, pdfBytes, {
      contentType: "application/pdf", upsert: false,
    });
    if (upErr) return json({ error: `upload failed: ${upErr.message}` }, 500);

    const { data: inserted, error: insErr } = await admin.from("tax_receipts").insert({
      food_listing_id,
      nonprofit_id: listing.nonprofit_claimed_id,
      venue_organization_id: listing.organization_id,
      receipt_type: "generated",
      pdf_path: path,
      submitted_by: user.id,
    }).select("id").single();
    if (insErr) {
      await admin.storage.from("tax-receipts").remove([path]);
      return json({ error: `insert failed: ${insErr.message}` }, 500);
    }

    return json({ id: inserted.id, pdf_path: path });
  } catch (e) {
    return json({ error: (e as Error).message || "unknown error" }, 500);
  }
});
