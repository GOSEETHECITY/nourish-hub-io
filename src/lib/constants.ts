// ─── Organization Type (Parent Categories) ───
export const ORG_CATEGORIES = [
  { value: "food_beverage_group", label: "Food & Beverage Group" },
  { value: "hospitality_group", label: "Hospitality Group" },
  { value: "venue_events_group", label: "Venue & Events Group" },
  { value: "farm_grocery_group", label: "Farm & Grocery Group" },
  { value: "government_entity", label: "Government Entity" },
  { value: "nonprofit_organization", label: "Nonprofit Organization" },
] as const;

// Mapping from signup category to default backend organization type
export const SIGNUP_CATEGORY_TO_ORG_TYPE: Record<string, string> = {
  restaurant: "restaurant",
  hospitality: "hotel",
  venue_events: "event",
  farm_grocery: "farm",
  food_suppliers: "food_distributor",
  government: "municipal_government",
  nonprofit: "nonprofit_organization",
};

export const CATEGORY_TO_ORG_TYPES: Record<string, Array<{ value: string; label: string }>> = {
  restaurant: [
    { value: "restaurant", label: "Restaurant" },
    { value: "catering_company", label: "Catering Company" },
    { value: "food_truck", label: "Food Truck" },
    { value: "cafe", label: "Cafe" },
  ],
  hospitality: [
    { value: "hotel", label: "Hotel" },
    { value: "resort", label: "Resort" },
    { value: "convention_center", label: "Convention Center" },
  ],
  venue_events: [
    { value: "stadium", label: "Stadium" },
    { value: "arena", label: "Arena" },
    { value: "airport", label: "Airport" },
    { value: "event", label: "Event Venue" },
    { value: "festival", label: "Festival" },
  ],
  farm_grocery: [
    { value: "farm", label: "Farm" },
  ],
  food_suppliers: [
    { value: "food_distributor", label: "Food Distributor" },
    { value: "food_manufacturer", label: "Food Manufacturer" },
  ],
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

// ─── US State 2-letter codes ───
export const US_STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

// Format org type for display (handles both old specific types and new categories)
export function formatOrgType(type: string | null | undefined): string {
  if (!type) return "—";
  const cat = ORG_CATEGORIES.find((c) => c.value === type);
  if (cat) return cat.label;
  // Legacy specific types
  return type.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}
