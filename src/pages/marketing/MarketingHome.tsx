import { Link } from "react-router-dom";
import { ArrowRight, Building2, UtensilsCrossed, Heart, BarChart3, Leaf, ChevronRight } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

const stats = [
  { value: "2M+", label: "Pounds Diverted" },
  { value: "150+", label: "Partner Venues" },
  { value: "40+", label: "Nonprofit Partners" },
  { value: "12", label: "Cities Active" },
];

const donateSteps = [
  { num: "01", title: "Log your surplus", desc: "Staff enter available food inventory in Hariet.AI at the end of an event or shift." },
  { num: "02", title: "Automatic matching", desc: "The platform instantly matches your surplus to vetted nonprofit partners in your city." },
  { num: "03", title: "Pickup & documentation", desc: "Nonprofits collect the food. Hariet.AI generates your tax documentation and ESG impact report." },
];

const sellSteps = [
  { num: "01", title: "Post a same-day offer", desc: "Staff post available surplus in Hariet.AI — it appears as a discount offer on GO See The City within minutes." },
  { num: "02", title: "Consumers purchase", desc: "Local consumers buy discounted meals through the app before your close. Real revenue, zero waste." },
  { num: "03", title: "Donate the rest", desc: "Anything unsold automatically routes to nonprofits. Nothing goes to the landfill." },
];

const industries = [
  { icon: Building2, title: "Stadiums & Arenas", desc: "Post-event surplus donated to local food banks automatically. Zero waste events, maximum community impact.", pathway: "Donate" },
  { icon: UtensilsCrossed, title: "Restaurants & Cafes", desc: "Sell end-of-day surplus at a discount, drive foot traffic before close, and donate what remains.", pathway: "Sell + Donate" },
  { icon: Building2, title: "Hotels & Hospitality", desc: "Daily kitchen surplus sold to guests and neighboring consumers, remainder donated to community partners.", pathway: "Sell + Donate" },
  { icon: Building2, title: "Convention Centers", desc: "Large-scale event surplus routed directly to city-wide nonprofit networks after every event.", pathway: "Donate" },
  { icon: Building2, title: "Corporate HQs", desc: "Cafeteria surplus diverted to employee community giving programs and local food shelters.", pathway: "Donate" },
  { icon: Heart, title: "Healthcare Facilities", desc: "Cafeteria and dining surplus handled with full HIPAA-aware documentation and nonprofit routing.", pathway: "Donate" },
];

