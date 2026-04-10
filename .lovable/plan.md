

# Implementation Plan — Sections 0 through G

## Section 0: Verify /app/home renders

The ConsumerHome component uses dynamic `import("leaflet")` and `import("react-leaflet")` with marker icon imports. The code looks structurally sound — it has null guards and try/catch. The most likely crash cause is the marker icon imports (`leaflet/dist/images/marker-icon.png`) returning a module object instead of a string in Vite's asset pipeline. Fix: add explicit `.default` fallback handling for all three icon imports, and wrap the entire map rendering in additional null guards. Verify via browser navigation.

## Section A: Three Supabase Migrations

**Migration 1 — events table**: Add `county TEXT NOT NULL DEFAULT ''` column. (`offer_badge`, `share_url`, `share_count`, `flyer_url` already exist from prior migration.)

**Migration 2 — invitation_codes table**: Add three columns:
- `state TEXT NOT NULL DEFAULT ''`
- `role_type TEXT NOT NULL DEFAULT 'Consumer'` with CHECK constraint `IN ('Consumer', 'Restaurant', 'Nonprofit')`
- `max_uses INTEGER NOT NULL DEFAULT 100`

**Migration 3 — event-flyers storage bucket**: Create public bucket with RLS for authenticated uploads.

Also update `src/types/database.ts` to add `county` to `HarietEvent` and `state`, `role_type`, `max_uses` to `InvitationCode`.

## Section B: /events form additions (P6)

Update `src/pages/Events.tsx`:
1. Add `county` field (required text, placeholder "e.g. Kings County") to form state and dialog
2. Add helper text under Offer Badge: "A short highlight... Shown as a badge on the event card"
3. Add flyer upload to `event-flyers` bucket (separate from existing `events` bucket image upload), save URL to `flyer_url`
4. Add "Generate description from flyer" button — create stub Edge Function `generate-event-description-from-flyer` that returns placeholder text
5. Add County column to events table display
6. Enforce max 40 chars on offer_badge input

## Section C: /users → Invitation Codes additions (P7)

Update `src/pages/UsersPage.tsx`:
1. Add State dropdown using a new `US_STATE_CODES` constant (2-letter codes) in `src/lib/constants.ts`
2. Add Role/Type dropdown (Consumer/Restaurant/Nonprofit), default Consumer
3. Add Max Uses number input, default 100, min 1
4. Add search bar above codes table with placeholder "Search invitation codes..."
5. Code column already has `font-mono` — confirm it renders correctly
6. Add auto-expiry logic: when rendering status, if `times_used >= max_uses`, show "Expired"
7. Wire new fields into saveCode mutation

## Section D: Cross-table UX consistency (P5)

Create shared components:
- `src/components/admin/StatusChip.tsx` — consistent status badge with color mapping (Active=green, Pending=amber, Inactive/Expired=gray, Rejected/Cancelled=red)
- `src/components/admin/ActionsMenu.tsx` — 3-dot MoreVertical dropdown with View/Edit/Delete, delete confirmation modal

Apply to all 8 admin table pages:
- `/organizations` — has search, needs Actions menu + status chip standardization
- `/food-listings/donations` — has search, needs Actions column
- `/food-listings/discounted-sale` — no search bar, no Actions column, needs both
- `/nonprofits` — no search bar visible, needs one + Actions
- `/events` — no search bar, has inline actions, needs search + standardized Actions menu
- `/marketplace` — card-based, add search bar
- `/users` (All Users) — has search, needs standardized Actions
- `/users` (Invitation Codes) — needs search bar (added in Section C)

Add filter labels ("Filter by status", "Filter by city") above every unlabeled dropdown.

State fields: normalize to 2-letter uppercase at render time with a `toStateAbbr()` helper.

## Section E: Global text/icon color sweep (P2 completion)

The sidebar uses `text-primary-foreground` (white on dark brown background) — this is correct since sidebar bg is dark brown. The issue is if any admin page body content renders text in brown.

Check CSS variables: `--foreground: 220 13% 18%` — this is a dark blue-gray, not brown. `--muted-foreground: 25 10% 45%` — this is a brownish muted color. Change it to a neutral gray: `25 0% 45%` or similar to remove brown tint.

