import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";
import { METHODOLOGY_SHORT, METHODOLOGY_SOURCES } from "@/lib/impactMethodology";

/** Standard "these are estimates" note with cited sources, shown wherever impact numbers appear. */
export default function ImpactMethodologyNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-muted-foreground flex items-start gap-1.5 ${className}`}>
      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span>
        {METHODOLOGY_SHORT}{" "}
        <Popover>
          <PopoverTrigger className="underline underline-offset-2 hover:text-foreground">Methodology</PopoverTrigger>
          <PopoverContent className="w-80 text-xs space-y-2">
            <p className="font-semibold text-foreground">How we estimate impact</p>
            <ul className="space-y-1.5 list-disc pl-4">
              {METHODOLOGY_SOURCES.map((s) => (
                <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.label}</a></li>
              ))}
            </ul>
            <p>Figures are estimates and may differ from actual outcomes.</p>
          </PopoverContent>
        </Popover>
      </span>
    </p>
  );
}
