-- =============================================
-- HarietAI Launch Fixes — Data Layer
-- Run these in the Supabase SQL Editor (Project: yaicfjdquvfifwtfpmbm)
-- Review each block before running. They are ordered so you can run them
-- one section at a time.
-- =============================================

-- -----------------------------------------------------------------------
-- FIX 1: Link venue.independent@test.hariet.ai to the Papo Deli organization
-- -----------------------------------------------------------------------
-- Symptom: venue.independent logs in but is trapped in /venue/onboarding
-- because the profiles.organization_id is NULL. Papo Deli already exists as
-- an organization row. This links the user to it so they reach the dashboard.
--
-- First, verify the data. Both queries should return exactly one row.
SELECT id, email FROM auth.users WHERE email = 'venue.independent@test.hariet.ai';
SELECT id, name, city, state FROM public.organizations WHERE name ILIKE 'Papo Deli' ORDER BY created_at LIMIT 1;

-- Then run this update (it uses subqueries so you don't need to paste IDs):
UPDATE public.profiles
SET organization_id = (
  SELECT id FROM public.organizations WHERE name ILIKE 'Papo Deli' ORDER BY created_at LIMIT 1
)
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'venue.independent@test.hariet.ai'
)
AND organization_id IS NULL;

-- Also link the user to the first Papo Deli location (needed for the venue
-- dashboard to render its "my location" context):
UPDATE public.profiles
SET location_id = (
  SELECT l.id FROM public.locations l
  JOIN public.organizations o ON o.id = l.organization_id
  WHERE o.name ILIKE 'Papo Deli'
  ORDER BY l.created_at
  LIMIT 1
)
WHERE id = (SELECT id FROM auth.users WHERE email = 'venue.independent@test.hariet.ai')
  AND location_id IS NULL;

-- Verify the link was set:
SELECT p.id, u.email, p.organization_id, p.location_id, o.name AS org_name
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN public.organizations o ON o.id = p.organization_id
WHERE u.email = 'venue.independent@test.hariet.ai';


-- -----------------------------------------------------------------------
-- FIX 2: Recreate auth accounts for venue.multloc and venue.franchise
-- -----------------------------------------------------------------------
-- Symptom: both accounts return "Invalid credentials" on login.
-- Reason: they either don't exist in auth.users or the passwords don't match.
--
-- CANNOT BE DONE VIA SQL: auth.users is managed by GoTrue and direct INSERTs
-- break bcrypt hashing. Instead, create these users in the Supabase dashboard:
--
--   1. Go to https://supabase.com/dashboard/project/yaicfjdquvfifwtfpmbm/auth/users
--   2. Click "Add user" → "Create new user"
--   3. For each of:
--        - Email: venue.multloc@test.hariet.ai      Password: TestHariet2026!
--        - Email: venue.franchise@test.hariet.ai    Password: TestHariet2026!
--      Check "Auto Confirm User" so you don't need to verify email
--
-- Then run the linking queries below to associate each user with the
-- corresponding organization.

-- 2a. Link venue.multloc to Serengeti Restaurant and Bar
UPDATE public.profiles
SET organization_id = (
  SELECT id FROM public.organizations WHERE name ILIKE '%Serengeti%' ORDER BY created_at LIMIT 1
),
location_id = (
  SELECT l.id FROM public.locations l
  JOIN public.organizations o ON o.id = l.organization_id
  WHERE o.name ILIKE '%Serengeti%'
  ORDER BY l.created_at LIMIT 1
)
WHERE id = (SELECT id FROM auth.users WHERE email = 'venue.multloc@test.hariet.ai');

-- 2b. Link venue.franchise to Rita's (confirm the exact org name first)
-- If Rita's doesn't exist yet, create it via the admin UI or a separate insert.
UPDATE public.profiles
SET organization_id = (
  SELECT id FROM public.organizations WHERE name ILIKE 'Rita%' ORDER BY created_at LIMIT 1
),
location_id = (
  SELECT l.id FROM public.locations l
  JOIN public.organizations o ON o.id = l.organization_id
  WHERE o.name ILIKE 'Rita%'
  ORDER BY l.created_at LIMIT 1
)
WHERE id = (SELECT id FROM auth.users WHERE email = 'venue.franchise@test.hariet.ai');


