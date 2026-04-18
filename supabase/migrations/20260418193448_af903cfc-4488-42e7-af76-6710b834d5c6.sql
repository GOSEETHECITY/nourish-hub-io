-- 1. Drop duplicate weaker nonprofit update policy
DROP POLICY IF EXISTS "Nonprofits update own record" ON public.nonprofits;

-- 2. Tighten government read on locations
DROP POLICY IF EXISTS "Government can read locations" ON public.locations;

CREATE OR REPLACE VIEW public.locations_government
WITH (security_invoker = true) AS
SELECT
  id, organization_id, name, address, city, state, zip, county,
  location_type, marketplace_enabled, estimated_surplus_frequency,
  hours_of_operation, pickup_address, pickup_instructions,
  latitude, longitude, created_at, approval_status,
  platform_fee_percentage
FROM public.locations;

GRANT SELECT ON public.locations_government TO authenticated;

CREATE POLICY "Government read locations non-sensitive"
ON public.locations
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'government_partner'::app_role)
  AND user_org_is_approved(auth.uid())
);

REVOKE SELECT (stripe_connect_account_id, stripe_onboarding_status, contact_name, contact_email, contact_phone)
ON public.locations FROM authenticated, anon;

-- 3. Allow venue partners to read orders for their own coupons (excluding payment details)
CREATE POLICY "Venue partners read orders for own coupons"
ON public.consumer_orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'venue_partner'::app_role)
  AND coupon_id IN (
    SELECT c.id FROM public.coupons c
    WHERE c.organization_id IN (
      SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
);

REVOKE SELECT (payment_method_last4) ON public.consumer_orders FROM authenticated, anon;