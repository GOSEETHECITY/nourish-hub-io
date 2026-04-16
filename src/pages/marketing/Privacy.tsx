import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MarketingNav variant="light" />

      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[#6d412a]/70 hover:text-[#6d412a] transition mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-4xl font-bold text-black mb-8">Privacy Policy</h1>
          <div className="prose prose-sm max-w-none text-[#6d412a]/70 space-y-4">
            <p>
              This Privacy Policy is coming soon. For now, please contact us at{" "}
              <a href="mailto:Hello@Hariet.AI" className="text-[#6d412a] font-semibold hover:underline">
                Hello@Hariet.AI
              </a>{" "}
              with any questions about how we handle your data.
            </p>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
