import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface LocationContextType {
  city: string;
  state: string;
  setLocation: (city: string, state: string) => void;
  locationLabel: string;
}

const DEFAULT_CITY = "Orlando";
const DEFAULT_STATE = "FL";

const LocationContext = createContext<LocationContextType>({
  city: DEFAULT_CITY,
  state: DEFAULT_STATE,
  setLocation: () => {},
  locationLabel: `${DEFAULT_CITY}, ${DEFAULT_STATE}`,
});

export const useLocation = () => useContext(LocationContext);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [city, setCity] = useState(() => {
    try { return localStorage.getItem("consumer_city") || DEFAULT_CITY; } catch { return DEFAULT_CITY; }
  });
  const [state, setState] = useState(() => {
    try { return localStorage.getItem("consumer_state") || DEFAULT_STATE; } catch { return DEFAULT_STATE; }
  });

  const setLocation = (newCity: string, newState: string) => {
    setCity(newCity);
    setState(newState);
    try {
      localStorage.setItem("consumer_city", newCity);
      localStorage.setItem("consumer_state", newState);
    } catch {}
  };

  const locationLabel = `${city}, ${state}`;

  return (
    <LocationContext.Provider value={{ city, state, setLocation, locationLabel }}>
      {children}
    </LocationContext.Provider>
  );
};
