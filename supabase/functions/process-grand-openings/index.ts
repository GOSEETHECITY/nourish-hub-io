import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CsvRow {
  event_name: string;
  source_description: string;
  date: string;
  time: string;
  location: string;
  organization_id: string;
  source_type: string;
  flyer_image_url: string;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h.trim()] = (values[i] || "").trim()));
    return row as unknown as CsvRow;
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

async function rewriteDescription(
  row: CsvRow,
  apiKey: string,
): Promise<string | null> {
  const prompt = `You are rewriting event descriptions for a mobile event discovery app (like Eventbrite).

Input:
- Event Name: ${row.event_name}
- Original Description: ${row.source_description}
- Date: ${row.date}
- Time: ${row.time}
- Location: ${row.location}

Task: Rewrite the source_description into a compelling, mobile-friendly event description (2-4 sentences max). 

Style:
- Eventbrite-like tone (friendly, exciting, direct)
- Structure: WHO (organizer/business), WHAT (event type/activity), WHEN (date/time), WHERE (location if not obvious), WHY (what they'll get or experience)
- If the business name isn't already in the description, include it
- Remove press release jargon, redundancy, corporate language
- Highlight the offer or main draw
- Keep it punchy — mobile users scan, not read

Output only the rewritten description text, nothing else.`;

  const resp = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
      }),
    },
  );
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function generateFlyerImage(
  row: CsvRow,
  description: string,
  apiKey: string,
): Promise<{ url: string | null; retryable: boolean; error?: string }> {
  const prompt = `Create a vibrant, eye-catching event flyer for mobile app.

Event: ${row.event_name}
Description: ${description}
Date: ${row.date}
Time: ${row.time}
Location: ${row.location}

Style: Make it visually appealing and mobile-friendly. Include the event name prominently, the date/time, the main offer or activity, and location. Use bright, inviting colors. This is for a food discovery and community events app. Make users want to tap and learn more.`;

  const resp = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    },
  );

  if (resp.status === 429) {
    return { url: null, retryable: true, error: "Rate limited (429)" };
  }
  if (!resp.ok) {
    const t = await resp.text();
    return { url: null, retryable: false, error: `AI error ${resp.status}: ${t}` };
  }

  const data = await resp.json();
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageUrl) {
    return { url: null, retryable: false, error: "No image returned" };
  }

  // Upload base64 image to events storage bucket
  const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
  const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  const path = `generated/${crypto.randomUUID()}.png`;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  const { error } = await sb.storage.from("events").upload(path, bytes, {
    contentType: "image/png",
  });
  if (error) {
    return { url: null, retryable: false, error: `Storage upload: ${error.message}` };
  }

  const { data: urlData } = sb.storage.from("events").getPublicUrl(path);
  return { url: urlData.publicUrl, retryable: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("LOVABLE_API_KEY");

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const sb = createClient(supabaseUrl, serviceKey);
  const batchId = crypto.randomUUID().slice(0, 8);
  const results: Array<{ event_name: string; status: string; error?: string }> = [];

  try {
    // Check for manual retry_pending param
    const url = new URL(req.url);
    const retryPending = url.searchParams.get("retry_pending") === "true";

    if (retryPending) {
      // Retry pending_image_retry entries
      const { data: pending } = await sb
        .from("import_logs")
        .select("*")
        .eq("status", "pending_image_retry");

      if (pending && pending.length > 0) {
        for (const log of pending) {
          const imgResult = await generateFlyerImage(
            { event_name: log.event_name, source_description: "", date: "", time: "", location: "", organization_id: "", source_type: "", flyer_image_url: "" },
            "",
            apiKey,
          );

          if (imgResult.url) {
            // Create event now
            const { data: evt } = await sb.from("events").insert({
              title: log.event_name,
              description: log.error_message?.replace("Pending image retry - desc: ", "") || "",
              image_url: imgResult.url,
              flyer_url: imgResult.url,
              status: "draft",
              county: "",
              created_from_import: true,
              import_batch_id: log.batch_id,
            }).select("id").single();

            await sb.from("import_logs").update({
              status: "success",
              error_message: null,
              created_event_id: evt?.id || null,
              processed_at: new Date().toISOString(),
            }).eq("id", log.id);
          }
        }
      }

      return new Response(
        JSON.stringify({ message: "Retry complete" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // List CSV files in grand-openings/incoming/
    const { data: files } = await sb.storage
      .from("grand-openings")
      .list("incoming", { limit: 100 });

    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify({ message: "No CSVs to process", batch_id: batchId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const csvFiles = files.filter((f) => f.name.endsWith(".csv"));

    for (const file of csvFiles) {
      const filePath = `incoming/${file.name}`;
      const { data: fileData } = await sb.storage
        .from("grand-openings")
        .download(filePath);

      if (!fileData) {
        results.push({ event_name: file.name, status: "error", error: "Could not download CSV" });
        continue;
      }

      const csvText = await fileData.text();
      const rows = parseCsv(csvText);

      for (const row of rows) {
        if (!row.event_name) {
          results.push({ event_name: "(empty)", status: "skipped", error: "No event_name" });
          continue;
        }

        // Step 1: Rewrite description with AI
        const rewritten = await rewriteDescription(row, apiKey);
        if (!rewritten) {
          await sb.from("import_logs").insert({
            batch_id: batchId,
            event_name: row.event_name,
            status: "skipped",
            error_message: "Claude description rewrite failed",
            csv_filename: file.name,
          });
          results.push({ event_name: row.event_name, status: "skipped", error: "Description rewrite failed" });
          continue;
        }

        // Step 2: Determine flyer image
        let flyerUrl: string | null = null;

        if (row.flyer_image_url && row.flyer_image_url.trim()) {
          flyerUrl = row.flyer_image_url.trim();
        } else {
          const imgResult = await generateFlyerImage(row, rewritten, apiKey);

          if (imgResult.retryable) {
            // Rate limited - mark for retry
            await sb.from("import_logs").insert({
              batch_id: batchId,
              event_name: row.event_name,
              status: "pending_image_retry",
              error_message: `Pending image retry - desc: ${rewritten}`,
              csv_filename: file.name,
            });
            results.push({ event_name: row.event_name, status: "pending_image_retry", error: imgResult.error });
            continue;
          }

          if (!imgResult.url) {
            await sb.from("import_logs").insert({
              batch_id: batchId,
              event_name: row.event_name,
              status: "error",
              error_message: imgResult.error || "Image generation failed",
              csv_filename: file.name,
            });
            results.push({ event_name: row.event_name, status: "error", error: imgResult.error });
            continue;
          }

          flyerUrl = imgResult.url;
        }

        // Step 3: Parse date/time
        let eventDate: string | null = null;
        let startTime: string | null = null;
        if (row.date) {
          const parsed = new Date(row.date);
          if (!isNaN(parsed.getTime())) {
            eventDate = parsed.toISOString().split("T")[0];
          }
        }
        if (row.time) {
          // Convert "10:00 AM" → "10:00"
          const match = row.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
          if (match) {
            let h = parseInt(match[1]);
            const m = match[2];
            const ampm = match[3];
            if (ampm?.toUpperCase() === "PM" && h !== 12) h += 12;
            if (ampm?.toUpperCase() === "AM" && h === 12) h = 0;
            startTime = `${h.toString().padStart(2, "0")}:${m}`;
          }
        }

        // Step 4: Create event
        const { data: evt, error: evtError } = await sb.from("events").insert({
          title: row.event_name,
          description: rewritten,
          event_date: eventDate,
          start_time: startTime,
          address: row.location || null,
          image_url: flyerUrl,
          flyer_url: flyerUrl,
          status: "draft",
          county: "",
          ai_generated_description: true,
          created_from_import: true,
          source_type: row.source_type || null,
          import_batch_id: batchId,
        }).select("id").single();

        if (evtError) {
          await sb.from("import_logs").insert({
            batch_id: batchId,
            event_name: row.event_name,
            status: "error",
            error_message: `Event insert: ${evtError.message}`,
            csv_filename: file.name,
          });
          results.push({ event_name: row.event_name, status: "error", error: evtError.message });
          continue;
        }

        // Set share_url
        if (evt) {
          await sb.from("events").update({ share_url: `/event-preview/${evt.id}` }).eq("id", evt.id);
        }

        await sb.from("import_logs").insert({
          batch_id: batchId,
          event_name: row.event_name,
          status: "success",
          csv_filename: file.name,
          created_event_id: evt?.id || null,
        });
        results.push({ event_name: row.event_name, status: "success" });
      }

      // Move CSV to processed/
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const destPath = `processed/${file.name.replace(".csv", "")}_${timestamp}.csv`;

      // Download then upload to new path, then delete original
      const { data: moveSrc } = await sb.storage.from("grand-openings").download(filePath);
      if (moveSrc) {
        const bytes = new Uint8Array(await moveSrc.arrayBuffer());
        await sb.storage.from("grand-openings").upload(destPath, bytes, { contentType: "text/csv" });
        await sb.storage.from("grand-openings").remove([filePath]);
      }
    }

    const summary = {
      batch_id: batchId,
      total_rows: results.length,
      successful: results.filter((r) => r.status === "success").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      pending_image_retry: results.filter((r) => r.status === "pending_image_retry").length,
      errors: results.filter((r) => r.status === "error").length,
      processed_at: new Date().toISOString(),
      details: results,
    };

    console.log("Import batch summary:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Grand opening import error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
