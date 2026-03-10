DROP POLICY IF EXISTS "Nonprofits can claim donations" ON public.food_listings;

CREATE POLICY "Nonprofits can claim donations" ON public.food_listings
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'nonprofit_partner'::app_role)
    AND listing_type = 'donation'::listing_type
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'nonprofit_partner'::app_role)
    AND listing_type = 'donation'::listing_type
  );