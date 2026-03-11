
-- ============================================
-- FIX 1: Tighten signup INSERT policies
-- Only allow users who don't yet have a role
-- ============================================

-- Drop existing overly permissive signup INSERT policies
DROP POLICY IF EXISTS "signup_insert_organizations" ON public.organizations;
DROP POLICY IF EXISTS "signup_insert_locations" ON public.locations;
DROP POLICY IF EXISTS "signup_insert_nonprofits" ON public.nonprofits;
DROP POLICY IF EXISTS "Signup insert nonprofit_locations" ON public.nonprofit_locations;
DROP POLICY IF EXISTS "signup_insert_sustainability" ON public.sustainability_baseline;

-- Organizations: only users without an existing role can insert
CREATE POLICY "signup_insert_organizations" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.user_has_any_role(auth.uid())
  );

-- Locations: only users without an existing role can insert
CREATE POLICY "signup_insert_locations" ON public.locations
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.user_has_any_role(auth.uid())
  );

-- Nonprofits: only users without an existing role can insert
CREATE POLICY "signup_insert_nonprofits" ON public.nonprofits
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.user_has_any_role(auth.uid())
  );

-- Nonprofit locations: only users without an existing role OR nonprofit partners for their own nonprofit
CREATE POLICY "signup_insert_nonprofit_locations" ON public.nonprofit_locations
  FOR INSERT TO authenticated
  WITH CHECK (
    (NOT public.user_has_any_role(auth.uid()))
    OR (
      public.has_role(auth.uid(), 'nonprofit_partner')
      AND nonprofit_id IN (SELECT p.nonprofit_id FROM profiles p WHERE p.id = auth.uid())
    )
  );

-- Sustainability baseline: only venue partners for their own locations
CREATE POLICY "signup_insert_sustainability" ON public.sustainability_baseline
  FOR INSERT TO authenticated
  WITH CHECK (
    (NOT public.user_has_any_role(auth.uid()))
    OR (
      public.has_role(auth.uid(), 'venue_partner')
      AND location_id IN (
        SELECT l.id FROM locations l
        JOIN profiles p ON p.organization_id = l.organization_id
        WHERE p.id = auth.uid()
      )
    )
  );

-- ============================================
-- FIX 2: Prevent profile org/nonprofit reassignment
-- Create a safe update function and restrict direct UPDATE
-- ============================================

-- Create a safe profile update function that only allows safe columns
CREATE OR REPLACE FUNCTION public.update_own_profile(
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET first_name = COALESCE(p_first_name, first_name),
      last_name = COALESCE(p_last_name, last_name),
      phone = COALESCE(p_phone, phone)
  WHERE id = auth.uid();
END;
$$;

-- Revoke direct UPDATE from authenticated on profiles and replace with restricted policy
DROP POLICY IF EXISTS "Users can update own profile only" ON public.profiles;

-- New policy: users can update own profile but cannot change org/nonprofit/location assignments
CREATE POLICY "Users can update own profile only" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND organization_id IS NOT DISTINCT FROM (SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid())
    AND nonprofit_id IS NOT DISTINCT FROM (SELECT p.nonprofit_id FROM profiles p WHERE p.id = auth.uid())
    AND location_id IS NOT DISTINCT FROM (SELECT p.location_id FROM profiles p WHERE p.id = auth.uid())
    AND nonprofit_location_id IS NOT DISTINCT FROM (SELECT p.nonprofit_location_id FROM profiles p WHERE p.id = auth.uid())
  );
