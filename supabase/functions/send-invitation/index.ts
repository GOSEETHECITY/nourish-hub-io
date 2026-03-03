import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InvitationPayload {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  /** "organization" | "location" */
  level: "organization" | "location";
  /** The org/location name shown in the email */
  entity_name: string;
  /** ID of the org or location to link the user to */
  entity_id: string;
  /** "venue" | "nonprofit" */
  entity_type: "venue" | "nonprofit";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller has admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: InvitationPayload = await req.json();
    const { email, first_name, last_name, role, level, entity_name, entity_id, entity_type } = payload;

    if (!email || !first_name || !last_name || !entity_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existing } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let action: string;

    if (existing) {
      // Link existing user
      const updateData: Record<string, string> = {};
      if (level === "organization") {
        updateData[entity_type === "nonprofit" ? "nonprofit_id" : "organization_id"] = entity_id;
      } else {
        updateData[entity_type === "nonprofit" ? "nonprofit_location_id" : "location_id"] = entity_id;
      }
      const { error } = await adminClient.from("profiles").update(updateData).eq("id", existing.id);
      if (error) throw error;
      action = "linked";
    } else {
      action = "invited";
    }

    // Send invitation email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const roleLabel = role.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    const levelLabel = level === "organization" ? "Organization" : "Location";
    const setupUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "#";

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c1803; font-size: 24px; margin: 0;">HarietAI</h1>
        </div>
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px;">
          <h2 style="color: #2c1803; font-size: 20px; margin-top: 0;">You've been invited!</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Hi ${first_name},
          </p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            You've been invited to join <strong>${entity_name}</strong> as a <strong>${roleLabel}</strong> (${levelLabel} level) on the HarietAI platform.
          </p>
          ${action === "linked"
            ? `<p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Your existing account has been linked. You can log in to access your new ${levelLabel.toLowerCase()} dashboard.</p>`
            : `<p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Click the button below to set up your account and get started.</p>
               <div style="text-align: center; margin: 30px 0;">
                 <a href="${setupUrl}/signup" style="background-color: #2c1803; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Set Up Your Account</a>
               </div>`
          }
          <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
          © ${new Date().getFullYear()} HarietAI. All rights reserved.
        </p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HarietAI <onboarding@resend.dev>",
        to: [email],
        subject: `You've been invited to join ${entity_name} on HarietAI`,
        html: emailHtml,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      throw new Error(`Email send failed [${resendRes.status}]: ${JSON.stringify(resendData)}`);
    }

    return new Response(
      JSON.stringify({ success: true, action, email_id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("send-invitation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
