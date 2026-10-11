// Estimated tax benefit for food donations. Estimates only — not tax advice.

export type EntityType = "c_corp" | "s_corp" | "partnership" | "sole_prop";
export type DonorType = "restaurant" | "farmer" | "other";

export const ENTITY_LABELS: Record<EntityType, string> = {
  c_corp: "C corporation", s_corp: "S corporation", partnership: "Partnership / LLC", sole_prop: "Sole proprietor",
};

export type TaxInput = {
  basis: number; fmv: number; entity: EntityType; state: string; taxableIncome: number;
  inventoryBusiness: boolean; useBasisElection: boolean; marginalRate: number; donorType: DonorType;
  today?: Date;
};

/** IRC §170(e)(3) enhanced deduction, 15% of taxable income cap, 5-year carryforward. */
export function federalEstimate(i: TaxInput) {
  const fmv = Math.max(0, i.fmv);
  // Non-inventory businesses may elect to treat basis as 25% of FMV.
  const basis = !i.inventoryBusiness && i.useBasisElection ? 0.25 * fmv : Math.max(0, i.basis);
  const appreciation = Math.max(0, fmv - basis);
  const enhanced = fmv <= basis ? fmv : Math.min(basis + appreciation / 2, 2 * basis);
  const cap = 0.15 * Math.max(0, i.taxableIncome);
  const deductibleNow = Math.min(enhanced, cap);
  const carryforward = Math.max(0, enhanced - deductibleNow);
  const rate = i.entity === "c_corp" ? 0.21 : i.marginalRate;
  return { basisUsed: basis, enhanced, cap, deductibleNow, carryforward, rate, taxSavings: deductibleNow * rate };
}

type Credit = { state: string; name: string; rate: number; cap: number | null; donors: DonorType[]; expires?: string; note: string; refundable?: boolean };

/** Verified state credits. Colorado and Kentucky are intentionally excluded (repealed). */
export const STATE_CREDITS: Credit[] = [
  { state: "CA", name: "California farm donation credit", rate: 0.15, cap: null, donors: ["farmer"], expires: "2032-01-01", note: "Farmers/growers donating fresh produce to California food banks; tax years beginning before 1/1/2032." },
  { state: "OR", name: "Oregon crop donation credit", rate: 0.25, cap: null, donors: ["farmer"], note: "Growers donating crops to Oregon food banks." },
  { state: "MO", name: "Missouri food pantry credit", rate: 0.5, cap: 2500, donors: ["restaurant", "farmer", "other"], expires: "2027-01-01", note: "Donations to local food pantries, soup kitchens or shelters; expires 12/31/2026." },
  { state: "VA", name: "Virginia food crop donation credit", rate: 0.5, cap: 10000, donors: ["farmer"], expires: "2028-01-01", note: "Farm food donations to nonprofit food banks; expires 1/1/2028." },
  { state: "IA", name: "Iowa food donation credit", rate: 0.15, cap: 5000, donors: ["farmer"], note: "Producers donating food to Iowa food banks/pantries." },
  { state: "MD", name: "Maryland farm food donation credit", rate: 1.0, cap: 5000, donors: ["farmer"], note: "Fresh farm products; up to $5,000 per farm per year." },
  { state: "NY", name: "New York farm donation credit", rate: 0.25, cap: 5000, donors: ["farmer"], refundable: true, note: "Eligible farmers donating to New York food pantries; refundable." },
];

export function stateCredits(i: TaxInput) {
  const today = (i.today ?? new Date()).toISOString().slice(0, 10);
  return STATE_CREDITS
    .filter((c) => c.state === i.state.toUpperCase() && c.donors.includes(i.donorType) && (!c.expires || today < c.expires))
    .map((c) => {
      const raw = c.rate * Math.max(0, i.fmv);
      return { ...c, amount: c.cap != null ? Math.min(raw, c.cap) : raw };
    });
}
