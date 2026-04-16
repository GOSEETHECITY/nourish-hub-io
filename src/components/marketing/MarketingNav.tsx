import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import HarietWordmark from "./HarietWordmark";

const navItems = [
  { label: "Solutions", href: "/solutions" },
  { label: "Partners", href: "/partners" },
  { label: "About", href: "/about" },
  { label: "Press", href: "/press" },
  { label: "Contact", href: "/contact" },
];

export default function MarketingNav({ variant = "light" }: { variant?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isDark = variant === "dark";

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

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`text-sm font-medium transition ${
                pathname === item.href
                  ? isDark ? "text-white" : "text-[#6d412a]"
                  : isDark ? "text-white/70 hover:text-white" : "text-[#6d412a]/70 hover:text-[#6d412a]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className={`text-sm font-medium px-4 py-2 rounded-lg transition ${
              isDark
                ? "text-white hover:bg-white/10"
                : "text-[#6d412a] hover:bg-[#6d412a]/5"
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
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  isDark ? "text-white/80 hover:bg-white/5" : "text-[#6d412a] hover:bg-[#6d412a]/5"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-current/10 space-y-2">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  isDark ? "text-white hover:bg-white/5" : "text-[#6d412a] hover:bg-[#6d412a]/5"
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
