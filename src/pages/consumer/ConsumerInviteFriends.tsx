import { Copy, Share2 } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import { useState } from "react";

const ConsumerInviteFriends = () => {
  const navigate = useNavigate();
  const { consumer } = useConsumerAuth();
  const code = consumer?.invite_code_used || "GOSEE2026";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleShare = () => { navigator.share?.({ title: "GO See The City", text: `Join me on GO See The City! Use code: ${code}` }); };

  return (
    <ConsumerMobileLayout>
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6 text-[#1B2A4A]" /></button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">Invite Friends</h1>
      </header>
      <div className="px-6 flex flex-col items-center gap-6 pt-12">
        <p className="text-gray-600 text-center">Share your invite code with friends</p>
        <div className="bg-gray-100 rounded-2xl px-8 py-4 text-center">
          <p className="text-2xl font-bold tracking-widest text-[#1B2A4A]">{code}</p>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full border-2 border-[#F97316] text-[#F97316] font-semibold">
            <Copy className="w-4 h-4" />{copied ? "Copied!" : "Copy"}
          </button>
          <button onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-[#F97316] text-white font-semibold">
            <Share2 className="w-4 h-4" />Share
          </button>
        </div>
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerInviteFriends;
