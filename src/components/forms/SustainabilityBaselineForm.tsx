import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertCircle } from "lucide-react";

const SURPLUS_TYPES = [
  "Prepared Meals / Cooked Food",
  "Produce / Fresh Fruits and Vegetables",
  "Dairy",
  "Meat / Protein",
  "Baked Goods",
  "Shelf-Stable / Packaged / Non-Perishable",
  "Frozen",
];

const PRIORITY_OUTCOMES = [
  "Meals Donated",
  "Waste Reduced",
  "Cost Savings",
  "Lower Disposal Costs",
  "Community Impact",
];

export interface SustainabilityBaselineData {
  generates_surplus: boolean;
  estimated_daily_surplus: string;
  surplus_types: string[];
  current_handling: string;
  donation_frequency: string;
  priority_outcomes: string[];
  priority_other: string;
}

export const emptySustainabilityBaseline: SustainabilityBaselineData = {
  generates_surplus: false,
  estimated_daily_surplus: "",
  surplus_types: [],
  current_handling: "",
  donation_frequency: "",
  priority_outcomes: [],
  priority_other: "",
};

interface Props {
  data: SustainabilityBaselineData;
  onChange: (data: SustainabilityBaselineData) => void;
}

export default function SustainabilityBaselineForm({ data, onChange }: Props) {
  const toggleSurplusType = (type: string) => {
    const next = data.surplus_types.includes(type)
      ? data.surplus_types.filter((t) => t !== type)
      : [...data.surplus_types, type];
    onChange({ ...data, surplus_types: next });
  };

  const selectedNonOther = data.priority_outcomes.filter((o) => o !== "Other");
  const hasOther = data.priority_outcomes.includes("Other");
  const totalSelected = selectedNonOther.length + (hasOther ? 1 : 0);

  const toggleOutcome = (outcome: string) => {
    if (selectedNonOther.includes(outcome)) {
      onChange({ ...data, priority_outcomes: data.priority_outcomes.filter((o) => o !== outcome) });
    } else if (totalSelected < 2) {
      onChange({ ...data, priority_outcomes: [...data.priority_outcomes, outcome] });
    }
  };

  const toggleOther = (checked: boolean) => {
    if (checked && totalSelected < 2) {
      onChange({ ...data, priority_outcomes: [...data.priority_outcomes, "Other"] });
    } else if (!checked) {
      onChange({ ...data, priority_outcomes: data.priority_outcomes.filter((o) => o !== "Other"), priority_other: "" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Do you regularly generate surplus food?</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{data.generates_surplus ? "Yes" : "No"}</span>
          <Switch
            checked={data.generates_surplus}
            onCheckedChange={(v) => onChange({ ...data, generates_surplus: v })}
          />
        </div>
      </div>

      <div>
        <Label>Estimated average surplus per day or event</Label>
        <Input
          value={data.estimated_daily_surplus}
          onChange={(e) => onChange({ ...data, estimated_daily_surplus: e.target.value })}
          placeholder="e.g. 50 lbs per day"
        />
      </div>

      <div>
        <Label>Types of surplus available</Label>
        <div className="flex flex-wrap gap-3 mt-2">
          {SURPLUS_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={data.surplus_types.includes(type)}
                onCheckedChange={() => toggleSurplusType(type)}
              />
              {type}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label>Current handling of surplus</Label>
        <Input
          value={data.current_handling}
          onChange={(e) => onChange({ ...data, current_handling: e.target.value })}
          placeholder="e.g. Thrown away, composted..."
        />
      </div>

      <div>
        <Label>Current donation frequency</Label>
        <Input
          value={data.donation_frequency}
          onChange={(e) => onChange({ ...data, donation_frequency: e.target.value })}
          placeholder="e.g. Weekly, monthly..."
        />
      </div>

      <div>
        <Label>Priority outcomes (select up to 2)</Label>
        {totalSelected >= 2 && (
          <div className="flex items-center gap-1.5 mt-1 text-amber-600">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-xs">Please select up to 2 outcomes only.</span>
          </div>
        )}
        <div className="flex flex-wrap gap-3 mt-2">
          {PRIORITY_OUTCOMES.map((outcome) => (
            <label key={outcome} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedNonOther.includes(outcome)}
                onCheckedChange={() => toggleOutcome(outcome)}
                disabled={!selectedNonOther.includes(outcome) && totalSelected >= 2}
              />
              {outcome}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={hasOther}
              onCheckedChange={(checked) => toggleOther(!!checked)}
              disabled={!hasOther && totalSelected >= 2}
            />
            Other
          </label>
        </div>
        {hasOther && (
          <Input
            className="mt-2"
            placeholder="Describe other outcome..."
            value={data.priority_other}
            onChange={(e) => onChange({ ...data, priority_other: e.target.value })}
          />
        )}
      </div>
    </div>
  );
}
