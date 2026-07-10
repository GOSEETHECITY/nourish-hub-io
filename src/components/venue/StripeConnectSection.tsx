import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Org = {
  id: string;
  name: string;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_details_submitted: boolean;
  platform_fee_percentage: number;
};

export default function StripeConnectSection() {
  const { user } = useAuth();
  const [org, setOrg] = useState<Org | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
      if (!profile?.organization_id) return;
      const { data } = await supabase.from("organizations")
        .select("id, name, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted, platform_fee_percentage")
        .eq("id", profile.organization_id).single();
      setOrg(data as Org);
    })();
  }, [user]);

  async function startOnboarding() {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", { body: {} });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start onboarding");
    } finally { setBusy(false); }
  }

  if (!org) return null;

  const ready = org.stripe_charges_enabled && org.stripe_payouts_enabled;
  const started = !!org.stripe_account_id;

  return (
    <Card>
      <CardHeader><CardTitle>Payments (Stripe Connect)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant={started ? "default" : "secondary"}>{started ? "Account created" : "Not started"}</Badge>
          <Badge variant={org.stripe_details_submitted ? "default" : "secondary"}>Details {org.stripe_details_submitted ? "submitted" : "pending"}</Badge>
          <Badge variant={org.stripe_charges_enabled ? "default" : "secondary"}>Charges {org.stripe_charges_enabled ? "enabled" : "disabled"}</Badge>
          <Badge variant={org.stripe_payouts_enabled ? "default" : "secondary"}>Payouts {org.stripe_payouts_enabled ? "enabled" : "disabled"}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Platform fee: <strong>{Number(org.platform_fee_percentage ?? 10)}%</strong> of gross sales.
          The remainder is transferred directly to your Stripe-connected bank account after payment.
        </p>
        <Button onClick={startOnboarding} disabled={busy}>
          {ready ? "Manage Stripe account" : started ? "Continue Stripe onboarding" : "Set up Stripe payouts"}
        </Button>
      </CardContent>
    </Card>
  );
}
