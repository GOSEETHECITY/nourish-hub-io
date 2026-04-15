import { Link } from "react-router-dom";

export default function MarketingFooter() {
  return (
    <footer className="bg-[#2a1a10] text-white/80 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#6d412a] flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="font-semibold text-lg text-white">Hariet.AI</span>
            </div>
            <p className="text-sm text-white/60 max-w-sm leading-relaxed">
              The enterprise platform for food waste diversion — routing surplus to communities and consumers across the country.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Platform</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/solutions" className="hover:text-white transition">Solutions</Link></li>
              <li><Link to="/industries" className="hover:text-white transition">Industries</Link></li>
              <li><Link to="/login" className="hover:text-white transition">Log In</Link></li>
              <li><Link to="/contact" className="hover:text-white transition">Get Started</Link></li>
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
            <h4 className="text-white font-semibold text-sm mb-4">Consumer App</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="https://goseethecity.com" target="_blank" rel="noreferrer" className="hover:text-white transition">
                  GO See The City
                </a>
              </li>
              <li className="text-white/50 text-xs pt-2">
                Powered by Hariet.AI
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-white/50">
          <p>&copy; {new Date().getFullYear()} Hariet.AI. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link to="/terms" className="hover:text-white transition">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
