
CREATE OR REPLACE FUNCTION public.enforce_nonprofit_approved_on_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NEW.nonprofit_claimed_id IS NOT NULL
     AND NEW.nonprofit_claimed_id IS DISTINCT FROM COALESCE(OLD.nonprofit_claimed_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    SELECT approval_status::text INTO v_status
      FROM public.nonprofits WHERE id = NEW.nonprofit_claimed_id;
    IF v_status IS DISTINCT FROM 'approved' THEN
      RAISE EXCEPTION 'Nonprofit is not approved and cannot claim donations';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_nonprofit_approved_on_claim ON public.food_listings;
CREATE TRIGGER trg_enforce_nonprofit_approved_on_claim
BEFORE INSERT OR UPDATE OF nonprofit_claimed_id ON public.food_listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_nonprofit_approved_on_claim();
