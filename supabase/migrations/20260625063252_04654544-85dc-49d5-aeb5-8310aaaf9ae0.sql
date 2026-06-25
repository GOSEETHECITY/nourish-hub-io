
-- 1. Remove broad authenticated-read policies that expose sensitive columns.
DROP POLICY IF EXISTS "Authenticated read approved locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated read approved organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated read approved nonprofits" ON public.nonprofits;

-- 2. Restore views as SECURITY DEFINER so cross-tenant safe reads still work
-- without exposing the base tables' sensitive columns.
ALTER VIEW public.locations_public      SET (security_invoker = false);
ALTER VIEW public.organizations_public  SET (security_invoker = false);
ALTER VIEW public.nonprofits_public     SET (security_invoker = false);
ALTER VIEW public.locations_government  SET (security_invoker = false);
-- venue_partner_orders is owner-scoped via auth.uid(); keep as invoker.

-- 3. Nonprofit-documents bucket: allow owning nonprofit to UPDATE/DELETE own files.
CREATE POLICY "Nonprofits update own documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'nonprofit-documents'
    AND (storage.foldername(name))[1] = 'nonprofits'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'nonprofit-documents'
    AND (storage.foldername(name))[1] = 'nonprofits'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Nonprofits delete own documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'nonprofit-documents'
    AND (storage.foldername(name))[1] = 'nonprofits'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- 4. Events bucket: drop the broad listing policy. Public URLs still resolve
-- because the bucket itself is marked public; only the .list() API is blocked.
DROP POLICY IF EXISTS "Event images are publicly accessible" ON storage.objects;

-- 5. SECURITY DEFINER function hardening: revoke EXECUTE from PUBLIC and anon
-- where the function does not need to be callable without auth.
REVOKE EXECUTE ON FUNCTION public.validate_join_code(text)              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_and_use_invite_code(text)    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_has_any_role(uuid)               FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_org_is_approved(uuid)            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_org_join_code(uuid)               FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_nonprofit_join_code(uuid)         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_own_profile(text, text, text)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_share_count(uuid)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_attendee_count(uuid)        FROM PUBLIC, anon;

-- 6. Invite-code bypass: require a real, active invite code on consumer self-insert.
DROP POLICY IF EXISTS consumers_insert_own ON public.consumers;
CREATE POLICY consumers_insert_own ON public.consumers
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND invite_code_used IS NOT NULL
    AND length(btrim(invite_code_used)) > 0
    AND EXISTS (
      SELECT 1 FROM public.invite_codes ic
      WHERE upper(ic.code) = upper(consumers.invite_code_used)
        AND ic.is_active = true
    )
  );

-- 7. Order price manipulation: replace direct INSERT with SECURITY DEFINER RPC
-- that reads the authoritative coupon price server-side.
CREATE OR REPLACE FUNCTION public.create_consumer_order(
  p_coupon_id uuid,
  p_quantity  integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consumer_id uuid;
  v_price       numeric;
  v_tax_rate    numeric := 0.065;
  v_unit        numeric;
  v_tax         numeric;
  v_total       numeric;
  v_order_id    uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 50 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  SELECT id INTO v_consumer_id FROM public.consumers WHERE user_id = auth.uid();
  IF v_consumer_id IS NULL THEN
    RAISE EXCEPTION 'No consumer profile';
  END IF;

  SELECT price INTO v_price FROM public.coupons
   WHERE id = p_coupon_id AND status = 'active';
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Coupon not available';
  END IF;

  v_unit  := v_price;
  v_tax   := round(v_unit * p_quantity * v_tax_rate, 2);
  v_total := round(v_unit * p_quantity * (1 + v_tax_rate), 2);

  INSERT INTO public.consumer_orders
    (consumer_id, coupon_id, quantity, unit_price, tax_amount, total_price, status)
  VALUES
    (v_consumer_id, p_coupon_id, p_quantity, v_unit, v_tax, v_total, 'pending')
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_consumer_order(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_consumer_order(uuid, integer) TO authenticated;

-- 8. Lock down direct INSERT on consumer_orders so clients must go through the RPC.
DROP POLICY IF EXISTS orders_insert_own ON public.consumer_orders;
CREATE POLICY orders_insert_own ON public.consumer_orders
  FOR INSERT TO authenticated
  WITH CHECK (false);
