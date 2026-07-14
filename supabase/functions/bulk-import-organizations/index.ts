// Admin-only bulk organization import. Creates org + join code + auth user with a
// canned temp password. Sends NO emails — send-partner-credentials is a separate
// admin-triggered step.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const genJoinCode = () => Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");

interface Row {
  organization_name: string;
  organization_type: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string | number;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  ein?: string;
  parent_organization_id?: string;
  logo_url?: string;
  business_bio?: string;
  website_url?: string;
  marketplace_enabled?: string | boolean;
  stripe_account_id?: string;
  is_verified?: string | boolean;
}

const nullify = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};
const toBool = (v: unknown): boolean | null => {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "") return null;
  if (["true", "1", "yes", "y", "t"].includes(s)) return true;
  if (["false", "0", "no", "n", "f"].includes(s)) return false;
  return null;
};

function parseCSV(text: string): Row[] {
  const lines: string[] = [];
  { // split preserving quoted newlines
    let cur = "", inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') { if (inQ && text[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; cur += c; }
      else if ((c === "\n" || c === "\r") && !inQ) {
        if (c === "\r" && text[i + 1] === "\n") i++;
        if (cur.trim().length) lines.push(cur);
        cur = "";
      } else cur += c;
    }
    if (cur.trim().length) lines.push(cur);
  }
  if (!lines.length) return [];
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === "," && !inQ) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/^\ufeff/, "").replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const row: any = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row as Row;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Accept either { rows: [...] } (legacy) or { csv_text: "..." } or multipart file upload.
    let rows: Row[] = [];
    const contentType = req.headers.get("content-type") || "";
    let csvText: string | null = null;
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (file instanceof File) csvText = await file.text();
    } else {
      const body = await req.json().catch(() => ({} as any));
      if (typeof body?.csv_text === "string") csvText = body.csv_text;
      else if (Array.isArray(body?.rows)) rows = body.rows;
    }
    if (csvText) rows = parseCSV(csvText);
    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "No rows found. Provide csv_text, a file upload, or rows[]." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: Array<{ row: number; organization_name: string; status: "created" | "failed"; id?: string; join_code?: string; reason?: string }> = [];

    // Process nonprofit rows differently from other org types.
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 1;
      try {
        const orgName = String(r.organization_name || "").trim();
        const orgType = String(r.organization_type || "").trim().toLowerCase();
        if (!orgName || !orgType) throw new Error("organization_name and organization_type required");

        const isNonprofit = orgType === "nonprofit";
        const password = isNonprofit ? "HarietGive2026!" : "HarietVenue2026!";
        const email = r.contact_email ? String(r.contact_email).trim().toLowerCase() : null;
        const joinCode = genJoinCode();

        // Resolve parent by UUID or by name (case-insensitive)
        let parentId: string | null = null;
        if (r.parent_organization_id) {
          const val = String(r.parent_organization_id).trim();
          if (/^[0-9a-f-]{36}$/i.test(val)) parentId = val;
          else {
            const normalized = val.replace(/_/g, " ").trim();
            const { data: parent } = await admin.from("organizations").select("id")
              .ilike("name", normalized).maybeSingle();
            if (parent) parentId = parent.id;
          }
        }

        // Create auth user (email confirmed, no email) if email present
        let userId: string | null = null;
        if (email) {
          const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
          // Try create — ignore duplicates
          const { data: created, error: authErr } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              first_name: (r.contact_name || "").split(" ")[0] || "",
              last_name: (r.contact_name || "").split(" ").slice(1).join(" ") || "",
              phone: r.contact_phone || "",
            },
          });
          if (created?.user) {
            userId = created.user.id;
          } else if (authErr && /already been registered|already exists/i.test(authErr.message)) {
            // Look up existing user via profiles
            const { data: prof } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
            userId = prof?.id ?? null;
          } else if (authErr) {
            throw new Error(`Auth: ${authErr.message}`);
          }
        }

        const zip = r.zip_code != null && String(r.zip_code).trim() !== ""
          ? String(r.zip_code).padStart(5, "0").slice(0, 5) : null;

        if (isNonprofit) {
          const { data: np, error: npErr } = await admin.from("nonprofits").insert({
            organization_name: orgName,
            address: nullify(r.address),
            city: nullify(r.city),
            state: nullify(r.state),
            zip,
            ein: nullify(r.ein),
            join_code: joinCode,
            approval_status: "approved",
            primary_contact_name: nullify(r.contact_name),
            primary_contact_email: email,
            primary_contact_phone: nullify(r.contact_phone),
            temp_password_hint: email ? password : null,
            user_id: userId,
            logo_url: nullify(r.logo_url),
            organization_bio: nullify(r.business_bio),
            website_url: nullify(r.website_url),
            is_verified: toBool(r.is_verified) ?? false,
          }).select("id").single();
          if (npErr) throw new Error(npErr.message);

          if (userId) {
            await admin.from("profiles").upsert({ id: userId, email: email!, nonprofit_id: np.id, first_name: (r.contact_name || "").split(" ")[0] || "", last_name: (r.contact_name || "").split(" ").slice(1).join(" ") || "", phone: r.contact_phone || null });
            await admin.from("user_roles").upsert({ user_id: userId, role: "nonprofit_partner" }, { onConflict: "user_id,role" });
          }
          results.push({ row: rowNum, organization_name: orgName, status: "created", id: np.id, join_code: joinCode });
        } else {
          const { data: org, error: orgErr } = await admin.from("organizations").insert({
            name: orgName,
            type: orgType,
            address: nullify(r.address),
            city: nullify(r.city),
            state: nullify(r.state),
            zip,
            join_code: joinCode,
            approval_status: "approved",
            parent_organization_id: parentId,
            primary_contact_name: nullify(r.contact_name),
            primary_contact_email: email,
            primary_contact_phone: nullify(r.contact_phone),
            temp_password_hint: email ? password : null,
            logo_url: nullify(r.logo_url),
            business_bio: nullify(r.business_bio),
            website_url: nullify(r.website_url),
            marketplace_enabled: toBool(r.marketplace_enabled) ?? false,
            stripe_account_id: nullify(r.stripe_account_id),
            is_verified: toBool(r.is_verified) ?? false,
          }).select("id").single();
          if (orgErr) throw new Error(`${orgErr.message} (valid types: restaurant, cafe, catering_company, event, hotel, convention_center, stadium, arena, farm, grocery_store, food_truck, airport, festival, resort, food_beverage_group, hospitality_group, venue_events_group, farm_grocery_group, franchise, municipal_government, county_government, state_government, government_entity, nonprofit_organization)`);

          if (userId) {
            await admin.from("profiles").upsert({ id: userId, email: email!, organization_id: org.id, first_name: (r.contact_name || "").split(" ")[0] || "", last_name: (r.contact_name || "").split(" ").slice(1).join(" ") || "", phone: r.contact_phone || null });
            await admin.from("user_roles").upsert({ user_id: userId, role: "venue_partner" }, { onConflict: "user_id,role" });
          }
          results.push({ row: rowNum, organization_name: orgName, status: "created", id: org.id, join_code: joinCode });
        }
      } catch (e: any) {
        results.push({ row: rowNum, organization_name: r.organization_name || "?", status: "failed", reason: e?.message || String(e) });
      }
    }

    const created = results.filter((r) => r.status === "created").length;
    return new Response(JSON.stringify({ total: rows.length, created, failed: rows.length - created, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
