import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SustainabilityBaselineForm, { emptySustainabilityBaseline, type SustainabilityBaselineData } from "@/components/forms/SustainabilityBaselineForm";

export default function VenueOnboarding() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Location form
  const [locationForm, setLocationForm] = useState({
    name: "", address: "", city: "", state: "", zip: "", county: "",
    pickup_address: "", pickup_instructions: "", hours_of_operation: "", estimated_surplus_frequency: "",
  });

  // Sustainability baseline
  const [baseline, setBaseline] = useState<SustainabilityBaselineData>(emptySustainabilityBaseline);

  const completeOnboarding = useMutation({
    mutationFn: async () => {
      if (!profile?.organization_id) throw new Error("No organization linked to your profile");

      // Create the location
      const { data: loc, error: locError } = await supabase.from("locations").insert({
        organization_id: profile.organization_id,
        name: locationForm.name,
        address: locationForm.address, city: locationForm.city, state: locationForm.state,
        zip: locationForm.zip, county: locationForm.county,
        pickup_address: locationForm.pickup_address || [locationForm.address, locationForm.city, locationForm.state].filter(Boolean).join(", "),
        pickup_instructions: locationForm.pickup_instructions,
        hours_of_operation: locationForm.hours_of_operation,
        estimated_surplus_frequency: locationForm.estimated_surplus_frequency,
      }).select().single();

      if (locError) throw locError;

      // Save sustainability baseline
      const outcomes = [...baseline.priority_outcomes];
      if (baseline.priority_other && outcomes.includes("Other")) {
        const idx = outcomes.indexOf("Other");
        outcomes[idx] = baseline.priority_other;
      }

      await supabase.from("sustainability_baseline").insert({
        location_id: loc.id,
        generates_surplus: baseline.generates_surplus,
        estimated_daily_surplus: baseline.estimated_daily_surplus || null,
        surplus_types: baseline.surplus_types.length ? baseline.surplus_types : null,
        current_handling: baseline.current_handling || null,
        donation_frequency: baseline.donation_frequency || null,
        priority_outcomes: outcomes.length ? outcomes : null,
      });
    },
    onSuccess: () => {
      toast.success("Onboarding complete! Welcome to your dashboard.");
      navigate("/venue");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-card rounded-xl border p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Welcome to HarietAI</h1>
          <p className="text-sm text-muted-foreground mt-1">Let's set up your venue — Step {step} of 2</p>
          <div className="flex gap-2 mt-4 justify-center">
            <div className={`h-1.5 w-16 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-1.5 w-16 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Your Primary Location</h2>
            <div><Label>Location Name *</Label><Input value={locationForm.name} onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })} placeholder="e.g. Main Kitchen" /></div>
            <div><Label>Address</Label><Input value={locationForm.address} onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>City</Label><Input value={locationForm.city} onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })} /></div>
              <div><Label>State</Label><Input value={locationForm.state} onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })} /></div>
              <div><Label>ZIP</Label><Input value={locationForm.zip} onChange={(e) => setLocationForm({ ...locationForm, zip: e.target.value })} /></div>
            </div>
            <div><Label>County</Label><Input value={locationForm.county} onChange={(e) => setLocationForm({ ...locationForm, county: e.target.value })} /></div>
            <div><Label>Pickup Address</Label><Input value={locationForm.pickup_address} onChange={(e) => setLocationForm({ ...locationForm, pickup_address: e.target.value })} placeholder="Defaults to location address" /></div>
            <div><Label>Pickup Instructions</Label><Input value={locationForm.pickup_instructions} onChange={(e) => setLocationForm({ ...locationForm, pickup_instructions: e.target.value })} /></div>
            <div><Label>Hours of Operation</Label><Input value={locationForm.hours_of_operation} onChange={(e) => setLocationForm({ ...locationForm, hours_of_operation: e.target.value })} /></div>
            <div><Label>Estimated Surplus Frequency</Label><Input value={locationForm.estimated_surplus_frequency} onChange={(e) => setLocationForm({ ...locationForm, estimated_surplus_frequency: e.target.value })} /></div>
            <Button className="w-full" onClick={() => setStep(2)} disabled={!locationForm.name}>
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Sustainability Baseline</h2>
            <p className="text-sm text-muted-foreground">Help us understand your current surplus situation so we can best support you.</p>
            <SustainabilityBaselineForm data={baseline} onChange={setBaseline} />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => completeOnboarding.mutate()} disabled={completeOnboarding.isPending}>
                {completeOnboarding.isPending ? "Completing..." : "Complete Setup"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
