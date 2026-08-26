# Partner portal: three fixes

## 1. Remove the fake badge unlock

Today every new `consumers` row fires a database trigger that awards an "account_created / Welcome aboard" badge, and the badge helper writes a notification titled "Badge unlocked: Welcome aboard" with a badge icon and a link to the consumer Profile page.

Change:
- Stop awarding a badge on account creation. The signup trigger will instead write a single plain notification: title "Your account is set up", body "Your GO See The City account is live.", type `account_created` (a normal account notification, not `badge_awarded`), with no badge icon in the payload.
- Remove existing "account_created" badge rows and the old "Badge unlocked: Welcome aboard" notifications so nobody keeps seeing the stale message.
- The Profile page badge grid is untouched: the welcome entry simply stays in its locked state like the others, exactly as it looks now.

Technical: SQL migration replacing `public.on_consumer_after_insert()` so it no longer calls `award_badge`; delete from `consumer_badges` where `badge_key = 'account_created'` and delete matching `notifications` rows. `award_badge` itself stays as-is for real badges (check-ins, referrals).

## 2. "Set operational hours" in Getting Started + donation gate

File: `src/components/venue/OnboardingChecklist.tsx` (the Getting Started card) and `src/pages/venue/VenueDonations.tsx` (the post-donation gate).

- Add a 4th checklist item, "Set operational hours", routed to `/venue/settings`. It counts as complete when the organization has saved `hours_of_operation` and at least one day is not marked closed (so an untouched all-closed state does not count).
- The donation gate currently only requires a sustainability baseline. It will require both baseline and hours. On clicking "Post donation" without both, show a message naming what is missing, for example "Complete your sustainability baseline and set your operational hours before posting a donation," and send the partner to the missing step (baseline first, otherwise Settings).

Technical: shared helper `hasRealHours(hours)` in `src/lib/orgProfile.ts` used by the checklist, the existing `HoursTaskCard`, and the donations gate, so all three agree on what "hours are set" means.

## 3. Disable the Marketplace page until launch

File: `src/pages/venue/VenueMarketplace.tsx`.

- Keep the "Marketplace Coming Soon" card and copy.
- The "Connect Stripe" button and the "Create Coupon" button become disabled, with the coupon dialog removed from reach; the stats and table below are dimmed and non-interactive so the page visually matches the coming-soon message.
- No Stripe onboarding flow and no coupon writes can be triggered from this page.

Technical: wrap the page body in a muted, `pointer-events-none` container with the coming-soon card kept fully visible, and set `disabled` on both actions with a tooltip/subtext "Available when the marketplace launches".

## Notes

Files to be edited: the consumer-signup SQL trigger (new migration), `src/components/venue/OnboardingChecklist.tsx`, `src/pages/venue/VenueDonations.tsx`, `src/lib/orgProfile.ts`, `src/pages/venue/VenueMarketplace.tsx`. Exact files edited and pending-publish state will be confirmed after the build.
