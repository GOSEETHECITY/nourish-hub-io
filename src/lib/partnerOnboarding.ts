import { supabase } from "@/integrations/supabase/client";

export type OrgKind = "venue" | "nonprofit" | "one_time_event";
export type AppStatus = "draft" | "applied" | "verifying" | "pending_review" | "active" | "suspended" | "rejected";

export const STATUS_LABEL: Record<AppStatus, string> = {
  draft: "Draft", applied: "Applied", verifying: "Verifying", pending_review: "Pending review",
  active: "Active", suspended: "Suspended", rejected: "Needs changes",
};
export const KIND_LABEL: Record<OrgKind, string> = { venue: "Venue / business", nonprofit: "Nonprofit", one_time_event: "One-time event" };

async function call<T = any>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* keep message */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const onboardingApi = (action: string, body: Record<string, unknown> = {}) => call("partner-onboarding", { action, ...body });
export const onboardingAdminApi = (action: string, body: Record<string, unknown> = {}) => call("partner-onboarding-admin", { action, ...body });

export async function uploadPartnerDocument(token: string | null, file: File, docType: string, expiresOn: string | null) {
  const base = token ? { token } : {};
  const { path, token: uploadToken } = await onboardingApi("doc_upload_url", { ...base, file_name: file.name, renewal: true });
  const { error } = await supabase.storage.from("partner-documents").uploadToSignedUrl(path, uploadToken, file);
  if (error) throw error;
  await onboardingApi("doc_register", { ...base, path, file_name: file.name, doc_type: docType, expires_on: expiresOn });
}
