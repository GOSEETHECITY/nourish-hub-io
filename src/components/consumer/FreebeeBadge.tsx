import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import freebeeLogo from "@/assets/freebee-logo.png";

/** Badge for events manually marked Freebee-eligible; tap opens an explainer sheet. */
export default function FreebeeBadge({ size = "sm", className = "" }: { size?: "sm" | "lg"; className?: string }) {
  const [open, setOpen] = useState(false);
  const lg = size === "lg";
  return (
    <>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); e.preventDefault(); setOpen(true); } }}
        className={`inline-flex items-center gap-1.5 rounded-full bg-white border border-[#8DC63F] text-[#1B2A4A] font-bold shadow-sm cursor-pointer ${lg ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs"} ${className}`}
      >
        <img src={freebeeLogo} alt="Freebee" className={`${lg ? "h-5" : "h-4"} w-auto object-contain`} />
        Free ride available
      </span>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent onClick={(e) => e.stopPropagation()}>
          <DrawerHeader className="text-center">
            <img src={freebeeLogo} alt="Freebee" className="h-12 w-auto mx-auto object-contain mb-2" />
            <DrawerTitle>Free ride available</DrawerTitle>
            <DrawerDescription>
              Freebee offers free on-demand electric rides in this area. Download the Freebee app to request your free ride to this grand opening.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <a
              href="https://www.ridefreebee.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center rounded-xl bg-[#F97316] text-white font-bold py-3"
            >
              Get the Freebee app
            </a>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
