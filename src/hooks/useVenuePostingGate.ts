import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { hasRealHours } from "@/lib/orgProfile";

/** Posting readiness for a venue: baseline + hours, skipped for one-time event accounts, which go dormant after their event. */
export function useVenuePostingGate(orgId: string | null | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ["venue-posting-gate", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [{ data: org }, { data: locs }] = await Promise.all([
        supabase.from("organizations").select("hours_of_operation, is_one_time_event, event_name, event_date").eq("id", orgId!).maybeSingle(),
        supabase.from("locations").select("id, name, pickup_address, address").eq("organization_id", orgId!),
      ]);
      const ids = (locs ?? []).map((l) => l.id);
      const { count } = ids.length
        ? await supabase.from("sustainability_baseline").select("id", { count: "exact", head: true }).in("location_id", ids)
        : { count: 0 };
      return { org: org as any, locations: locs ?? [], baseline: (count ?? 0) > 0 };
    },
  });
  const org = data?.org;
  const isOneTime = !!org?.is_one_time_event;
  const dormant = isOneTime && !!org?.event_date && new Date().toISOString().slice(0, 10) > addDays(org.event_date, 3);
  const missing: string[] = [];
  if (!isOneTime) {
    if (data && !data.baseline) missing.push("complete your sustainability baseline");
    if (data && !hasRealHours(org?.hours_of_operation)) missing.push("set your operating hours in Settings");
  }
  return {
    loading: isLoading, isOneTime, dormant, eventName: org?.event_name as string | undefined, eventDate: org?.event_date as string | undefined,
    locations: data?.locations ?? [], missing, ready: !!data && !dormant && missing.length === 0,
  };
}

function addDays(d: string, n: number) {
  const x = new Date(d + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
