import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator, AlertTriangle } from "lucide-react";
import { ENTITY_LABELS, federalEstimate, stateCredits, type DonorType, type EntityType } from "@/lib/taxBenefit";

const STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");
const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

function Disclaimer() {
  return (
    <p className="text-xs text-muted-foreground mt-2">
      Estimated tax benefit only — not tax advice. Consult your CPA or tax advisor before filing.{" "}
      <Dialog>
        <DialogTrigger className="underline">Full disclaimer</DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>About these estimates</DialogTitle></DialogHeader>
          <div className="text-sm space-y-2 text-muted-foreground">
            <p>Every figure is an estimate based on the information you entered and current rules as we understand them.</p>
            <p>Your actual benefit depends on facts this calculator cannot see, including your full income, filing status, other deductions, and documentation.</p>
            <p>Tax laws change and several state credits expire on fixed dates.</p>
            <p>Consult a qualified tax professional before filing, and obtain the required documentation: a written statement from the donee organization, and Form 8283 Section A for noncash contributions over $500 (no appraisal is required for inventory).</p>
          </div>
        </DialogContent>
      </Dialog>
    </p>
  );
}

export default function VenueTaxCalculator() {
  const [checks, setChecks] = useState({ charity: false, wholesome: false, statement: false });
  const [f, setF] = useState({
    basis: "", fmv: "", entity: "c_corp" as EntityType, state: "", income: "", inventory: true, election: false, rate: "24", donor: "restaurant" as DonorType,
  });
  const eligible = checks.charity && checks.wholesome && checks.statement;
  const input = {
    basis: Number(f.basis) || 0, fmv: Number(f.fmv) || 0, entity: f.entity, state: f.state, taxableIncome: Number(f.income) || 0,
    inventoryBusiness: f.inventory, useBasisElection: f.election, marginalRate: (Number(f.rate) || 0) / 100, donorType: f.donor,
  };
  const fed = useMemo(() => federalEstimate(input), [JSON.stringify(input)]); // eslint-disable-line react-hooks/exhaustive-deps
  const credits = useMemo(() => (f.state ? stateCredits(input) : []), [JSON.stringify(input)]); // eslint-disable-line react-hooks/exhaustive-deps
  const ready = input.fmv > 0 && (input.basis > 0 || (!f.inventory && f.election)) && input.taxableIncome > 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Calculator className="w-6 h-6" /> Estimated Tax Benefit</h1>
        <p className="text-sm text-muted-foreground mt-1">Estimate the deduction for a planned food donation under the federal enhanced deduction (IRC §170(e)(3)) plus any matching state credit.</p>
      </div>

      <section className="bg-card rounded-xl border p-6 space-y-3">
        <h2 className="font-semibold text-foreground">1. Eligibility checklist</h2>
        {([
          ["charity", "The recipient is a 501(c)(3) public charity that uses the food to care for the ill, the needy, or infants."],
          ["wholesome", "The food is apparently wholesome (meets quality and labeling standards)."],
          ["statement", "I will obtain a written statement from the recipient describing the donation and its use."],
        ] as const).map(([k, t]) => (
          <label key={k} className="flex items-start gap-3 text-sm">
            <Checkbox checked={checks[k]} onCheckedChange={(v) => setChecks({ ...checks, [k]: !!v })} className="mt-0.5" /> {t}
          </label>
        ))}
        {!eligible && <p className="text-xs text-muted-foreground">Confirm all three to see the enhanced-deduction estimate.</p>}
      </section>

      <section className={`bg-card rounded-xl border p-6 space-y-4 ${eligible ? "" : "opacity-50 pointer-events-none"}`} aria-disabled={!eligible}>
        <h2 className="font-semibold text-foreground">2. Your donation</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Food cost basis ($)</Label><Input type="number" min="0" value={f.basis} onChange={(e) => setF({ ...f, basis: e.target.value })} disabled={!f.inventory && f.election} /></div>
          <div><Label>Fair market value ($)</Label><Input type="number" min="0" value={f.fmv} onChange={(e) => setF({ ...f, fmv: e.target.value })} /></div>
          <div><Label>Business entity type</Label>
            <Select value={f.entity} onValueChange={(v) => setF({ ...f, entity: v as EntityType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(ENTITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>State</Label>
            <Select value={f.state} onValueChange={(v) => setF({ ...f, state: v })}>
              <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>{STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Estimated taxable income ($)</Label><Input type="number" min="0" value={f.income} onChange={(e) => setF({ ...f, income: e.target.value })} /></div>
          <div><Label>Donor type (for state credits)</Label>
            <Select value={f.donor} onValueChange={(v) => setF({ ...f, donor: v as DonorType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="restaurant">Restaurant, venue or food service</SelectItem>
                <SelectItem value="farmer">Farmer / grower / producer</SelectItem>
                <SelectItem value="other">Other business</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {f.entity !== "c_corp" && (
            <div><Label>Estimated marginal tax rate (%)</Label><Input type="number" min="0" max="50" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></div>
          )}
        </div>
        <div className="flex items-center justify-between gap-4">
          <div><Label>We keep inventory (inventory business)</Label><p className="text-xs text-muted-foreground">Turn off if you don't track food inventory for tax purposes.</p></div>
          <Switch checked={f.inventory} onCheckedChange={(v) => setF({ ...f, inventory: v, election: v ? false : f.election })} />
        </div>
        {!f.inventory && (
          <label className="flex items-start gap-3 text-sm">
            <Checkbox checked={f.election} onCheckedChange={(v) => setF({ ...f, election: !!v })} className="mt-0.5" />
            Use the election to treat cost basis as 25% of fair market value.
          </label>
        )}
      </section>

      {eligible && ready && (
        <section className="bg-card rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-foreground">3. Estimated results</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground">Est. enhanced deduction</p>
              <p className="text-2xl font-bold text-foreground">{usd(fed.enhanced)}</p>
              <p className="text-xs text-muted-foreground">Lesser of basis + ½ appreciation or 2× basis (basis used {usd(fed.basisUsed)})</p>
              <Disclaimer />
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground">Est. deductible this year</p>
              <p className="text-2xl font-bold text-foreground">{usd(fed.deductibleNow)}</p>
              <p className="text-xs text-muted-foreground">Capped at 15% of taxable income ({usd(fed.cap)})</p>
              <Disclaimer />
            </div>
            {fed.carryforward > 0 && (
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground">Est. carryforward (up to 5 years)</p>
                <p className="text-2xl font-bold text-foreground">{usd(fed.carryforward)}</p>
                <Disclaimer />
              </div>
            )}
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground">Est. federal tax savings this year</p>
              <p className="text-2xl font-bold text-foreground">{usd(fed.taxSavings)}</p>
              <p className="text-xs text-muted-foreground">At {Math.round(fed.rate * 100)}% {f.entity === "c_corp" ? "(federal corporate rate)" : "(your estimated rate)"}</p>
              {f.entity === "c_corp" && (
                <p className="text-xs text-chart-4 mt-2 flex items-start gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Confirm with your CPA: a 2026 federal change added a 1%-of-taxable-income floor on corporate charitable deductions. Published analysis argues it does not apply to food donations, but the IRS has not issued guidance.
                </p>
              )}
              <Disclaimer />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">State credits</h3>
            {!f.state ? <p className="text-sm text-muted-foreground">Select a state to check for credits.</p> : credits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matching state food-donation credit for this state and donor type. Most state credits apply to farmers and growers, not restaurants or venues; Missouri's is the broad one.</p>
            ) : credits.map((c) => (
              <div key={c.name} className="rounded-lg bg-muted/50 p-4 mb-2">
                <p className="text-xs text-muted-foreground">{c.name}{c.refundable ? " (refundable)" : ""}</p>
                <p className="text-2xl font-bold text-foreground">Est. {usd(c.amount)}</p>
                <p className="text-xs text-muted-foreground">{Math.round(c.rate * 100)}% of value{c.cap ? `, up to ${usd(c.cap)}/yr` : ""}. {c.note}</p>
                <Disclaimer />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
