// Social sharing for the consumer app: builds a branded image and shares it with a link.
export const SHARE_ORIGIN = "https://goseethecity.com";

export function shareUrl(path: string, referralCode?: string | null) {
  const u = new URL(path, SHARE_ORIGIN);
  if (referralCode) u.searchParams.set("ref", referralCode);
  return u.toString();
}

/** Remembers a ?ref= code from any landing URL so signup can credit the friend who shared. */
export function captureReferralFromUrl() {
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^[A-Za-z0-9-]{4,32}$/.test(ref)) sessionStorage.setItem("referral_code", ref);
  } catch { /* storage unavailable */ }
}

export async function makeShareImage(opts: { emoji: string; title: string; subtitle: string }): Promise<Blob | null> {
  const c = document.createElement("canvas");
  c.width = 1080; c.height = 1080;
  const g = c.getContext("2d");
  if (!g) return null;
  const grad = g.createLinearGradient(0, 0, 1080, 1080);
  grad.addColorStop(0, "#F97316"); grad.addColorStop(1, "#8DC63F");
  g.fillStyle = grad; g.fillRect(0, 0, 1080, 1080);
  g.fillStyle = "rgba(255,255,255,0.95)";
  g.beginPath(); g.roundRect(90, 90, 900, 900, 60); g.fill();
  g.textAlign = "center";
  g.font = "260px sans-serif"; g.fillText(opts.emoji, 540, 470);
  g.fillStyle = "#1B2A4A"; g.font = "bold 72px sans-serif"; wrap(g, opts.title, 540, 640, 820, 84);
  g.fillStyle = "#4B5563"; g.font = "40px sans-serif"; wrap(g, opts.subtitle, 540, 800, 820, 52);
  g.fillStyle = "#F97316"; g.font = "bold 40px sans-serif"; g.fillText("GO See The City", 540, 930);
  return await new Promise((r) => c.toBlob((b) => r(b), "image/png"));
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(" "); let line = ""; let yy = y;
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > max && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = t;
  }
  if (line) g.fillText(line, x, yy);
}

/** Native share with image when supported; otherwise copies the link and downloads the image. Returns what happened. */
export async function shareWithImage(p: { title: string; text: string; url: string; image?: Blob | null }): Promise<"shared" | "copied" | "cancelled"> {
  const file = p.image ? new File([p.image], "go-see-the-city.png", { type: "image/png" }) : null;
  try {
    if (file && navigator.canShare?.({ files: [file] })) { await navigator.share({ title: p.title, text: p.text, url: p.url, files: [file] }); return "shared"; }
    if (navigator.share) { await navigator.share({ title: p.title, text: p.text, url: p.url }); return "shared"; }
  } catch (e: any) {
    if (e?.name === "AbortError") return "cancelled";
  }
  try { await navigator.clipboard.writeText(`${p.text} ${p.url}`); } catch { /* ignore */ }
  if (p.image) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(p.image); a.download = "go-see-the-city.png"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  return "copied";
}
