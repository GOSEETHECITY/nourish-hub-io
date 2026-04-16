import { ArrowUpRight } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

const pressReleases = [
  {
    outlet: "Black Wall Street Times",
    title: "GO See The City: Redirecting Food Waste to Those Facing Hunger",
    url: "https://theblackwallsttimes.com/2024/04/01/go-see-the-city-redirecting-food-waste-to-those-facing-hunger/",
    category: "Feature",
    screenshot:
      "https://s.wordpress.com/mshots/v1/https%3A%2F%2Ftheblackwallsttimes.com%2F2024%2F04%2F01%2Fgo-see-the-city-redirecting-food-waste-to-those-facing-hunger%2F?w=1200&h=750",
  },
  {
    outlet: "Inc.",
    title: "She Built a Clever App to Tackle Food Waste",
    url: "https://www.inc.com/farrell-evans/she-built-a-clever-app-to-tackle-food-waste/91148352",
    category: "Founder Profile",
    screenshot:
      "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.inc.com%2Ffarrell-evans%2Fshe-built-a-clever-app-to-tackle-food-waste%2F91148352?w=1200&h=750",
  },
  {
    outlet: "OKCFOX",
    title:
      "Levy Restaurant and GO See The City Donate Thunder, OU Games Leftover Food",
    url: "https://okcfox.com/news/local/levy-restaurant-and-go-see-the-city-donate-thunder-ou-games-leftover-food-food-desert-landfills-waste-hunger-university-of-oklahoma-football-spring-game-oklahoma-city-thunder-norman",
    category: "Partnership",
    screenshot:
      "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fokcfox.com%2Fnews%2Flocal%2Flevy-restaurant-and-go-see-the-city-donate-thunder-ou-games-leftover-food-food-desert-landfills-waste-hunger-university-of-oklahoma-football-spring-game-oklahoma-city-thunder-norman?w=1200&h=750",
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

        {/* Press Releases Grid with screenshots */}
        <section className="bg-white border-t border-black/10 py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {pressReleases.map((release, idx) => (
                <a
                  key={idx}
                  href={release.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group block bg-white rounded-2xl border border-black/10 overflow-hidden hover:border-black hover:shadow-xl transition-all"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-black/5">
                    <img
                      src={release.screenshot}
                      alt={`${release.outlet}: ${release.title}`}
                      loading="lazy"
                      className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-500"
                    />
                    <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white border border-black/10 flex items-center justify-center group-hover:bg-black group-hover:border-black transition">
                      <ArrowUpRight className="w-4 h-4 text-black group-hover:text-white transition" />
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-bold text-black uppercase tracking-widest">
                        {release.outlet}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-black/30" />
                      <span className="text-xs font-semibold text-black/50 uppercase tracking-wider">
                        {release.category}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-black leading-snug group-hover:underline underline-offset-4 decoration-2">
                      {release.title}
                    </h3>
                  </div>
                </a>
              ))}
            </div>
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
