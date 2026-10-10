CREATE OR REPLACE FUNCTION public.expire_pending_orders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  WITH expired AS (
    UPDATE consumer_orders SET status = 'cancelled'
     WHERE status = 'pending' AND created_at < now() - interval '5 minutes'
     RETURNING consumer_id, food_listing_id
  ), rel AS (
    UPDATE flash_reservations fr SET status = 'released', released_at = now()
      FROM expired e
     WHERE e.food_listing_id IS NOT NULL AND fr.food_listing_id = e.food_listing_id
       AND fr.consumer_id = e.consumer_id AND fr.status = 'reserved'
     RETURNING fr.id
  )
  SELECT count(*) INTO n FROM expired;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.expire_pending_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_pending_orders() TO service_role;

-- Lets a shopper release their own unpaid orders when the checkout timer runs out.
CREATE OR REPLACE FUNCTION public.release_own_pending_orders(p_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int; v_consumer uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO v_consumer FROM consumers WHERE user_id = auth.uid();
  IF v_consumer IS NULL OR p_ids IS NULL OR array_length(p_ids,1) > 50 THEN RETURN 0; END IF;
  UPDATE consumer_orders SET status = 'cancelled'
   WHERE id = ANY(p_ids) AND consumer_id = v_consumer AND status = 'pending';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.release_own_pending_orders(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_own_pending_orders(uuid[]) TO authenticated;