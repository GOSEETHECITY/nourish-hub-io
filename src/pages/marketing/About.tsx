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
              We are building the infrastructure that turns America's food surplus into
              somebody's next meal.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-black mb-8 text-center">A supply chain problem, solved</h2>

            <div className="space-y-6 text-lg leading-relaxed">
              <p className="text-[#6d412a]/80">
                Hariet.AI is named for Harriet Tubman, a woman who worked the tools of her time
                to build a pathway that changed a country. The American food system has a similar
                opportunity in front of it today.
              </p>
              <p className="text-[#6d412a]/80">
                Roughly 40% of food produced in the United States goes to waste every year while
                one in six Americans faces food insecurity. That gap is a supply chain problem.
                Good food already exists. The infrastructure to move it from the kitchens that
                have it to the people who need it does not.
              </p>
              <p className="text-[#6d412a]/80">
                Hariet.AI is that infrastructure. Our platform runs on two pathways, and
                operators pick the one that fits how they already work:
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-10">
              <div className="rounded-2xl border border-[#ede5dc] bg-[#fdf8f4] p-6">
                <div className="text-xs font-bold text-[#6d412a] uppercase tracking-widest mb-3">
                  Donate Pathway
                </div>
                <h3 className="text-xl font-bold text-black mb-2">
                  Stadiums, convention centers, corporate cafeterias, and hospitals
                </h3>
                <p className="text-[#6d412a]/70 leading-relaxed">
                  Route every pound of surplus directly to vetted nonprofit partners nearby. No
                  consumer transactions. Tax documentation and ESG reporting handled automatically.
                </p>
              </div>

              <div className="rounded-2xl border border-black bg-[#1c0e07] text-white p-6">
                <div className="text-xs font-bold text-white uppercase tracking-widest mb-3">
                  Sell + Donate Pathway
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Restaurants, cafes, hotels, and food festivals
                </h3>
                <p className="text-white/80 leading-relaxed">
                  Recover revenue on same-day surplus through GO See The City, our consumer
                  marketplace. Sell what you can. Donate what you don't. With no edible food
                  going to waste.
                </p>
              </div>
            </div>

            <p className="text-[#6d412a]/80 text-lg leading-relaxed mt-10 text-center">
              One dashboard. Every meal accounted for. Nothing goes to the landfill.
            </p>
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
        <section className="py-24 bg-white border-t border-[#ede5dc]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-black mb-6">Join the network</h2>
            <p className="text-lg text-[#6d412a]/70 mb-10">
              Venues partner with us. Nonprofits receive from us. Consumers download us.
              There is a place here for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/get-started"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-black text-white font-bold hover:bg-[#222] transition shadow-sm text-lg"
              >
                Partner with us <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="https://hariet.ai/app/login"
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
