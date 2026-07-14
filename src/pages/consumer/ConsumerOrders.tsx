import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import { toast } from "@/hooks/use-toast";

const ConsumerOrders = () => {
  const navigate = useNavigate();
  const { consumer } = useConsumerAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!consumer) return;
    supabase.from("consumer_orders").select("*").eq("consumer_id", consumer.id).order("created_at", { ascending: false })
      .then(({ data }) => setOrders(data || []));
    const ch = supabase
      .channel(`orders-${consumer.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "consumer_orders", filter: `consumer_id=eq.${consumer.id}` },
        (p) => setOrders((prev) => prev.map((o) => (o.id === (p.new as any).id ? { ...o, ...(p.new as any) } : o))))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [consumer]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code); setTimeout(() => setCopied(null), 2000);
    toast({ title: "Pickup code copied" });
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-gray-100 text-gray-700",
      paid: "bg-blue-50 text-blue-700",
      ready: "bg-green-50 text-green-700",
      picked_up: "bg-[#8DC63F]/20 text-[#5a8a2a]",
    };
    return map[s] || "bg-gray-100 text-gray-700";
  };

  return (
    <ConsumerMobileLayout>
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft className="w-6 h-6 text-[#1B2A4A]" /></button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">My Orders</h1>
      </header>
      <div className="px-4 pb-8 space-y-3">
        {orders.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No orders yet</p>
        ) : orders.map((o) => (
          <div key={o.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-sm text-[#1B2A4A]">Order #{o.id.slice(0, 8)}</p>
                <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleString()}</p>
              </div>
              <span className={`text-[10px] font-semibold capitalize px-2 py-0.5 rounded-full ${statusBadge(o.status)}`}>
                {o.status?.replace("_", " ")}
              </span>
            </div>
            {o.pickup_code && o.status !== "picked_up" && (
              <div className="bg-[#F97316]/5 border border-[#F97316]/20 rounded-xl p-3 mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#F97316] font-bold">Pickup Code</p>
                  <p className="text-2xl font-black tracking-[0.3em] text-[#1B2A4A] mt-0.5">{o.pickup_code}</p>
                </div>
                <button onClick={() => copyCode(o.pickup_code)} className="p-2 rounded-lg hover:bg-white transition-colors">
                  {copied === o.pickup_code ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-gray-500" />}
                </button>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Qty {o.quantity}</span>
              <span className="font-bold text-[#F97316]">${Number(o.total_price ?? 0).toFixed(2)}</span>
            </div>
            {o.status === "ready" && <p className="text-xs text-green-700 mt-2 font-semibold">✓ Ready for pickup — show your code to the venue</p>}
          </div>
        ))}
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerOrders;
