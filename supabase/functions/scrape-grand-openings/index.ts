import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ScrapedEvent {
  event_name: string;
  source_description: string;
  date: string;
  time: string;
  location: string;
  source_url: string;
  source_type: string;
}

/* ------------------------------------------------------------------ */
/*  CONFIG – nationwide search across major US metros                  */
/* ------------------------------------------------------------------ */
const TARGET_REGIONS = [
  // Northeast
  "New York NY",
  "Boston MA",
  "Philadelphia PA",
  "Washington DC",
  // Southeast
  "Atlanta GA",
  "Miami FL",
  "Orlando FL",
  "Charlotte NC",
  "Nashville TN",
  // Midwest
  "Chicago IL",
  "Detroit MI",
  "Minneapolis MN",
  "Columbus OH",
  // South / Southwest
  "Houston TX",
  "Dallas TX",
  "Austin TX",
  "Phoenix AZ",
  "Denver CO",
  // West
  "Los Angeles CA",
  "San Francisco Bay Area CA",
  "San Diego CA",
  "Seattle WA",
  "Portland OR",
  "Las Vegas NV",
];

const SEARCH_QUERIES = [
  "grand opening restaurant {region}",
  "new restaurant opening {region}",
  "grand opening food {region}",
  "new business grand opening {region} this week",
  "grand opening celebration {region}",
];

/* ------------------------------------------------------------------ */
/*  AI-POWERED WEB SEARCH + EXTRACTION                                */
/*  Uses Gemini with grounding (Google Search) to find grand openings  */
/* ------------------------------------------------------------------ */
async function searchAndExtractGrandOpenings(
  apiKey: string,
  region: string,
): Promise<ScrapedEvent[]> {
  const today = new Date();
  const twoWeeksOut = new Date(today);
  twoWeeksOut.setDate(today.getDate() + 14);
  const dateRange = `${today.toISOString().split("T")[0]} to ${twoWeeksOut.toISOString().split("T")[0]}`;

  const prompt = `You are a research assistant finding grand opening events for a food and community events app.

Search the internet for grand openings and new business openings happening in or near: ${region}
Date range: ${dateRange} (today through 2 weeks from now)

Focus on:
- Restaurant grand openings
- Food establishment openings (cafes, bakeries, food halls, food trucks)
- Bar and brewery openings
- Grocery store or market openings
- Any business grand opening that involves food/drinks or community celebration

For each event you find, extract:
1. event_name: The name of the event (e.g., "Grand Opening - Chick-fil-A Lake Nona")
2. source_description: A brief description of the event (what's happening, any specials, giveaways, etc.)
3. date: The event date in YYYY-MM-DD format. If only a month is mentioned, use the 1st. If "this weekend", calculate the actual date.
4. time: The event time (e.g., "10:00 AM"). If unknown, use "TBD"
5. location: Full address or location name
6. source_url: The URL where you found this information
7. source_type: One of: "google_search", "news_article", "social_media", "press_release", "business_listing"

IMPORTANT RULES:
- Only include events that are UPCOMING (today or future), not past events
- Only include events in or very near ${region}
- If you cannot find any events, return an empty array
- Be accurate — do not fabricate events. Only return events you actually found.
- Today's date is ${today.toISOString().split("T")[0]}

Return your response as a JSON array of objects with the exact fields listed above.
Return ONLY the JSON array, no markdown, no explanation, no code fences.
If no events found, return: []`;

  try {
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

    if (!resp.ok) {
      console.error(`AI search failed for ${region}: ${resp.status}`);
      return [];
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return [];

    // Parse JSON response — handle potential markdown code fences
    let cleaned = content;
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: any) => ({
      event_name: String(item.event_name || "").trim(),
      source_description: String(item.source_description || "").trim(),
      date: String(item.date || "").trim(),
      time: String(item.time || "TBD").trim(),
      location: String(item.location || "").trim(),
      source_url: String(item.source_url || "").trim(),
      source_type: String(item.source_type || "google_search").trim(),
    }));
  } catch (err) {
    console.error(`Search/parse error for ${region}:`, err);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  DEDUPLICATION                                                      */
/*  Check against existing events to avoid creating duplicates         */
/* ------------------------------------------------------------------ */
async function isDuplicate(
  sb: ReturnType<typeof createClient>,
  event: ScrapedEvent,
): Promise<boolean> {
  // Check by title similarity (exact match or close)
  const { data } = await sb
    .from("events")
    .select("id, title")
    .ilike("title", `%${event.event_name.replace(/[%_]/g, "")}%`)
    .limit(5);

  if (data && data.length > 0) {
    // Check for exact or near-exact match
    const normalizedNew = event.event_name.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const existing of data) {
      const normalizedExisting = existing.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normalizedNew === normalizedExisting) return true;
      // Check if one contains the other (catches "Grand Opening - X" vs "X Grand Opening")
      if (normalizedNew.includes(normalizedExisting) || normalizedExisting.includes(normalizedNew)) return true;
    }
  }

  // Also check import_logs to avoid re-scraping same event
  const { data: logData } = await sb
    .from("import_logs")
    .select("id")
    .ilike("event_name", `%${event.event_name.replace(/[%_]/g, "")}%`)
    .limit(1);

  return (logData && logData.length > 0) || false;
}

