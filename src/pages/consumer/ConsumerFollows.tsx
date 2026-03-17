import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";

const ConsumerFollows = () => {
  const navigate = useNavigate();
  const { consumer } = useConsumerAuth();
  const [favs, setFavs] = useState<any[]>([]);

  useEffect(() => {
    if (consumer) {
      supabase.from("consumer_favorites").select("*, organizations(name, address)").eq("consumer_id", consumer.id)
        .then(({ data }) => setFavs(data || []));
    }
  }, [consumer]);

  return (
    <ConsumerMobileLayout>
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6 text-[#1B2A4A]" /></button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">Follows</h1>
      </header>
      <div className="px-4 pb-8">
        {favs.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No favorites yet</p>
        ) : favs.map((f) => (
          <div key={f.id} className="flex items-center gap-3 py-3 border-b border-gray-100">
            <Heart className="w-5 h-5 text-[#F97316] fill-[#F97316]" />
            <div>
              <p className="font-semibold text-[#1B2A4A]">{(f as any).organizations?.name || "Restaurant"}</p>
              <p className="text-xs text-gray-400">{(f as any).organizations?.address}</p>
            </div>
          </div>
        ))}
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerFollows;
