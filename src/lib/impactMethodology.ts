// Single source of truth for every impact estimate shown in any portal.
// Edge functions mirror these numbers in supabase/functions/_shared/impactMethodology.ts.

export const IMPACT_FACTORS = {
  /** Meals per pound of food. Feeding America uses ~1.2 lb per meal (≈0.83); rounded down to 0.8 to stay conservative. */
  MEALS_PER_LB: 0.8,
  /** lb CO2e avoided per lb of food kept out of landfill (EPA WARM / ReFED food-waste emission factors). */
  CO2E_LBS_PER_LB: 2.5,
  /** Gallons of water embedded per lb of food (average food water footprint, Water Footprint Network). */
  WATER_GAL_PER_LB: 108,
  /** lb CO2 absorbed by one mature tree per year (USDA Forest Service / Arbor Day estimate). */
  CO2_LBS_PER_TREE_YEAR: 48,
  /** lb CO2 per passenger-vehicle mile (EPA: ~404 g/mile). */
  CO2_LBS_PER_CAR_MILE: 0.89,
} as const;

export function estimateImpact(pounds: number) {
  const lbs = Number(pounds) || 0;
  const co2 = lbs * IMPACT_FACTORS.CO2E_LBS_PER_LB;
  return {
    pounds: lbs,
    landfillLbs: lbs,
    meals: Math.round(lbs * IMPACT_FACTORS.MEALS_PER_LB),
    co2Lbs: Math.round(co2),
    waterGal: Math.round(lbs * IMPACT_FACTORS.WATER_GAL_PER_LB),
    trees: Math.round(co2 / IMPACT_FACTORS.CO2_LBS_PER_TREE_YEAR),
    carMiles: Math.round(co2 / IMPACT_FACTORS.CO2_LBS_PER_CAR_MILE),
  };
}

export const METHODOLOGY_SHORT =
  `Estimates based on pounds diverted: 1 lb = ${IMPACT_FACTORS.MEALS_PER_LB} meals, ${IMPACT_FACTORS.CO2E_LBS_PER_LB} lbs CO2e, ${IMPACT_FACTORS.WATER_GAL_PER_LB} gal water; 1 tree = ${IMPACT_FACTORS.CO2_LBS_PER_TREE_YEAR} lbs CO2/yr. "Meals served" are reported by nonprofits.`;

export const METHODOLOGY_SOURCES = [
  { label: "Meals: Feeding America meal equivalency (~1.2 lb/meal), rounded to 0.8 meals/lb", url: "https://www.feedingamerica.org/research/elevating-voices" },
  { label: "CO2e: U.S. EPA Waste Reduction Model (WARM), food waste", url: "https://www.epa.gov/waste-reduction-model" },
  { label: "Water: Water Footprint Network product water footprints", url: "https://www.waterfootprint.org/resources/interactive-tools/product-gallery/" },
  { label: "Trees: USDA Forest Service / Arbor Day Foundation (~48 lb CO2 per tree per year)", url: "https://www.arborday.org/trees/benefits" },
  { label: "Car miles: U.S. EPA greenhouse gas emissions from a typical passenger vehicle", url: "https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle" },
];
