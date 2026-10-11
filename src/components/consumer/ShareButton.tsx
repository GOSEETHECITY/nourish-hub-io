import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import { makeShareImage, shareUrl, shareWithImage } from "@/lib/share";

/** Shares a branded image + link (with the user's referral code so friends who join are credited). */
export default function ShareButton({
  emoji, title, subtitle, text, path, label = "Share", className = "",
}: { emoji: string; title: string; subtitle: string; text: string; path: string; label?: string; className?: string }) {
  const { consumer } = useConsumerAuth() as any;
  const [busy, setBusy] = useState(false);
  const go = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(true);
    const url = shareUrl(path, consumer?.referral_code);
    const image = await makeShareImage({ emoji, title, subtitle });
    const res = await shareWithImage({ title, text, url, image });
    setBusy(false);
    if (res === "copied") toast({ title: "Link copied", description: "Image downloaded — paste the link into any post." });
  };
  return (
    <button type="button" onClick={go} disabled={busy} aria-label={label}
      className={`inline-flex items-center gap-1 text-xs font-semibold text-[#F97316] px-2 py-1 rounded-lg hover:bg-[#F97316]/10 ${className}`}>
      <Share2 className="w-4 h-4" />{label}
    </button>
  );
}
