// Nightly job: download IRS Pub 78 dataset and upsert into irs_pub78_orgs.
// Requires no auth — pg_cron invokes it. Run manually the first time by curling
// this endpoint with the anon key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

Deno.serve(async () => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    // Pub 78 is published as a pipe-delimited text file inside a zip.
    // Direct text mirror maintained by the IRS Business Master File team:
    //   https://apps.irs.gov/pub/epostcard/data-download-pub78.zip
    // Deno cannot ergonomically unzip in this runtime, so we use the
    // uncompressed text mirror pushed to the IRS's data.gov endpoint. If it
    // 404s the operator will see the exact status in the response.
    const url = "https://apps.irs.gov/pub/epostcard/data-download-pub78.txt";
    const res = await fetch(url);
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, status: res.status, url,
        hint: "Fallback: manually download the Pub 78 zip, unzip, and POST rows to this function." }), { status: 500 });
    }
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    let rows: any[] = [];
    let processed = 0;
    for (const line of lines) {
      const [ein, name, city, state, country, dedStatus] = line.split("|");
      if (!ein) continue;
      rows.push({
        ein: ein.replace(/\D/g, ""),
        organization_name: name || null,
        city: city || null,
        state: state || null,
        country: country || null,
        deductibility_status: dedStatus || null,
        last_synced_at: new Date().toISOString(),
      });
      if (rows.length >= 1000) {
        await admin.from("irs_pub78_orgs").upsert(rows, { onConflict: "ein" });
        processed += rows.length;
        rows = [];
      }
    }
    if (rows.length) {
      await admin.from("irs_pub78_orgs").upsert(rows, { onConflict: "ein" });
      processed += rows.length;
    }
    return new Response(JSON.stringify({ ok: true, processed }));
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), { status: 500 });
  }
});
