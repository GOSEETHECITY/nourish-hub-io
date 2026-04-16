import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export default function About() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MarketingNav variant="light" />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-white border-b border-[#ede5dc]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-black mb-4 tracking-tight">
              About Hariet.AI
            </h1>
            <p className="text-lg text-[#6d412a]/70 max-w-2xl mx-auto leading-relaxed">
              Built on a legacy of purpose. Powered by modern infrastructure.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="bg-[#fdf8f4] rounded-3xl border border-[#ede5dc] p-8 mb-8">
                  <div className="text-5xl mb-4">🌾</div>
                  <blockquote className="text-xl font-medium text-black italic leading-relaxed">
                    "Just as Harriet Tubman guided people to freedom and opportunity,
                    Hariet.AI guides surplus food to the communities who need it most."
                  </blockquote>
                </div>
              </div>
              <div>
                <h2 className="text-4xl font-bold text-black mb-6">Built on a legacy of purpose</h2>
                <p className="text-[#6d412a]/80 text-lg leading-relaxed mb-6">
                  The name Hariet.AI draws inspiration from Harriet Tubman. Someone who used the resources and systems available to her to create meaningful change for an entire community.
                </p>
                <p className="text-[#6d412a]/70 leading-relaxed mb-8">
                  We believe the food system has a similar opportunity. There is no shortage of food, only a shortage of infrastructure to move it to where it's needed. Hariet.AI is that infrastructure.
                </p>
                <p className="text-[#6d412a]/70 leading-relaxed">
                  Every day, 40% of food produced in the US goes to waste while 1 in 6 Americans face food insecurity. That gap isn't about supply. It's about logistics and incentives.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
              <div className="py-7 px-8 text-center">
                <div className="text-3xl font-bold text-white mb-1">2M+</div>
                <div className="text-sm text-white/50">Pounds Diverted</div>
              </div>
              <div className="py-7 px-8 text-center">
                <div className="text-3xl font-bold text-white mb-1">150+</div>
                <div className="text-sm text-white/50">Partner Venues</div>
              </div>
              <div className="py-7 px-8 text-center">
                <div className="text-3xl font-bold text-white mb-1">40+</div>
                <div className="text-sm text-white/50">Nonprofit Partners</div>
              </div>
              <div className="py-7 px-8 text-center">
                <div className="text-3xl font-bold text-white mb-1">12</div>
                <div className="text-sm text-white/50">Cities Active</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-[#fdf8f4] border-t border-[#ede5dc]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-black mb-6">Join the movement</h2>
            <p className="text-lg text-[#6d412a]/70 mb-10">
              Whether you're a venue, nonprofit, or consumer, there's a place for you in the Hariet.AI ecosystem.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/get-started"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#6d412a] text-white font-semibold hover:bg-[#5a3422] transition shadow-sm text-lg"
              >
                Get started <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="https://goseethecity.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-[#6d412a]/25 text-[#6d412a] font-semibold hover:bg-[#6d412a]/5 transition text-lg"
              >
                Download GO See The City
              </a>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
