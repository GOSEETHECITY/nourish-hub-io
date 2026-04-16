import { Link } from "react-router-dom";
import HarietWordmark from "./HarietWordmark";

export default function MarketingFooter() {
  return (
    <footer className="bg-[#2a1a10] text-white/80 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <Link to="/" aria-label="Hariet.AI home" className="inline-block mb-4">
              <HarietWordmark className="h-8 w-auto text-white" />
            </Link>
            <p className="text-sm text-white/60 max-w-sm leading-relaxed">
              The enterprise platform for food waste diversion, routing surplus to communities and consumers across the country.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Platform</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/solutions" className="hover:text-white transition">Solutions</Link></li>
              <li><Link to="/partners" className="hover:text-white transition">Partners</Link></li>
              <li><Link to="/login" className="hover:text-white transition">Log In</Link></li>
              <li><Link to="/get-started" className="hover:text-white transition">Get Started</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/about" className="hover:text-white transition">About</Link></li>
              <li><Link to="/press" className="hover:text-white transition">Press</Link></li>
              <li><Link to="/contact" className="hover:text-white transition">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">More</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="https://harietai.com" target="_blank" rel="noreferrer" className="hover:text-white transition">
                  Shop Now
                </a>
              </li>
              <li>
                <a href="https://goseethecity.com" target="_blank" rel="noreferrer" className="hover:text-white transition">
                  GO See The City
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10">
          <div className="grid sm:grid-cols-3 gap-6 mb-6 text-xs text-white/70">
            <div>
              <p className="font-semibold text-white mb-1">Email</p>
              <a href="mailto:Hello@Hariet.AI" className="hover:text-white transition">Hello@Hariet.AI</a>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Location</p>
              <p>Tampa, FL</p>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Phone</p>
              <a href="tel:844-974-6277" className="hover:text-white transition">844-974-6277</a>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-white/50">
            <p>&copy; {new Date().getFullYear()} Hariet.AI. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/privacy" className="hover:text-white transition">Privacy</Link>
              <Link to="/terms" className="hover:text-white transition">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
