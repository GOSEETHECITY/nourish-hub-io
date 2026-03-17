import { Home, UtensilsCrossed, CalendarDays, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { label: "Home", icon: Home, path: "/app/home" },
  { label: "Restaurant", icon: UtensilsCrossed, path: "/app/restaurants" },
  { label: "Events", icon: CalendarDays, path: "/app/events" },
  { label: "Profile", icon: User, path: "/app/profile" },
];

const ConsumerBottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-200 flex justify-around py-2 z-40">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.path);
        return (
          <button key={t.path} onClick={() => navigate(t.path)} className="flex flex-col items-center gap-0.5">
            <t.icon className={`w-5 h-5 ${active ? "text-[#F97316]" : "text-gray-400"}`} />
            <span className={`text-[10px] ${active ? "text-[#F97316] font-semibold" : "text-gray-400"}`}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default ConsumerBottomNav;
