import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  UtensilsCrossed,
  Heart,
  BarChart3,
  ChevronRight,
  Hotel,
  Briefcase,
  Stethoscope,
  HandHeart,
  Users,
  Check,
} from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import AppScreens from "@/components/marketing/AppScreens";

const stats = [
  { value: "2M+", label: "Pounds Diverted" },
  { value: "150+", label: "Partner Venues" },
  { value: "40+", label: "Nonprofit Partners" },
  { value: "12", label: "Cities Active" },
];

const donateSteps = [
  { num: "01", title: "Log your surplus", desc: "Staff enter available food inventory in Hariet.AI at the close of a shift or event." },
  { num: "02", title: "We match it in real time", desc: "The platform routes your surplus to vetted nonprofit partners nearby, within minutes." },
  { num: "03", title: "Pickup and paperwork", desc: "Nonprofits collect the food. Hariet.AI generates your tax documentation and ESG reporting automatically." },
];

const sellSteps = [
  { num: "01", title: "Post a same-day offer", desc: "Log available surplus in Hariet.AI, and it appears as a limited-time deal on GO See The City within minutes." },
  { num: "02", title: "Local diners buy before close", desc: "People in your city discover, buy, and pick up discounted meals before you lock up for the night." },
  { num: "03", title: "The rest feeds the community", desc: "Sell what you can. Donate what you don't. Waste nothing." },
];

const industries = [
  { icon: Building2, title: "Stadiums & Arenas", desc: "Turn post-event surplus into guaranteed nonprofit donations with one tap, tax documentation included.", pathway: "Donate" },
  { icon: UtensilsCrossed, title: "Restaurants & Cafes", desc: "Recover revenue on end-of-day surplus, bring new customers in before close, and donate what's left.", pathway: "Sell + Donate" },
  { icon: Hotel, title: "Hotels & Hospitality", desc: "Move daily kitchen surplus to paying diners and neighbors, and give the remainder to community partners.", pathway: "Sell + Donate" },
  { icon: Users, title: "Convention Centers", desc: "Send large-scale event surplus directly into city-wide nonprofit networks the moment a show ends.", pathway: "Donate" },
  { icon: Briefcase, title: "Corporate HQs", desc: "Route cafeteria surplus into employee-backed community giving programs and local food shelters.", pathway: "Donate" },
  { icon: Stethoscope, title: "Healthcare Facilities", desc: "Handle cafeteria and patient dining surplus with HIPAA-aware documentation and vetted nonprofit pickups.", pathway: "Donate" },
  { icon: HandHeart, title: "Nonprofits", desc: "Join the recipient network and receive real-time alerts, pickup scheduling, and same-day food from local venues.", pathway: "Receive" },
];

