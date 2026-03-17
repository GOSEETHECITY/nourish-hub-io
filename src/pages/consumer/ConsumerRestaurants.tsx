import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerAppHeader from "@/components/consumer/ConsumerAppHeader";
import ConsumerBottomNav from "@/components/consumer/ConsumerBottomNav";

interface RestaurantCard {
  id: string;
  org_name: string;
  address: string;
  coupon_title: string;
  price: number;
  original_price: number;
  photo_url: string | null;
}

const ConsumerRestaurants = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<RestaurantCard[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("coupons")
        .select("id, title, price, original_price, photo_url, organization_id, organizations(name, address)")
        .eq("status", "active");
      if (data) {
        setRestaurants(data.map((c: any) => ({
          id: c.id,
          org_name: c.organizations?.name || "Restaurant",
          address: c.organizations?.address || "",
          coupon_title: c.title,
          price: c.price,
          original_price: c.original_price || c.price,
          photo_url: c.photo_url,
        })));
      }
    };
    load();
  }, []);

  const discount = (orig: number, price: number) => orig > 0 ? Math.round(((orig - price) / orig) * 100) : 0;
  const filtered = restaurants.filter((r) => r.org_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <ConsumerMobileLayout>
      <ConsumerAppHeader />
      <div className="px-4 pb-24">
        <div className="flex items-center gap-2 my-3">
          <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search restaurants"
              className="flex-1 bg-transparent outline-none text-sm" />
          </div>
        </div>
        <h2 className="text-lg font-bold text-[#1B2A4A] mb-3">Restaurants</h2>
        <div className="flex flex-col gap-4">
          {filtered.map((r) => (
            <button key={r.id} onClick={() => navigate(`/app/coupon/${r.id}`)}
              className="bg-white rounded-2xl shadow-md overflow-hidden text-left">
              <div className="relative h-36 bg-gray-200">
                {r.photo_url && <img src={r.photo_url} alt={r.org_name} className="w-full h-full object-cover" />}
                {discount(r.original_price, r.price) > 0 && (
                  <span className="absolute top-2 left-2 bg-[#F97316] text-white text-xs font-bold px-2 py-1 rounded-full">
                    {discount(r.original_price, r.price)}% OFF
                  </span>
                )}
                <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}>
                  <Heart className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="p-3">
                <p className="font-semibold text-[#1B2A4A]">{r.org_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{r.address}</p>
                <p className="text-sm text-[#F97316] font-semibold mt-1">{r.coupon_title}</p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">No restaurants found</p>}
        </div>
      </div>
      <ConsumerBottomNav />
    </ConsumerMobileLayout>
  );
};

export default ConsumerRestaurants;
