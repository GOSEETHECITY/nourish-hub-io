// Creates (or retrieves) a Stripe Connect Express account for the caller's
// organization and returns an Account Link URL for onboarding.
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret, stripe-signature" };

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
  const userId = claims?.claims?.sub;
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { data: profile } = await admin.from("profiles").select("organization_id").eq("id", userId).maybeSingle();
    if (!profile?.organization_id) throw new Error("No organization for user");

    const { data: org } = await admin.from("organizations")
      .select("id, name, stripe_account_id, primary_contact_email")
      .eq("id", profile.organization_id).single();

    let accountId = org.stripe_account_id as string | null;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: org.primary_contact_email ?? undefined,
        business_type: "company",
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        metadata: { organization_id: org.id },
      });
      accountId = account.id;
      await admin.from("organizations").update({ stripe_account_id: accountId }).eq("id", org.id);
    }

    const url = new URL(req.url);
    const origin = req.headers.get("origin") ?? `${url.protocol}//${url.host}`;
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/venue/settings?stripe=refresh`,
      return_url: `${origin}/venue/settings?stripe=return`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: link.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stripe-connect-onboard", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
