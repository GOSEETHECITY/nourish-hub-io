import { Link, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import HarietWordmark from "./HarietWordmark";

type NavItem = {
  label: string;
  href?: string;
  dropdown?: { label: string; href: string; description?: string }[];
};

const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Solutions", href: "/solutions" },
  {
    label: "Partners",
    dropdown: [
      { label: "Business", href: "/partners/business/signup", description: "Venues, restaurants, hospitality" },
      { label: "Nonprofits", href: "/partners/nonprofit/signup", description: "Food banks, shelters, community" },
    ],
  },
  { label: "About", href: "/about" },
  { label: "Press", href: "/press" },
  { label: "Contact", href: "/contact" },
];

export default function MarketingNav({ variant = "light" }: { variant?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const isDark = variant === "dark";

  // Close desktop dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openDropdown]);

  // Close dropdown when route changes
  useEffect(() => {
    setOpenDropdown(null);
    setMobileExpanded(null);
  }, [pathname]);

  const isActive = (href?: string) => href && pathname === href;
  const isDropdownActive = (item: NavItem) =>
    item.dropdown?.some((sub) => pathname === sub.href || pathname.startsWith(sub.href));

  return (
    <header
      className={`sticky top-0 z-40 w-full backdrop-blur-md ${
        isDark
          ? "bg-[#3a2617]/85 border-b border-[#ffffff12] text-white"
          : "bg-white/85 border-b border-[#e8e0d8] text-[#3a2617]"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center" aria-label="Hariet.AI home">
          <HarietWordmark className={`h-7 w-auto ${isDark ? "text-white" : "text-[#6d412a]"}`} />
        </Link>

        <nav className="hidden md:flex items-center gap-8" ref={dropdownRef}>
          {navItems.map((item) => {
            if (item.dropdown) {
              const active = isDropdownActive(item);
              const isOpen = openDropdown === item.label;
              return (
                <div key={item.label} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(isOpen ? null : item.label)}
                    onMouseEnter={() => setOpenDropdown(item.label)}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    className={`flex items-center gap-1 text-sm font-bold transition ${
                      isDark
                        ? active
                          ? "text-white"
                          : "text-white/80 hover:text-white"
                        : "text-black hover:text-[#6d412a]"
                    }`}
                  >
                    {item.label}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div
                      onMouseLeave={() => setOpenDropdown(null)}
                      className={`absolute left-0 top-full mt-2 min-w-[240px] rounded-xl border shadow-lg overflow-hidden ${
                        isDark
                          ? "bg-[#3a2617] border-white/10"
                          : "bg-white border-[#e8e0d8]"
                      }`}
                    >
                      {item.dropdown.map((sub) => (
                        <Link
                          key={sub.href}
                          to={sub.href}
                          className={`block px-4 py-3 transition ${
                            isDark
                              ? "text-white/90 hover:bg-white/5"
                              : "text-black hover:bg-[#fdf8f4]"
                          }`}
                        >
                          <div className="text-sm font-bold">{sub.label}</div>
                          {sub.description && (
                            <div
                              className={`text-xs mt-0.5 ${
                                isDark ? "text-white/50" : "text-[#6d412a]/60"
                              }`}
                            >
                              {sub.description}
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                to={item.href!}
                className={`text-sm font-bold transition ${
                  isDark
                    ? isActive(item.href)
                      ? "text-white"
                      : "text-white/80 hover:text-white"
                    : "text-black hover:text-[#6d412a]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className={`text-sm font-medium px-4 py-2 rounded-lg transition ${
              isDark
                ? "text-white hover:bg-white/10"
                : "text-black hover:bg-black/5"
            }`}
          >
            Log In
          </Link>
          <Link
            to="/get-started"
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-[#6d412a] text-white hover:bg-[#5a3422] transition shadow-sm"
          >
            Get Started
          </Link>
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className={`md:hidden border-t ${isDark ? "border-white/10 bg-[#3a2617]" : "border-[#e8e0d8] bg-white"}`}>
          <div className="px-4 py-4 space-y-1">
            {navItems.map((item) => {
              if (item.dropdown) {
                const expanded = mobileExpanded === item.label;
                return (
                  <div key={item.label}>
                    <button
                      type="button"
                      onClick={() => setMobileExpanded(expanded ? null : item.label)}
                      aria-expanded={expanded}
                      className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-bold ${
                        isDark ? "text-white/80 hover:bg-white/5" : "text-black hover:bg-black/5"
                      }`}
                    >
                      <span>{item.label}</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </button>
                    {expanded && (
                      <div className="pl-4 mt-1 space-y-1">
                        {item.dropdown.map((sub) => (
                          <Link
                            key={sub.href}
                            to={sub.href}
                            onClick={() => setOpen(false)}
                            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                              isDark ? "text-white/70 hover:bg-white/5" : "text-black/80 hover:bg-black/5"
                            }`}
                          >
                            {sub.label}
                            {sub.description && (
                              <div
                                className={`text-xs mt-0.5 ${
                                  isDark ? "text-white/40" : "text-[#6d412a]/60"
                                }`}
                              >
                                {sub.description}
                              </div>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <Link
                  key={item.href}
                  to={item.href!}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-bold ${
                    isDark ? "text-white/80 hover:bg-white/5" : "text-black hover:bg-black/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-current/10 space-y-2">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  isDark ? "text-white hover:bg-white/5" : "text-black hover:bg-black/5"
                }`}
              >
                Log In
              </Link>
              <Link
                to="/get-started"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold bg-[#6d412a] text-white text-center"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
