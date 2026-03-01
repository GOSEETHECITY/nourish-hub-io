import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const SURPLUS_TYPES = [
  "Prepared Meals",
  "Produce",
  "Dairy",
  "Meat/Protein",
  "Baked Goods",
  "Shelf-Stable",
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

  const toggleOutcome = (outcome: string) => {
    const current = data.priority_outcomes.filter((o) => o !== "Other");
    if (current.includes(outcome)) {
      onChange({ ...data, priority_outcomes: current.filter((o) => o !== outcome) });
    } else if (current.length < 2) {
      onChange({ ...data, priority_outcomes: [...current, outcome, ...(data.priority_other ? ["Other"] : [])] });
    }
  };

  const selectedNonOther = data.priority_outcomes.filter((o) => o !== "Other");

  return (
    <div className="space-y-4">
      <div>
        <Label>Do you regularly generate surplus food?</Label>
        <RadioGroup
          value={data.generates_surplus ? "yes" : "no"}
          onValueChange={(v) => onChange({ ...data, generates_surplus: v === "yes" })}
          className="flex gap-4 mt-2"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="yes" /> Yes
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="no" /> No
          </label>
        </RadioGroup>
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
        <div className="flex flex-wrap gap-3 mt-2">
          {PRIORITY_OUTCOMES.map((outcome) => (
            <label key={outcome} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedNonOther.includes(outcome)}
                onCheckedChange={() => toggleOutcome(outcome)}
                disabled={!selectedNonOther.includes(outcome) && selectedNonOther.length >= 2}
              />
              {outcome}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={data.priority_outcomes.includes("Other")}
              onCheckedChange={(checked) => {
                if (checked) {
                  onChange({ ...data, priority_outcomes: [...data.priority_outcomes, "Other"] });
                } else {
                  onChange({ ...data, priority_outcomes: data.priority_outcomes.filter((o) => o !== "Other"), priority_other: "" });
                }
              }}
            />
            Other
          </label>
        </div>
        {data.priority_outcomes.includes("Other") && (
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
