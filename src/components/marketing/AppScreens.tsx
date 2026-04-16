import { ChevronDown, Search, ShoppingCart, Star, Menu, ChevronRight } from "lucide-react";

// ── Phone frame ─────────────────────────────────
function Phone({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-[2.5rem] bg-black p-1.5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] ${className}`}
    >
      <div className="rounded-[2.2rem] bg-white overflow-hidden relative aspect-[9/19] w-[180px] sm:w-[210px]">
        {/* status bar */}
        <div className="flex items-center justify-between px-5 pt-2 pb-1 text-[9px] font-semibold text-black">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-black" />
            <span className="w-1 h-1 rounded-full bg-black" />
            <span className="w-1 h-1 rounded-full bg-black" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Screen 1: Restaurants tab ─────────────────────
function RestaurantsScreen() {
  return (
    <div className="h-full flex flex-col bg-white text-black">
      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <Menu className="w-4 h-4 text-[#fb9014]" strokeWidth={2.5} />
        <div className="flex items-center gap-1 text-xs font-bold">
          Orlando, FL <ChevronDown className="w-3 h-3" />
        </div>
        <ShoppingCart className="w-4 h-4 text-[#fb9014]" />
      </div>

      <div className="px-3">
        <div className="flex items-center gap-2 bg-black/5 rounded-lg px-2 py-1.5 text-[10px] text-black/50">
          <Search className="w-3 h-3" />
          Search for food, brand...
        </div>
      </div>

      <div className="px-3 pt-3 pb-1 text-[10px] font-bold">Restaurants</div>

      <div className="px-3 space-y-3 overflow-hidden">
        {/* Card 1: Rita's */}
        <div className="rounded-xl overflow-hidden border border-black/5 shadow-sm">
          <div className="relative h-16 bg-gradient-to-br from-[#ffd966] via-[#ff9966] to-[#ff3366]">
            <div className="absolute top-1 left-1 bg-[#fb9014] text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
              50% Off
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-70 text-xl">
              🍨
            </div>
          </div>
          <div className="p-2">
            <div className="flex items-start justify-between gap-1">
              <div className="text-[9px] font-bold leading-tight">
                Rita's Italian Ice and Frozen Custard
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Star className="w-2 h-2 fill-[#fb9014] text-[#fb9014]" />
                <span className="text-[8px] font-bold">5.0</span>
              </div>
            </div>
            <div className="text-[7px] text-black/50 mt-0.5">
              Regency Village Dr, Orlando, FL
            </div>
          </div>
        </div>

        {/* Card 2: Serengeti */}
        <div className="rounded-xl overflow-hidden border border-black/5 shadow-sm">
          <div className="relative h-16 bg-gradient-to-br from-[#6d412a] via-[#8d6240] to-[#b88360]">
            <div className="absolute inset-0 flex items-center justify-center opacity-70 text-xl">
              🍝
            </div>
          </div>
          <div className="p-2">
            <div className="flex items-start justify-between gap-1">
              <div className="text-[9px] font-bold leading-tight">
                Serengeti Restaurant & Bar
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Star className="w-2 h-2 fill-[#fb9014] text-[#fb9014]" />
                <span className="text-[8px] font-bold">4.6</span>
              </div>
            </div>
            <div className="text-[7px] text-black/50 mt-0.5">
              International Dr, Orlando, FL
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Screen 2: Events tab ─────────────────────
function EventsScreen() {
  return (
    <div className="h-full flex flex-col bg-white text-black">
      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <Menu className="w-4 h-4 text-[#fb9014]" strokeWidth={2.5} />
        <div className="flex items-center gap-1 text-xs font-bold">
          Orlando, FL <ChevronDown className="w-3 h-3" />
        </div>
        <ShoppingCart className="w-4 h-4 text-[#fb9014]" />
      </div>

      <div className="px-3 pt-1 pb-1 text-[10px] font-bold">Events</div>

      <div className="px-3 space-y-3">
        {/* Event 1: Goo Festival */}
        <div className="rounded-xl overflow-hidden border border-black/5 shadow-sm">
          <div className="relative h-16 bg-gradient-to-br from-[#4a1a5c] via-[#7c2a8e] to-[#b846c9]">
            <div className="absolute top-1 left-1 bg-[#92c216] text-white text-[7px] font-bold px-1 py-0.5 rounded">
              Save $17
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-70 text-xl">
              🎤
            </div>
          </div>
          <div className="p-2">
            <div className="text-[9px] font-bold leading-tight">The Goo Festival</div>
            <div className="text-[7px] text-black/50 mt-0.5">Orlando, FL</div>
          </div>
        </div>

        {/* Event 2: Grand Opening */}
        <div className="rounded-xl overflow-hidden border border-black/5 shadow-sm">
          <div className="relative h-16 bg-[#fb9014]">
            <div className="absolute top-1 left-1 bg-white text-[#fb9014] text-[7px] font-bold px-1 py-0.5 rounded">
              Grand Opening
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-white text-[8px] font-black uppercase tracking-wider">
              Island Wing
            </div>
          </div>
          <div className="p-2">
            <div className="text-[9px] font-bold leading-tight">Grand Opening of Island Wing</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[7px] font-bold text-[#92c216]">Free</span>
              <span className="text-[7px] text-black/50">Orlando, FL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Screen 3: Menu / profile ─────────────────────
function MenuScreen() {
  const items = [
    "Home",
    "Restaurants",
    "Events",
    "Follows",
    "Profile",
    "Notifications",
    "Payment Method",
    "Invite Friends",
  ];
  return (
    <div className="h-full flex flex-col bg-[#1f3c4f] text-white">
      <div className="px-4 pt-3 pb-3 flex items-center gap-2 border-b border-white/10">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#fb9014] to-[#6d412a] flex items-center justify-center text-[9px] font-bold">
          AS
        </div>
        <div>
          <div className="text-[9px] font-bold">Aneshai Smith</div>
          <div className="text-[7px] text-white/50">View profile</div>
        </div>
      </div>

      <div className="px-2 py-2 space-y-0.5">
        {items.map((it, i) => (
          <div
            key={it}
            className={`flex items-center justify-between px-2 py-1.5 rounded-md text-[9px] ${
              i === 1 ? "bg-[#fb9014] text-white font-bold" : "text-white/80"
            }`}
          >
            <span>{it}</span>
            <ChevronRight className="w-2.5 h-2.5 opacity-50" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main exported component ────────────────────
export default function AppScreens() {
  return (
    <div className="relative w-full">
      <div className="absolute -inset-8 bg-gradient-to-br from-[#fb9014]/20 to-[#92c216]/20 rounded-3xl blur-3xl" />
      <div className="relative flex items-end justify-center gap-3 sm:gap-5">
        <Phone className="translate-y-6 rotate-[-4deg] hidden sm:block">
          <MenuScreen />
        </Phone>
        <Phone className="z-10">
          <RestaurantsScreen />
        </Phone>
        <Phone className="translate-y-6 rotate-[4deg]">
          <EventsScreen />
        </Phone>
      </div>
    </div>
  );
}
