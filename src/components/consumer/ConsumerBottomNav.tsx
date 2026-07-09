import { Home, UtensilsCrossed, CalendarDays, User } from "lucide-react";
import { useNavigate, useLocation as useRouterLocation } from "react-router-dom";
import { useMarketplaceUnlocked } from "@/hooks/useMarketplaceUnlocked";

const ConsumerBottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useRouterLocation();
  const { unlocked } = useMarketplaceUnlocked();

  const tabs = [
    { label: "Home", icon: Home, path: "/app/home", active: true },
    {
      label: "Marketplace",
      icon: UtensilsCrossed,
      path: unlocked ? "/app/restaurants" : "/app/marketplace-coming-soon",
      active: unlocked,
    },
    { label: "Events", icon: CalendarDays, path: "/app/events", active: true },
    { label: "Profile", icon: User, path: "/app/profile", active: true },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-200 flex justify-around py-2 z-40">
      {tabs.map((t) => {
        const isActive = t.active && pathname.startsWith(t.path);
        const isDisabled = !t.active;
        return (
          <button key={t.label} onClick={() => navigate(t.path)} className="flex flex-col items-center gap-0.5">
            <t.icon
              className={`w-5 h-5 ${
                isDisabled ? "text-gray-300" : isActive ? "text-[#F97316]" : "text-gray-400"
              }`}
            />
            <span
              className={`text-[10px] ${
                isDisabled ? "text-gray-300" : isActive ? "text-[#F97316] font-semibold" : "text-gray-400"
              }`}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default ConsumerBottomNav;