-- -----------------------------------------------------------------------
-- FIX 3: Normalize state codes (Florida → FL, etc.)
-- -----------------------------------------------------------------------
-- Symptom: government /organizations page shows mixed "Florida" and "FL".
-- The region filter helper now normalizes both sides, but the underlying
-- data should also be consistent for cleaner display.

UPDATE public.organizations SET state = 'FL' WHERE LOWER(TRIM(state)) = 'florida';
UPDATE public.organizations SET state = 'CA' WHERE LOWER(TRIM(state)) = 'california';
UPDATE public.organizations SET state = 'NV' WHERE LOWER(TRIM(state)) = 'nevada';
UPDATE public.organizations SET state = 'OK' WHERE LOWER(TRIM(state)) = 'oklahoma';
UPDATE public.organizations SET state = 'TX' WHERE LOWER(TRIM(state)) = 'texas';
UPDATE public.organizations SET state = 'NY' WHERE LOWER(TRIM(state)) = 'new york';

UPDATE public.locations SET state = 'FL' WHERE LOWER(TRIM(state)) = 'florida';
UPDATE public.locations SET state = 'CA' WHERE LOWER(TRIM(state)) = 'california';
UPDATE public.locations SET state = 'NV' WHERE LOWER(TRIM(state)) = 'nevada';
UPDATE public.locations SET state = 'OK' WHERE LOWER(TRIM(state)) = 'oklahoma';
UPDATE public.locations SET state = 'TX' WHERE LOWER(TRIM(state)) = 'texas';
UPDATE public.locations SET state = 'NY' WHERE LOWER(TRIM(state)) = 'new york';

UPDATE public.nonprofits SET state = 'FL' WHERE LOWER(TRIM(state)) = 'florida';
UPDATE public.nonprofits SET state = 'CA' WHERE LOWER(TRIM(state)) = 'california';
UPDATE public.nonprofits SET state = 'NV' WHERE LOWER(TRIM(state)) = 'nevada';
UPDATE public.nonprofits SET state = 'OK' WHERE LOWER(TRIM(state)) = 'oklahoma';
UPDATE public.nonprofits SET state = 'TX' WHERE LOWER(TRIM(state)) = 'texas';
UPDATE public.nonprofits SET state = 'NY' WHERE LOWER(TRIM(state)) = 'new york';


-- -----------------------------------------------------------------------
-- FIX 4: Identify possible duplicate organizations (REVIEW, don't auto-delete)
-- -----------------------------------------------------------------------
-- Symptom: "OKCC 2" and "Oklahoma Convention Center" likely represent the
-- same venue. This query surfaces probable duplicates so you can merge them
-- manually. Do NOT run a blanket DELETE — review the matches first.

SELECT o1.id AS id_1, o1.name AS name_1, o1.city AS city_1, o1.created_at AS created_1,
       o2.id AS id_2, o2.name AS name_2, o2.city AS city_2, o2.created_at AS created_2
FROM public.organizations o1
JOIN public.organizations o2 ON o1.id < o2.id
WHERE LOWER(o1.city) = LOWER(o2.city)
  AND (
    -- Similar names (one contains the other, ignoring trailing digits)
    LOWER(REGEXP_REPLACE(o1.name, '\s*\d+\s*$', '')) = LOWER(REGEXP_REPLACE(o2.name, '\s*\d+\s*$', ''))
    OR LOWER(o1.name) LIKE '%' || LOWER(o2.name) || '%'
    OR LOWER(o2.name) LIKE '%' || LOWER(o1.name) || '%'
  );


-- -----------------------------------------------------------------------
-- POST-FIX SANITY CHECK
-- -----------------------------------------------------------------------
-- After running the fixes above, confirm the expected state:

-- All test venue accounts should now be linked to organizations
SELECT u.email, o.name AS organization, l.name AS location
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.organizations o ON o.id = p.organization_id
LEFT JOIN public.locations l ON l.id = p.location_id
WHERE u.email IN (
  'venue.independent@test.hariet.ai',
  'venue.multloc@test.hariet.ai',
  'venue.franchise@test.hariet.ai'
)
ORDER BY u.email;

-- State codes should all be two-letter uppercase
SELECT DISTINCT state FROM public.organizations WHERE state IS NOT NULL ORDER BY state;
SELECT DISTINCT state FROM public.locations WHERE state IS NOT NULL ORDER BY state;
SELECT DISTINCT state FROM public.nonprofits WHERE state IS NOT NULL ORDER BY state;
