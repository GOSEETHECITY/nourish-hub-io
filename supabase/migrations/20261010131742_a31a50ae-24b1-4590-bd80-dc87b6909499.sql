-- 1. Locations: government users only see in-region approved locations
DROP POLICY IF EXISTS "Authenticated read approved locations" ON public.locations;
CREATE POLICY "Authenticated read approved locations" ON public.locations
  FOR SELECT TO authenticated
  USING (
    approval_status = 'approved'::approval_status
    AND (NOT public.has_role(auth.uid(), 'government_partner'::app_role)
         OR public.has_role(auth.uid(), 'admin'::app_role)
         OR public.gov_location_in_region(auth.uid(), id))
  );

-- 2. Impact reports scoped to region
DROP POLICY IF EXISTS "Government can read impact_reports" ON public.impact_reports;
CREATE POLICY "Government can read impact_reports in region" ON public.impact_reports
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.food_listings f
                 WHERE f.id = impact_reports.food_listing_id
                   AND public.gov_location_in_region(auth.uid(), f.location_id)));

CREATE OR REPLACE FUNCTION public.gov_region_impact_reports()
RETURNS SETOF public.impact_reports
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.* FROM impact_reports r JOIN food_listings f ON f.id = r.food_listing_id
  WHERE gov_location_in_region(auth.uid(), f.location_id)
  ORDER BY r.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.gov_region_impact_reports() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gov_region_impact_reports() TO authenticated;

-- 3. Atomic multi-item checkout (one transaction: all or nothing)
CREATE OR REPLACE FUNCTION public.create_consumer_orders(p_items jsonb)
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it jsonb; ids uuid[] := '{}';
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Invalid cart';
  END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    ids := ids || public.create_consumer_order((it->>'coupon_id')::uuid, (it->>'quantity')::int);
  END LOOP;
  RETURN ids;
END $$;
REVOKE ALL ON FUNCTION public.create_consumer_orders(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_consumer_orders(jsonb) TO authenticated;

-- 4. Pending order expiry (called by the 5-minute cleanup job, service role only)
CREATE OR REPLACE FUNCTION public.expire_pending_orders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  WITH expired AS (
    UPDATE consumer_orders SET status = 'cancelled'
     WHERE status = 'pending' AND created_at < now() - interval '30 minutes'
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

-- 6. Which flash listings are currently held
CREATE OR REPLACE FUNCTION public.reserved_flash_listing_ids(p_ids uuid[])
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT food_listing_id FROM flash_reservations
   WHERE food_listing_id = ANY(p_ids) AND status IN ('reserved','confirmed','picked_up');
$$;
REVOKE ALL ON FUNCTION public.reserved_flash_listing_ids(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserved_flash_listing_ids(uuid[]) TO authenticated;