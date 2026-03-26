
-- Create a SECURITY DEFINER function to check if user's org is approved
-- This bypasses RLS, preventing infinite recursion when used in policies on organizations
CREATE OR REPLACE FUNCTION public.user_org_is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    JOIN organizations o ON o.id = p.organization_id
    WHERE p.id = _user_id
      AND o.approval_status = 'approved'
  )
$$;

-- Fix: Government can read organizations (was self-referencing organizations)
DROP POLICY IF EXISTS "Government can read organizations" ON public.organizations;
CREATE POLICY "Government can read organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'government_partner') 
    AND user_org_is_approved(auth.uid())
  );

-- Fix: Government can read locations (also references organizations in its subquery)
DROP POLICY IF EXISTS "Government can read locations" ON public.locations;
CREATE POLICY "Government can read locations"
  ON public.locations FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'government_partner')
    AND user_org_is_approved(auth.uid())
  );

-- Fix: Government can read food_listings
DROP POLICY IF EXISTS "Government can read food_listings" ON public.food_listings;
CREATE POLICY "Government can read food_listings"
  ON public.food_listings FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR (
      has_role(auth.uid(), 'government_partner')
      AND user_org_is_approved(auth.uid())
    )
  );

-- Fix: Government can read impact_reports
DROP POLICY IF EXISTS "Government can read impact_reports" ON public.impact_reports;
CREATE POLICY "Government can read impact_reports"
  ON public.impact_reports FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'government_partner')
    AND user_org_is_approved(auth.uid())
  );

-- Fix: Government can read nonprofits
DROP POLICY IF EXISTS "Government can read nonprofits" ON public.nonprofits;
CREATE POLICY "Government can read nonprofits"
  ON public.nonprofits FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'government_partner')
    AND user_org_is_approved(auth.uid())
  );

-- Fix: Government can read nonprofit_locations
DROP POLICY IF EXISTS "Government can read nonprofit_locations" ON public.nonprofit_locations;
CREATE POLICY "Government can read nonprofit_locations"
  ON public.nonprofit_locations FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'government_partner')
    AND user_org_is_approved(auth.uid())
  );
