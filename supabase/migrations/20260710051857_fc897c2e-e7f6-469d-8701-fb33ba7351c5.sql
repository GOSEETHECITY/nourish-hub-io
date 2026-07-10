
CREATE OR REPLACE FUNCTION public.notify_on_listing_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_np_name text;
BEGIN
  IF NEW.nonprofit_claimed_id IS DISTINCT FROM OLD.nonprofit_claimed_id
     AND NEW.nonprofit_claimed_id IS NOT NULL THEN
    SELECT organization_name INTO v_np_name
      FROM public.nonprofits WHERE id = NEW.nonprofit_claimed_id;
    PERFORM public.notify_org_members(
      NEW.organization_id,
      'listing_claimed',
      'Donation claimed',
      COALESCE(v_np_name, 'A nonprofit') || ' claimed your donation.',
      '/venue/donations',
      jsonb_build_object('listing_id', NEW.id, 'nonprofit_id', NEW.nonprofit_claimed_id)
    );
  END IF;

  IF NEW.status = 'picked_up' AND OLD.status IS DISTINCT FROM 'picked_up' THEN
    PERFORM public.notify_org_members(
      NEW.organization_id,
      'listing_picked_up',
      'Pickup confirmed',
      'Your donation was picked up.',
      '/venue/donations',
      jsonb_build_object('listing_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;
