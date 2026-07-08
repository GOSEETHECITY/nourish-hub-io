import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, School, Package, Truck, Recycle, FileBarChart,
  Presentation, LifeBuoy, Settings, LogOut, Menu, X, Search, Bell,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";

const mainNav = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/district" },
  { icon: School, label: "Schools", path: "/district/schools" },
  { icon: Package, label: "Donations", path: "/district/donations" },
  { icon: Truck, label: "Pickups", path: "/district/pickups" },
  { icon: Recycle, label: "Compost", path: "/district/compost" },
  { icon: FileBarChart, label: "Reports", path: "/district/reports" },
  { icon: Presentation, label: "Assemblies", path: "/district/assemblies" },
  { icon: LifeBuoy, label: "Support Log", path: "/district/support-log" },
];

const otherNav = [
  { icon: Settings, label: "Settings", path: "/district/settings" },
];

export default function DistrictLayout() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const close = () => { if (isMobile) setOpen(false); };

  const sidebar = (
    <>
      <div className="p-6 pb-8 flex items-center justify-between">
        <span className="text-primary-foreground font-bold tracking-wider text-lg">HARIET.AI</span>
        {isMobile && (
          <button onClick={() => setOpen(false)} className="text-primary-foreground/60 hover:text-primary-foreground">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 px-3 overflow-y-auto">
        <p className="text-[11px] font-semibold tracking-wider text-primary-foreground/40 px-3 mb-2">DISTRICT</p>
        <div className="space-y-0.5">
          {mainNav.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/district"}
              onClick={close}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                  isActive
                    ? "text-primary-foreground [background:hsl(var(--district-accent))]"
                    : "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/5"
                }`
              }
            >
              <Icon className="w-[18px] h-[18px]" />{label}
            </NavLink>
          ))}
        </div>
        <div className="my-6 border-t border-primary-foreground/10" />
        <div className="space-y-0.5">
          {otherNav.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              onClick={close}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                  isActive
                    ? "text-primary-foreground [background:hsl(var(--district-accent))]"
                    : "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/5"
                }`
              }
            >
              <Icon className="w-[18px] h-[18px]" />{label}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="p-3 mt-auto">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-primary-foreground/60 hover:text-primary-foreground w-full hover:bg-primary-foreground/5 transition-all"
        >
          <LogOut className="w-[18px] h-[18px]" />Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen" style={{ background: "hsl(var(--district-bg))" }}>
      {isMobile && open && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
      )}
      <aside
        className={`${
          isMobile
            ? `fixed inset-y-0 left-0 z-50 w-[260px] transform transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`
            : "w-[260px] shrink-0"
        } flex flex-col`}
        style={{ background: "hsl(var(--district-sidebar))" }}
      >
        {sidebar}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card border-b flex items-center px-4 md:px-6 gap-4 shrink-0">
          {isMobile && (
            <button onClick={() => setOpen(true)} className="p-2 rounded-lg hover:bg-muted">
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          )}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search schools, pickups..."
              className="pl-9 h-9 bg-muted/40 border-0"
            />
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <button className="relative p-2 rounded-lg hover:bg-muted">
              <Bell className="w-5 h-5 text-foreground" />
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-primary-foreground" style={{ background: "hsl(var(--district-alert))" }}>3</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground" style={{ background: "hsl(var(--district-primary))" }}>MD</div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-foreground">M-DCPS Sustainability</p>
                <p className="text-xs text-muted-foreground">Admin</p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
