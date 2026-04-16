import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Calendar } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Pathway = "donate" | "sell_donate" | "nonprofit";

interface EventConfig {
  title: string;
  subtitle: string;
  thankYouMessage: string;
  source: string;
}

const EVENT_CONFIGS: Record<string, EventConfig> = {
  TulsaTechWeek: {
    title: "Tulsa Tech Week",
    subtitle:
      "Sign up to have surplus food from your Tulsa Tech Week events picked up by Hariet.AI.",
    thankYouMessage:
      "You're all set to have surplus food from your Tulsa Tech Week events picked up.\n\nTwo weeks prior to your event, you'll receive your login details to schedule your pickup.\n\nThank you for committing to making a meaningful impact in your community.",
    source: "tulsa_tech_week",
  },
  OKCTechWeek: {
    title: "OKC Tech Week",
    subtitle:
      "Sign up to have surplus food from your OKC Tech Week events picked up by Hariet.AI.",
    thankYouMessage:
      "You're all set to have surplus food from your OKC Tech Week events picked up.\n\nTwo weeks prior to your event, you'll receive your login details to schedule your pickup.\n\nThank you for committing to making a meaningful impact in your community.",
    source: "okc_tech_week",
  },
};

export default function EventGetStarted() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const config = eventSlug ? EVENT_CONFIGS[eventSlug] : null;
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    address: "",
    pathway: "donate" as Pathway,
    comments: "",
  });

  const update = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  // If the slug doesn't match a known event, show a 404-style message
  if (!config) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <MarketingNav variant="light" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-black mb-4">Event not found</h1>
            <Link to="/get-started" className="text-[#6d412a] hover:underline font-semibold">
              Go to Get Started
            </Link>
          </div>
        </main>
        <MarketingFooter />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.name || !form.email) {
      toast({
        title: "Missing info",
        description: "Please include at least your name and email.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("partner_leads" as any).insert({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        organization: form.organization.trim() || null,
        address: form.address.trim() || null,
        pathway: form.pathway,
        comments: form.comments.trim() || null,
        source: config.source,
      } as any);

      if (error) throw error;

      setSubmitted(true);
      toast({ title: "Signed up!", description: "You're all set." });
    } catch (err: any) {
      console.error("Failed to submit lead:", err);
      toast({
        title: "Something went wrong",
        description: "Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MarketingNav variant="light" />

      <main className="flex-1">
        {/* Header */}
        <section className="bg-white border-b border-[#ede5dc]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-[#6d412a]/70 hover:text-[#6d412a] transition mb-6"
            >
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
            <h1 className="text-4xl sm:text-5xl font-bold text-black mb-4 tracking-tight">
              {config.title}
            </h1>
            <p className="text-lg text-[#6d412a]/70 max-w-2xl mx-auto leading-relaxed">
              {config.subtitle}
            </p>
          </div>
        </section>

        {/* Form */}
        <section className="py-16 bg-[#fdf8f4] border-b border-[#ede5dc]">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-3xl border border-[#ede5dc] p-6 sm:p-10 shadow-sm">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-full bg-[#92c216]/15 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 h-7 text-[#4a6a0c]" />
                  </div>
                  <h2 className="text-2xl font-bold text-black mb-4">
                    Thanks, {form.name.split(" ")[0] || "there"}!
                  </h2>
                  {config.thankYouMessage.split("\n\n").map((paragraph, i) => (
                    <p key={i} className="text-[#6d412a]/70 mb-4 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-black">
                        Full name
                      </Label>
                      <Input
                        id="name"
                        required
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organization" className="text-sm font-medium text-black">
                        Organization Name
                      </Label>
                      <Input
                        id="organization"
                        value={form.organization}
                        onChange={(e) => update("organization", e.target.value)}
                        placeholder="Business name"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-black">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        placeholder="you@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium text-black">
                        Phone number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        placeholder="(555) 555-5555"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium text-black">
                      Address
                    </Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(e) => update("address", e.target.value)}
                      placeholder="Street, City, State"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-black">What best describes you?</Label>
                    <RadioGroup
                      value={form.pathway}
                      onValueChange={(v) => update("pathway", v)}
                      className="grid sm:grid-cols-3 gap-3"
                    >
                      <label className="relative flex flex-col gap-1 p-4 rounded-xl border border-[#ede5dc] bg-[#fdf8f4] cursor-pointer hover:border-[#6d412a]/40 transition has-[:checked]:border-[#6d412a] has-[:checked]:bg-[#6d412a]/5">
                        <RadioGroupItem value="donate" className="sr-only" />
                        <span className="text-sm font-semibold text-black">Donate surplus</span>
                        <span className="text-xs text-[#6d412a]/70">
                          Stadium, convention center, HQ, healthcare
                        </span>
                      </label>
                      <label className="relative flex flex-col gap-1 p-4 rounded-xl border border-[#ede5dc] bg-[#fdf8f4] cursor-pointer hover:border-[#6d412a]/40 transition has-[:checked]:border-[#6d412a] has-[:checked]:bg-[#6d412a]/5">
                        <RadioGroupItem value="sell_donate" className="sr-only" />
                        <span className="text-sm font-semibold text-black">Sell + Donate</span>
                        <span className="text-xs text-[#6d412a]/70">
                          Restaurant, cafe, hotel, hospitality
                        </span>
                      </label>
                      <label className="relative flex flex-col gap-1 p-4 rounded-xl border border-[#ede5dc] bg-[#fdf8f4] cursor-pointer hover:border-[#6d412a]/40 transition has-[:checked]:border-[#6d412a] has-[:checked]:bg-[#6d412a]/5">
                        <RadioGroupItem value="nonprofit" className="sr-only" />
                        <span className="text-sm font-semibold text-black">Receive as nonprofit</span>
                        <span className="text-xs text-[#6d412a]/70">
                          Food bank, shelter, community partner
                        </span>
                      </label>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="comments" className="text-sm font-medium text-black">
                      Anything else we should know?
                    </Label>
                    <Textarea
                      id="comments"
                      rows={4}
                      value={form.comments}
                      onChange={(e) => update("comments", e.target.value)}
                      placeholder="Event cadence, typical surplus volume, timeline, referral source, etc."
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#6d412a] hover:bg-[#5a3422] text-white font-semibold py-6 text-base rounded-xl shadow-sm"
                  >
                    {submitting ? "Signing up..." : "Signed up"}
                  </Button>
                  <p className="text-xs text-[#6d412a]/50 text-center">
                    By submitting, you agree to be contacted by the Hariet.AI team.
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* Contact section (no Calendly for event pages) */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm text-[#6d412a]/60">
              Have questions? Reach us at{" "}
              <a
                href="mailto:hello@hariet.ai"
                className="text-[#6d412a] font-semibold hover:underline"
              >
                hello@hariet.ai
              </a>
            </p>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
