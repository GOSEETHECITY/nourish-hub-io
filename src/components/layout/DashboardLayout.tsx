import { Outlet, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Store,
  Heart,
  BarChart3,
  Phone,
  Settings,
  LogOut,
  Search,
  Bell,
  MapPin,
  ChevronDown,
} from "lucide-react";
import logo from "@/assets/logo.png";

const mainNav = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Store, label: "Restaurant", path: "/restaurant" },
  { icon: Heart, label: "Donations", path: "/donations" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
];

const otherNav = [
  { icon: Phone, label: "Support", path: "/support" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function DashboardLayout() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-[260px] bg-primary flex flex-col shrink-0">
        <div className="p-6 pb-8">
          <img src={logo} alt="HarietAI" className="h-12 w-auto" />
        </div>

        <nav className="flex-1 px-3">
          <p className="text-[11px] font-semibold tracking-wider text-primary-foreground/40 px-3 mb-2">
            CITY
          </p>
          <div className="space-y-0.5">
            {mainNav.map(({ icon: Icon, label, path }) => (
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
            ))}
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/5 transition-all"
              >
                <Icon className="w-[18px] h-[18px]" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="p-3 mt-auto">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-primary-foreground/60 hover:text-primary-foreground w-full hover:bg-primary-foreground/5 transition-all">
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
                JF
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Jame Fred</p>
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
