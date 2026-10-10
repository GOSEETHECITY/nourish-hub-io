import { useState, useRef, useEffect } from "react";
import { Search, X, MapPin } from "lucide-react";
import { useLocation } from "@/contexts/LocationContext";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

type CityResult = { placeId: string; city: string; region: string; secondary: string; label: string };

const POPULAR_CITIES = [
  { city: "Atlanta", state: "GA" },
  { city: "Orlando", state: "FL" },
  { city: "Miami", state: "FL" },
  { city: "Tampa", state: "FL" },
  { city: "Jacksonville", state: "FL" },
  { city: "Charlotte", state: "NC" },
  { city: "Nashville", state: "TN" },
  { city: "Houston", state: "TX" },
  { city: "Dallas", state: "TX" },
  { city: "New York", state: "NY" },
  { city: "Los Angeles", state: "CA" },
  { city: "Chicago", state: "IL" },
  { city: "Philadelphia", state: "PA" },
  { city: "Washington", state: "DC" },
  { city: "New Orleans", state: "LA" },
  { city: "Detroit", state: "MI" },
  { city: "Memphis", state: "TN" },
  { city: "Baltimore", state: "MD" },
  { city: "San Antonio", state: "TX" },
  { city: "Birmingham", state: "AL" },
];

// US state abbreviations for validation
const US_STATES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY", "district of columbia": "DC",
};

interface CitySearchModalProps {
  open: boolean;
  onClose: () => void;
}

const CitySearchModal = ({ open, onClose }: CitySearchModalProps) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { setLocation, city: currentCity, state: currentState } = useLocation();
  const [results, setResults] = useState<CityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const sessionRef = useRef<string>(crypto.randomUUID());
  const reqId = useRef(0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSearchError(null);
      sessionRef.current = crypto.randomUUID();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Worldwide city search, debounced while typing.
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const id = ++reqId.current;
    setSearching(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase.functions.invoke("city-search", {
        body: { input: q, sessionToken: sessionRef.current },
      });
      if (id !== reqId.current) return;
      setSearching(false);
      if (error) {
        let msg = "City search is unavailable right now.";
        if (error instanceof FunctionsHttpError) {
          try {
            const body = await error.context.json();
            console.error("city-search failed:", body);
            if (body?.error === "not_configured" || body?.error === "api_not_enabled") msg = "Worldwide city search isn't set up yet.";
            if (body?.error === "Sign in required") msg = "Sign in to search all cities.";
          } catch { /* ignore */ }
        }
        setSearchError(msg);
        setResults([]);
        return;
      }
      setSearchError(null);
      setResults((data?.results as CityResult[]) ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [query, open]);

  if (!open) return null;

  const filtered = query.trim()
    ? POPULAR_CITIES.filter(
        (c) =>
          c.city.toLowerCase().includes(query.toLowerCase()) ||
          c.state.toLowerCase().includes(query.toLowerCase())
      )
    : POPULAR_CITIES;

  // Remote results replace the built-in list once 2+ letters are typed; if the
  // lookup is unavailable, fall back to the built-in list and "City, ST" entry.
  const useRemote = query.trim().length >= 2 && !searchError;

  const handleSelect = (city: string, state: string) => {
    sessionRef.current = crypto.randomUUID();
    setLocation(city, state);
    onClose();
  };

  // Allow custom city entry if typed as "City, ST" — must include comma + valid state
  const handleCustomEntry = () => {
    if (!query.includes(",")) return;
    const parts = query.split(",").map((s) => s.trim());
    if (parts.length === 2 && parts[0] && parts[1]) {
      const cityName = parts[0]
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
      const stateInput = parts[1].toUpperCase();
      const validAbbrs = new Set(Object.values(US_STATES));
      const stateAbbr =
        stateInput.length === 2 && validAbbrs.has(stateInput)
          ? stateInput
          : US_STATES[parts[1].toLowerCase()];
      if (stateAbbr) {
        handleSelect(cityName, stateAbbr);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <button onClick={onClose}>
          <X className="w-6 h-6 text-gray-500" />
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCustomEntry();
            }}
            placeholder="Search city or type City, State..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
          />
        </div>
      </div>

      {/* Current location */}
      <div className="px-4 py-3 border-b bg-orange-50">
        <p className="text-xs text-gray-500 mb-1">Current location</p>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#F97316]" />
          <span className="text-sm font-semibold text-[#1B2A4A]">{currentCity}, {currentState}</span>
        </div>
      </div>

      {/* City list */}
      <div className="flex-1 overflow-y-auto">
        <p className="px-4 pt-3 pb-1 text-xs text-gray-500 font-medium uppercase tracking-wide">
          {query.trim() ? "Search results" : "Popular cities"}
        </p>
        {useRemote && results.map((r) => {
          const isCurrent = r.city === currentCity && r.region === currentState;
          return (
            <button
              key={r.placeId}
              onClick={() => handleSelect(r.city, r.region)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 ${isCurrent ? "bg-orange-50" : ""}`}
            >
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-[#1B2A4A]">
                {r.city}
                <span className="text-gray-500">{r.secondary ? `, ${r.secondary}` : ""}</span>
              </span>
              {isCurrent && <span className="ml-auto text-xs text-[#F97316] font-medium">Current</span>}
            </button>
          );
        })}
        {useRemote && searching && results.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-gray-500">Searching…</p>
        )}
        {useRemote && !searching && results.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-gray-500">No matching cities found</p>
        )}
        {searchError && query.trim().length >= 2 && (
          <p className="px-4 py-2 text-xs text-gray-400">{searchError}</p>
        )}
        {!useRemote && filtered.map((c) => (
          <button
            key={`${c.city}-${c.state}`}
            onClick={() => handleSelect(c.city, c.state)}
            className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 ${
              c.city === currentCity && c.state === currentState ? "bg-orange-50" : ""
            }`}
          >
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-[#1B2A4A]">
              {c.city}, {c.state}
            </span>
            {c.city === currentCity && c.state === currentState && (
              <span className="ml-auto text-xs text-[#F97316] font-medium">Current</span>
            )}
          </button>
        ))}
        {!useRemote && filtered.length === 0 && query.trim() && (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-500 mb-2">No matching cities found</p>
            <p className="text-xs text-gray-400">
              Type as <span className="font-medium">City, State</span> (e.g. "Austin, TX") and press Enter
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CitySearchModal;
