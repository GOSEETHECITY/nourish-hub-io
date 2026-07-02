
-- 1) Convert public views from SECURITY DEFINER to SECURITY INVOKER
ALTER VIEW public.locations_public SET (security_invoker = true);
ALTER VIEW public.locations_government SET (security_invoker = true);
ALTER VIEW public.nonprofits_public SET (security_invoker = true);
ALTER VIEW public.organizations_public SET (security_invoker = true);

-- 2) Add narrow authenticated SELECT policies on base tables for approved rows
--    so the invoker-mode views can be read by legitimate authenticated users.
DROP POLICY IF EXISTS "Authenticated read approved locations" ON public.locations;
CREATE POLICY "Authenticated read approved locations" ON public.locations
  FOR SELECT TO authenticated
  USING (approval_status = 'approved'::approval_status);

DROP POLICY IF EXISTS "Authenticated read approved nonprofits" ON public.nonprofits;
CREATE POLICY "Authenticated read approved nonprofits" ON public.nonprofits
  FOR SELECT TO authenticated
  USING (approval_status = 'approved'::approval_status);

DROP POLICY IF EXISTS "Authenticated read approved organizations" ON public.organizations;
CREATE POLICY "Authenticated read approved organizations" ON public.organizations
  FOR SELECT TO authenticated
  USING (approval_status = 'approved'::approval_status);

-- 3) Drop the broad government-partner locations policy; government partners
--    now read via the locations_government / locations_public views backed by
--    the "Authenticated read approved locations" policy above.
DROP POLICY IF EXISTS "Government partners read all locations" ON public.locations;

-- 4) Column-level protection on sensitive base-table fields.
--    Prevent authenticated (non-service) queries from selecting sensitive
--    columns directly. Legitimate access remains via SECURITY DEFINER RPCs
--    (e.g. get_org_join_code, get_nonprofit_join_code) or via projected views.
REVOKE SELECT (stripe_connect_account_id, stripe_onboarding_status, platform_fee_percentage,
               contact_email, contact_phone)
  ON public.locations FROM authenticated, anon;

-- 5) Nonprofits: drop the profile-linked read policy that leaked sensitive
--    fields to any linked user. Owner keeps full read for settings screens.
DROP POLICY IF EXISTS "Nonprofit users read by profile" ON public.nonprofits;

-- 6) invite_codes: allow authenticated users to read active codes so that
--    consumers_insert_own WITH CHECK sub-select can resolve. Limit to the
--    columns actually needed by that check (code, is_active).
REVOKE SELECT ON public.invite_codes FROM authenticated, anon;
GRANT SELECT (code, is_active) ON public.invite_codes TO authenticated;
GRANT SELECT ON public.invite_codes TO service_role;

DROP POLICY IF EXISTS "invite_codes_authenticated_check" ON public.invite_codes;
CREATE POLICY "invite_codes_authenticated_check" ON public.invite_codes
  FOR SELECT TO authenticated
  USING (is_active = true);

-- 7) consumer_orders: block consumers from mutating financial / status fields
--    on their own orders via a BEFORE UPDATE trigger. The RLS policy still
--    scopes rows to the owner; the trigger locks down which columns may change.
CREATE OR REPLACE FUNCTION public.consumer_orders_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Admins and service role bypass the guard.
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.consumer_id      IS DISTINCT FROM OLD.consumer_id
  OR NEW.coupon_id        IS DISTINCT FROM OLD.coupon_id
  OR NEW.quantity         IS DISTINCT FROM OLD.quantity
  OR NEW.unit_price       IS DISTINCT FROM OLD.unit_price
  OR NEW.tax_amount       IS DISTINCT FROM OLD.tax_amount
  OR NEW.total_price      IS DISTINCT FROM OLD.total_price
  OR NEW.status           IS DISTINCT FROM OLD.status
  OR NEW.payment_method_last4 IS DISTINCT FROM OLD.payment_method_last4
  THEN
    RAISE EXCEPTION 'Consumers cannot modify financial or status fields on their orders';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consumer_orders_guard_update ON public.consumer_orders;
CREATE TRIGGER consumer_orders_guard_update
  BEFORE UPDATE ON public.consumer_orders
  FOR EACH ROW EXECUTE FUNCTION public.consumer_orders_guard_update();

-- 8) Storage: public read policy for the 'events' bucket so flyer downloads work.
DROP POLICY IF EXISTS "Events bucket public read" ON storage.objects;
CREATE POLICY "Events bucket public read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'events');

-- 9) Atomic RPC for invitation-code consumption (fixes TOCTOU in
--    assign-government-role). Callable only by service_role.
CREATE OR REPLACE FUNCTION public.consume_government_invitation_code(p_code text)
RETURNS TABLE (id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.invitation_codes
     SET times_used = times_used + 1
   WHERE code = p_code
     AND status = 'active'
     AND role_type = 'Government'
     AND (expiration_date IS NULL OR expiration_date > now())
     AND times_used < max_uses
  RETURNING id;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_government_invitation_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_government_invitation_code(text) TO service_role;
