import { Menu, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useConsumerCart } from "@/contexts/ConsumerCartContext";
import ConsumerSideDrawer from "./ConsumerSideDrawer";

const ConsumerAppHeader = () => {
  const navigate = useNavigate();
  const { totalItems } = useConsumerCart();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-sm z-30">
        <button onClick={() => setDrawerOpen(true)}>
          <Menu className="w-6 h-6 text-[#F97316]" />
        </button>
        <span className="text-sm font-semibold text-gray-700">Orlando, FL</span>
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
    </>
  );
};

export default ConsumerAppHeader;
