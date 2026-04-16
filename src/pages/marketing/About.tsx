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
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="bg-[#fdf8f4] rounded-3xl border border-[#ede5dc] p-8">
                  <div className="text-5xl mb-4">🌾</div>
                  <blockquote className="text-xl font-medium text-black italic leading-relaxed">
                    "Harriet Tubman used the systems she had to guide people to freedom.
                    Hariet.AI uses the systems we have to guide surplus food to the people who need it."
                  </blockquote>
                </div>
              </div>
              <div>
                <h2 className="text-4xl font-bold text-black mb-6">A name, and a mission, with history behind it</h2>
                <p className="text-[#6d412a]/80 text-lg leading-relaxed mb-6">
                  Hariet.AI is named for Harriet Tubman, a woman who worked the tools of her time
                  to build a pathway that changed a country. The American food system has a similar
                  opportunity in front of it today.
                </p>
                <p className="text-[#6d412a]/70 leading-relaxed mb-6">
                  Roughly 40% of the food produced in the United States goes to waste every year,
                  while one in six Americans faces food insecurity. That gap is not a supply problem.
                  It is a logistics, incentives, and software problem.
                </p>
                <p className="text-[#6d412a]/70 leading-relaxed">
                  Hariet.AI solves it by giving stadiums, restaurants, hotels, and hospitals one
                  dashboard to sell or donate their surplus, and by putting a consumer marketplace,
                  GO See The City, on top of it so diners can buy what's left before it's gone.
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
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#6d412a] text-white font-semibold hover:bg-[#5a3422] transition shadow-sm text-lg"
              >
                Partner with us <ArrowRight className="w-5 h-5" />
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
