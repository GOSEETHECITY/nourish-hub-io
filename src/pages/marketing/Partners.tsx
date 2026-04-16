import { Link } from "react-router-dom";
import { ArrowRight, Building2, UtensilsCrossed, Hotel, Briefcase, Stethoscope, HandHeart, Users } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

const partners = [
  { icon: Building2, title: "Stadiums & Arenas", desc: "Turn post-event surplus into guaranteed nonprofit donations with one tap, tax documentation included.", pathway: "Donate" },
  { icon: UtensilsCrossed, title: "Restaurants & Cafes", desc: "Recover revenue on end-of-day surplus, bring new customers in before close, and donate what's left.", pathway: "Sell + Donate" },
  { icon: Hotel, title: "Hotels & Hospitality", desc: "Move daily kitchen surplus to paying diners and neighbors, and give the remainder to community partners.", pathway: "Sell + Donate" },
  { icon: Users, title: "Convention Centers", desc: "Send large-scale event surplus directly into city-wide nonprofit networks the moment a show ends.", pathway: "Donate" },
  { icon: Briefcase, title: "Corporate HQs", desc: "Route cafeteria surplus into employee-backed community giving programs and local food shelters.", pathway: "Donate" },
  { icon: Stethoscope, title: "Healthcare Facilities", desc: "Handle cafeteria and patient dining surplus with HIPAA-aware documentation and vetted nonprofit pickups.", pathway: "Donate" },
  { icon: HandHeart, title: "Nonprofits", desc: "Join the recipient network and receive real-time alerts, pickup scheduling, and same-day food from local venues.", pathway: "Receive" },
];

export default function Partners() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MarketingNav variant="light" />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-white border-b border-[#ede5dc]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-black mb-4 tracking-tight">
              Partner with us
            </h1>
            <p className="text-lg text-[#6d412a]/70 max-w-2xl mx-auto leading-relaxed">
              From stadiums to neighborhood kitchens to the nonprofits who feed the block,
              Hariet.AI plugs every part of the food system into one simple workflow.
            </p>
          </div>
        </section>

        {/* Partners Grid */}
        <section className="py-24 bg-[#fdf8f4]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.map((partner) => (
                <div key={partner.title} className="bg-white rounded-2xl border border-[#ede5dc] p-6 hover:border-black/40 hover:shadow-md transition group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center group-hover:bg-black/10 transition">
                      <partner.icon className="w-5 h-5 text-black" />
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      partner.pathway === "Donate"
                        ? "bg-[#6d412a]/10 text-[#6d412a]"
                        : partner.pathway === "Sell + Donate"
                        ? "bg-[#1c0e07] text-white"
                        : "bg-[#92c216]/15 text-[#4a6a0c]"
                    }`}>
                      {partner.pathway}
                    </span>
                  </div>
                  <h3 className="font-bold text-black mb-2">{partner.title}</h3>
                  <p className="text-sm text-[#6d412a]/70 leading-relaxed">{partner.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-white border-t border-[#ede5dc]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-black mb-6">See yourself here?</h2>
            <p className="text-lg text-[#6d412a]/70 mb-10">
              Your operation, your pathway, one simple signup. We'll take it from there.
            </p>
            <Link
              to="/get-started"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#6d412a] text-white font-semibold hover:bg-[#5a3422] transition shadow-sm text-lg"
            >
              Get started <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
