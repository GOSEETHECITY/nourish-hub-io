-- Allow authenticated users (consumers) to read active coupons
CREATE POLICY "Anyone authenticated can read active coupons"
  ON public.coupons FOR SELECT
  TO authenticated
  USING (status = 'active'::coupon_status);

-- Allow authenticated users (consumers) to read approved locations
CREATE POLICY "Anyone authenticated can read approved locations"
  ON public.locations FOR SELECT
  TO authenticated
  USING (approval_status = 'approved'::approval_status);

-- Allow authenticated users (consumers) to read approved organizations
CREATE POLICY "Anyone authenticated can read approved organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (approval_status = 'approved'::approval_status);
