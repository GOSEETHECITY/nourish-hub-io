import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  UtensilsCrossed,
  Heart,
  CalendarDays,
  Store,
  BarChart3,
  Users,
  CreditCard,
  Headphones,
  Settings,
  LogOut,
  Search,
  Bell,
  MapPin,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

const mainNav = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Building2, label: "Organizations", path: "/organizations" },
  {
    icon: UtensilsCrossed,
    label: "Food Listings",
    path: "/food-listings",
    children: [
      { label: "Donations", path: "/food-listings/donations" },
      { label: "Discounted Sale", path: "/food-listings/discounted-sale" },
    ],
  },
  { icon: Heart, label: "Nonprofits", path: "/nonprofits" },
  { icon: CalendarDays, label: "Events", path: "/events" },
  { icon: Store, label: "Marketplace", path: "/marketplace" },
  { icon: BarChart3, label: "Impact", path: "/impact" },
  { icon: Users, label: "Users", path: "/users" },
  { icon: CreditCard, label: "Billing", path: "/billing" },
];

const otherNav = [
  { icon: Headphones, label: "Support", path: "/support" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["/food-listings"]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = profile
    ? `${(profile.first_name || "")[0] || ""}${(profile.last_name || "")[0] || ""}`.toUpperCase() || "U"
    : "U";
  const displayName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "User"
    : "User";

  const toggleMenu = (path: string) => {
    setExpandedMenus((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const isChildActive = (children: { path: string }[]) =>
    children.some((child) => location.pathname === child.path);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-[260px] bg-primary flex flex-col shrink-0">
        <div className="p-6 pb-8">
          <img src={logo} alt="HarietAI" className="h-12 w-auto" />
        </div>

        <nav className="flex-1 px-3 overflow-y-auto">
          <p className="text-[11px] font-semibold tracking-wider text-primary-foreground/40 px-3 mb-2">
            MAIN
          </p>
          <div className="space-y-0.5">
            {mainNav.map(({ icon: Icon, label, path, children }) => {
              if (children) {
                const isExpanded = expandedMenus.includes(path);
                const childActive = isChildActive(children);
                return (
                  <div key={path}>
                    <button
                      onClick={() => toggleMenu(path)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all w-full ${
                        childActive
                          ? "text-primary-foreground"
                          : "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/5"
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                      <span className="flex-1 text-left">{label}</span>
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="ml-[30px] mt-0.5 space-y-0.5">
                        {children.map((child) => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={({ isActive }) =>
                              `block px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                                isActive
                                  ? "bg-accent text-accent-foreground"
                                  : "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/5"
                              }`
                            }
                          >
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={path}
                  to={path}
                  end={path === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/5"
                    }`
                  }
                >
                  <Icon className="w-[18px] h-[18px]" />
                  {label}
                </NavLink>
              );
            })}
          </div>

          <div className="my-6 border-t border-primary-foreground/10" />

          <p className="text-[11px] font-semibold tracking-wider text-primary-foreground/40 px-3 mb-2">
            OTHERS
          </p>
          <div className="space-y-0.5">
            {otherNav.map(({ icon: Icon, label, path }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/5"
                  }`
                }
              >
                <Icon className="w-[18px] h-[18px]" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="p-3 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-primary-foreground/60 hover:text-primary-foreground w-full hover:bg-primary-foreground/5 transition-all"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-card border-b flex items-center px-6 gap-4 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Search Restaurants, Products etc.."
              className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <MapPin className="w-4 h-4" />
            <span>Location</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold">
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{displayName}</p>
                <p className="text-xs text-muted-foreground">Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
