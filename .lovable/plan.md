# Audit Completion — 11 Items

Grouped into 4 batches so each ships fully working. I execute batches back-to-back once you approve; no batch is "deferred" — this is sequencing, not postponement.

## Batch A — Data model & core loops (Items 1, 2, 3, 6, 7, 10)

**Migration 1 — Badges, referrals, rollup helpers, cron**
- `consumer_badges`: add `badge_key` (unique per consumer), `badge_name`, `awarded_at`. Seed catalog.
- New `referrals` table: `referrer_consumer_id`, `referee_consumer_id`, `code`, `created_at`. Grants + RLS.
- `consumers.referral_code` (unique, 8-char). Backfill for all existing rows.
- Trigger `award_badge(consumer_id, key)` — idempotent insert + writes a `notifications` row so the app can toast on next load.
- Triggers:
  - On `consumers` insert → award `account_created` + generate referral_code. Backfill both for existing.
  - On `event_checkins` insert → award `first_checkin_grand_opening` (if event is grand opening), `checkins_5`, `checkins_10`.
  - On `referrals` insert → award `first_referral` to referrer.
  - On `consumer_orders` insert → award `first_order`.
- pg_cron schedules (Item 10):
  - `grand-opening-agent` daily 08:00 UTC (3am EST)
  - `enforce-receipt-deadline` hourly
  - `release-expired-flash-reservations` every 5 min
  - `refresh-impact-snapshot` Sundays 00:00

**Frontend**
- `ConsumerInviteFriends.tsx` → show `consumer.referral_code` (not `invite_code_used`), copy/share.
- `ConsumerSignup.tsx` → if invite code matches a `consumers.referral_code`, insert `referrals` row after signup.
- `ConsumerProfile.tsx` → query real badges, unblur awarded ones, show name on hover.
- New `BadgeToastListener` mounted in consumer layout — subscribes to `notifications` realtime, toasts on `badge_awarded` type.
- New `/app/leaderboard` — top 20 referrers in consumer's city + "Your rank: #N" row. (Item 3)
- `VenueDashboardHome.tsx` → when `locations.length > 1`, render org-wide rollup card grid at top; per-location breakdown below with click-through. (Item 6)
- `FranchiseDashboard.tsx` already exists — add route gate: users whose org has children auto-see it; add drill-down link from each franchisee row to that org's venue dashboard. (Item 7)

## Batch B — Push notifications (Item 4)

- `generate_secret VAPID_PRIVATE_KEY` + store public key as `VITE_VAPID_PUBLIC_KEY`.
- Migration: `push_subscriptions` table (consumer_id, endpoint, p256dh, auth, user_agent).
- `public/sw.js` service worker: handles `push` event, shows notification, click → focus/open URL.
- `PushOptInPrompt` component on ConsumerProfile + first-visit banner.
- Edge function `send-push` — takes `{consumer_ids[], title, body, url}`, fans out via `web-push` npm.
- DB triggers call `send-push` via `pg_net` when:
  - New `events` row published with category=grand_opening in a city
  - `notifications` row inserted with type=`badge_awarded`
  - New `food_listings` row with `is_flash=true`

## Batch C — Admin Leads Inbox + Onboarding Automation (Items 5, 8)

**Item 5 — Leads Inbox**
- Migration: `partner_leads.status` enum (New/Contacted/InProgress/Converted/NotInterested), default New.
- New page `/admin/leads` — table with inline status editor, filters (date/status/type/source), CSV export, "Convert to Partner" button that navigates to org create form with query-string prefill.
- Trigger on `partner_leads` insert → `admin_notifications` row. Notification bell already reads that table; add badge count for unread leads.

**Item 8 — Onboarding Automation**
- Migration: `organization_submissions` table (all form fields + `ein`, `irs_verification_status`, `irs_verification_notes`, `status`).
- Public route `/partners/apply` (form) — submits to edge function `submit-partner-application`.
- Edge function `verify-ein` — calls IRS Pub 78 lookup (public JSON endpoint via propublica Nonprofit Explorer API as fallback since IRS bulk data is a 200MB download; documented tradeoff in code).
- Edge function `approve-partner-submission` (admin-only) — creates org, generates 8-char join_code, creates auth user with temp password via admin API, emails via Resend (already configured), returns credentials.
- Edge function `reject-partner-submission` — sends rejection email.
- Admin UI `/admin/pending-approvals` — list + approve/reject with IRS result visible.
- Edge function `bulk-import-partners` — accepts CSV, processes row-by-row, returns summary JSON. Admin UI upload widget on same page.

## Batch D — Content sources + Emails (Items 9, 11)

**Item 9 — Facebook Events**
- Facebook Graph API removed public Events search in 2018 (Cambridge Analytica fallout); only Page-owned events for Pages you admin are accessible. This is a documented, permanent limitation, not a config issue.
- Substitute: extend `grand-opening-agent` to add a `web_search` source via Lovable AI Gateway (`google/gemini-2.5-flash` with grounding) querying "grand opening restaurant [city] [month]". Results deduped against existing events table. Written into the same agent, gated by same cron.

**Item 11 — Auth Email Templates**
- Blocked until you finish the domain setup for `goseethecity.com` in Cloud → Emails.
- The moment `email_domain--check_email_domain_status` returns a domain, I run `scaffold_auth_email_templates`, brand the 6 templates with the HarietAI palette (brown `hsl(30 88% 9%)` primary, Space Grotesk/DM Sans), and deploy `auth-email-hook` — all in one turn, no extra approval needed.

## What I need from you

1. Approve this plan so I can start Batch A immediately.
2. Finish the sender-domain setup for `goseethecity.com` whenever you can — Batch D item 11 runs the moment it's ready and does not block anything else.

## Order of execution once approved

A → B → C → D, each batch fully landed (migration + code + verification) before the next starts. I'll post a short confirmation after each batch listing exactly what shipped and where.
