-- Fix: Venue partners manage baseline - add location-ownership check to WITH CHECK
DROP POLICY IF EXISTS "Venue partners manage baseline" ON public.sustainability_baseline;

CREATE POLICY "Venue partners manage baseline"
ON public.sustainability_baseline
FOR ALL
TO public
USING (
  has_role(auth.uid(), 'venue_partner'::app_role)
  AND (location_id IN (
    SELECT l.id FROM locations l
    JOIN profiles p ON p.organization_id = l.organization_id
    WHERE p.id = auth.uid()
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'venue_partner'::app_role)
  AND (location_id IN (
    SELECT l.id FROM locations l
    JOIN profiles p ON p.organization_id = l.organization_id
    WHERE p.id = auth.uid()
  ))
);