Also audit: `text-chart-4` and similar chart-derived colors used as text in status badges. Replace with standardized StatusChip colors.

Fix the admin header search placeholder from "Search Restaurants, Products etc.." to "Search..." (it's in DashboardLayout.tsx line 153).

Verify all headings use `font-display` (Space Grotesk) class.

## Section F: Data integrity bugs

**F1 — Marketplace vs Discounted Sale count mismatch**: The Marketplace page correctly shows only coupons whose location has `marketplace_enabled=true`. The Discounted Sale page shows all coupons. This is by design — the Marketplace is a subset. Add clarifying subtitle text on both pages explaining the scope, e.g. "Coupons on marketplace-enabled locations" vs "All discounted surplus food coupons". This isn't a bug — it's a UX clarity issue.

**F2 — Identical pickup window times**: One food listing has `pickup_window_start = pickup_window_end`. Fix: backfill via SQL UPDATE where start=end, setting end = start + 2 hours. Also audit `VenueDonations.tsx` to ensure the form writes distinct start/end values.

**F3 — Coupon titles duplicating org name**: Current coupon titles are "Rita's Italian Ice and Frozen Custard" and "Serengeti Restaurant and Bar" — these look like they ARE the org names used as titles, not a concatenation bug. The titles themselves need to be the coupon-specific text. Fix via data update and check the coupon creation form.

## Section G: Minor admin styling

**G1 — Login button color**: No `#2B1803` found in codebase — the login button uses `className="w-full"` which inherits from the primary color CSS variable `--primary: 31 87% 9%`. Converting: HSL(31, 87%, 9%) ≈ `#2B1803`. Change `--primary` from `31 87% 9%` to match `#2C1803` exactly: HSL(30, 88%, 9%).

**G2 — Remove emojis from admin**: Replace 🏆 in Impact.tsx with `<Trophy>` Lucide icon. Replace 💳 in Billing.tsx with `<CreditCard>`. Replace 📧 in SettingsPage.tsx with `<Mail>`. Also replace 🟢/🟡 in Marketplace.tsx with colored dot divs.

## Files to Create/Modify

**New files:**
- `src/components/admin/StatusChip.tsx`
- `src/components/admin/ActionsMenu.tsx`
- `supabase/functions/generate-event-description-from-flyer/index.ts`

**Modified files:**
- `src/lib/constants.ts` — add `US_STATE_CODES`
- `src/types/database.ts` — add `county` to HarietEvent, add fields to InvitationCode
- `src/pages/Events.tsx` — add County, flyer upload, AI button, search bar, Actions menu
- `src/pages/UsersPage.tsx` — add State/Role/MaxUses to code form, search bar, auto-expiry
- `src/pages/FoodListingsDiscounted.tsx` — add search bar, Actions menu
- `src/pages/FoodListingsDonations.tsx` — add Actions menu
- `src/pages/Nonprofits.tsx` — add search bar, Actions menu
- `src/pages/Organizations.tsx` — standardize Actions
- `src/pages/Marketplace.tsx` — add search bar, remove emojis
- `src/pages/Impact.tsx` — replace 🏆 with Trophy icon
- `src/pages/Billing.tsx` — replace 💳 with CreditCard icon
- `src/pages/SettingsPage.tsx` — replace 📧 with Mail icon
- `src/pages/Index.tsx` — no changes needed (charts already done)
- `src/pages/consumer/ConsumerHome.tsx` — harden icon imports
- `src/components/layout/DashboardLayout.tsx` — fix search placeholder
- `src/index.css` — adjust `--primary` and `--muted-foreground` hue
- Migration SQL for events.county, invitation_codes columns, event-flyers bucket

**Data fixes (via insert tool):**
- Backfill food_listings where pickup_window_start = pickup_window_end
- Update coupon titles to remove org name duplication

## Execution Order
1. Section 0 — fix/verify /app/home
2. Section A — run 3 migrations
3. Section B — Events form
4. Section C — Invitation Codes form
5. Section D — cross-table sweep (StatusChip + ActionsMenu + search bars)
6. Section E — color/font sweep
7. Section F — data fixes
8. Section G — minor styling