export default function MarketingHome() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav variant="light" />

      {/* ── HERO ─────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#6d412a]/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight text-black mb-6 mt-4">
              Good food shouldn't{" "}
              <span className="text-[#6d412a]">go to waste.</span>
            </h1>

            <p className="text-xl text-[#6d412a]/70 leading-relaxed max-w-2xl mx-auto mb-10">
              Hariet.AI is the operating system for surplus food. Stadiums, restaurants, hotels,
              and healthcare operators use one dashboard to sell, donate, and track every meal
              that would have otherwise been thrown away.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/get-started"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-black text-white font-bold hover:bg-[#222] transition shadow-sm"
              >
                Partner With Us <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/solutions"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-black text-white font-bold hover:bg-[#222] transition shadow-sm"
              >
                See How It Works <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
              {stats.map((s) => (
                <div key={s.label} className="py-7 px-8 text-center">
                  <div className="text-3xl font-bold text-white mb-1">{s.value}</div>
                  <div className="text-sm text-white/50">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TWO PATHWAYS ─────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-black mb-4">One platform. Two pathways.</h2>
            <p className="text-lg text-[#6d412a]/70 max-w-2xl mx-auto">
              Every kitchen operates differently. Hariet.AI fits either model, whether you donate
              every pound of surplus or sell what you can and give the rest.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Donate Pathway */}
            <div className="rounded-3xl bg-[#fdf8f4] border border-[#ede5dc] p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6d412a]/10 text-[#6d412a] text-xs font-semibold tracking-wide uppercase mb-6">
                <Heart className="w-3.5 h-3.5" />
                Donate Pathway
              </div>
              <h3 className="text-2xl font-bold text-black mb-2">Donate every pound.</h3>
              <p className="text-[#6d412a]/70 mb-8">
                Built for stadiums, arenas, convention centers, and institutions that route all
                surplus directly to nonprofit partners. No consumer transactions. No complexity.
                Just a clean handoff.
              </p>
              <div className="space-y-6">
                {donateSteps.map((step) => (
                  <div key={step.num} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#6d412a] text-white text-sm font-bold flex items-center justify-center">
                      {step.num}
                    </div>
                    <div>
                      <div className="font-semibold text-black mb-1">{step.title}</div>
                      <div className="text-sm text-[#6d412a]/70 leading-relaxed">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-[#ede5dc]">
                <p className="text-xs font-semibold text-[#6d412a]/50 uppercase tracking-wide mb-3">Best for</p>
                <div className="flex flex-wrap gap-2">
                  {["Stadiums & Arenas", "Convention Centers", "Corporate HQs", "Healthcare", "Airports"].map((t) => (
                    <span key={t} className="px-3 py-1 rounded-full bg-[#6d412a]/10 text-[#6d412a] text-xs font-medium">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sell + Donate Pathway */}
            <div className="rounded-3xl bg-[#1c0e07] text-white p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold tracking-wide uppercase mb-6">
                <BarChart3 className="w-3.5 h-3.5" />
                Sell + Donate Pathway
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Sell what you can. Donate the rest.</h3>
              <p className="text-white mb-8">
                Built for restaurants, cafes, and hotels that want to recover revenue on same-day
                surplus, drive new customers through the door, and send everything that doesn't
                sell straight to a local nonprofit.
              </p>
              <div className="space-y-6">
                {sellSteps.map((step) => (
                  <div key={step.num} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#92c216] text-white text-sm font-bold flex items-center justify-center">
                      {step.num}
                    </div>
                    <div>
                      <div className="font-semibold text-white mb-1">{step.title}</div>
                      <div className="text-sm text-white leading-relaxed">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-xs font-semibold text-white uppercase tracking-wide mb-3">Best for</p>
                <div className="flex flex-wrap gap-2">
                  {["Restaurants", "Cafes & Bakeries", "Hotels", "Food Festivals", "Campus Dining"].map((t) => (
                    <span key={t} className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INDUSTRIES ───────────────────────────── */}
      <section className="py-24 bg-[#fdf8f4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-black mb-4">Built for every partner in the food system</h2>
            <p className="text-lg text-[#6d412a]/70 max-w-2xl mx-auto">
              Stadium kitchens, neighborhood restaurants, corporate cafeterias, and the nonprofits
              that feed the block. One platform, tailored to how you already work.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries.map((ind) => (
              <div
                key={ind.title}
                className={`bg-white rounded-2xl border border-[#ede5dc] p-6 hover:border-black/40 hover:shadow-md transition group ${
                  ind.pathway === "Receive" ? "lg:col-start-2 sm:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center group-hover:bg-black/10 transition">
                    <ind.icon className="w-5 h-5 text-black" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    ind.pathway === "Donate"
                      ? "bg-[#6d412a]/10 text-[#6d412a]"
                      : ind.pathway === "Sell + Donate"
                      ? "bg-[#1c0e07] text-white"
                      : "bg-[#92c216]/15 text-[#4a6a0c]"
                  }`}>
                    {ind.pathway}
                  </span>
                </div>
                <h3 className="font-bold text-black mb-2">{ind.title}</h3>
                <p className="text-sm text-[#6d412a]/70 leading-relaxed">{ind.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GO SEE THE CITY CONSUMER APP ──────────── */}
      <section className="py-24 bg-[#1a1a1a] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#fb9014]/20 text-[#fb9014] text-sm font-semibold mb-6">
                <span className="w-2 h-2 rounded-full bg-[#fb9014]" />
                For Food Lovers
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight text-white">
                Half-off deals.{" "}
                <span className="text-[#fb9014]">Grand openings.</span>{" "}
                Your city, on your phone.
              </h2>
              <p className="text-white text-lg leading-relaxed mb-8">
                GO See The City is where our partners' surplus becomes your next great meal, and
                where every grand opening in the country lands first. Find new restaurants the day
                they open their doors, score same-day deals up to 70% off from local favorites,
                and support a neighborhood that wastes less.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "Grand openings in every city, nationwide",
                  "Up to 70% off from local restaurants, cafes, and hotels",
                  "Every purchase keeps good food out of the landfill",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3 text-white text-base">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#92c216] flex items-center justify-center mt-1">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="https://apps.apple.com/app/go-see-the-city/id1580226473"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#fb9014] text-white font-semibold hover:bg-[#e08010] transition shadow-lg"
                >
                  Download the App <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="https://goseethecity.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/10 transition"
                >
                  Visit GO See The City
                </a>
              </div>
            </div>

            <div className="relative">
              <AppScreens />
            </div>
          </div>
        </div>
      </section>

      {/* ── MISSION ──────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-black mb-6">A supply chain problem, solved</h2>
          <p className="text-[#6d412a]/80 text-lg leading-relaxed mb-6">
            Roughly 40% of food produced in the United States goes to waste every year while one
            in six Americans faces food insecurity. The gap is not about supply. Good food
            already exists. The infrastructure to move it from the kitchens that have it to the
            people who need it does not.
          </p>
          <p className="text-[#6d412a]/70 leading-relaxed mb-8">
            Hariet.AI is that infrastructure. One dashboard connects venues to vetted nonprofits
            and to local diners, and every meal is tracked and documented along the way.
          </p>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 text-[#6d412a] font-semibold hover:gap-3 transition-all"
          >
            Read our story <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────── */}
      <section className="py-24 bg-white border-t border-[#ede5dc]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-6">
            Put your surplus to work.
          </h2>
          <p className="text-[#6d412a]/70 text-lg mb-10 leading-relaxed">
            Whether you're a stadium feeding thousands after a game or a restaurant closing the
            kitchen for the night, Hariet.AI has a pathway built for your operation. Onboard in
            days, not months.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/get-started"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#6d412a] text-white font-semibold hover:bg-[#5a3422] transition shadow-sm text-lg"
            >
              Partner With Us <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-[#6d412a]/25 text-[#6d412a] font-semibold hover:bg-[#6d412a]/5 transition text-lg"
            >
              Log In to Dashboard
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
