import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { hasRealHours } from "@/lib/orgProfile";


const DISMISSED_KEY = "hariet_hours_task_dismissed";

/** Dismissible reminder to set hours of operation in Settings. */
export default function HoursTaskCard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === "true"; } catch { return false; }
  });

  const { data: org } = useQuery({
    queryKey: ["hours-task-org", profile?.organization_id],
    enabled: !!profile?.organization_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("hours_of_operation")
        .eq("id", profile!.organization_id!)
        .maybeSingle();
      return data as { hours_of_operation: unknown } | null;
    },
  });

  if (dismissed || !org || hasRealHours(org.hours_of_operation)) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, "true"); } catch { /* ignore */ }
  };

  return (
    <div className="bg-card rounded-xl border p-5 flex items-start gap-3">
      <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">Set your hours of operation</p>
        <p className="text-xs text-muted-foreground mt-1">
          Add your open and close times so nonprofits know when they can reach you.
        </p>
        <button onClick={() => navigate("/venue/settings")} className="text-xs font-medium text-primary hover:underline mt-2">
          Go to Settings
        </button>
      </div>
      <button onClick={dismiss} className="p-1 rounded hover:bg-muted" title="Dismiss">
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
