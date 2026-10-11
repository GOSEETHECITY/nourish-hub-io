import { useNavigate } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useConsumerCart } from "@/contexts/ConsumerCartContext";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import { useEffect, useState } from "react";
import CheckoutCountdown, { startCheckoutHold } from "@/components/consumer/CheckoutCountdown";

const DEFAULT_TAX_RATE = 0.065;

// Tax comes from the coupon's city record (city_thresholds.tax_rate), matching the server-side checkout.
function useCartTaxRates(couponIds: string[]) {
  const [rates, setRates] = useState<Record<string, number>>({});
  const key = [...couponIds].sort().join(",");
  useEffect(() => {
    if (!couponIds.length) return;
    let cancelled = false;
    (async () => {
      const { data: coupons } = await supabase.from("coupons").select("id, location_id").in("id", couponIds);
      const locIds = [...new Set((coupons || []).map((c: any) => c.location_id).filter(Boolean))];
      const { data: locs } = locIds.length ? await supabase.from("locations").select("id, city, state").in("id", locIds) : { data: [] as any[] };
      const { data: cities } = await supabase.from("city_thresholds").select("city, state, tax_rate");
      const norm = (v?: string | null) => (v || "").toLowerCase().trim();
      const out: Record<string, number> = {};
      for (const c of coupons || []) {
        const loc = (locs || []).find((l: any) => l.id === (c as any).location_id);
        const city = loc && (cities || []).find((ct: any) => norm(ct.city) === norm(loc.city));
        out[(c as any).id] = city?.tax_rate != null ? Number(city.tax_rate) : DEFAULT_TAX_RATE;
      }
      if (!cancelled) setRates(out);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return rates;
}

const ConsumerCart = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, clearCart, subtotal } = useConsumerCart();
  const { consumer } = useConsumerAuth();
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [holdActive, setHoldActive] = useState(() => !!localStorage.getItem("gstc_checkout_hold"));
  const [justStarted, setJustStarted] = useState(false);
  useEffect(() => {
    const sync = () => setHoldActive(!!localStorage.getItem("gstc_checkout_hold"));
    window.addEventListener("gstc-hold", sync);
    return () => window.removeEventListener("gstc-hold", sync);
  }, []);

  const taxRates = useCartTaxRates(items.map((i) => i.coupon_id));
  const tax = items.reduce((s, i) => s + Math.round(i.price * i.quantity * (taxRates[i.coupon_id] ?? DEFAULT_TAX_RATE) * 100) / 100, 0);
  const rateValues = [...new Set(items.map((i) => taxRates[i.coupon_id] ?? DEFAULT_TAX_RATE))];
  const taxLabel = rateValues.length === 1 ? `Tax (${+(rateValues[0] * 100).toFixed(3)}%)` : "Tax";
  const total = subtotal + tax;

  const handleBuy = async () => {
    if (!consumer || items.length === 0) return;
    setOrdering(true);
    // Prices are recomputed server-side from the coupon row via a SECURITY DEFINER
    // RPC. The client cannot manipulate unit_price, tax, or total.
    // All items are created in one database transaction: all succeed or none do.
    setOrderError(null);
    const { data, error } = await supabase.rpc("create_consumer_orders" as any, {
      p_items: items.map((i) => ({ coupon_id: i.coupon_id, quantity: i.quantity })),
    });
    if (error) {
      setOrderError(`We couldn't place your order, and nothing was charged or ordered. ${error.message}`);
      setOrdering(false);
      return;
    }
    // Start the 5-minute hold; items stay in the cart so the shopper can retry if it runs out.
    startCheckoutHold((data as string[] | null) ?? []);
    setJustStarted(true);
    setOrdering(false);
  };

  return (
    <ConsumerMobileLayout>
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6 text-[#1B2A4A]" /></button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">Your Order</h1>
      </header>
      <div className="px-4 pb-8">
        {items.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Your cart is empty</p>
        ) : (
          <>
            <CheckoutCountdown justStarted={justStarted} />
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3 border-b border-gray-100">
                <div className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                  {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1B2A4A] text-sm">{item.name}</p>
                  <p className="text-[#F97316] font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded-full border flex items-center justify-center">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded-full border flex items-center justify-center">
                    <Plus className="w-3 h-3" />
                  </button>
                  <button onClick={() => removeItem(item.id)} className="ml-1"><Trash2 className="w-4 h-4 text-red-400" /></button>
                </div>
              </div>
            ))}
            <button onClick={() => navigate("/app/add-payment")} className="w-full flex justify-between py-3 border-b border-gray-100 text-sm">
              <span className="text-gray-600">Payment Info</span><span className="text-[#F97316] font-semibold">Add →</span>
            </button>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{taxLabel}</span><span>${tax.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-[#F97316]">${total.toFixed(2)}</span></div>
            </div>
            <p className="text-xs text-gray-400 mt-3">* Pick up your order at the restaurant location</p>
            {orderError && (
              <p role="alert" className="mt-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">{orderError}</p>
            )}
            {holdActive ? (
              <button onClick={() => { clearCart(); navigate("/app/orders"); }}
                className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] transition-colors mt-4">
                View my orders
              </button>
            ) : (
            <button onClick={handleBuy} disabled={ordering}
              className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] disabled:opacity-50 transition-colors mt-4">
              {ordering ? "Processing..." : "Buy Now"}
            </button>
            )}
          </>
        )}
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerCart;
