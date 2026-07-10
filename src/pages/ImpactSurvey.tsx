import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

// Public tokenized survey page. No auth required — the URL token is the credential.
const DEMOS = ["Families", "Homeless individuals", "Women and children", "Youth", "Other"];

export default function ImpactSurvey() {
  const { token = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [foodReceived, setFoodReceived] = useState(true);
  const [dateReceived, setDateReceived] = useState<string>(new Date().toISOString().slice(0, 10));
  const [peopleFed, setPeopleFed] = useState<string>("");
  const [demos, setDemos] = useState<string[]>([]);
  const [conditionGood, setConditionGood] = useState<boolean>(true);
  const [conditionComment, setConditionComment] = useState("");
  const [testimonial, setTestimonial] = useState("");
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_impact_survey_by_token", { p_token: token });
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setContext(null);
      } else {
        const row = Array.isArray(data) ? data[0] : data;
        setContext(row);
        if (row?.submitted_at) setAlreadyDone(true);
      }
      setLoading(false);
    })();
  }, [token]);

  const toggleDemo = (d: string) =>
    setDemos((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const handlePhoto = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((res, rej) => {
        reader.onload = () => res(String(reader.result));
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.split(",")[1];
      const { data, error } = await supabase.functions.invoke("upload-survey-photo", {
        body: { token, filename: file.name, content_type: file.type, data_base64: base64 },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      setPhotoPaths((prev) => [...prev, (data as any).path]);
      toast.success("Photo uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("submit_impact_survey", {
        p_token: token,
        p_food_received: foodReceived,
        p_date_received: dateReceived || null,
        p_people_fed: peopleFed ? Number(peopleFed) : null,
        p_demographics: demos,
        p_food_condition_good: conditionGood,
        p_condition_comment: conditionGood ? null : conditionComment,
        p_testimonial: testimonial,
        p_photo_urls: photoPaths,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (e: any) {
      toast.error(e.message || "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  const headline = useMemo(() => {
    if (!context) return "";
    return `${context.nonprofit_name || "Your nonprofit"} · ${context.venue_name || "Donor"}`;
  }, [context]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!context) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold">Survey not found</h1>
          <p className="text-muted-foreground">This link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (submitted || alreadyDone) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 mx-auto text-success" />
          <h1 className="text-2xl font-bold">Thank you</h1>
          <p className="text-muted-foreground">
            Your impact story has been shared with the donor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Share your impact</h1>
          <p className="text-sm text-muted-foreground mt-2">{headline}</p>
          {context.pounds != null && (
            <p className="text-xs text-muted-foreground">
              {context.pounds} lbs · {(context.food_type || "").replace(/_/g, " ")}
            </p>
          )}
        </div>

        <div className="bg-card border rounded-xl p-6 space-y-6">
          <div className="flex items-start gap-3">
            <Checkbox
              id="received"
              checked={foodReceived}
              onCheckedChange={(v) => setFoodReceived(!!v)}
            />
            <div className="flex-1">
              <Label htmlFor="received" className="text-base font-medium cursor-pointer">
                I confirm the food was received
              </Label>
              <div className="mt-2">
                <Label className="text-xs">Date received</Label>
                <Input
                  type="date"
                  value={dateReceived}
                  onChange={(e) => setDateReceived(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <Label>How many people did this donation feed?</Label>
            <Input
              type="number"
              min={0}
              value={peopleFed}
              onChange={(e) => setPeopleFed(e.target.value)}
              placeholder="e.g. 120"
            />
          </div>

          <div>
            <Label>Demographic of people served</Label>
            <div className="mt-2 space-y-2">
              {DEMOS.map((d) => (
                <label key={d} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={demos.includes(d)} onCheckedChange={() => toggleDemo(d)} />
                  {d}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Was the food in good condition when received?</Label>
            <div className="mt-2 flex gap-3">
              <Button
                type="button"
                size="sm"
                variant={conditionGood ? "default" : "outline"}
                onClick={() => setConditionGood(true)}
              >
                Yes
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!conditionGood ? "default" : "outline"}
                onClick={() => setConditionGood(false)}
              >
                No
              </Button>
            </div>
            {!conditionGood && (
              <Textarea
                className="mt-2"
                placeholder="Tell us what happened"
                value={conditionComment}
                onChange={(e) => setConditionComment(e.target.value)}
              />
            )}
          </div>

          <div>
            <Label>Share a story or testimonial (optional)</Label>
            <Textarea
              value={testimonial}
              onChange={(e) => setTestimonial(e.target.value)}
              placeholder="A quick story or quote from someone helped"
            />
          </div>

          <div>
            <Label>Photos (optional)</Label>
            <Input
              type="file"
              accept="image/*"
              disabled={uploadingPhoto}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePhoto(f);
                e.currentTarget.value = "";
              }}
            />
            {photoPaths.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {photoPaths.length} photo{photoPaths.length > 1 ? "s" : ""} attached
              </p>
            )}
          </div>

          <Button className="w-full" onClick={submit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
