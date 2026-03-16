-- Fix: Require nonprofit profile linkage to read donation listings
DROP POLICY IF EXISTS "Nonprofits can read available donations" ON public.food_listings;

CREATE POLICY "Nonprofits can read available donations"
ON public.food_listings
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'nonprofit_partner'::app_role)
  AND listing_type = 'donation'::listing_type
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.nonprofit_id IS NOT NULL
  )
);