
-- 1) Remove privilege escalation: drop self-insert policy on user_roles
DROP POLICY IF EXISTS "signup_insert_user_roles" ON public.user_roles;

-- 2) Restrict venue partner access to consumer_orders
-- Drop the over-permissive policy
DROP POLICY IF EXISTS "Venue partners read orders for their org" ON public.consumer_orders;

-- Create a safe view exposing only non-sensitive order fields for venue partners
CREATE OR REPLACE VIEW public.venue_partner_orders
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.coupon_id,
  o.quantity,
  o.unit_price,
  o.total_price,
  o.tax_amount,
  o.status,
  o.pickup_window_start,
  o.pickup_window_end,
  o.created_at
FROM public.consumer_orders o
WHERE o.coupon_id IN (
  SELECT c.id FROM public.coupons c
  WHERE c.organization_id IN (
    SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()
  )
);

GRANT SELECT ON public.venue_partner_orders TO authenticated;

-- 3) Restrict stripe_connect_account_id exposure
-- Revoke direct column access on locations.stripe_connect_account_id from non-admin roles
REVOKE SELECT (stripe_connect_account_id) ON public.locations FROM authenticated, anon;
-- Admins still get full access via the "Admins full access locations" policy and table-level grants.
-- Re-grant SELECT on safe columns for authenticated (explicit allowlist)
GRANT SELECT (
  id, organization_id, name, address, city, state, zip, county,
  contact_name, contact_email, contact_phone, location_type,
  marketplace_enabled, estimated_surplus_frequency, hours_of_operation,
  pickup_address, pickup_instructions, platform_fee_percentage,
  latitude, longitude, created_at, approval_status,
  stripe_onboarding_status
) ON public.locations TO authenticated;
