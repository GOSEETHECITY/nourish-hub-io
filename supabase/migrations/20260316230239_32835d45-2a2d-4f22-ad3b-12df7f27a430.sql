-- 1. Restrict signup location inserts to pending orgs created by the user
DROP POLICY IF EXISTS "signup_insert_locations" ON public.locations;
CREATE POLICY "signup_insert_locations"
ON public.locations
FOR INSERT
TO authenticated
WITH CHECK (
  (NOT user_has_any_role(auth.uid()))
  AND (NOT EXISTS (SELECT 1 FROM consumers c WHERE c.user_id = auth.uid()))
  AND (organization_id IN (
    SELECT o.id FROM organizations o
    WHERE o.approval_status = 'pending'
  ))
);

-- 2. Restrict signup sustainability baseline to locations in pending orgs
DROP POLICY IF EXISTS "signup_insert_sustainability" ON public.sustainability_baseline;
CREATE POLICY "signup_insert_sustainability"
ON public.sustainability_baseline
FOR INSERT
TO authenticated
WITH CHECK (
  (NOT user_has_any_role(auth.uid()))
  AND (location_id IN (
    SELECT l.id FROM locations l
    JOIN organizations o ON o.id = l.organization_id
    WHERE o.approval_status = 'pending'
  ))
  OR (
    has_role(auth.uid(), 'venue_partner'::app_role)
    AND location_id IN (
      SELECT l.id FROM locations l
      JOIN profiles p ON p.organization_id = l.organization_id
      WHERE p.id = auth.uid()
    )
  )
);

-- 3. Require nonprofit user_id = auth.uid() on signup insert
DROP POLICY IF EXISTS "signup_insert_nonprofits" ON public.nonprofits;
CREATE POLICY "signup_insert_nonprofits"
ON public.nonprofits
FOR INSERT
TO authenticated
WITH CHECK (
  (NOT user_has_any_role(auth.uid()))
  AND (NOT EXISTS (SELECT 1 FROM consumers c WHERE c.user_id = auth.uid()))
  AND (user_id = auth.uid() OR user_id IS NULL)
);