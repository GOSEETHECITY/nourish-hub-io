// ─── Organization Type (Parent Categories) ───
export const ORG_CATEGORIES = [
  { value: "food_beverage_group", label: "Food & Beverage Group" },
  { value: "hospitality_group", label: "Hospitality Group" },
  { value: "venue_events_group", label: "Venue & Events Group" },
  { value: "farm_grocery_group", label: "Farm & Grocery Group" },
  { value: "government_entity", label: "Government Entity" },
  { value: "nonprofit_organization", label: "Nonprofit Organization" },
] as const;

// Mapping from signup category to org type
export const SIGNUP_CATEGORY_TO_ORG_TYPE: Record<string, string> = {
  restaurant: "food_beverage_group",
  hospitality: "hospitality_group",
  venue_events: "venue_events_group",
  farm_grocery: "farm_grocery_group",
  government: "government_entity",
  nonprofit: "nonprofit_organization",
};

// ─── Location Type Options ───
export const LOCATION_TYPES = [
  "Restaurant",
  "Food Truck",
  "Catering Company",
  "Cafe",
  "Coffee Shop",
  "Convenience Store",
  "Deli",
  "Bakery",
  "Hotel",
  "Resort",
  "Convention Center",
  "Stadium",
  "Arena",
  "Airport",
  "Festival",
  "Farm",
  "Grocery Store",
  "Food Distributor",
  "Food Pantry",
  "Community Kitchen",
  "Other",
] as const;

// ─── US States (for government region selection) ───
export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
] as const;

// Format org type for display (handles both old specific types and new categories)
export function formatOrgType(type: string | null | undefined): string {
  if (!type) return "—";
  const cat = ORG_CATEGORIES.find((c) => c.value === type);
  if (cat) return cat.label;
  // Legacy specific types
  return type.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}
