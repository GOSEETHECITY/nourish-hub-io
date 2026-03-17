import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, Leaf, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConsumerCart } from "@/contexts/ConsumerCartContext";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";

const ConsumerCouponDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useConsumerCart();
  const [coupon, setCoupon] = useState<any>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("coupons").select("*, organizations(name)").eq("id", id!).maybeSingle();
      setCoupon(data);
    };
    if (id) load();
  }, [id]);

  if (!coupon) return <ConsumerMobileLayout><div className="p-8 text-center">Loading...</div></ConsumerMobileLayout>;

  const discount = coupon.original_price ? Math.round(((coupon.original_price - coupon.price) / coupon.original_price) * 100) : 0;

  const handleBuy = () => {
    addItem({
      coupon_id: coupon.id,
      name: coupon.title,
      image: coupon.photo_url || "",
      price: coupon.price,
      original_price: coupon.original_price || coupon.price,
      quantity: qty,
      organization_name: coupon.organizations?.name,
    });
    navigate("/app/cart");
  };

  return (
    <ConsumerMobileLayout>
      <div className="relative h-56 bg-gray-300">
        {coupon.photo_url && <img src={coupon.photo_url} alt={coupon.title} className="w-full h-full object-cover" />}
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center">
          <Heart className="w-5 h-5 text-gray-400" />
        </button>
      </div>
      <div className="px-4 pt-4 pb-24">
        <h1 className="text-xl font-bold text-[#1B2A4A]">{coupon.title}</h1>
        <div className="flex items-center gap-3 mt-2">
          {coupon.original_price && <span className="text-gray-400 line-through">${coupon.original_price}</span>}
          <span className="text-2xl font-bold text-[#F97316]">${coupon.price}</span>
          {discount > 0 && <span className="bg-[#F97316] text-white text-xs font-bold px-2 py-0.5 rounded-full">{discount}% OFF</span>}
        </div>
        {coupon.description && <p className="text-sm text-gray-600 mt-3">{coupon.description}</p>}
        {coupon.estimated_donation_value && (
          <div className="flex items-center gap-2 bg-[#8DC63F]/10 rounded-xl px-4 py-3 mt-4">
            <Leaf className="w-5 h-5 text-[#8DC63F]" />
            <span className="text-sm text-[#8DC63F] font-semibold">Est. donation value: ${coupon.estimated_donation_value}</span>
          </div>
        )}
        {coupon.pickup_address && <p className="text-sm text-gray-500 mt-3">📍 {coupon.pickup_address}</p>}
        <div className="flex items-center justify-center gap-6 mt-6">
          <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center">
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-xl font-bold">{qty}</span>
          <button onClick={() => setQty(qty + 1)} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <button onClick={handleBuy}
          className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] transition-colors mt-6">
          Buy Now
        </button>
        <button className="w-full py-3 rounded-full border-2 border-[#F97316] text-[#F97316] font-bold text-lg mt-3">
          Claim Deal
        </button>
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerCouponDetail;
