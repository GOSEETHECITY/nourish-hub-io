import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  approved: "bg-green-100 text-green-800",
  published: "bg-green-100 text-green-800",
  live: "bg-green-100 text-green-800",
  paid: "bg-green-100 text-green-800",
  unlocked: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  draft: "bg-amber-100 text-amber-800",
  new: "bg-amber-100 text-amber-800",
  unpaid: "bg-amber-100 text-amber-800",
  posted: "bg-amber-100 text-amber-800",
  claimed: "bg-blue-100 text-blue-800",
  picked_up: "bg-blue-100 text-blue-800",
  pending_impact_report: "bg-amber-100 text-amber-800",
  inactive: "bg-gray-100 text-gray-800",
  expired: "bg-gray-100 text-gray-800",
  sold_out: "bg-gray-100 text-gray-800",
  taken_down: "bg-gray-100 text-gray-800",
  deactivated: "bg-gray-100 text-gray-800",
  locked: "bg-gray-100 text-gray-800",
  archived: "bg-gray-100 text-gray-800",
  free: "bg-gray-100 text-gray-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-red-100 text-red-800",
};

export function toTitleCase(s: string): string {
  return s.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function toStateAbbr(state: string | null | undefined): string {
  if (!state) return "—";
  const trimmed = state.trim();
  if (trimmed.length <= 2) return trimmed.toUpperCase();
  // Common full state names to abbreviations
  const map: Record<string, string> = {
    alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
    colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
    hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
    kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
    massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
    missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
    "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
    "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
    oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
    virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
  };
  return map[trimmed.toLowerCase()] || trimmed.toUpperCase().slice(0, 2);
}

interface StatusChipProps {
  status: string;
  className?: string;
}

export default function StatusChip({ status, className }: StatusChipProps) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  const colorClass = STATUS_MAP[key] || "bg-gray-100 text-gray-800";
  return (
    <span className={cn("px-2.5 py-0.5 text-xs font-semibold rounded", colorClass, className)}>
      {toTitleCase(status)}
    </span>
  );
}
