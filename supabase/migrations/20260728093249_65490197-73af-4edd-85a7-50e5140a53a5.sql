CREATE OR REPLACE FUNCTION public.notify_ops_sms_on_donation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.listing_type = 'donation' THEN
    BEGIN
      PERFORM public.invoke_scheduled_function('donation-posted-sms', jsonb_build_object('listing_id', NEW.id));
    EXCEPTION WHEN OTHERS THEN
      NULL; -- never block the donation post
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_donation_posted_sms ON public.food_listings;
CREATE TRIGGER trg_donation_posted_sms
AFTER INSERT ON public.food_listings
FOR EACH ROW EXECUTE FUNCTION public.notify_ops_sms_on_donation();