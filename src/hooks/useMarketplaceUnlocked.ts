import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";

export const useMarketplaceUnlocked = () => {
  const { city, state, ready } = useLocation();
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !city || !state) return;
    let active = true;

    const fetchStatus = async () => {
      const { data } = await supabase
        .from("city_thresholds")
        .select("marketplace_unlocked")
        .ilike("city", city)
        .ilike("state", state)
        .maybeSingle();
      if (!active) return;
      setUnlocked(Boolean(data?.marketplace_unlocked));
      setLoading(false);
    };

    fetchStatus();

    const channel = supabase
      .channel(`city_thresholds:${city}:${state}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "city_thresholds" },
        (payload) => {
          const row: any = payload.new || payload.old;
          if (!row) return;
          if (
            String(row.city).toLowerCase() === city.toLowerCase() &&
            String(row.state).toLowerCase() === state.toLowerCase()
          ) {
            setUnlocked(Boolean(row.marketplace_unlocked));
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [city, state, ready]);

  return { unlocked, loading };
};
