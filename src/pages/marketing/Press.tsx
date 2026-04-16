import { ArrowUpRight } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

const pressReleases = [
  {
    outlet: "Black Wall Street Times",
    title: "GO See The City: Redirecting Food Waste to Those Facing Hunger",
    url: "https://theblackwallsttimes.com/2024/04/01/go-see-the-city-redirecting-food-waste-to-those-facing-hunger/",
    date: "April 1, 2024",
    category: "Feature",
  },
  {
    outlet: "Inc.",
    title: "She Built a Clever App to Tackle Food Waste",
    url: "https://www.inc.com/farrell-evans/she-built-a-clever-app-to-tackle-food-waste/91148352",
    date: "2024",
    category: "Founder Profile",
  },
  {
    outlet: "OKCFOX",
    title: "Levy Restaurant and GO See The City Donate Thunder, OU Games Leftover Food",
    url: "https://okcfox.com/news/local/levy-restaurant-and-go-see-the-city-donate-thunder-ou-games-leftover-food-food-desert-landfills-waste-hunger-university-of-oklahoma-football-spring-game-oklahoma-city-thunder-norman",
    date: "2024",
    category: "Partnership",
  },
];

export default function Press() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MarketingNav variant="light" />

      <main className="flex-1 bg-white">
        {/* Hero */}
        <section className="bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold text-black/50 uppercase tracking-widest mb-6">
                Press
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-black tracking-tight leading-[1.05] mb-8">
                In the news.
              </h1>
              <p className="text-xl text-black/70 leading-relaxed max-w-2xl">
                Coverage of Hariet.AI, GO See The City, and our mission to move
                surplus food to the communities who need it most.
              </p>
            </div>
          </div>
        </section>

        {/* Press Releases Grid */}
        <section className="bg-white border-t border-black/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {pressReleases.map((release, idx) => (
              <a
                key={idx}
                href={release.url}
                target="_blank"
                rel="noreferrer"
                className="group block border-b border-black/10 py-10 sm:py-12 hover:bg-black/[0.02] transition -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
                  <div className="sm:col-span-2">
                    <div className="text-sm text-black/50 font-medium">
                      {release.date}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-sm font-semibold text-black uppercase tracking-wide">
                      {release.outlet}
                    </div>
                  </div>
                  <div className="sm:col-span-7">
                    <h3 className="text-2xl sm:text-3xl font-bold text-black leading-tight group-hover:underline underline-offset-4 decoration-2">
                      {release.title}
                    </h3>
                    <div className="mt-3 text-sm text-black/50 uppercase tracking-wider">
                      {release.category}
                    </div>
                  </div>
                  <div className="sm:col-span-1 flex sm:justify-end">
                    <div className="w-12 h-12 rounded-full border border-black/20 flex items-center justify-center group-hover:bg-black group-hover:border-black transition">
                      <ArrowUpRight className="w-5 h-5 text-black group-hover:text-white transition" />
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Media Inquiries */}
        <section className="bg-white border-t border-black/10 py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
              <div>
                <div className="text-sm font-semibold text-black/50 uppercase tracking-widest mb-6">
                  Media Inquiries
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold text-black tracking-tight leading-tight mb-6">
                  Writing about us?
                </h2>
                <p className="text-lg text-black/70 leading-relaxed">
                  We are happy to share our story, provide product demos, or
                  connect you with partners, venues, and nonprofits using the
                  platform today.
                </p>
              </div>
              <div className="flex flex-col justify-end">
                <div className="space-y-6">
                  <div>
                    <div className="text-sm font-semibold text-black/50 uppercase tracking-wider mb-2">
                      Email
                    </div>
                    <a
                      href="mailto:Hello@Hariet.AI"
                      className="text-2xl font-bold text-black hover:underline underline-offset-4 decoration-2"
                    >
                      Hello@Hariet.AI
                    </a>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-black/50 uppercase tracking-wider mb-2">
                      Phone
                    </div>
                    <a
                      href="tel:+18449746277"
                      className="text-2xl font-bold text-black hover:underline underline-offset-4 decoration-2"
                    >
                      844-974-6277
                    </a>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-black/50 uppercase tracking-wider mb-2">
                      Location
                    </div>
                    <div className="text-2xl font-bold text-black">
                      Tampa, FL
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
