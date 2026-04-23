import { X, Home, UtensilsCrossed, CalendarDays, Heart, User, Bell, CreditCard, MessageSquare, UserPlus, ThumbsUp, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import { toast } from "sonner";

const items = [
  { label: "Home", icon: Home, path: "/app/home" },
  { label: "Restaurant", icon: UtensilsCrossed, path: "/app/restaurants", active: false },
  { label: "Events", icon: CalendarDays, path: "/app/events" },
  { label: "Follows", icon: Heart, path: "/app/follows" },
  { label: "Profile", icon: User, path: "/app/profile" },
  { label: "Notification", icon: Bell, path: "/app/notifications" },
  { label: "Payment method", icon: CreditCard, path: "/app/add-payment" },
  { label: "App chat support", icon: MessageSquare, path: "/app/feedback" },
  { label: "Invite friends", icon: UserPlus, path: "/app/invite-friends" },
  { label: "Give feedback", icon: ThumbsUp, path: "/app/feedback" },
];

interface Props { open: boolean; onClose: () => void; }

const ConsumerSideDrawer = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const { consumer, signOut } = useConsumerAuth();

  const handleItemClick = (item: typeof items[number]) => {
    if (item.active === false) {
      toast("Not available in your area yet. Stay tuned!", { duration: 3000 });
      return;
    }

    navigate(item.path);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative w-72 bg-[#1B2A4A] text-white min-h-screen flex flex-col animate-in slide-in-from-left duration-200">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F97316] flex items-center justify-center text-white font-bold">
              {consumer?.first_name?.[0] || "G"}
            </div>
            <span className="font-semibold">{consumer ? `${consumer.first_name} ${consumer.last_name}` : "Guest"}</span>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 py-2">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => handleItemClick(item)}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/10 transition-colors"
            >
              <item.icon className="w-5 h-5 text-[#F97316]" />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <button
          onClick={async () => { await signOut(); navigate("/app/splash"); onClose(); }}
          className="flex items-center gap-3 px-4 py-4 border-t border-white/10 hover:bg-white/10"
        >
          <LogOut className="w-5 h-5 text-red-400" />
          <span className="text-sm text-red-400">Logout</span>
        </button>
      </aside>
    </div>
  );
};

export default ConsumerSideDrawer;
