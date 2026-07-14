import { supabase } from "@/integrations/supabase/client";

export async function callBulkImport(payload: { csv_text?: string; rows?: any[] }) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not signed in. Please sign in as an admin and retry.");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-import-organizations`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) throw new Error(data?.error || `Import failed (${res.status})`);
  return data as { total: number; created: number; failed: number; results: any[] };
}
