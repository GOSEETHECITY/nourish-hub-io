import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Validation helpers
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

function validatePhone(phone: string): boolean {
  if (!phone) return true; // optional
  return /^[\d\s\-\+\(\)\.]{7,20}$/.test(phone);
}

function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 128) return "Password must be less than 128 characters";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  return null;
}

function sanitizeString(val: unknown, maxLen = 255): string | null {
  if (typeof val !== "string") return "";
  const trimmed = val.trim();
  if (trimmed.length > maxLen) return null; // reject instead of truncate
  return trimmed;
}

function validateUrl(url: string): boolean {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);
}

function validateRequired(obj: Record<string, unknown>, fields: string[]): string | null {
  for (const f of fields) {
    const v = obj[f];
    if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
      return `Missing required field: ${f}`;
    }
  }
  return null;
}

const VALID_ORG_TYPES = [
  "restaurant", "catering_company", "event", "hotel", "convention_center",
  "stadium", "arena", "farm", "grocery_store", "food_truck",
  "airport", "festival", "municipal_government", "county_government",
  "state_government", "resort", "cafe",
];

const VALID_FOOD_TYPES = [
  "prepared_meals", "produce", "dairy", "meat_protein", "baked_goods", "shelf_stable", "frozen",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { signup_type } = payload;

    if (!["venue", "nonprofit", "government", "join"].includes(signup_type)) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid signup type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const errors: string[] = [];

    // Common account validation
    const account = payload.account || {};
    const firstName = sanitizeString(account.firstName, 100);
    const lastName = sanitizeString(account.lastName, 100);
    const email = sanitizeString(account.email, 255);
    const phone = sanitizeString(account.phone, 20);
    const password = typeof account.password === "string" ? account.password : "";

    if (firstName === null) errors.push("First name is too long (max 100 characters)");
    else if (!firstName) errors.push("First name is required");
    if (lastName === null) errors.push("Last name is too long (max 100 characters)");
    else if (!lastName) errors.push("Last name is required");
    if (email === null) errors.push("Email is too long (max 255 characters)");
    else if (!email) errors.push("Email is required");
    else if (!validateEmail(email)) errors.push("Invalid email format");
    if (phone === null) errors.push("Phone is too long (max 20 characters)");
    else if (phone && !validatePhone(phone)) errors.push("Invalid phone format");

    const pwError = validatePassword(password);
    if (pwError) errors.push(pwError);

    if (account.password !== account.confirmPassword) {
      errors.push("Passwords do not match");
    }

    // Type-specific validation
    if (signup_type === "venue") {
      const org = payload.org || {};
      if (!sanitizeString(org.name, 200)) errors.push("Organization name is required");
      if (!sanitizeString(org.type, 50)) errors.push("Organization type is required");
      else if (!VALID_ORG_TYPES.includes(org.type)) errors.push("Invalid organization type");

      const loc = payload.loc || {};
      if (!sanitizeString(loc.name, 200)) errors.push("Location name is required");

      if (org.contactEmail && !validateEmail(org.contactEmail)) errors.push("Invalid contact email");
      if (org.contactPhone && !validatePhone(org.contactPhone)) errors.push("Invalid contact phone");
    }

    if (signup_type === "nonprofit") {
      const org = payload.org || {};
      if (!sanitizeString(org.name, 200)) errors.push("Organization name is required");

      const loc = payload.loc || {};
      if (!sanitizeString(loc.name, 200)) errors.push("Distribution location name is required");

      if (org.contactEmail && !validateEmail(org.contactEmail)) errors.push("Invalid contact email");
      if (org.contactPhone && !validatePhone(org.contactPhone)) errors.push("Invalid contact phone");
      if (org.website && !validateUrl(org.website)) errors.push("Invalid website URL");
      if (org.socialHandles && typeof org.socialHandles === "string" && org.socialHandles.length > 500) errors.push("Social handles too long (max 500 characters)");

      // Validate food types if provided
      const capacity = payload.capacity || {};
      if (Array.isArray(capacity.foodTypes)) {
        for (const ft of capacity.foodTypes) {
          if (!VALID_FOOD_TYPES.includes(ft)) {
            errors.push(`Invalid food type: ${ft}`);
          }
        }
      }

      if (capacity.weeklyServed && isNaN(parseInt(capacity.weeklyServed))) {
        errors.push("Weekly served must be a number");
      }
    }

    if (signup_type === "government") {
      const gov = payload.gov || {};
      if (!sanitizeString(gov.name, 200)) errors.push("Organization name is required");
      if (!sanitizeString(gov.type, 50)) errors.push("Government type is required");
      else if (!["municipal_government", "county_government", "state_government"].includes(gov.type)) {
        errors.push("Invalid government type");
      }
      if (gov.contactEmail && !validateEmail(gov.contactEmail)) errors.push("Invalid contact email");
      if (gov.contactPhone && !validatePhone(gov.contactPhone)) errors.push("Invalid contact phone");
    }

    if (signup_type === "join") {
      const joinCode = sanitizeString(payload.joinCode, 20);
      if (!joinCode) errors.push("Join code is required");

      const orgType = payload.orgType; // "venue" or "nonprofit"
      if (!["venue", "nonprofit"].includes(orgType)) errors.push("Invalid organization type for join");

      if (orgType === "venue") {
        const loc = payload.loc || {};
        if (!sanitizeString(loc.name, 200)) errors.push("Location name is required");
      } else if (orgType === "nonprofit") {
        const loc = payload.loc || {};
        if (!sanitizeString(loc.name, 200)) errors.push("Location name is required");
      }
    }

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ valid: false, errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Validation failed";
    return new Response(
      JSON.stringify({ valid: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
