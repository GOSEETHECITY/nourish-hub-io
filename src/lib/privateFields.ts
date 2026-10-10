import { supabase } from "@/integrations/supabase/client";

/**
 * Signed-in users can only read these columns directly. Private fields
 * (contact email/phone, Stripe ID, EIN, insurance/agreement documents) come
 * from secure lookups that return them only to admins and members.
 */
export const ORG_PUBLIC_COLUMNS =
  "id, name, type, primary_contact_name, billing_contact, address, city, state, zip, county, approval_status, created_at, join_code, government_regions, logo_url, business_bio, hours_of_operation, parent_organization_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted, platform_fee_percentage, credentials_sent_at, website_url, marketplace_enabled, is_verified";

export const NONPROFIT_PUBLIC_COLUMNS =
  "id, user_id, organization_name, logo_url, website, social_handles, primary_contact, address, city, state, zip, county, operating_hours, cold_storage, refrigeration, cabinetry, food_types_accepted, estimated_weekly_served, population_served, approval_status, created_at, join_code, credentials_sent_at, primary_contact_name, organization_bio, website_url, is_verified";

export type OrgPrivate = {
  id: string;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  stripe_account_id: string | null;
};

export type NonprofitPrivate = {
  id: string;
  ein: string | null;
  proof_of_insurance_url: string | null;
  signed_agreement_url: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
};

const ORG_EMPTY = { primary_contact_email: null, primary_contact_phone: null, stripe_account_id: null };
const NP_EMPTY = { ein: null, proof_of_insurance_url: null, signed_agreement_url: null, primary_contact_email: null, primary_contact_phone: null };

export async function fetchOrgPrivate(ids: string[]): Promise<Map<string, OrgPrivate>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data, error } = await (supabase.rpc as any)("get_organization_private", { p_ids: unique });
  if (error) { console.warn("get_organization_private failed", error); return new Map(); }
  return new Map(((data ?? []) as OrgPrivate[]).map((r) => [r.id, r]));
}

export async function fetchNonprofitPrivate(ids: string[]): Promise<Map<string, NonprofitPrivate>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const { data, error } = await (supabase.rpc as any)("get_nonprofit_private", { p_ids: unique });
  if (error) { console.warn("get_nonprofit_private failed", error); return new Map(); }
  return new Map(((data ?? []) as NonprofitPrivate[]).map((r) => [r.id, r]));
}

/** Merge private org fields (when the caller is allowed) into rows. */
export async function withOrgPrivate<T extends { id: string }>(rows: T[] | null | undefined): Promise<any[]> {
  const list = rows ?? [];
  const map = await fetchOrgPrivate(list.map((r) => r.id));
  return list.map((r) => ({ ...ORG_EMPTY, ...r, ...(map.get(r.id) ?? {}) }));
}

export async function withNonprofitPrivate<T extends { id: string }>(rows: T[] | null | undefined): Promise<any[]> {
  const list = rows ?? [];
  const map = await fetchNonprofitPrivate(list.map((r) => r.id));
  return list.map((r) => ({ ...NP_EMPTY, ...r, ...(map.get(r.id) ?? {}) }));
}

export async function withOrgPrivateOne<T extends { id: string }>(row: T | null | undefined): Promise<any> {
  if (!row) return row ?? null;
  return (await withOrgPrivate([row]))[0];
}

export async function withNonprofitPrivateOne<T extends { id: string }>(row: T | null | undefined): Promise<any> {
  if (!row) return row ?? null;
  return (await withNonprofitPrivate([row]))[0];
}
