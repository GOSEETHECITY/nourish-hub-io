-- 1. Per-city tax rate
ALTER TABLE public.city_thresholds ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0.065;

CREATE OR REPLACE FUNCTION public.tax_rate_for_location(p_location_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT ct.tax_rate FROM public.locations l
    JOIN public.city_thresholds ct
      ON lower(trim(ct.city)) = lower(trim(l.city))
     AND (ct.state IS NULL OR l.state IS NULL OR public.gov_state_code(ct.state) = public.gov_state_code(l.state))
    WHERE l.id = p_location_id
    LIMIT 1), 0.065);
$$;
REVOKE ALL ON FUNCTION public.tax_rate_for_location(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tax_rate_for_location(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.coupon_tax_rates(p_coupon_ids uuid[])
RETURNS TABLE(coupon_id uuid, tax_rate numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, public.tax_rate_for_location(c.location_id)
  FROM public.coupons c WHERE c.id = ANY(p_coupon_ids) AND coalesce(array_length(p_coupon_ids,1),0) <= 100;
$$;
REVOKE ALL ON FUNCTION public.coupon_tax_rates(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coupon_tax_rates(uuid[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_consumer_order(p_coupon_id uuid, p_quantity integer)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_consumer_id uuid; v_price numeric; v_location uuid; v_tax_rate numeric;
  v_unit numeric; v_tax numeric; v_total numeric; v_order_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 50 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
  SELECT id INTO v_consumer_id FROM public.consumers WHERE user_id = auth.uid();
  IF v_consumer_id IS NULL THEN RAISE EXCEPTION 'No consumer profile'; END IF;
  SELECT price, location_id INTO v_price, v_location FROM public.coupons WHERE id = p_coupon_id AND status = 'active';
  IF v_price IS NULL THEN RAISE EXCEPTION 'Coupon not available'; END IF;
  v_tax_rate := public.tax_rate_for_location(v_location);
  v_unit  := v_price;
  v_tax   := round(v_unit * p_quantity * v_tax_rate, 2);
  v_total := round(v_unit * p_quantity, 2) + v_tax;
  INSERT INTO public.consumer_orders (consumer_id, coupon_id, quantity, unit_price, tax_amount, total_price, status)
  VALUES (v_consumer_id, p_coupon_id, p_quantity, v_unit, v_tax, v_total, 'pending')
  RETURNING id INTO v_order_id;
  RETURN v_order_id;
END;
$function$;

-- 2. One source of truth for meals served: impact_reports.meals_served.
-- Survey "people fed" and report "meals served" are kept identical in both directions.
CREATE OR REPLACE FUNCTION public.sync_report_meals_to_survey()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.impact_surveys SET people_fed = NEW.meals_served
   WHERE food_listing_id = NEW.food_listing_id AND people_fed IS DISTINCT FROM NEW.meals_served
     AND NEW.meals_served IS NOT NULL;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_report_meals_to_survey() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sync_report_meals_to_survey ON public.impact_reports;
CREATE TRIGGER trg_sync_report_meals_to_survey AFTER INSERT OR UPDATE OF meals_served ON public.impact_reports
FOR EACH ROW EXECUTE FUNCTION public.sync_report_meals_to_survey();

CREATE OR REPLACE FUNCTION public.sync_survey_people_to_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.submitted_at IS NULL OR NEW.people_fed IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.impact_reports WHERE food_listing_id = NEW.food_listing_id) THEN
    UPDATE public.impact_reports SET meals_served = NEW.people_fed
     WHERE food_listing_id = NEW.food_listing_id AND meals_served IS DISTINCT FROM NEW.people_fed;
  ELSE
    INSERT INTO public.impact_reports (food_listing_id, nonprofit_id, meals_served, date_distributed, notes)
    VALUES (NEW.food_listing_id, NEW.nonprofit_id, NEW.people_fed, NEW.date_received, 'From pickup survey');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_survey_people_to_report() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sync_survey_people_to_report ON public.impact_surveys;
CREATE TRIGGER trg_sync_survey_people_to_report AFTER INSERT OR UPDATE OF people_fed, submitted_at ON public.impact_surveys
FOR EACH ROW EXECUTE FUNCTION public.sync_survey_people_to_report();

-- 3. On pickup confirmation: create the survey and email its link
CREATE OR REPLACE FUNCTION public.create_survey_on_pickup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_token text;
BEGIN
  IF NEW.status = 'picked_up' AND OLD.status IS DISTINCT FROM 'picked_up' AND NEW.nonprofit_claimed_id IS NOT NULL THEN
    INSERT INTO public.impact_surveys (food_listing_id, nonprofit_id, venue_organization_id)
    VALUES (NEW.id, NEW.nonprofit_claimed_id, NEW.organization_id)
    ON CONFLICT (food_listing_id) DO NOTHING
    RETURNING id, token INTO v_id, v_token;
    IF v_id IS NULL THEN
      SELECT id, token INTO v_id, v_token FROM public.impact_surveys WHERE food_listing_id = NEW.id;
    END IF;
    INSERT INTO public.notifications (user_id, type, title, body, link_path, metadata)
    SELECT p.id, 'impact_survey_ready', 'Complete your pickup survey',
           'Share how the food helped and upload photos — takes under 2 minutes.',
           '/survey/' || v_token, jsonb_build_object('survey_id', v_id, 'listing_id', NEW.id)
    FROM public.profiles p WHERE p.nonprofit_id = NEW.nonprofit_claimed_id;
    BEGIN
      PERFORM public.invoke_scheduled_function('send-pickup-survey', jsonb_build_object('listing_id', NEW.id));
    EXCEPTION WHEN OTHERS THEN NULL; -- email failure must never block a pickup
    END;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.create_survey_on_pickup() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_create_survey_on_pickup ON public.food_listings;
CREATE TRIGGER trg_create_survey_on_pickup AFTER UPDATE OF status ON public.food_listings
FOR EACH ROW EXECUTE FUNCTION public.create_survey_on_pickup();

-- 4. Pickup windows posted by venues must be in the future (admins may record historical donations)
CREATE OR REPLACE FUNCTION public.food_listings_require_future_pickup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.pickup_window_start IS NOT DISTINCT FROM OLD.pickup_window_start
     AND NEW.pickup_window_end IS NOT DISTINCT FROM OLD.pickup_window_end THEN RETURN NEW; END IF;
  IF NEW.pickup_window_start IS NOT NULL AND NEW.pickup_window_start <= now() THEN
    RAISE EXCEPTION 'Pickup start must be a future date and time';
  END IF;
  IF NEW.pickup_window_end IS NOT NULL AND NEW.pickup_window_end <= now() THEN
    RAISE EXCEPTION 'Pickup end must be a future date and time';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.food_listings_require_future_pickup() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_food_listings_require_future_pickup ON public.food_listings;
CREATE TRIGGER trg_food_listings_require_future_pickup BEFORE INSERT OR UPDATE OF pickup_window_start, pickup_window_end ON public.food_listings
FOR EACH ROW EXECUTE FUNCTION public.food_listings_require_future_pickup();

-- 5. Performance: index every unindexed foreign key
CREATE INDEX IF NOT EXISTS idx_billing_organization_id ON public.billing(organization_id);
CREATE INDEX IF NOT EXISTS idx_consumer_checkins_consumer_id ON public.consumer_checkins(consumer_id);
CREATE INDEX IF NOT EXISTS idx_consumer_checkins_organization_id ON public.consumer_checkins(organization_id);
CREATE INDEX IF NOT EXISTS idx_consumer_favorites_organization_id ON public.consumer_favorites(organization_id);
CREATE INDEX IF NOT EXISTS idx_consumer_favorites_consumer_id ON public.consumer_favorites(consumer_id);
CREATE INDEX IF NOT EXISTS idx_consumer_orders_coupon_id ON public.consumer_orders(coupon_id);
CREATE INDEX IF NOT EXISTS idx_consumer_orders_consumer_id ON public.consumer_orders(consumer_id);
CREATE INDEX IF NOT EXISTS idx_consumer_orders_food_listing_id ON public.consumer_orders(food_listing_id);
CREATE INDEX IF NOT EXISTS idx_coupons_location_id ON public.coupons(location_id);
CREATE INDEX IF NOT EXISTS idx_coupons_organization_id ON public.coupons(organization_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_user_id ON public.event_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_event_id ON public.event_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_food_listings_organization_id ON public.food_listings(organization_id);
CREATE INDEX IF NOT EXISTS idx_food_listings_location_id ON public.food_listings(location_id);
CREATE INDEX IF NOT EXISTS idx_food_listings_nonprofit_claimed_id ON public.food_listings(nonprofit_claimed_id);
CREATE INDEX IF NOT EXISTS idx_impact_reports_nonprofit_id ON public.impact_reports(nonprofit_id);
CREATE INDEX IF NOT EXISTS idx_impact_reports_food_listing_id ON public.impact_reports(food_listing_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_created_event_id ON public.import_logs(created_event_id);
CREATE INDEX IF NOT EXISTS idx_locations_organization_id ON public.locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_nonprofit_locations_nonprofit_id ON public.nonprofit_locations(nonprofit_id);
CREATE INDEX IF NOT EXISTS idx_nonprofits_user_id ON public.nonprofits(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_created_nonprofit_id ON public.onboarding_submissions(created_nonprofit_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_parent_organization_id ON public.onboarding_submissions(parent_organization_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_reviewed_by ON public.onboarding_submissions(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_created_organization_id ON public.onboarding_submissions(created_organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_pricing_organization_id ON public.organization_pricing(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_location_id ON public.profiles(location_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_nonprofit_location_id ON public.profiles(nonprofit_location_id);
CREATE INDEX IF NOT EXISTS idx_profiles_nonprofit_id ON public.profiles(nonprofit_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_consumer_id ON public.push_subscriptions(consumer_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_user_id ON public.support_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sustainability_baseline_location_id ON public.sustainability_baseline(location_id);
CREATE INDEX IF NOT EXISTS idx_tax_receipts_submitted_by ON public.tax_receipts(submitted_by);
CREATE INDEX IF NOT EXISTS idx_tax_receipts_food_listing_id ON public.tax_receipts(food_listing_id);
CREATE INDEX IF NOT EXISTS idx_tax_receipts_nonprofit_id ON public.tax_receipts(nonprofit_id);
CREATE INDEX IF NOT EXISTS idx_tax_receipts_venue_organization_id ON public.tax_receipts(venue_organization_id);