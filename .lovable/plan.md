# M-DCPS District Admin Dashboard

Add a new district-admin view for the HarietAI cafeteria-food-waste program, mounted at `/district` and going straight to the dashboard (no auth gate). Uses the existing HarietAI dark-sidebar layout system, but with a district-specific sidebar section and its own theme accents.

## Route & shell

- New route in `src/App.tsx`: `/district` → `DistrictDashboard` (no `ProtectedRoute` wrapper, per request).
- Reuse `PartnerDashboardLayout` (same pattern as Venue/Nonprofit/Government) so we inherit the dark sidebar, top bar, notifications, and responsive behavior.
- Sidebar section labeled **DISTRICT** with these items (all render, only Dashboard is wired to a real page for now; the rest go to lightweight placeholder pages so nav doesn't break):
  - Dashboard → `/district`
  - Schools → `/district/schools`
  - Donations → `/district/donations`
  - Pickups → `/district/pickups`
  - Compost → `/district/compost`
  - Reports → `/district/reports`
  - Assemblies → `/district/assemblies`
  - Support Log → `/district/support-log`
  - Settings → `/district/settings`
  - Logout → returns to `/`
- Top bar: search input ("Search schools, pickups…"), notification bell with badge, profile chip "M-DCPS Sustainability | Admin".

## Dashboard page (`/district`)

Layout (all cards white, rounded, soft shadow, on `#F5F6FA` background):

1. **Header row** — District logo placeholder (rounded square), "Miami-Dade County Public Schools", subtitle "Fall 2026 Program | 9 Schools | Sept – Dec 2026", right-aligned date-range selector (This Week / This Month / Semester / Custom).

2. **Stat tiles (4 across, responsive to 2×2, then 1-col)**
   - Total Lbs Diverted — 12,847 lbs · green pill "+312 today"
   - Meals Donated — 4,215 · green pill "+8.2% this week"
   - Disposal Cost Savings — $4,289 · green pill "on pace for $8.5K"
   - Schools Reporting Today — 9 of 9 · green pill "100%"

3. **Two-column grid (60/40 on lg, stacked on mobile)**
   - Left: **Food Diverted Over Time** — stacked bar chart (Recharts) by week with 4 series: Donated (steel blue), Composted (green), Could Have Been Donated (orange), Waste (gray). Toggle: This Week / This Month / Semester.
   - Right column, stacked:
     - **Fun Impact Stat** card — large text ("Enough food donated to fill 2.5 football fields"), football-field icon, refresh icon that cycles through a small array (school buses, elephants, garbage trucks, swimming pools).
     - **USDA 2030 Goal Progress** — SVG progress ring at 34% toward 50% reduction, label "On track".

4. **School Leaderboard (full width)** — "School Rankings — Most Food Donated". Table with columns: Rank, School Name, Lbs Donated, Lbs Composted, Diversion Rate %, Last Submission, Status (green/yellow/red dot). Rank 1 shows a small trophy icon. 9 realistic M-DCPS high-school names as placeholders (Miami Beach Senior High, MAST Academy, Coral Reef Senior High, Carol City Senior High, Miami Palmetto, Miami Killian, Miami Norland, Miami Southridge, Miami Sunset).

5. **Two-column grid**
   - **Needs Attention** — colored list rows:
     - Red: "Carol City HS — no data submitted 3 days"
     - Yellow: "Pickup missed at Gloria Floyd — rescheduled for tomorrow"
     - Blue: "New staff at MAST Academy — retraining video sent automatically"
   - **Recent Pickups** — live-feed list: school, nonprofit (Fertile Earth Foundation, Food Rescue US, Farm Share, etc.), lbs, method (Nonprofit Direct / Driver), timestamp.

6. **Two-column grid**
   - **Support Questions This Month** — big "47 questions answered", breakdown "43 by Sort It app · 4 by HarietAI support · 0 to district office", green banner "Zero questions reached M-DCPS staff".
   - **Program Time Tracker** — three side-by-side numbers: HarietAI 84 hrs · School Staff 31 hrs · District Staff 1.5 hrs, subtitle "Tracking true per-school cost to scale to 392 schools".

7. **Bottom action row** — primary steel-blue button "Export Monthly Report" and secondary outline button "Download Board Presentation Data" (both non-functional stubs with toast on click).

All numbers, school names, pickups, and alerts are hard-coded realistic placeholder data in a `districtMockData.ts` module — no DB changes.

## Files to add

- `src/pages/district/DistrictDashboard.tsx` — sidebar shell (wraps `PartnerDashboardLayout`).
- `src/pages/district/DistrictHome.tsx` — the dashboard page above.
- `src/pages/district/placeholders.tsx` — small "Coming soon" pages for Schools/Donations/Pickups/Compost/Reports/Assemblies/Support Log/Settings so the sidebar links resolve.
- `src/components/district/StatTile.tsx`
- `src/components/district/FoodDivertedChart.tsx` (Recharts stacked bar)
- `src/components/district/FunImpactCard.tsx`
- `src/components/district/UsdaGoalRing.tsx`
- `src/components/district/SchoolLeaderboard.tsx`
- `src/components/district/NeedsAttention.tsx`
- `src/components/district/RecentPickups.tsx`
- `src/components/district/SupportDeflection.tsx`
- `src/components/district/TimeTracker.tsx`
- `src/lib/districtMockData.ts`

## Files to modify

- `src/App.tsx` — register `/district` and sub-routes (public, no `ProtectedRoute`).
- `src/index.css` — add district accent tokens (steel-blue `#0D47A1`, success green `#4CAF50`, alert orange `#FF5722`) as HSL semantic tokens so components stay theme-safe.

## Technical notes

- Chart uses `recharts` (already in the shadcn stack).
- Progress ring is a small inline SVG (stroke-dasharray) — no new dependency.
- All colors go through the design tokens in `index.css` / `tailwind.config.ts` (no hard-coded `bg-[#...]` in components).
- Fully responsive via Tailwind grid breakpoints (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`, etc.).
- No Supabase reads — pure mock data, so page loads instantly with no auth.
