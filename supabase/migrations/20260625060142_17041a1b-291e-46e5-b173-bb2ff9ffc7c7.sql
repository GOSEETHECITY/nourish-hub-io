
-- 1) Drop overly permissive "approved readable to all authenticated" base-table policies.
DROP POLICY IF EXISTS "Approved locations readable to authenticated" ON public.locations;
DROP POLICY IF EXISTS "Anyone authenticated can read approved organizations" ON public.organizations;
DROP POLICY IF EXISTS "Approved nonprofits readable to authenticated" ON public.nonprofits;
-- Redundant overlapping select policies
DROP POLICY IF EXISTS "Admins read all locations" ON public.locations;
DROP POLICY IF EXISTS "Partners read own-org locations" ON public.locations;

-- 2) Recreate public views WITHOUT security_invoker so they execute as definer
--    (owner = postgres) and bypass base-table RLS, exposing only safe columns.
DROP VIEW IF EXISTS public.locations_public;
DROP VIEW IF EXISTS public.organizations_public;
DROP VIEW IF EXISTS public.nonprofits_public;

CREATE VIEW public.locations_public
WITH (security_invoker = false)
AS
SELECT id, organization_id, name, location_type, address, city, state, county, zip,
       latitude, longitude, hours_of_operation, pickup_address, pickup_instructions,
       marketplace_enabled, estimated_surplus_frequency, approval_status, created_at
FROM public.locations
WHERE approval_status = 'approved'::approval_status;

CREATE VIEW public.organizations_public
WITH (security_invoker = false)
AS
SELECT id, name, type, address, city, state, zip, county, government_regions,
       approval_status, created_at
FROM public.organizations
WHERE approval_status = 'approved'::approval_status;

CREATE VIEW public.nonprofits_public
WITH (security_invoker = false)
AS
SELECT id, organization_name, website, logo_url, address, city, state, zip, county,
       operating_hours, approval_status, population_served, estimated_weekly_served,
       food_types_accepted, refrigeration, cold_storage, cabinetry, social_handles,
       created_at
FROM public.nonprofits
WHERE approval_status = 'approved'::approval_status;

GRANT SELECT ON public.locations_public TO authenticated, anon;
GRANT SELECT ON public.organizations_public TO authenticated, anon;
GRANT SELECT ON public.nonprofits_public TO authenticated, anon;

-- 3) Rate-limit table for invite/join code validation
CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  key text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limit_attempts_lookup_idx
  ON public.rate_limit_attempts (bucket, key, created_at DESC);

GRANT SELECT, INSERT ON public.rate_limit_attempts TO authenticated, anon;
GRANT ALL ON public.rate_limit_attempts TO service_role;

ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY rl_admin_read ON public.rate_limit_attempts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
-- Inserts only allowed through SECURITY DEFINER RPCs (no direct INSERT policy).

-- 4) Harden validate_and_use_invite_code: rate-limit + small delay to thwart brute force.
CREATE OR REPLACE FUNCTION public.validate_and_use_invite_code(code_input text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  code_record invite_codes%rowtype;
  caller text;
  recent_fails int;
BEGIN
  caller := COALESCE(auth.uid()::text, 'anon');

  -- Slow brute force
  PERFORM pg_sleep(0.4);

  -- Per-caller failure throttle: > 10 failed attempts in 10 minutes -> reject.
  SELECT count(*) INTO recent_fails
  FROM public.rate_limit_attempts
  WHERE bucket = 'invite_code'
    AND key = caller
    AND success = false
    AND created_at > now() - interval '10 minutes';

  IF recent_fails >= 10 THEN
    RETURN json_build_object('valid', false, 'message', 'Too many attempts. Try again later.');
  END IF;

  IF code_input IS NULL OR length(btrim(code_input)) = 0 OR length(code_input) > 64 THEN
    INSERT INTO public.rate_limit_attempts (bucket, key, success) VALUES ('invite_code', caller, false);
    RETURN json_build_object('valid', false, 'message', 'Invalid invite code');
  END IF;

  SELECT * INTO code_record
  FROM invite_codes
  WHERE code = upper(code_input)
    AND is_active = true
    AND current_uses < max_uses;

  IF NOT FOUND THEN
    INSERT INTO public.rate_limit_attempts (bucket, key, success) VALUES ('invite_code', caller, false);
    RETURN json_build_object('valid', false, 'message', 'Invalid or expired invite code');
  END IF;

  UPDATE invite_codes SET current_uses = current_uses + 1 WHERE id = code_record.id;
  INSERT INTO public.rate_limit_attempts (bucket, key, success) VALUES ('invite_code', caller, true);

  RETURN json_build_object(
    'valid', true,
    'message', 'Code accepted',
    'region', code_record.region,
    'code_id', code_record.id
  );
END;
$function$;

-- 5) Harden validate_join_code: add small delay + length cap.
CREATE OR REPLACE FUNCTION public.validate_join_code(p_code text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE result JSON;
BEGIN
  PERFORM pg_sleep(0.3);

  IF p_code IS NULL OR length(p_code) < 4 OR length(p_code) > 32 THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object('id', id, 'name', name, 'type', 'venue')
  INTO result
  FROM public.organizations
  WHERE join_code = p_code AND approval_status = 'approved'
  LIMIT 1;

  IF result IS NOT NULL THEN RETURN result; END IF;

  SELECT json_build_object('id', id, 'name', organization_name, 'type', 'nonprofit')
  INTO result
  FROM public.nonprofits
  WHERE join_code = p_code AND approval_status = 'approved'
  LIMIT 1;

  RETURN result;
END;
$function$;

-- 6) Make sure new view grants stick.
GRANT SELECT ON public.locations_government TO authenticated;
GRANT SELECT ON public.venue_partner_orders TO authenticated;
