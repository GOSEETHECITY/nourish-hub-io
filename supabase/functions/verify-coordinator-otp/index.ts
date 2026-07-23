// TEMPORARY: Coordinator SMS bypass. Remove after Twilio toll-free approval.
// If the submitted code matches COORDINATOR_TEST_OTP, mark the phone as verified
// server-side (create/update the auth user with phone_confirm: true) and return
// a Supabase session so the client can proceed with normal account creation.
// Any other code returns { bypass: false } and the client falls back to the
// standard Twilio verifyOtp flow.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone, code } = await req.json();
    if (!phone || !code) {
      return new Response(JSON.stringify({ error: "Missing phone or code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expected = Deno.env.get("COORDINATOR_TEST_OTP");
    if (!expected || String(code) !== String(expected)) {
      return new Response(JSON.stringify({ bypass: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Supabase stores phone without the leading "+"
    const phoneDigits = String(phone).replace(/^\+/, "");
    const tempPassword = `Cx!${crypto.randomUUID()}Zz9`;

    // Locate an existing auth user by phone.
    let userId: string | null = null;
    let page = 1;
    while (page < 20) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const match = data.users.find((u: any) => u.phone === phoneDigits);
      if (match) {
        userId = match.id;
        break;
      }
      if (data.users.length < 200) break;
      page += 1;
    }

    if (userId) {
      const { error } = await admin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        phone_confirm: true,
      });
      if (error) throw error;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        phone,
        password: tempPassword,
        phone_confirm: true,
      });
      if (error) throw error;
      userId = data.user!.id;
    }

    // Mint a real session using signInWithPassword with the just-set password.
    const anon = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: sess, error: signErr } = await anon.auth.signInWithPassword({
      phone,
      password: tempPassword,
    });
    if (signErr || !sess.session) throw signErr ?? new Error("Failed to mint session");

    return new Response(
      JSON.stringify({
        bypass: true,
        access_token: sess.session.access_token,
        refresh_token: sess.session.refresh_token,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("verify-coordinator-otp error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
