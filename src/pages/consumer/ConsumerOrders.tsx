import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";

const ConsumerOrders = () => {
  const navigate = useNavigate();
  const { consumer } = useConsumerAuth();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (consumer) {
      supabase.from("consumer_orders").select("*").eq("consumer_id", consumer.id).order("created_at", { ascending: false })
        .then(({ data }) => setOrders(data || []));
    }
  }, [consumer]);

  return (
    <ConsumerMobileLayout>
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6 text-[#1B2A4A]" /></button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">My Orders</h1>
      </header>
      <div className="px-4 pb-8">
        {orders.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No orders yet</p>
        ) : orders.map((o) => (
          <div key={o.id} className="py-3 border-b border-gray-100 flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm text-[#1B2A4A]">Order #{o.id.slice(0, 8)}</p>
              <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-[#F97316]">${o.total_price?.toFixed(2)}</p>
              <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-gray-100">{o.status}</span>
            </div>
          </div>
        ))}
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerOrders;
