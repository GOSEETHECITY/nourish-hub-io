CREATE OR REPLACE FUNCTION public.increment_coupon_sold(p_coupon_id uuid, p_qty integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF p_qty IS NULL OR p_qty < 1 THEN RETURN false; END IF;
  UPDATE public.coupons SET quantity_sold = quantity_sold + p_qty
   WHERE id = p_coupon_id AND quantity_available - quantity_sold - p_qty >= 0;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END $$;
REVOKE ALL ON FUNCTION public.increment_coupon_sold(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_coupon_sold(uuid, integer) TO service_role;