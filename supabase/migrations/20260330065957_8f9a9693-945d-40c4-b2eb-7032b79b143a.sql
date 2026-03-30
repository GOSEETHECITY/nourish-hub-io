
-- Fix 1: Organizations INSERT policy - restrict to authenticated users only
DROP POLICY IF EXISTS "signup_insert_organizations" ON public.organizations;
CREATE POLICY "signup_insert_organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    (NOT user_has_any_role(auth.uid()))
    AND (NOT EXISTS (SELECT 1 FROM consumers c WHERE c.user_id = auth.uid()))
    AND (approval_status = 'pending'::approval_status)
  );

-- Fix 2: Nonprofits INSERT policy - restrict to authenticated with user_id check
DROP POLICY IF EXISTS "signup_insert_nonprofits" ON public.nonprofits;
CREATE POLICY "signup_insert_nonprofits"
  ON public.nonprofits FOR INSERT
  TO authenticated
  WITH CHECK (
    (NOT user_has_any_role(auth.uid()))
    AND (NOT EXISTS (SELECT 1 FROM consumers c WHERE c.user_id = auth.uid()))
    AND (user_id = auth.uid() OR user_id IS NULL)
    AND (approval_status = 'pending'::approval_status)
  );

-- Fix 3: Nonprofit locations - prevent self-approval by nonprofit partners
DROP POLICY IF EXISTS "Nonprofit partners manage own locations" ON public.nonprofit_locations;
CREATE POLICY "Nonprofit partners manage own locations"
  ON public.nonprofit_locations FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'nonprofit_partner'::app_role)
    AND nonprofit_id IN (SELECT p.nonprofit_id FROM profiles p WHERE p.id = auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'nonprofit_partner'::app_role)
    AND nonprofit_id IN (SELECT p.nonprofit_id FROM profiles p WHERE p.id = auth.uid())
    AND (approval_status IS NOT DISTINCT FROM (
      SELECT nl.approval_status FROM nonprofit_locations nl WHERE nl.id = nonprofit_locations.id
    ))
  );
