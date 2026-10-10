import { useState } from "react";
import { Info } from "lucide-react";

/**
 * Compact map credit: an info button that expands the legally required
 * attribution as plain text. No links, so tapping never leaves the app.
 */
export default function MapCredit() {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1">
      {open && (
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] text-gray-600 shadow-sm">
          © OpenStreetMap contributors · VersaTiles · MapLibre
        </span>
      )}
      <button
        type="button"
        aria-label={open ? "Hide map credits" : "Show map credits"}
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 shadow-sm"
      >
        <Info className="h-3.5 w-3.5 text-gray-600" />
      </button>
    </div>
  );
}
