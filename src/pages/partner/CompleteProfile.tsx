import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LOCATION_TYPES } from "@/lib/constants";
import { Upload } from "lucide-react";

const FOOD_TYPES = [
  { value: "prepared_meals", label: "Prepared Meals / Cooked Food" },
  { value: "produce", label: "Produce / Fresh Fruits and Vegetables" },
  { value: "dairy", label: "Dairy" },
  { value: "meat_protein", label: "Meat / Protein" },
  { value: "baked_goods", label: "Baked Goods" },
  { value: "shelf_stable", label: "Shelf-Stable / Packaged / Non-Perishable" },
  { value: "frozen", label: "Frozen" },
];

const POPULATIONS = ["Children", "Seniors", "Families", "Homeless Individuals", "Veterans", "Low Income Individuals", "Other"];

const PICKUP_PLACEHOLDER =
  "Example: Pickup takes place behind the restaurant. We're in a plaza and the back door has the restaurant name on it.";

/**
 * Post-approval "Complete your profile" wizard.
 * Two steps only: one location address (which is also the business address)
 * and pickup details. Every step stays editable when the partner goes back.
 */
export default function CompleteProfile() {
  const { profile, role } = useAuth();
  const isNonprofit = role === "nonprofit_partner";

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["complete-profile", profile?.organization_id, profile?.nonprofit_id],
    enabled: !!profile,
    queryFn: async () => {
      if (isNonprofit && profile?.nonprofit_id) {
        const [np, locs] = await Promise.all([
          supabase.from("nonprofits").select("*").eq("id", profile.nonprofit_id).maybeSingle(),
          supabase.from("nonprofit_locations").select("*").eq("nonprofit_id", profile.nonprofit_id).order("created_at"),
        ]);
        return { org: np.data as any, locations: (locs.data ?? []) as any[] };
      }
      if (profile?.organization_id) {
        const [org, locs] = await Promise.all([
          supabase.from("organizations").select("*").eq("id", profile.organization_id).maybeSingle(),
          supabase.from("locations").select("*").eq("organization_id", profile.organization_id).order("created_at"),
        ]);
        return { org: org.data as any, locations: (locs.data ?? []) as any[] };
      }
      return { org: null, locations: [] as any[] };
    },
  });

  const org = data?.org;
  const firstLocation = data?.locations?.[0];

  // Resume at the first incomplete step.
  const resumeStep = useMemo(() => {
    if (!firstLocation) return 1;
    if (!isNonprofit && !firstLocation.pickup_address) return 2;
    if (isNonprofit && !firstLocation.pickup_dropoff_instructions) return 2;
    return 2;
  }, [firstLocation, isNonprofit]);

  const [step, setStep] = useState<number | null>(null);
  useEffect(() => { if (!isLoading && step === null) setStep(resumeStep); }, [isLoading, resumeStep, step]);

  const [busy, setBusy] = useState(false);
  const [locForm, setLocForm] = useState({
    name: "", locationType: "", address: "", city: "", state: "", zip: "", county: "",
    contactName: "", contactEmail: "", contactPhone: "",
  });
  const [pickup, setPickup] = useState({ sameAddress: true, instructions: "" });
  const [capacity, setCapacity] = useState({ coldStorage: false, refrigeration: false, cabinetry: false, foodTypes: [] as string[], populations: [] as string[] });
  const [ein, setEin] = useState("");
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [agreementFile, setAgreementFile] = useState<File | null>(null);

  // Hydrate every field from whatever is saved so going Back shows real,
  // editable inputs rather than a locked "already saved" message.
  useEffect(() => {
    if (!org) return;
    setEin((v) => org.ein ?? v);
    if (isNonprofit) {
      setCapacity((c) => ({
        coldStorage: org.cold_storage ?? c.coldStorage,
        refrigeration: org.refrigeration ?? c.refrigeration,
        cabinetry: org.cabinetry ?? c.cabinetry,
        foodTypes: org.food_types_accepted ?? c.foodTypes,
        populations: org.population_served ? String(org.population_served).split(", ") : c.populations,
      }));
    }
  }, [org, isNonprofit]);

  useEffect(() => {
    if (!firstLocation) return;
    setLocForm((f) => ({
      name: firstLocation.name ?? f.name,
      locationType: firstLocation.location_type ?? f.locationType,
      address: firstLocation.address ?? f.address,
      city: firstLocation.city ?? f.city,
      state: firstLocation.state ?? f.state,
      zip: firstLocation.zip ?? f.zip,
      county: firstLocation.county ?? f.county,
      contactName: firstLocation.contact_name ?? f.contactName,
      contactEmail: firstLocation.contact_email ?? f.contactEmail,
      contactPhone: firstLocation.contact_phone ?? f.contactPhone,
    }));
    const fullAddress = [firstLocation.address, firstLocation.city, firstLocation.state, firstLocation.zip].filter(Boolean).join(", ");
    setPickup((p) => ({
      sameAddress: firstLocation.pickup_address ? firstLocation.pickup_address === fullAddress : p.sameAddress,
      instructions: firstLocation.pickup_instructions ?? firstLocation.pickup_dropoff_instructions ?? p.instructions,
    }));
  }, [firstLocation]);

  const fullAddress = [locForm.address, locForm.city, locForm.state, locForm.zip].filter(Boolean).join(", ");

  const saveLocation = async () => {
    setBusy(true);
    try {
      const addr = {
        address: locForm.address, city: locForm.city, state: locForm.state,
        zip: locForm.zip, county: locForm.county || null,
      };

      if (isNonprofit) {
        // The location address is also the organization address.
        const { error: npErr } = await supabase.from("nonprofits").update({
          ...addr,
          ein: ein || null,
          cold_storage: capacity.coldStorage, refrigeration: capacity.refrigeration, cabinetry: capacity.cabinetry,
          food_types_accepted: capacity.foodTypes.length ? (capacity.foodTypes as any) : null,
          population_served: capacity.populations.length ? capacity.populations.join(", ") : null,
        }).eq("id", profile!.nonprofit_id!);
        if (npErr) throw npErr;

        if (insuranceFile || agreementFile) {
          const uploads: Record<string, string> = {};
          for (const [file, key, label] of [
            [insuranceFile, "proof_of_insurance_url", "insurance"],
            [agreementFile, "signed_agreement_url", "agreement"],
          ] as Array<[File | null, string, string]>) {
            if (!file) continue;
            const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const path = `nonprofits/${profile!.id}/${label}_${safe}`;
            const { error: upErr } = await supabase.storage.from("nonprofit-documents").upload(path, file, { upsert: true });
            if (upErr) throw upErr;
            uploads[key] = path;
          }
          if (Object.keys(uploads).length) {
            await supabase.from("nonprofits").update(uploads as any).eq("id", profile!.nonprofit_id!);
          }
        }

        if (firstLocation) {
          const { error } = await supabase.from("nonprofit_locations").update({
            name: locForm.name, ...addr,
            contact_name: locForm.contactName || null, contact_email: locForm.contactEmail || null,
            contact_phone: locForm.contactPhone || null,
          }).eq("id", firstLocation.id);
          if (error) throw error;
        } else {
          const { data: loc, error } = await supabase.from("nonprofit_locations").insert({
            nonprofit_id: profile!.nonprofit_id!, name: locForm.name, ...addr,
            contact_name: locForm.contactName || null, contact_email: locForm.contactEmail || null,
            contact_phone: locForm.contactPhone || null,
          }).select("id").single();
          if (error) throw error;
          const { error: linkErr } = await supabase.rpc("set_own_nonprofit_location", { p_location_id: loc.id });
          if (linkErr) throw linkErr;
        }
      } else {
        const { error: orgErr } = await supabase.from("organizations").update(addr).eq("id", profile!.organization_id!);
        if (orgErr) throw orgErr;

        if (firstLocation) {
          const { error } = await supabase.from("locations").update({
            name: locForm.name, location_type: locForm.locationType || null, ...addr,
            contact_name: locForm.contactName || null, contact_email: locForm.contactEmail || null,
            contact_phone: locForm.contactPhone || null,
          }).eq("id", firstLocation.id);
          if (error) throw error;
        } else {
          const { data: loc, error } = await supabase.from("locations").insert({
            organization_id: profile!.organization_id!, name: locForm.name,
            location_type: locForm.locationType || null, ...addr,
            contact_name: locForm.contactName || null, contact_email: locForm.contactEmail || null,
            contact_phone: locForm.contactPhone || null,
            approval_status: "approved",
          }).select("id").single();
          if (error) throw error;
          const { error: linkErr } = await supabase.rpc("set_own_location", { p_location_id: loc.id });
          if (linkErr) throw linkErr;
        }
      }
      await refetch();
      setStep(2);
    } catch (e: any) { toast.error(e.message || "Could not save location"); } finally { setBusy(false); }
  };

  const savePickup = async () => {
    if (!firstLocation) { toast.error("Save your location first"); setStep(1); return; }
    if (!pickup.sameAddress && !pickup.instructions.trim()) {
      toast.error("Please describe where pickup takes place");
      return;
    }
    setBusy(true);
    try {
      if (isNonprofit) {
        const { error } = await supabase.from("nonprofit_locations").update({
          pickup_dropoff_instructions: pickup.instructions || null,
        }).eq("id", firstLocation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("locations").update({
          pickup_address: fullAddress,
          pickup_instructions: pickup.instructions || null,
        }).eq("id", firstLocation.id);
        if (error) throw error;
      }
      toast.success("Profile complete. Welcome to HarietAI.");
      window.location.replace(isNonprofit ? "/nonprofit" : role === "government_partner" ? "/government" : "/venue");
    } catch (e: any) { toast.error(e.message || "Could not save"); } finally { setBusy(false); }
  };

  if (isLoading || step === null) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const toggle = (list: string[], v: string) => list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  const canContinue = !!locForm.name && !!locForm.address && !!locForm.city && !!locForm.state && !!locForm.zip && (isNonprofit || !!locForm.locationType);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-card rounded-xl border p-6 sm:p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Complete your profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Step {step} of 2</p>
          <div className="flex gap-2 mt-4 justify-center">
            {[1, 2].map((s) => <div key={s} className={`h-1.5 w-20 rounded-full ${step >= s ? "bg-primary" : "bg-muted"}`} />)}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Your location</h2>
            <div><Label>Location Name *</Label><Input value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} placeholder="e.g. Main Kitchen" /></div>
            {!isNonprofit && (
              <div>
                <Label>Location Type *</Label>
                <Select value={locForm.locationType} onValueChange={(v) => setLocForm({ ...locForm, locationType: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{LOCATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Street Address *</Label><Input value={locForm.address} onChange={(e) => setLocForm({ ...locForm, address: e.target.value })} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><Label>City *</Label><Input value={locForm.city} onChange={(e) => setLocForm({ ...locForm, city: e.target.value })} /></div>
              <div><Label>State *</Label><Input value={locForm.state} onChange={(e) => setLocForm({ ...locForm, state: e.target.value })} /></div>
              <div><Label>ZIP *</Label><Input value={locForm.zip} onChange={(e) => setLocForm({ ...locForm, zip: e.target.value })} /></div>
            </div>
            <div><Label>County</Label><Input value={locForm.county} onChange={(e) => setLocForm({ ...locForm, county: e.target.value })} /></div>
            <div><Label>Contact Name</Label><Input value={locForm.contactName} onChange={(e) => setLocForm({ ...locForm, contactName: e.target.value })} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Contact Email</Label><Input type="email" value={locForm.contactEmail} onChange={(e) => setLocForm({ ...locForm, contactEmail: e.target.value })} /></div>
              <div><Label>Contact Phone</Label><Input type="tel" value={locForm.contactPhone} onChange={(e) => setLocForm({ ...locForm, contactPhone: e.target.value })} /></div>
            </div>

            {isNonprofit && (
              <>
                <div><Label>EIN</Label><Input value={ein} onChange={(e) => setEin(e.target.value)} placeholder="XX-XXXXXXX" /></div>
                <div className="space-y-3">
                  {([["coldStorage", "Cold Storage Capacity"], ["refrigeration", "Refrigeration Capacity"], ["cabinetry", "Cabinetry Capacity"]] as const).map(([k, label]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{label}</span>
                      <Switch checked={(capacity as any)[k]} onCheckedChange={(v) => setCapacity({ ...capacity, [k]: v })} />
                    </div>
                  ))}
                </div>
                <div>
                  <Label>Food Types Accepted</Label>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {FOOD_TYPES.map((ft) => (
                      <label key={ft.value} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={capacity.foodTypes.includes(ft.value)} onCheckedChange={() => setCapacity({ ...capacity, foodTypes: toggle(capacity.foodTypes, ft.value) })} />
                        {ft.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Population Served</Label>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {POPULATIONS.map((p) => (
                      <label key={p} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={capacity.populations.includes(p)} onCheckedChange={() => setCapacity({ ...capacity, populations: toggle(capacity.populations, p) })} />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Proof of Insurance</Label>
                  <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{insuranceFile ? insuranceFile.name : org?.proof_of_insurance_url ? "Uploaded" : "Choose file"}</span>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setInsuranceFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div className="space-y-2">
                  <Label>Signed Agreement</Label>
                  <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{agreementFile ? agreementFile.name : org?.signed_agreement_url ? "Uploaded" : "Choose file"}</span>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setAgreementFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </>
            )}

            <Button className="w-full" onClick={saveLocation} disabled={busy || !canContinue}>
              {busy ? "Saving..." : "Continue"}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Pickup details</h2>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox className="mt-0.5" checked={pickup.sameAddress} onCheckedChange={(v) => setPickup({ ...pickup, sameAddress: !!v })} />
              <span className="text-foreground">Food is picked up at this address{fullAddress ? ` (${fullAddress})` : ""}</span>
            </label>
            <div>
              <Label>Pickup Instructions {pickup.sameAddress ? "" : "*"}</Label>
              <Textarea
                rows={4}
                value={pickup.instructions}
                onChange={(e) => setPickup({ ...pickup, instructions: e.target.value })}
                placeholder={PICKUP_PLACEHOLDER}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={savePickup} disabled={busy}>{busy ? "Saving..." : "Finish"}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
