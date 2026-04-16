import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Heart, CheckCircle2 } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export default function Solutions() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MarketingNav variant="light" />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-white border-b border-[#ede5dc]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-black mb-4 tracking-tight">
              How Hariet.AI works
            </h1>
            <p className="text-lg text-[#6d412a]/70 max-w-2xl mx-auto leading-relaxed">
              Log surplus at the end of a shift or event. Hariet.AI either sells it through
              GO See The City or routes it straight to a nonprofit. You get documentation,
              the community gets a meal, and nothing goes to the landfill.
            </p>
          </div>
        </section>

        {/* Two Pathways */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Donate */}
              <div className="rounded-3xl bg-[#fdf8f4] border border-[#ede5dc] p-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6d412a]/10 text-[#6d412a] text-xs font-semibold uppercase mb-6">
                  <Heart className="w-3.5 h-3.5" />
                  Donate Pathway
                </div>
                <h2 className="text-3xl font-bold text-black mb-4">Donate every pound.</h2>
                <p className="text-[#6d412a]/70 mb-6">
                  Route all surplus directly to vetted nonprofit partners nearby. Tax
                  documentation and ESG reporting included with every pickup.
                </p>
                <ul className="space-y-3 text-sm text-[#6d412a]/70">
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#6d412a] mt-0.5" />
                    <span>Log your surplus in Hariet.AI at shift or event close</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#6d412a] mt-0.5" />
                    <span>The platform matches your food to nearby nonprofits in real time</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#6d412a] mt-0.5" />
                    <span>Nonprofits pick up the food. Nothing hits a landfill.</span>
                  </li>
                </ul>
              </div>

              {/* Sell + Donate */}
              <div className="rounded-3xl bg-[#1c0e07] text-white p-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold uppercase mb-6">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Sell + Donate Pathway
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Sell what you can. Donate the rest.</h2>
                <p className="text-white mb-6">
                  Recover revenue on same-day surplus through GO See The City, and donate
                  whatever doesn't sell before you close the kitchen.
                </p>
                <ul className="space-y-3 text-sm text-white">
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#92c216] mt-0.5" />
                    <span>Post offers in Hariet.AI, live on GO See The City within minutes</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#92c216] mt-0.5" />
                    <span>Local diners buy your discounted meals before close, driving real revenue</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#92c216] mt-0.5" />
                    <span>Donate everything, or sell some and donate the rest. Either way, nothing is wasted.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-white border-t border-[#ede5dc]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-black mb-6">Ready to get started?</h2>
            <p className="text-lg text-[#6d412a]/70 mb-10 leading-relaxed">
              Pick the pathway that fits your operation and onboard in days, not months.
            </p>
            <Link
              to="/get-started"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#6d412a] text-white font-semibold hover:bg-[#5a3422] transition shadow-sm text-lg"
            >
              Start your pathway <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
