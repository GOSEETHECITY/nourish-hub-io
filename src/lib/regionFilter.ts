// Shared helper for filtering rows by a government user's assigned region.
//
// Government users have a `government_regions` JSON field on their organization
// record with the shape: { state?, cities?, counties?, is_state_wide? }.
// This helper applies the same matching rules used across government pages
// so they stay consistent.

export type GovernmentRegions = {
  state?: string | null;
  cities?: string[] | null;
  counties?: string[] | null;
  is_state_wide?: boolean | null;
} | null | undefined;

export type RegionFilterable = {
  city?: string | null;
  state?: string | null;
  county?: string | null;
};

/**
 * Returns true if the row belongs to the given government region assignment.
 * When regions is null/undefined the row is considered in-region (no filter).
 */
export function matchesRegion<T extends RegionFilterable>(row: T, regions: GovernmentRegions): boolean {
  if (!regions) return true;

  const rowState = (row.state || "").toLowerCase().trim();
  const rowCity = (row.city || "").toLowerCase().trim();
  const rowCounty = (row.county || "").toLowerCase().trim();

  // Normalize US state names vs two-letter codes so "Florida" and "FL" match.
  const normalizeState = (s: string): string => {
    const lookup: Record<string, string> = {
      alabama: "al", alaska: "ak", arizona: "az", arkansas: "ar", california: "ca",
      colorado: "co", connecticut: "ct", delaware: "de", florida: "fl", georgia: "ga",
      hawaii: "hi", idaho: "id", illinois: "il", indiana: "in", iowa: "ia", kansas: "ks",
      kentucky: "ky", louisiana: "la", maine: "me", maryland: "md", massachusetts: "ma",
      michigan: "mi", minnesota: "mn", mississippi: "ms", missouri: "mo", montana: "mt",
      nebraska: "ne", nevada: "nv", "new hampshire": "nh", "new jersey": "nj",
      "new mexico": "nm", "new york": "ny", "north carolina": "nc", "north dakota": "nd",
      ohio: "oh", oklahoma: "ok", oregon: "or", pennsylvania: "pa", "rhode island": "ri",
      "south carolina": "sc", "south dakota": "sd", tennessee: "tn", texas: "tx",
      utah: "ut", vermont: "vt", virginia: "va", washington: "wa",
      "west virginia": "wv", wisconsin: "wi", wyoming: "wy",
    };
    const key = s.toLowerCase().trim();
    return lookup[key] ?? key;
  };

  if (regions.is_state_wide && regions.state) {
    return normalizeState(rowState) === normalizeState(regions.state);
  }
  if (regions.cities && regions.cities.length > 0) {
    return regions.cities.some((c) => c.toLowerCase().trim() === rowCity);
  }
  if (regions.counties && regions.counties.length > 0) {
    return regions.counties.some((c) => c.toLowerCase().trim() === rowCounty);
  }
  // No constraints set → include everything
  return true;
}

export function filterByRegion<T extends RegionFilterable>(rows: T[], regions: GovernmentRegions): T[] {
  if (!regions) return rows;
  return rows.filter((row) => matchesRegion(row, regions));
}
