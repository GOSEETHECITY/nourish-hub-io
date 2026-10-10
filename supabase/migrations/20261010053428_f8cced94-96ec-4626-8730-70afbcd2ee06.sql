CREATE OR REPLACE FUNCTION public.food_listings_restrict_nonprofit_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  allowed text[] := ARRAY['status','nonprofit_claimed_id','picked_up_at'];
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR NOT public.has_role(auth.uid(), 'nonprofit_partner')
     OR (public.has_role(auth.uid(), 'venue_partner') AND OLD.organization_id IN (
           SELECT organization_id FROM public.profiles WHERE id = auth.uid())) THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - allowed) IS DISTINCT FROM (to_jsonb(OLD) - allowed) THEN
    RAISE EXCEPTION 'Nonprofit accounts can only claim, release, or update the status of a donation'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- "a_" prefix so it runs before other BEFORE UPDATE triggers and only checks the caller's own changes
DROP TRIGGER IF EXISTS a_food_listings_restrict_nonprofit_update ON public.food_listings;
CREATE TRIGGER a_food_listings_restrict_nonprofit_update
  BEFORE UPDATE ON public.food_listings
  FOR EACH ROW EXECUTE FUNCTION public.food_listings_restrict_nonprofit_update();

REVOKE EXECUTE ON FUNCTION public.food_listings_restrict_nonprofit_update() FROM PUBLIC, anon, authenticated;