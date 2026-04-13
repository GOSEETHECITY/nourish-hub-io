import { Menu, ShoppingCart, MapPin, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useConsumerCart } from "@/contexts/ConsumerCartContext";
import { useLocation } from "@/contexts/LocationContext";
import ConsumerSideDrawer from "./ConsumerSideDrawer";
import CitySearchModal from "./CitySearchModal";

const ConsumerAppHeader = () => {
  const navigate = useNavigate();
  const { totalItems } = useConsumerCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const { locationLabel } = useLocation();

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-sm z-30">
        <button onClick={() => setDrawerOpen(true)}>
          <Menu className="w-6 h-6 text-[#F97316]" />
        </button>
        <button onClick={() => setCityModalOpen(true)} className="flex items-center gap-1">
          <MapPin className="w-4 h-4 text-[#F97316]" />
          <span className="text-sm font-semibold text-gray-700">{locationLabel}</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>
        <button onClick={() => navigate("/app/cart")} className="relative">
          <ShoppingCart className="w-6 h-6 text-[#F97316]" />
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#F97316] text-white text-xs flex items-center justify-center font-bold">
              {totalItems}
            </span>
          )}
        </button>
      </header>
      <ConsumerSideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <CitySearchModal open={cityModalOpen} onClose={() => setCityModalOpen(false)} />
    </>
  );
};

export default ConsumerAppHeader;
