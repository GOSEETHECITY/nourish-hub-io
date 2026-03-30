import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, Phone, MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";

const ConsumerRestaurantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [location, setLocation] = useState<any>(null);
  const [coupons, setCoupons] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: loc } = await supabase.from("locations").select("id, name, address, city, state, zip, latitude, longitude, hours_of_operation, location_type, marketplace_enabled, pickup_address, pickup_instructions, organization_id, organizations(name, address, city, state)").eq("id", id!).maybeSingle();
      setLocation(loc);
      const { data: c } = await supabase.from("coupons").select("*").eq("location_id", id!).eq("status", "active");
      setCoupons(c || []);
    };
    if (id) load();
  }, [id]);

  if (!location) return <ConsumerMobileLayout><div className="p-8 text-center">Loading...</div></ConsumerMobileLayout>;

  const org = location.organizations;

  return (
    <ConsumerMobileLayout>
      <div className="relative h-48 bg-gray-300">
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center">
          <Heart className="w-5 h-5 text-gray-400" />
        </button>
      </div>
      <div className="px-4 pt-4 pb-24">
        <div className="flex items-center gap-2">
          <span className="bg-[#F97316] text-white text-xs font-bold px-2 py-0.5 rounded-full">POPULAR</span>
          <div className="flex items-center gap-0.5">
            {[1,2,3,4,5].map((s) => <Star key={s} className="w-3 h-3 text-yellow-400 fill-yellow-400" />)}
          </div>
        </div>
        <h1 className="text-xl font-bold text-[#1B2A4A] mt-2">{org?.name || location.name}</h1>
        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{location.address}, {location.city}</p>
        <div className="flex gap-3 mt-4">
          <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-full border border-[#F97316] text-[#F97316] font-semibold text-sm">
            <Phone className="w-4 h-4" /> Call
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-full border border-[#8DC63F] text-[#8DC63F] font-semibold text-sm">
            <MapPin className="w-4 h-4" /> Directions
          </button>
        </div>
        <h2 className="text-lg font-bold text-[#1B2A4A] mt-6 mb-3">Available Coupons</h2>
        {coupons.map((c) => (
          <button key={c.id} onClick={() => navigate(`/app/coupon/${c.id}`)}
            className="w-full bg-white rounded-xl shadow-sm border p-3 mb-3 text-left flex items-center gap-3">
            <div className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
              {c.photo_url && <img src={c.photo_url} alt={c.title} className="w-full h-full object-cover" />}
            </div>
            <div>
              <p className="font-semibold text-[#1B2A4A]">{c.title}</p>
              <div className="flex items-center gap-2 mt-1">
                {c.original_price && <span className="text-xs text-gray-400 line-through">${c.original_price}</span>}
                <span className="text-sm font-bold text-[#F97316]">${c.price}</span>
              </div>
            </div>
          </button>
        ))}
        {coupons.length === 0 && <p className="text-gray-400 text-sm">No active coupons</p>}
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerRestaurantDetail;
