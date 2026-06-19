import { useEffect } from "react";
import { ArrowRight, Check } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

const stats = [
  { value: "1 in 3", label: "Meals worth of food wasted in the U.S. annually" },
  { value: "~$3,000", label: "Lost per family of four each year to food waste" },
  { value: "#1", label: "Food is the single largest landfill material in America" },
];

const problemStats = [
  { value: "133B lbs", label: "of food wasted in the U.S. each year" },
  { value: "$3,000 / year", label: "lost per family of four roughly 11% of their food budget" },
  { value: "Landfill #1", label: "Food is America's single largest landfill contributor and the most preventable" },
];

const initiatives = [
  {
    title: "Highlight Success Stories",
    body: "Real-world examples from farms, grocers, food service providers, and waste operators showing what's already possible across America.",
  },
  {
    title: "Connect Partners",
    body: "Building bridges between food businesses and the nonprofits already serving their neighborhoods no new infrastructure required.",
  },
  {
    title: "Amplify Impact",
    body: 'Dedicated partner features, short-form social content, and the "Impact in Action" newsletter making local success visible nationally.',
  },
];

const hariFeatures = [
  { t: "Donate on Your Terms", b: "No required frequency. No minimum amount. Donate when it works for your operation." },
  { t: "We Handle Logistics", b: "Pickup coordination fully managed no extra administrative burden on your team." },
  { t: "Tax Deduction Opportunities", b: "Maximize deductions on every donation your business makes, automatically documented." },
  { t: "Impact Reports", b: "Track pounds donated and meals supported in real time shareable directly to your social channels." },
];

const servesList = [
  "Restaurants", "Hotels", "Food Trucks", "Schools", "Grocery Stores",
  "Farms", "Venues", "Stadiums", "Healthcare",
];

const gstcFeatures = [
  "Same-day surplus coupons published instantly",
  "Drives real foot traffic to local businesses",
  "Turns unsold food into revenue before it becomes waste",
  "Supports nonprofits through community engagement",
  "Works for restaurants, cafes, food trucks, grocers, and more",
];

const harietPlatformFeatures = [
  "Unified dashboard: sell, donate, and track in one place",
  "Nonprofit matching and pickup logistics managed for you",
  "Real-time impact reports (pounds, meals, tax deductions)",
  "Works for stadiums, hospitals, hotels, restaurants, schools, farms, and venues",
  "Protected under the Bill Emerson Good Samaritan Food Donation Act",
];

