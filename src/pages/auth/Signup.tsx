import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import VenueSignup from "./signup/VenueSignup";
import NonprofitSignup from "./signup/NonprofitSignup";
import GovernmentSignup from "./signup/GovernmentSignup";
import JoinSignup from "./signup/JoinSignup";

export type OrgCategory =
  | "restaurant"
  | "hospitality"
  | "venue_events"
  | "farm_grocery"
  | "government"
  | "nonprofit"
  | "join_existing";

const CATEGORIES: { id: OrgCategory; emoji: string; title: string; subtitle: string }[] = [
  { id: "restaurant", emoji: "🍽️", title: "Restaurant or Food Service", subtitle: "Restaurants, food trucks, catering companies, cafes" },
  { id: "hospitality", emoji: "🏨", title: "Hospitality Group", subtitle: "Hotels, resorts, bed and breakfasts" },
  { id: "venue_events", emoji: "🏟️", title: "Venue or Events Group", subtitle: "Convention centers, stadiums, arenas, festivals, airports" },
  { id: "farm_grocery", emoji: "🌱", title: "Farm or Grocery", subtitle: "Farms, grocery stores, food distributors" },
  { id: "government", emoji: "🏛️", title: "Government", subtitle: "Municipal, county, or state government" },
  { id: "nonprofit", emoji: "💚", title: "Nonprofit", subtitle: "Nonprofit organizations that distribute food" },
  { id: "join_existing", emoji: "🔗", title: "Join Existing Organization", subtitle: "I have a Location Join Code" },
];

export default function Signup() {
  const [selected, setSelected] = useState<OrgCategory | null>(null);

  if (selected === "government") return <GovernmentSignup onBack={() => setSelected(null)} />;
  if (selected === "nonprofit") return <NonprofitSignup onBack={() => setSelected(null)} />;
  if (selected === "join_existing") return <JoinSignup onBack={() => setSelected(null)} />;
  if (selected && ["restaurant", "hospitality", "venue_events", "farm_grocery"].includes(selected)) {
    return <VenueSignup category={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-primary rounded-2xl p-4">
              <img src={logo} alt="HarietAI" className="h-10 w-auto" />
            </div>
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">Join the HarietAI Network</h1>
          <p className="text-sm text-muted-foreground mt-1">What best describes you?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelected(cat.id)}
              className="flex items-start gap-4 bg-card border border-border rounded-xl p-5 text-left hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <span className="text-3xl mt-0.5">{cat.emoji}</span>
              <div>
                <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{cat.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{cat.subtitle}</p>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
