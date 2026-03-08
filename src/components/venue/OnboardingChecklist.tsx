import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Circle, X, Leaf, MapPin, Package, CreditCard } from "lucide-react";

const DISMISSED_KEY = "hariet_onboarding_dismissed";

interface ChecklistItem {
  id: string;
  label: string;
  icon: any;
  done: boolean;
  route: string;
}

export default function OnboardingChecklist() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === "true"; } catch { return false; }
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["onboard-locs", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("locations").select("id").eq("organization_id", profile!.organization_id!);
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: baselines = [] } = useQuery({
    queryKey: ["onboard-baselines", profile?.organization_id],
    queryFn: async () => {
      if (!locations.length) return [];
      const { data } = await supabase.from("sustainability_baseline").select("id").in("location_id", locations.map((l) => l.id));
      return data || [];
    },
    enabled: locations.length > 0,
  });

  const { data: donations = [] } = useQuery({
    queryKey: ["onboard-donations", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("food_listings").select("id").eq("organization_id", profile!.organization_id!).eq("listing_type", "donation").limit(1);
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: stripeLocations = [] } = useQuery({
    queryKey: ["onboard-stripe", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("locations").select("stripe_onboarding_status").eq("organization_id", profile!.organization_id!).not("stripe_onboarding_status", "is", null).not("stripe_onboarding_status", "eq", "not_started");
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  if (dismissed) return null;

  const items: ChecklistItem[] = [
    { id: "baseline", label: "Complete sustainability baseline", icon: Leaf, done: baselines.length > 0, route: "/venue/baseline" },
    { id: "location", label: "Add your first location", icon: MapPin, done: locations.length > 0, route: "/venue/locations" },
    { id: "donation", label: "Post your first donation", icon: Package, done: donations.length > 0, route: "/venue/donations" },
    { id: "stripe", label: "Connect Stripe for marketplace", icon: CreditCard, done: stripeLocations.length > 0, route: "/venue/marketplace" },
  ];

  const allDone = items.every((i) => i.done);
  if (allDone) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, "true");
  };

  return (
    <div className="bg-card rounded-xl border p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Getting Started</h3>
          <p className="text-xs text-muted-foreground">{items.filter((i) => i.done).length} of {items.length} complete</p>
        </div>
        <button onClick={handleDismiss} className="p-1 rounded hover:bg-muted" title="Dismiss">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.done && navigate(item.route)}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors ${item.done ? "bg-success/5" : "hover:bg-muted/50 cursor-pointer"}`}
          >
            {item.done
              ? <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
              : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
            }
            <item.icon className={`w-4 h-4 shrink-0 ${item.done ? "text-success" : "text-muted-foreground"}`} />
            <span className={`text-sm ${item.done ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}