/* ------------------------------------------------------------------ */
/*  AI DESCRIPTION REWRITE                                             */
/* ------------------------------------------------------------------ */
async function rewriteDescription(
  event: ScrapedEvent,
  apiKey: string,
): Promise<string | null> {
  const prompt = `You are rewriting event descriptions for a mobile event discovery app (like Eventbrite).

Input:
- Event Name: ${event.event_name}
- Original Description: ${event.source_description}
- Date: ${event.date}
- Time: ${event.time}
- Location: ${event.location}

Task: Rewrite into a compelling, mobile-friendly event description (2-4 sentences max).

Style:
- Eventbrite-like tone (friendly, exciting, direct)
- Structure: WHO, WHAT, WHEN, WHERE, WHY (what they'll experience)
- Remove press release jargon, redundancy, corporate language
- Highlight the offer or main draw
- Keep it punchy — mobile users scan, not read

Output only the rewritten description text, nothing else.`;

  try {
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
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  AI FLYER IMAGE GENERATION                                          */
/* ------------------------------------------------------------------ */
async function generateFlyerImage(
  event: ScrapedEvent,
  description: string,
  apiKey: string,
): Promise<{ url: string | null; retryable: boolean; error?: string }> {
  const prompt = `Create a vibrant, eye-catching event flyer for a mobile app.

Event: ${event.event_name}
Description: ${description}
Date: ${event.date}
Time: ${event.time}
Location: ${event.location}

Style: Visually appealing, mobile-friendly. Include the event name prominently, date/time, main offer, and location. Use bright, inviting colors. This is for a food discovery and community events app.`;

  try {
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

    // Upload base64 image to storage
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
  } catch (err) {
    return { url: null, retryable: false, error: `Exception: ${err}` };
  }
}

/* ------------------------------------------------------------------ */
/*  MAIN HANDLER                                                       */
/* ------------------------------------------------------------------ */
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
  const batchId = `scrape-${crypto.randomUUID().slice(0, 8)}`;
  const results: Array<{ event_name: string; status: string; error?: string; region?: string }> = [];

  try {
    console.log(`[${batchId}] Starting grand opening web scrape...`);

    // Step 1: Search each region for grand openings
    const allEvents: Array<ScrapedEvent & { region: string }> = [];

    for (const region of TARGET_REGIONS) {
      console.log(`[${batchId}] Searching: ${region}`);
      const found = await searchAndExtractGrandOpenings(apiKey, region);
      console.log(`[${batchId}] Found ${found.length} events in ${region}`);

      for (const event of found) {
        if (event.event_name) {
          allEvents.push({ ...event, region });
        }
      }

      // Small delay between regions to avoid rate limiting
      await new Promise((r) => setTimeout(r, 1000));
    }

    console.log(`[${batchId}] Total scraped events: ${allEvents.length}`);

    if (allEvents.length === 0) {
      // Log that scraper ran but found nothing
      await sb.from("import_logs").insert({
        batch_id: batchId,
        event_name: "(scraper: no events found)",
        status: "skipped",
        error_message: `Searched ${TARGET_REGIONS.length} regions, no upcoming grand openings found`,
        csv_filename: "web-scraper",
      });

      return new Response(
        JSON.stringify({
          batch_id: batchId,
          message: "Scrape complete, no new events found",
          regions_searched: TARGET_REGIONS.length,
          source: "web-scraper",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 2: Deduplicate and process each event
    for (const event of allEvents) {
      // Check for duplicates
      const duplicate = await isDuplicate(sb, event);
      if (duplicate) {
        console.log(`[${batchId}] Skipping duplicate: ${event.event_name}`);
        results.push({ event_name: event.event_name, status: "skipped", error: "Duplicate", region: event.region });
        continue;
      }

      // Rewrite description with AI
      const rewritten = await rewriteDescription(event, apiKey);
      if (!rewritten) {
        await sb.from("import_logs").insert({
          batch_id: batchId,
          event_name: event.event_name,
          status: "skipped",
          error_message: "Description rewrite failed",
          csv_filename: "web-scraper",
        });
        results.push({ event_name: event.event_name, status: "skipped", error: "Description rewrite failed", region: event.region });
        continue;
      }

      // Generate flyer image
      const imgResult = await generateFlyerImage(event, rewritten, apiKey);

      if (imgResult.retryable) {
        await sb.from("import_logs").insert({
          batch_id: batchId,
          event_name: event.event_name,
          status: "pending_image_retry",
          error_message: `Pending image retry - desc: ${rewritten}`,
          csv_filename: "web-scraper",
        });
        results.push({ event_name: event.event_name, status: "pending_image_retry", error: imgResult.error, region: event.region });
        continue;
      }

      const flyerUrl = imgResult.url; // May be null if image gen failed — event still gets created

      // Parse date
      let eventDate: string | null = null;
      if (event.date) {
        const parsed = new Date(event.date);
        if (!isNaN(parsed.getTime())) {
          eventDate = parsed.toISOString().split("T")[0];
        }
      }

      // Parse time
      let startTime: string | null = null;
      if (event.time && event.time !== "TBD") {
        const match = event.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (match) {
          let h = parseInt(match[1]);
          const m = match[2];
          const ampm = match[3];
          if (ampm?.toUpperCase() === "PM" && h !== 12) h += 12;
          if (ampm?.toUpperCase() === "AM" && h === 12) h = 0;
          startTime = `${h.toString().padStart(2, "0")}:${m}`;
        }
      }

      // Create event
      const { data: evt, error: evtError } = await sb.from("events").insert({
        title: event.event_name,
        description: rewritten,
        event_date: eventDate,
        start_time: startTime,
        address: event.location || null,
        image_url: flyerUrl,
        flyer_url: flyerUrl,
        status: "draft",
        county: "",
        ai_generated_description: true,
        created_from_import: true,
        source_type: event.source_type || "web-scraper",
        import_batch_id: batchId,
      }).select("id").single();

      if (evtError) {
        await sb.from("import_logs").insert({
          batch_id: batchId,
          event_name: event.event_name,
          status: "error",
          error_message: `Event insert: ${evtError.message}`,
          csv_filename: "web-scraper",
        });
        results.push({ event_name: event.event_name, status: "error", error: evtError.message, region: event.region });
        continue;
      }

      // Set share_url
      if (evt) {
        await sb.from("events").update({ share_url: `/event-preview/${evt.id}` }).eq("id", evt.id);
      }

      await sb.from("import_logs").insert({
        batch_id: batchId,
        event_name: event.event_name,
        status: "success",
        csv_filename: "web-scraper",
        created_event_id: evt?.id || null,
      });
      results.push({ event_name: event.event_name, status: "success", region: event.region });

      // Delay between events to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    }

    const summary = {
      batch_id: batchId,
      source: "web-scraper",
      regions_searched: TARGET_REGIONS.length,
      total_found: allEvents.length,
      successful: results.filter((r) => r.status === "success").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      pending_image_retry: results.filter((r) => r.status === "pending_image_retry").length,
      errors: results.filter((r) => r.status === "error").length,
      processed_at: new Date().toISOString(),
      details: results,
    };

    console.log(`[${batchId}] Scrape summary:`, JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`[${batchId}] Scraper error:`, err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error", batch_id: batchId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
