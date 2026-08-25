# Partner Signup Hardening (post-audit)

The audit is done. Sections 1-6 of the original prompt never arrived, so this plan covers the work the audit itself points to: making partner signup succeed with a reduced form, moving the writes that RLS blocks into a server-side function, and reusing the approval queue that already exists.

## Audit results (verified against the live database)

- A trigger on `auth.users` (`handle_new_user`) already inserts the `profiles` row. A second trigger (`ensure_consumer_for_new_user`) also fires. Nothing should insert `profiles` again.
- `organizations` is reachable by `authenticated` (select/insert/update/delete granted) and by `service_role`. It is not blocked by grants. What blocks signup is RLS: there is no UPDATE policy on `organizations` for a user who has no role yet, and the `profiles` UPDATE policy explicitly forbids changing `organization_id`, `nonprofit_id`, `location_id`, `nonprofit_location_id`.
- Policies already in place are listed in the chat audit; they are working and will not be replaced.
- NOT NULL columns with no default: `organizations.name`, `organizations.type`, `nonprofits.organization_name`, `locations.organization_id`, `locations.name`, `sustainability_baseline.location_id`. Everything else already defaults.
- An approval queue exists at `/admin/organizations-pending` (`PendingApprovals.tsx`) driven by `onboarding_submissions`. It will be extended, not duplicated.
- `app_role` values: `admin`, `venue_partner`, `nonprofit_partner`, `government_partner`.
- `assign-government-role` needs a signed-in user's `Authorization` header plus body `{ invitationCode }`, refuses users who already hold a role, and consumes the code atomically.

## What gets built

### 1. No schema migration for nullability
The four NOT NULL columns without defaults are all values a minimal signup still collects (organization name and type, location name, nonprofit name). Nothing needs to be relaxed. If a field is later dropped from the form, that is the moment to revisit this.

### 2. New Edge Function: `complete-partner-signup`
Runs with the service role, so it bypasses the RLS gaps rather than widening them.

Input (validated with Zod, caller's JWT required and verified in code):
- pathway: `venue` | `nonprofit`
- organization or nonprofit fields
- optional location fields, optional sustainability baseline answers

Behaviour:
- verify the JWT, reject if the user already has a row in `user_roles`
- venue: insert `organizations` (status `pending`), insert `locations`, optionally insert `sustainability_baseline`
- nonprofit: insert `nonprofits` (status `pending`, `user_id` = caller)
- update the existing `profiles` row to link `organization_id` / `location_id` / `nonprofit_id`
- insert the `user_roles` row (`venue_partner` or `nonprofit_partner`)
- insert an `onboarding_submissions` row (status `pending`) so the record appears in the existing admin queue
- all-or-nothing: on any failure, roll back the rows created in that call and return a clear message
- restricted CORS to `https://hariet.ai` plus the preview origin, fatal-error alerting via the shared `ops.ts` helper

### 3. Signup pages call the function instead of writing directly
`VenueSignup.tsx` and `NonprofitSignup.tsx` stop doing client-side inserts into `organizations`, `locations`, `sustainability_baseline`, `nonprofits`, `profiles`, and `user_roles`. They sign the user up, then make one `supabase.functions.invoke("complete-partner-signup", ...)` call and route to the pending-approval screen on success, showing the returned error inline on failure.

`GovernmentSignup.tsx` is left on `assign-government-role` and only checked for header and body shape.

### 4. Approval queue extension
`PendingApprovals.tsx` gains handling for the new submission rows: it shows pathway (venue vs nonprofit), the created organization or nonprofit, and approving flips `organizations.approval_status` / `nonprofits.approval_status` to `approved` rather than re-creating the entity through bulk-import. Rejection keeps the existing reason flow.

### 5. Cleanup of the two legacy permissive policies
`Authenticated users can insert locations` and `Authenticated users can insert sustainability_baseline` both allow any signed-in user to insert arbitrary rows and are made redundant by the `signup_insert_*` policies plus the new service-role path. They are dropped in a migration. No other policy is touched.

## Verification
- Typecheck.
- Playwright: complete a venue signup end to end and confirm the pending-approval screen, then confirm the submission appears in `/admin/organizations-pending` and approving it flips the organization to approved and unlocks the venue dashboard.
- Repeat for a nonprofit signup.