export default function MarketingHome() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav variant="light" />

      {/* ── HERO ─────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white">
        {/* Subtle warm radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#6d412a]/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6d412a]/10 border border-[#6d412a]/20 text-[#6d412a] text-sm font-medium mb-8">
              <Leaf className="w-3.5 h-3.5" />
              Enterprise Food Diversion Platform
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight text-black mb-6">
              Food doesn't have to{" "}
              <span className="text-[#6d412a]">go to waste.</span>
            </h1>

            <p className="text-xl text-[#6d412a]/70 leading-relaxed max-w-2xl mx-auto mb-10">
              Hariet.AI connects venues, restaurants, and institutions with the
              communities and consumers who need their surplus most —
              automatically, compliantly, and at scale.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#6d412a] text-white font-semibold hover:bg-[#5a3422] transition shadow-sm"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/solutions"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-[#6d412a]/25 text-[#6d412a] font-semibold hover:bg-[#6d412a]/5 transition"
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
              Every venue operates differently. Hariet.AI handles both — whether
              you donate everything or sell surplus before donating the rest.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Donate Pathway */}
            <div className="rounded-3xl bg-[#fdf8f4] border border-[#ede5dc] p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6d412a]/10 text-[#6d412a] text-xs font-semibold tracking-wide uppercase mb-6">
                <Heart className="w-3.5 h-3.5" />
                Donate Pathway
              </div>
              <h3 className="text-2xl font-bold text-black mb-2">Donate your surplus</h3>
              <p className="text-[#6d412a]/70 mb-8">
                For stadiums, arenas, convention centers, and institutions that
                route all surplus directly to nonprofit partners — no consumer
                transactions, no complexity.
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6d412a]/50 text-[#e8c9a8] text-xs font-semibold tracking-wide uppercase mb-6">
                <BarChart3 className="w-3.5 h-3.5" />
                Sell + Donate Pathway
              </div>
              <h3 className="text-2xl font-bold mb-2">Sell surplus. Donate the rest.</h3>
              <p className="text-white/60 mb-8">
                For restaurants, cafes, and hospitality venues that want to
                recover revenue on same-day surplus — then donate whatever
                doesn't sell.
              </p>
              <div className="space-y-6">
                {sellSteps.map((step) => (
                  <div key={step.num} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#6d412a] text-white text-sm font-bold flex items-center justify-center">
                      {step.num}
                    </div>
                    <div>
                      <div className="font-semibold text-white mb-1">{step.title}</div>
                      <div className="text-sm text-white/60 leading-relaxed">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">Best for</p>
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
            <h2 className="text-4xl font-bold text-black mb-4">Built for every venue that serves food</h2>
            <p className="text-lg text-[#6d412a]/70 max-w-2xl mx-auto">
              From post-game stadium kitchens to end-of-service restaurant prep —
              Hariet.AI fits your operation.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries.map((ind) => (
              <div key={ind.title} className="bg-white rounded-2xl border border-[#ede5dc] p-6 hover:border-[#6d412a]/40 hover:shadow-md transition group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#6d412a]/10 flex items-center justify-center group-hover:bg-[#6d412a]/20 transition">
                    <ind.icon className="w-5 h-5 text-[#6d412a]" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    ind.pathway === "Donate"
                      ? "bg-[#6d412a]/10 text-[#6d412a]"
                      : "bg-[#1c0e07] text-white"
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

      {/* ── GO SEE THE CITY BRIDGE ───────────────── */}
      <section className="py-24 bg-[#1a1a1a] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#fb9014]/20 text-[#fb9014] text-sm font-semibold mb-6">
                <span className="w-2 h-2 rounded-full bg-[#fb9014]" />
                Consumer Layer
              </div>
              <h2 className="text-4xl font-bold mb-6">
                Your surplus becomes a{" "}
                <span className="text-[#fb9014]">same-day deal</span>{" "}
                in your city.
              </h2>
              <p className="text-white/70 text-lg leading-relaxed mb-8">
                Restaurant and hospitality partners on the Sell + Donate pathway
                automatically power the GO See The City consumer app. Your
                surplus offers appear in real time, driving new customers through
                your doors before close.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "Offers posted in Hariet.AI appear on GO See The City in minutes",
                  "Consumers in your city discover and purchase surplus items",
                  "Unsold items auto-route to nonprofits — nothing is wasted",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3 text-white/70 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#92c216]/20 flex items-center justify-center mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-[#92c216]" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              <a
                href="https://goseethecity.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#fb9014] text-white font-semibold hover:bg-[#e08010] transition"
              >
                See GO See The City <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#fb9014]/20 to-[#92c216]/20 rounded-3xl blur-2xl" />
              <div className="relative bg-[#2a2a2a] rounded-3xl border border-white/10 p-8 text-center">
                <div className="text-6xl mb-4">📱</div>
                <div className="text-2xl font-bold text-[#fb9014] mb-2">GO See The City</div>
                <p className="text-white/60 text-sm mb-6">
                  The consumer marketplace powered by Hariet.AI
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-2xl p-4">
                    <div className="text-2xl font-bold text-[#92c216]">4.8★</div>
                    <div className="text-xs text-white/50 mt-1">App Store rating</div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4">
                    <div className="text-2xl font-bold text-[#fb9014]">23</div>
                    <div className="text-xs text-white/50 mt-1">Published events</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MISSION ──────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-[#fdf8f4] rounded-3xl border border-[#ede5dc] p-8">
                <div className="text-5xl mb-6">🌾</div>
                <blockquote className="text-xl font-medium text-black italic leading-relaxed">
                  "Just as Harriet Tubman guided people to freedom and opportunity,
                  Hariet.AI guides surplus food to the communities who need it most."
                </blockquote>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl font-bold text-black mb-6">Built on a legacy of purpose</h2>
              <p className="text-[#6d412a]/80 text-lg leading-relaxed mb-6">
                The name Hariet.AI draws inspiration from Harriet Tubman — someone
                who used the resources and systems available to her to create
                meaningful change for an entire community.
              </p>
              <p className="text-[#6d412a]/70 leading-relaxed mb-8">
                We believe the food system has a similar opportunity. There is no
                shortage of food — only a shortage of infrastructure to move it
                to where it's needed. Hariet.AI is that infrastructure.
              </p>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 text-[#6d412a] font-semibold hover:gap-3 transition-all"
              >
                Read our story <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────── */}
      <section className="py-24 bg-[#fdf8f4] border-t border-[#ede5dc]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-6">
            Ready to divert your surplus?
          </h2>
          <p className="text-[#6d412a]/70 text-lg mb-10 leading-relaxed">
            Whether you're a stadium feeding thousands after a game or a restaurant
            closing for the night — Hariet.AI has a pathway for your operation.
            Get set up in days, not months.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#6d412a] text-white font-semibold hover:bg-[#5a3422] transition shadow-sm text-lg"
            >
              Get Started <ArrowRight className="w-5 h-5" />
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
