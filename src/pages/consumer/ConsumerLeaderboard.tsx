import { useEffect, useState } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerBottomNav from "@/components/consumer/ConsumerBottomNav";

type Row = { consumer_id: string; first_name: string; referral_count: number; rank: number };

const ConsumerLeaderboard = () => {
  const navigate = useNavigate();
  const { consumer } = useConsumerAuth();
  const city = consumer?.city ?? null;
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<{ referral_count: number; rank: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [top, mine] = await Promise.all([
        supabase.rpc("city_referral_leaderboard", { p_city: city, p_limit: 20 }),
        supabase.rpc("my_referral_rank", { p_city: city }),
      ]);
      setRows((top.data as Row[]) || []);
      setMe(((mine.data as any[]) || [])[0] || null);
      setLoading(false);
    })();
  }, [city]);

  const inTop = me && rows.some(r => r.consumer_id === consumer?.id);

  return (
    <ConsumerMobileLayout>
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft className="w-6 h-6 text-[#1B2A4A]" /></button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">Referral leaderboard</h1>
      </header>
      <div className="px-4 pb-24">
        <p className="text-sm text-gray-500 mb-4">Top referrers {city ? `in ${city}` : ""}</p>
        {loading ? <p className="text-center text-gray-400 py-12">Loading…</p> : rows.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 mx-auto text-gray-300" />
            <p className="text-gray-500 mt-3">No referrals yet — be the first!</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map(r => {
              const isMe = r.consumer_id === consumer?.id;
              return (
                <li key={r.consumer_id} className={`flex justify-between items-center py-3 ${isMe ? "bg-[#F97316]/5 -mx-4 px-4 rounded" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold w-8 ${r.rank <= 3 ? "text-[#F97316]" : "text-gray-400"}`}>#{r.rank}</span>
                    <span className="font-medium text-[#1B2A4A]">{r.first_name || "Anonymous"}{isMe && " (you)"}</span>
                  </div>
                  <span className="font-semibold text-[#8DC63F]">{r.referral_count}</span>
                </li>
              );
            })}
          </ul>
        )}
        {me && !inTop && (
          <div className="mt-6 p-4 bg-[#F97316]/10 rounded-2xl flex justify-between items-center">
            <div><p className="text-xs text-gray-500">Your rank</p><p className="text-lg font-bold text-[#1B2A4A]">#{me.rank}</p></div>
            <div className="text-right"><p className="text-xs text-gray-500">Referrals</p><p className="text-lg font-bold text-[#8DC63F]">{me.referral_count}</p></div>
          </div>
        )}
      </div>
      <ConsumerBottomNav />
    </ConsumerMobileLayout>
  );
};

export default ConsumerLeaderboard;
