import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";

interface LocationContextType {
  city: string;
  state: string;
  setLocation: (city: string, state: string) => void;
  locationLabel: string;
  ready: boolean;
}

const DEFAULT_CITY = "Orlando";
const DEFAULT_STATE = "FL";
const CITY_STORAGE_KEY = "consumer_city";
const STATE_STORAGE_KEY = "consumer_state";
const LOCATION_SOURCE_KEY = "consumer_location_source";

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

// City -> state lookup. Consumers table only stores city, so we resolve state
// from this map. Keep in sync with the known cities on the platform.
const CITY_TO_STATE: Record<string, string> = {
  atlanta: "GA",
  orlando: "FL",
  miami: "FL",
  jacksonville: "FL",
  "st. petersburg": "FL",
  "saint petersburg": "FL",
  hernando: "FL",
  dunedin: "FL",
  rogers: "AR",
  lowell: "AR",
  ashland: "OH",
  hampton: "GA",
  seattle: "WA",
  "st. louis": "MO",
  "saint louis": "MO",
  minneapolis: "MN",
  albuquerque: "NM",
};

const toTitleCase = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

async function reverseGeocode(lat: number, lng: number): Promise<{ city: string; state: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
    );
    const data = await res.json();
    const address = data?.address;
    const resolvedCity = address?.city || address?.town || address?.village || address?.municipality;
    const resolvedState = address?.state_code || US_STATES[(address?.state || "").toLowerCase()];

    if (resolvedCity && resolvedState) {
      return { city: toTitleCase(resolvedCity), state: resolvedState.toUpperCase() };
    }
  } catch {}

  return null;
}

const LocationContext = createContext<LocationContextType>({
  city: DEFAULT_CITY,
  state: DEFAULT_STATE,
  setLocation: () => {},
  locationLabel: `${DEFAULT_CITY}, ${DEFAULT_STATE}`,
  ready: false,
});

export const useLocation = () => useContext(LocationContext);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const { consumer, loading: consumerLoading } = useConsumerAuth();

  const [city, setCity] = useState(() => {
    try { return localStorage.getItem(CITY_STORAGE_KEY) || DEFAULT_CITY; } catch { return DEFAULT_CITY; }
  });
  const [state, setState] = useState(() => {
    try { return localStorage.getItem(STATE_STORAGE_KEY) || DEFAULT_STATE; } catch { return DEFAULT_STATE; }
  });
  const [ready, setReady] = useState(() => {
    try {
      return Boolean(localStorage.getItem(CITY_STORAGE_KEY) && localStorage.getItem(STATE_STORAGE_KEY));
    } catch {
      return false;
    }
  });

  const setLocation = (newCity: string, newState: string) => {
    setCity(newCity);
    setState(newState);
    setReady(true);
    try {
      localStorage.setItem(CITY_STORAGE_KEY, newCity);
      localStorage.setItem(STATE_STORAGE_KEY, newState);
      localStorage.setItem(LOCATION_SOURCE_KEY, "manual");
    } catch {}
  };

  // Source of truth from the consumer profile (city only). Resolve state from
  // the city lookup so we never persist a mismatched city/state pair.
  useEffect(() => {
    if (consumerLoading) return;
    if (!consumer?.city) return;

    let source: string | null = null;
    try { source = localStorage.getItem(LOCATION_SOURCE_KEY); } catch {}
    if (source === "manual") {
      setReady(true);
      return;
    }

    const resolvedState = CITY_TO_STATE[consumer.city.toLowerCase().trim()];
    if (!resolvedState) {
      // Unknown city — don't guess. Just adopt city, leave state as-is only
      // when it already pairs with this city; otherwise skip to avoid the
      // "Orlando, MD" class of bug.
      return;
    }

    const nextCity = toTitleCase(consumer.city);
    setCity(nextCity);
    setState(resolvedState);
    setReady(true);
    try {
      localStorage.setItem(CITY_STORAGE_KEY, nextCity);
      localStorage.setItem(STATE_STORAGE_KEY, resolvedState);
      localStorage.setItem(LOCATION_SOURCE_KEY, "consumer_profile");
    } catch {}
  }, [consumer?.city, consumerLoading]);

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;

    let cancelled = false;
    let hasStoredLocation = false;
    let manualOverride = false;
    let source: string | null = null;

    try {
      hasStoredLocation = Boolean(localStorage.getItem(CITY_STORAGE_KEY) && localStorage.getItem(STATE_STORAGE_KEY));
      source = localStorage.getItem(LOCATION_SOURCE_KEY);
      manualOverride = source === "manual" || source === "consumer_profile";
    } catch {}

    if (manualOverride) return;
    if (hasStoredLocation && !(city === DEFAULT_CITY && state === DEFAULT_STATE)) return;

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const nextLocation = await reverseGeocode(coords.latitude, coords.longitude);
        if (!nextLocation || cancelled) return;

        setCity(nextLocation.city);
        setState(nextLocation.state);
        setReady(true);

        try {
          localStorage.setItem(CITY_STORAGE_KEY, nextLocation.city);
          localStorage.setItem(STATE_STORAGE_KEY, nextLocation.state);
          localStorage.setItem(LOCATION_SOURCE_KEY, "device");
        } catch {}
      },
      () => {},
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );

    return () => {
      cancelled = true;
    };
  }, [city, state]);

  const locationLabel = `${city}, ${state}`;

  return (
    <LocationContext.Provider value={{ city, state, setLocation, locationLabel, ready }}>
      {children}
    </LocationContext.Provider>
  );
};
