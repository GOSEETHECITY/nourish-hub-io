// Marketplace eligibility rules
export const MARKETPLACE_ELIGIBLE_TYPES = [
  "Restaurant",
  "Food Truck",
  "Cafe",
  "Coffee Shop",
  "Convenience Store",
  "Deli",
  "Bakery",
  "Farm",
  "Grocery Store",
  "Food Distributor",
];

export const MARKETPLACE_INELIGIBLE_TYPES = [
  "Catering Company",
  "Hotel",
  "Resort",
  "Convention Center",
  "Stadium",
  "Arena",
  "Airport",
  "Festival",
  "Food Pantry",
  "Community Kitchen",
  "Other",
];

export function isMarketplaceEligible(locationType: string | null, marketplaceEnabled: boolean): boolean {
  // If admin has explicitly toggled, respect that
  if (marketplaceEnabled) return true;
  if (!locationType) return false;
  return MARKETPLACE_ELIGIBLE_TYPES.includes(locationType);
}
