import { useNavigate } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useConsumerCart } from "@/contexts/ConsumerCartContext";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import { useState } from "react";

const TAX_RATE = 0.065;

const ConsumerCart = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, clearCart, subtotal } = useConsumerCart();
  const { consumer } = useConsumerAuth();
  const [ordering, setOrdering] = useState(false);

  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const handleBuy = async () => {
    if (!consumer || items.length === 0) return;
    setOrdering(true);
    for (const item of items) {
      await supabase.from("consumer_orders").insert({
        consumer_id: consumer.id,
        coupon_id: item.coupon_id,
        quantity: item.quantity,
        unit_price: item.price,
        tax_amount: +(item.price * item.quantity * TAX_RATE).toFixed(2),
        total_price: +(item.price * item.quantity * (1 + TAX_RATE)).toFixed(2),
        status: "pending",
      });
    }
    clearCart();
    setOrdering(false);
    navigate("/app/orders");
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
              <div className="flex justify-between"><span className="text-gray-500">Tax (6.5%)</span><span>${tax.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-[#F97316]">${total.toFixed(2)}</span></div>
            </div>
            <p className="text-xs text-gray-400 mt-3">* Pick up your order at the restaurant location</p>
            <button onClick={handleBuy} disabled={ordering}
              className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] disabled:opacity-50 transition-colors mt-4">
              {ordering ? "Processing..." : "Buy Now"}
            </button>
          </>
        )}
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerCart;
