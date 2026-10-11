import { useSearchParams } from "react-router-dom";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import ApplicationWizard from "@/components/onboarding/ApplicationWizard";

export default function PartnerApply() {
  const [params, setParams] = useSearchParams();
  const token = params.get("resume");
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-2">Become a Partner</h1>
        <p className="text-muted-foreground mb-8">Apply online in minutes — verify, sign and upload documents, and get reviewed the same day. Your progress saves at every step.</p>
        <ApplicationWizard key={token ?? "new"} token={token} onToken={(t) => setParams({ resume: t }, { replace: true })} />
      </div>
      <MarketingFooter />
    </div>
  );
}