export default function FeedItOnward() {
  useEffect(() => {
    document.title = "Feed It Onward Go See The City × Hariet.AI × U.S. EPA Freedom 250";
    const meta = document.querySelector('meta[name="description"]');
    if (meta)
      meta.setAttribute(
        "content",
        "Go See The City and Hariet.AI are proud partners in the U.S. EPA's Freedom 250 Feed It Onward Campaign redirecting surplus food from landfills to families, veterans, and neighbors."
      );
  }, []);

  return (
    <div className="min-h-screen bg-white text-black">
      <MarketingNav variant="light" />

      {/* HERO */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#6d412a]/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6d412a]/10 text-[#6d412a] text-xs font-semibold tracking-wide uppercase mb-6">
            Go See The City × Hariet.AI × U.S. EPA Freedom 250
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight text-black mb-6 max-w-4xl mx-auto">
            No Meal Left Behind. <span className="text-[#6d412a]">No Community Overlooked.</span>
          </h1>
          <p className="text-xl text-[#6d412a]/70 leading-relaxed max-w-2xl mx-auto mb-10">
            Go See The City and Hariet.AI are proud partners in the U.S. EPA's Freedom 250 Feed It Onward Campaign a national movement to redirect surplus food from landfills to the families, veterans, and neighbors who need it most.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://hariet.ai/get-started"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#6d412a] text-white font-bold hover:bg-[#5a3422] transition shadow-sm"
            >
              Join the Movement <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#story"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-black text-white font-bold hover:bg-[#222] transition shadow-sm"
            >
              Learn Our Story
            </a>
          </div>
        </div>

        {/* Stat strip */}
        <div className="bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-white/10">
              {stats.map((s) => (
                <div key={s.label} className="py-7 px-8 text-center">
                  <div className="text-3xl font-bold text-white mb-1">{s.value}</div>
                  <div className="text-sm text-white/60">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STORY */}
      <section id="story" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-start">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6d412a]/10 text-[#6d412a] text-xs font-semibold tracking-wide uppercase mb-6">
              The Story Behind the Name
            </div>
            <h2 className="text-4xl font-bold text-black mb-6 leading-tight">
              She Never Lost a Passenger. We Won't Lose a Meal.
            </h2>
            <div className="space-y-5 text-[#6d412a]/80 leading-relaxed">
              <p>
                Harriet Tubman didn't just dream of freedom she engineered it. Through the Underground Railroad, she built a network of safe houses, trusted partners, and seamless handoffs that guided hundreds of people to safety. She operated through ingenuity, courage, and the willingness of ordinary people farmers, business owners, community members to open their doors and share what they had.
              </p>
              <p>
                Hariet.AI carries that name and that mission into today's food system. The platform is a modern Underground Railroad for surplus food: a technology-powered network of restaurants, stadiums, hotels, healthcare operators, and nonprofits working together to ensure that what goes unsold doesn't go to waste.
              </p>
              <p>
                Go See The City extends that network one step further creating same-day coupons that give customers a reason to walk through the door before closing time, turning surplus into sales and saving food before it ever needs to be donated.
              </p>
            </div>
          </div>
          <div className="rounded-3xl bg-[#1c0e07] text-white p-10 border-l-4 border-[#6d412a]">
            <blockquote className="text-2xl font-semibold leading-snug italic">
              "I never ran my train off the track and I never lost a passenger."
            </blockquote>
            <div className="text-sm text-white/60 mt-4 font-medium"> Harriet Tubman</div>
            <div className="w-10 h-px bg-white/20 my-8" />
            <p className="text-white/80 text-sm leading-relaxed">
              Hariet.AI honors her legacy by making sure no meal and no community is ever left behind.
            </p>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="py-24 bg-[#fdf8f4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6d412a]/10 text-[#6d412a] text-xs font-semibold tracking-wide uppercase mb-6">
            Why This Matters
          </div>
          <h2 className="text-4xl font-bold text-black mb-4 max-w-3xl mx-auto">
            America Wastes Too Much. Together, We Can Change That.
          </h2>
          <p className="text-lg text-[#6d412a]/70 max-w-2xl mx-auto mb-14 leading-relaxed">
            More than one-third of all food in the United States goes uneaten and most of it ends up in landfills. The solution isn't a new system. It's activating the one we already have.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {problemStats.map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-2xl border border-[#ede5dc] p-8 hover:border-black/40 hover:shadow-md transition"
              >
                <div className="text-3xl font-bold text-[#6d412a] mb-3">{s.value}</div>
                <div className="text-sm text-[#6d412a]/80 leading-relaxed">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TWO PLATFORMS */}
      <section id="platforms" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6d412a]/10 text-[#6d412a] text-xs font-semibold tracking-wide uppercase mb-6">
              Our Ecosystem
            </div>
            <h2 className="text-4xl font-bold text-black mb-4">Two Platforms. One Mission. Zero Waste.</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* GSTC */}
            <div className="rounded-3xl bg-[#fdf8f4] border border-[#ede5dc] p-8">
              <div className="text-xs font-semibold tracking-wide uppercase text-[#6d412a] mb-3">The Commerce Layer</div>
              <h3 className="text-2xl font-bold text-black mb-2">Go See The City</h3>
              <p className="text-lg font-semibold text-black mb-4">Turn Closing Time Into Community Time</p>
              <p className="text-[#6d412a]/80 mb-6 leading-relaxed">
                Go See The City drives foot traffic to local businesses by enabling them to create same-day coupons for surplus food giving customers a reason to show up before closing and giving businesses a way to convert unsold inventory into revenue instead of waste.
              </p>
              <ul className="space-y-3 mb-8">
                {gstcFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-black">
                    <Check className="w-4 h-4 text-[#6d412a] mt-0.5 flex-shrink-0" strokeWidth={3} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="https://goseethecity.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#6d412a] text-white font-semibold hover:bg-[#5a3422] transition"
              >
                Visit goseethecity.com <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Hariet */}
            <div className="rounded-3xl bg-[#1c0e07] text-white p-8">
              <div className="text-xs font-semibold tracking-wide uppercase text-white/60 mb-3">The Operating System</div>
              <h3 className="text-2xl font-bold mb-2">Hariet.AI</h3>
              <p className="text-lg font-semibold mb-4">One Dashboard. Every Meal. Nothing Wasted.</p>
              <p className="text-white/80 mb-6 leading-relaxed">
                Hariet.AI is the operating system for food businesses that want to eliminate waste entirely. Stadiums, restaurants, hotels, and healthcare operators use one unified dashboard to sell, donate, and track every meal that would otherwise be thrown away connecting seamlessly with nonprofits in their own communities.
              </p>
              <ul className="space-y-3 mb-8">
                {harietPlatformFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-white">
                    <Check className="w-4 h-4 text-white mt-0.5 flex-shrink-0" strokeWidth={3} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="https://hariet.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition"
              >
                Visit hariet.ai <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IS FEED IT ONWARD */}
      <section className="py-24 bg-[#fdf8f4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6d412a]/10 text-[#6d412a] text-xs font-semibold tracking-wide uppercase mb-6">
              EPA's Freedom 250 Initiative
            </div>
            <h2 className="text-4xl font-bold text-black mb-6 leading-tight">
              A National Movement Built on American Ingenuity
            </h2>
            <div className="space-y-4 text-[#6d412a]/80 leading-relaxed">
              <p>
                Feed It Onward is the U.S. EPA's national storytelling and partnership initiative, launched as part of Freedom 250 America's 250th birthday celebration. It shines a light on the farms, businesses, nonprofits, and communities already doing the work of keeping food in use and out of landfills.
              </p>
              <p>
                This isn't about new mandates or big spending. It's about celebrating what's already working. Feed It Onward tells that story and Go See The City and Hariet.AI are proud to be part of it.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {initiatives.map((t) => (
              <div
                key={t.title}
                className="bg-white rounded-2xl border border-[#ede5dc] p-6 hover:border-black/40 hover:shadow-md transition"
              >
                <h3 className="font-bold text-black mb-2">{t.title}</h3>
                <p className="text-sm text-[#6d412a]/70 leading-relaxed">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW HARIET POWERS */}
      <section id="how" className="grid md:grid-cols-2">
        <div className="bg-[#1c0e07] text-white p-12 lg:p-16 flex items-center">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold tracking-wide uppercase mb-6">
              Powered by Hariet.AI
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
              The Technology Behind the Mission
            </h2>
            <p className="text-white/80 leading-relaxed mb-4">
              Hariet.AI handles the logistics so food businesses don't have to. From restaurants and hotels to food trucks, stadiums, grocery stores, farms, schools, and venues if you have surplus food, Hariet.AI connects you with a nonprofit neighbor, tracks every pound, and generates the impact reports and tax documentation your business needs.
            </p>
            <p className="text-xs text-white/50 italic mb-6">
              Food donations are protected under the Bill Emerson Good Samaritan Food Donation Act.
            </p>
            <a
              href="https://hariet.ai/get-started"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition"
            >
              Get Started at Hariet.AI <ArrowRight className="w-4 h-4" />
            </a>
            <div className="text-sm text-white/70 mt-4">
              <a href="mailto:goseethecity@gmail.com" className="hover:text-white transition">goseethecity@gmail.com</a> | 352-900-1505
            </div>
          </div>
        </div>
        <div className="bg-[#fdf8f4] p-12 lg:p-16 flex items-center">
          <div className="grid sm:grid-cols-2 gap-5 w-full">
            {hariFeatures.map((f) => (
              <div
                key={f.t}
                className="bg-white p-6 rounded-2xl border border-[#ede5dc] hover:border-black/40 hover:shadow-md transition"
              >
                <div className="font-bold text-black mb-2">{f.t}</div>
                <div className="text-sm text-[#6d412a]/70 leading-relaxed">{f.b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO HARIET SERVES */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6d412a]/10 text-[#6d412a] text-xs font-semibold tracking-wide uppercase mb-6">
            Built for Every Food Business
          </div>
          <h2 className="text-4xl font-bold text-black mb-10">
            Whatever You Serve. Whatever Remains.
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {servesList.map((label) => (
              <span
                key={label}
                className="px-4 py-2 rounded-full bg-[#fdf8f4] border border-[#ede5dc] text-[#6d412a] text-sm font-semibold"
              >
                {label}
              </span>
            ))}
          </div>
          <p className="text-sm text-[#6d412a]/60 mt-8">
            If you serve food, Hariet.AI has a place for you in the network.
          </p>
        </div>
      </section>

      {/* GET INVOLVED */}
      <section id="get-involved" className="py-24 bg-[#fdf8f4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6d412a]/10 text-[#6d412a] text-xs font-semibold tracking-wide uppercase mb-6">
              Take Action
            </div>
            <h2 className="text-4xl font-bold text-black">Ready to Feed More and Waste Less?</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-3xl bg-white border border-[#ede5dc] p-10 flex flex-col">
              <h3 className="text-2xl font-bold text-black mb-4">Turn Surplus Into Impact</h3>
              <p className="text-[#6d412a]/80 leading-relaxed mb-6">
                Whether you run a restaurant, stadium, hotel, grocery store, school, or healthcare facility Hariet.AI connects you with nonprofits in your own community and handles everything else. No required minimums. No extra overhead. Just impact.
              </p>
              <div className="text-sm text-[#6d412a]/80 space-y-1 mb-8">
                <div>
                  <a href="mailto:goseethecity@gmail.com" className="hover:text-[#6d412a] transition">goseethecity@gmail.com</a>
                </div>
                <div>352-900-1505</div>
                <div>
                  <a href="https://hariet.ai" target="_blank" rel="noopener noreferrer" className="hover:text-[#6d412a] transition">www.Hariet.AI</a>
                </div>
              </div>
              <div className="mt-auto">
                <a
                  href="https://hariet.ai/get-started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#6d412a] text-white font-bold hover:bg-[#5a3422] transition shadow-sm"
                >
                  Get Started at Hariet.AI <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="rounded-3xl bg-[#1c0e07] text-white p-10 flex flex-col">
              <h3 className="text-2xl font-bold mb-4">Shop Surplus. Save Money. Feed Your City.</h3>
              <p className="text-white/80 leading-relaxed mb-8">
                Go See The City makes it easy to find same-day deals on surplus food from businesses in your neighborhood saving you money while keeping good food out of the landfill. Every coupon redeemed is a meal saved and a local business supported.
              </p>
              <div className="mt-auto">
                <a
                  href="https://goseethecity.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition shadow-sm"
                >
                  Find Deals at GoSeeTheCity.com <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
