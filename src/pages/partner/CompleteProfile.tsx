import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const PICKUP_PLACEHOLDER =
  "Example: Pickup takes place behind the restaurant. We're in a plaza and the back door has the restaurant name on it.";

type LocationForm = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
};

const EMPTY_LOCATION: LocationForm = {
  name: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  county: "",
};

export default function CompleteProfile() {
  const { profile, role } = useAuth();
  const isNonprofit = role === "nonprofit_partner";
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locForm, setLocForm] = useState<LocationForm>(EMPTY_LOCATION);
  const [pickup, setPickup] = useState({ sameAddress: true, instructions: "" });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["complete-profile", profile?.organization_id, profile?.nonprofit_id, role],
    enabled: !!profile,
    queryFn: async () => {
      if (isNonprofit && profile?.nonprofit_id) {
        const [entityResult, locationResult] = await Promise.all([
          supabase
            .from("nonprofits")
            .select("address, city, state, zip, county")
            .eq("id", profile.nonprofit_id)
            .maybeSingle(),
          supabase
            .from("nonprofit_locations")
            .select("id, name, address, city, state, zip, county, pickup_dropoff_instructions")
            .eq("nonprofit_id", profile.nonprofit_id)
            .order("created_at")
            .limit(1)
            .maybeSingle(),
        ]);
        if (entityResult.error) throw entityResult.error;
        if (locationResult.error) throw locationResult.error;
        return { entity: entityResult.data, location: locationResult.data };
      }

      if (profile?.organization_id) {
        const [entityResult, locationResult] = await Promise.all([
          supabase
            .from("organizations")
            .select("address, city, state, zip, county")
            .eq("id", profile.organization_id)
            .maybeSingle(),
          supabase
            .from("locations")
            .select("id, name, address, city, state, zip, county, pickup_address, pickup_instructions")
            .eq("organization_id", profile.organization_id)
            .order("created_at")
            .limit(1)
            .maybeSingle(),
        ]);
        if (entityResult.error) throw entityResult.error;
        if (locationResult.error) throw locationResult.error;
        return { entity: entityResult.data, location: locationResult.data };
      }

      return { entity: null, location: null };
    },
  });

  useEffect(() => {
    const savedLocation = data?.location;
    const savedEntity = data?.entity;
    if (!savedLocation && !savedEntity) return;

    setLocationId(savedLocation?.id ?? null);
    setLocForm({
      name: savedLocation?.name ?? "",
      address: savedLocation?.address ?? savedEntity?.address ?? "",
      city: savedLocation?.city ?? savedEntity?.city ?? "",
      state: savedLocation?.state ?? savedEntity?.state ?? "",
      zip: savedLocation?.zip ?? savedEntity?.zip ?? "",
      county: savedLocation?.county ?? savedEntity?.county ?? "",
    });

    if (isNonprofit && savedLocation && "pickup_dropoff_instructions" in savedLocation) {
      setPickup({
        sameAddress: true,
        instructions: savedLocation?.pickup_dropoff_instructions ?? "",
      });
      return;
    }

    const savedFullAddress = [
      savedLocation?.address,
      savedLocation?.city,
      savedLocation?.state,
      savedLocation?.zip,
    ].filter(Boolean).join(", ");
    if (savedLocation && "pickup_address" in savedLocation) {
      setPickup({
        sameAddress: !savedLocation.pickup_address || savedLocation.pickup_address === savedFullAddress,
        instructions: savedLocation.pickup_instructions ?? "",
      });
    }
  }, [data, isNonprofit]);

  const fullAddress = useMemo(
    () => [locForm.address, locForm.city, locForm.state, locForm.zip].filter(Boolean).join(", "),
    [locForm.address, locForm.city, locForm.state, locForm.zip],
  );

  const updateLocationField = (field: keyof LocationForm, value: string) => {
    setLocForm((current) => ({ ...current, [field]: value }));
  };

  const saveLocation = async () => {
    if (!profile) return;
    setBusy(true);

    try {
      const address = {
        address: locForm.address.trim(),
        city: locForm.city.trim(),
        state: locForm.state.trim(),
        zip: locForm.zip.trim(),
        county: locForm.county.trim() || null,
      };
      let savedLocationId = locationId;

      if (isNonprofit) {
        if (!profile.nonprofit_id) throw new Error("Your nonprofit profile is not linked.");

        const { error: nonprofitError } = await supabase
          .from("nonprofits")
          .update(address)
          .eq("id", profile.nonprofit_id);
        if (nonprofitError) throw nonprofitError;

        if (savedLocationId) {
          const { error } = await supabase
            .from("nonprofit_locations")
            .update({ name: locForm.name.trim(), ...address })
            .eq("id", savedLocationId);
          if (error) throw error;
        } else {
          const { data: created, error } = await supabase
            .from("nonprofit_locations")
            .insert({ nonprofit_id: profile.nonprofit_id, name: locForm.name.trim(), ...address })
            .select("id")
            .single();
          if (error) throw error;
          savedLocationId = created.id;
        }

        const { error: linkError } = await supabase.rpc("set_own_nonprofit_location", {
          p_location_id: savedLocationId,
        });
        if (linkError) throw linkError;
      } else {
        if (!profile.organization_id) throw new Error("Your organization profile is not linked.");

        const { error: organizationError } = await supabase
          .from("organizations")
          .update(address)
          .eq("id", profile.organization_id);
        if (organizationError) throw organizationError;

        if (savedLocationId) {
          const { error } = await supabase
            .from("locations")
            .update({ name: locForm.name.trim(), ...address })
            .eq("id", savedLocationId);
          if (error) throw error;
        } else {
          const { data: created, error } = await supabase
            .from("locations")
            .insert({
              organization_id: profile.organization_id,
              name: locForm.name.trim(),
              approval_status: "approved",
              ...address,
            })
            .select("id")
            .single();
          if (error) throw error;
          savedLocationId = created.id;
        }

        const { error: linkError } = await supabase.rpc("set_own_location", {
          p_location_id: savedLocationId,
        });
        if (linkError) throw linkError;
      }

      setLocationId(savedLocationId);
      await refetch();
      setStep(2);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save location");
    } finally {
      setBusy(false);
    }
  };

  const savePickup = async () => {
    if (!locationId) {
      toast.error("Save your location first");
      setStep(1);
      return;
    }
    if (!pickup.sameAddress && !pickup.instructions.trim()) {
      toast.error("Pickup instructions are required when food is not picked up at this address.");
      return;
    }

    setBusy(true);
    try {
      if (isNonprofit) {
        const { error } = await supabase
          .from("nonprofit_locations")
          .update({ pickup_dropoff_instructions: pickup.instructions.trim() || null })
          .eq("id", locationId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("locations")
          .update({
            pickup_address: pickup.sameAddress ? fullAddress : null,
            pickup_instructions: pickup.instructions.trim() || null,
          })
          .eq("id", locationId);
        if (error) throw error;
      }

      toast.success("Profile complete. Welcome to HarietAI.");
      window.location.replace(isNonprofit ? "/nonprofit" : role === "government_partner" ? "/government" : "/venue");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save pickup details");
    } finally {
      setBusy(false);
    }
  };

  const canContinue = Object.values(locForm).every((value) => value.trim().length > 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <section className="w-full max-w-xl bg-card rounded-xl border p-6 sm:p-8 space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Complete your profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Step {step} of 2</p>
          <div className="flex gap-2 mt-4 justify-center" aria-hidden="true">
            {[1, 2].map((number) => (
              <div key={number} className={`h-1.5 w-20 rounded-full ${step >= number ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </header>

        {step === 1 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Your location</h2>
            <div>
              <Label htmlFor="location-name">Location Name *</Label>
              <Input id="location-name" value={locForm.name} onChange={(event) => updateLocationField("name", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="street-address">Street Address *</Label>
              <Input id="street-address" value={locForm.address} onChange={(event) => updateLocationField("address", event.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input id="city" value={locForm.city} onChange={(event) => updateLocationField("city", event.target.value)} />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input id="state" value={locForm.state} onChange={(event) => updateLocationField("state", event.target.value)} />
              </div>
              <div>
                <Label htmlFor="zip">ZIP *</Label>
                <Input id="zip" value={locForm.zip} onChange={(event) => updateLocationField("zip", event.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="county">County *</Label>
              <Input id="county" value={locForm.county} onChange={(event) => updateLocationField("county", event.target.value)} />
            </div>
            <Button className="w-full" onClick={saveLocation} disabled={busy || !canContinue}>
              {busy ? "Saving..." : "Continue"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Pickup details</h2>
            <label className="flex items-start gap-2 text-sm text-foreground">
              <Checkbox
                className="mt-0.5"
                checked={pickup.sameAddress}
                onCheckedChange={(checked) => setPickup((current) => ({ ...current, sameAddress: checked === true }))}
              />
              <span>Food is picked up at this address</span>
            </label>
            <div>
              <Label htmlFor="pickup-instructions">
                Pickup Instructions {!pickup.sameAddress && "*"}
              </Label>
              <Textarea
                id="pickup-instructions"
                rows={4}
                value={pickup.instructions}
                onChange={(event) => setPickup((current) => ({ ...current, instructions: event.target.value }))}
                placeholder={PICKUP_PLACEHOLDER}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)} disabled={busy}>Back</Button>
              <Button className="flex-1" onClick={savePickup} disabled={busy || (!pickup.sameAddress && !pickup.instructions.trim())}>
                {busy ? "Saving..." : "Finish"}
              </Button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}