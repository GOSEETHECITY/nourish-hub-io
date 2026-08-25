
-- Allow an org member to point their own profile at a location inside their own org.
CREATE OR REPLACE FUNCTION public.set_own_location(p_location_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.profiles WHERE id = auth.uid();
  IF v_org IS NULL THEN RAISE EXCEPTION 'No organization on profile'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.locations l WHERE l.id = p_location_id AND l.organization_id = v_org) THEN
    RAISE EXCEPTION 'Location does not belong to your organization';
  END IF;
  UPDATE public.profiles SET location_id = p_location_id WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.set_own_nonprofit_location(p_location_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_np uuid;
BEGIN
  SELECT nonprofit_id INTO v_np FROM public.profiles WHERE id = auth.uid();
  IF v_np IS NULL THEN RAISE EXCEPTION 'No nonprofit on profile'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.nonprofit_locations l WHERE l.id = p_location_id AND l.nonprofit_id = v_np) THEN
    RAISE EXCEPTION 'Location does not belong to your nonprofit';
  END IF;
  UPDATE public.profiles SET nonprofit_location_id = p_location_id WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.set_own_location(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.set_own_nonprofit_location(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_own_location(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_own_nonprofit_location(uuid) TO authenticated;

-- Signup no longer writes these tables from the browser.
DROP POLICY IF EXISTS "signup_insert_organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can insert new organizations" ON public.organizations;
DROP POLICY IF EXISTS "signup_insert_nonprofits" ON public.nonprofits;
DROP POLICY IF EXISTS "signup_insert_locations" ON public.locations;
DROP POLICY IF EXISTS "signup_insert_sustainability" ON public.sustainability_baseline;
DROP POLICY IF EXISTS "signup_insert_nonprofit_locations" ON public.nonprofit_locations;

-- Nonprofit partners must still be able to add their own distribution locations.
DROP POLICY IF EXISTS "Nonprofit owners insert own locations" ON public.nonprofit_locations;
CREATE POLICY "Nonprofit owners insert own locations"
ON public.nonprofit_locations FOR INSERT TO authenticated
WITH CHECK (nonprofit_id IN (SELECT p.nonprofit_id FROM public.profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "Nonprofit owners update own locations" ON public.nonprofit_locations;
CREATE POLICY "Nonprofit owners update own locations"
ON public.nonprofit_locations FOR UPDATE TO authenticated
USING (nonprofit_id IN (SELECT p.nonprofit_id FROM public.profiles p WHERE p.id = auth.uid()))
WITH CHECK (nonprofit_id IN (SELECT p.nonprofit_id FROM public.profiles p WHERE p.id = auth.uid()));

-- Org members (venue or government) manage locations in their own org.
DROP POLICY IF EXISTS "Org members insert own locations" ON public.locations;
CREATE POLICY "Org members insert own locations"
ON public.locations FOR INSERT TO authenticated
WITH CHECK (organization_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "Org members update own locations" ON public.locations;
CREATE POLICY "Org members update own locations"
ON public.locations FOR UPDATE TO authenticated
USING (organization_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()))
WITH CHECK (organization_id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

-- Org members manage the baseline for locations in their own org.
DROP POLICY IF EXISTS "Org members insert own baseline" ON public.sustainability_baseline;
CREATE POLICY "Org members insert own baseline"
ON public.sustainability_baseline FOR INSERT TO authenticated
WITH CHECK (location_id IN (
  SELECT l.id FROM public.locations l JOIN public.profiles p ON p.organization_id = l.organization_id
  WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "Org members update own baseline" ON public.sustainability_baseline;
CREATE POLICY "Org members update own baseline"
ON public.sustainability_baseline FOR UPDATE TO authenticated
USING (location_id IN (
  SELECT l.id FROM public.locations l JOIN public.profiles p ON p.organization_id = l.organization_id
  WHERE p.id = auth.uid()))
WITH CHECK (location_id IN (
  SELECT l.id FROM public.locations l JOIN public.profiles p ON p.organization_id = l.organization_id
  WHERE p.id = auth.uid()));
