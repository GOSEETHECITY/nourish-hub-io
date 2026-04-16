import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Heart, Leaf, CheckCircle2 } from "lucide-react";
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
              From logging surplus to automatic matching to nonprofit pickup, your food reaches communities in real time.
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
                <h2 className="text-3xl font-bold text-black mb-4">Donate your surplus</h2>
                <p className="text-[#6d412a]/70 mb-6">
                  Route all surplus directly to vetted nonprofit partners. Tax documentation and ESG reporting included.
                </p>
                <ul className="space-y-3 text-sm text-[#6d412a]/70">
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#6d412a] mt-0.5" />
                    <span>Log surplus in Hariet.AI at shift/event end</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#6d412a] mt-0.5" />
                    <span>Platform instantly matches to local nonprofits</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#6d412a] mt-0.5" />
                    <span>Nonprofits pick up food. Nothing hits landfills.</span>
                  </li>
                </ul>
              </div>

              {/* Sell + Donate */}
              <div className="rounded-3xl bg-[#1c0e07] text-white p-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6d412a]/50 text-[#e8c9a8] text-xs font-semibold uppercase mb-6">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Sell + Donate Pathway
                </div>
                <h2 className="text-3xl font-bold mb-4">Sell surplus. Donate the rest.</h2>
                <p className="text-white/60 mb-6">
                  Recover revenue on same-day surplus through GO See The City, then donate what doesn't sell.
                </p>
                <ul className="space-y-3 text-sm text-white/70">
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#92c216] mt-0.5" />
                    <span>Post offers in Hariet.AI, live on GO See The City within minutes</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#92c216] mt-0.5" />
                    <span>Consumers buy discounted meals before close</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#92c216] mt-0.5" />
                    <span>Unsold items automatically route to nonprofits</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-[#fdf8f4] border-t border-[#ede5dc]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-black mb-6">Ready to get started?</h2>
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
