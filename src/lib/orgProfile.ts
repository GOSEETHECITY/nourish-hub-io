import { supabase } from "@/integrations/supabase/client";

export type HoursDay = { open: string; close: string; closed: boolean };
export type HoursOfOperation = Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  HoursDay
>;

export const DAY_KEYS: (keyof HoursOfOperation)[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABELS: Record<keyof HoursOfOperation, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};

export const defaultHours = (): HoursOfOperation =>
  DAY_KEYS.reduce((acc, k) => {
    acc[k] = { open: "09:00", close: "17:00", closed: k === "sun" };
    return acc;
  }, {} as HoursOfOperation);

// Basic RFC-5322-ish email + simple E.164-friendly phone check.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts +1 555-123-4567, (555) 123-4567, 5551234567 etc. 7-15 digits.
export const PHONE_RE = /^[+]?[\d\s().-]{7,20}$/;

export const isValidEmail = (v: string) => EMAIL_RE.test(v.trim());
export const isValidPhone = (v: string) => {
  const digits = v.replace(/\D/g, "");
  return PHONE_RE.test(v.trim()) && digits.length >= 7 && digits.length <= 15;
};

// Logos live in the private `organization-logos` bucket at path `<orgId>/<file>`.
// We store the storage PATH in organizations.logo_url and resolve to a
// signed URL for display. Signed URLs expire; we default to 1 hour and
// refresh in the component.
export async function getLogoSignedUrl(path: string | null | undefined, expiresIn = 3600) {
  if (!path) return null;
  // If a full URL is already stored (legacy), return it as-is.
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage
    .from("organization-logos")
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}
