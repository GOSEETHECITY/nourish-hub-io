import { ArrowRight } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

const pressReleases = [
  {
    outlet: "Black Wall Street Times",
    title: "GO See The City: Redirecting Food Waste to Those Facing Hunger",
    url: "https://theblackwallsttimes.com/2024/04/01/go-see-the-city-redirecting-food-waste-to-those-facing-hunger/",
    date: "April 1, 2024",
  },
  {
    outlet: "Inc.",
    title: "She Built a Clever App to Tackle Food Waste",
    url: "https://www.inc.com/farrell-evans/she-built-a-clever-app-to-tackle-food-waste/91148352",
    date: "2024",
  },
  {
    outlet: "OKCFOX",
    title: "Levy Restaurant and GO See The City Donate Thunder, OU Games Leftover Food",
    url: "https://okcfox.com/news/local/levy-restaurant-and-go-see-the-city-donate-thunder-ou-games-leftover-food-food-desert-landfills-waste-hunger-university-of-oklahoma-football-spring-game-oklahoma-city-thunder-norman",
    date: "2024",
  },
];

export default function Press() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MarketingNav variant="light" />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-white border-b border-[#ede5dc]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-black mb-4 tracking-tight">
              Press & Media
            </h1>
            <p className="text-lg text-[#6d412a]/70 max-w-2xl mx-auto leading-relaxed">
              Latest coverage of Hariet.AI and GO See The City.
            </p>
          </div>
        </section>

        {/* Press Releases */}
        <section className="py-24 bg-[#fdf8f4]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">
              {pressReleases.map((release, idx) => (
                <a
                  key={idx}
                  href={release.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group block bg-white rounded-2xl border border-[#ede5dc] p-6 hover:border-[#6d412a]/40 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-semibold text-[#6d412a] mb-1">{release.outlet}</div>
                      <h3 className="text-xl font-bold text-black group-hover:text-[#6d412a] transition mb-2">
                        {release.title}
                      </h3>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#6d412a] flex-shrink-0 mt-1 group-hover:translate-x-1 transition" />
                  </div>
                  <div className="text-sm text-[#6d412a]/60">{release.date}</div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Contact for Press */}
        <section className="py-24 bg-white border-t border-[#ede5dc]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-black mb-4">Looking for media kit or interviews?</h2>
            <p className="text-lg text-[#6d412a]/70 mb-8">
              Reach out to our press team at{" "}
              <a href="mailto:Hello@Hariet.AI" className="text-[#6d412a] font-semibold hover:underline">
                Hello@Hariet.AI
              </a>
            </p>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
