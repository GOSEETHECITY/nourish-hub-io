
CREATE TABLE public.nonprofit_alert_settings (
  nonprofit_id uuid PRIMARY KEY REFERENCES public.nonprofits(id) ON DELETE CASCADE,
  radius_miles integer NOT NULL DEFAULT 25,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  alert_email text,
  alert_phone text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.nonprofit_alert_settings TO authenticated;
GRANT ALL ON public.nonprofit_alert_settings TO service_role;
ALTER TABLE public.nonprofit_alert_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "np members read alert settings" ON public.nonprofit_alert_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.nonprofit_id = nonprofit_alert_settings.nonprofit_id));
CREATE POLICY "np members insert alert settings" ON public.nonprofit_alert_settings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.nonprofit_id = nonprofit_alert_settings.nonprofit_id));
CREATE POLICY "np members update alert settings" ON public.nonprofit_alert_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.nonprofit_id = nonprofit_alert_settings.nonprofit_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.nonprofit_id = nonprofit_alert_settings.nonprofit_id));
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER nas_touch BEFORE UPDATE ON public.nonprofit_alert_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.driver_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_listing_id uuid REFERENCES public.food_listings(id) ON DELETE SET NULL,
  nonprofit_id uuid NOT NULL REFERENCES public.nonprofits(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'uber',
  pickup_kind text NOT NULL DEFAULT 'one_time',
  scheduled_date date,
  pickup_notes text,
  estimated_fee_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'awaiting_payment',
  fulfillment_mode text NOT NULL DEFAULT 'manual',
  uber_deeplink text,
  stripe_session_id text,
  stripe_payment_intent_id text,
  admin_notes text,
  created_by uuid,
  paid_at timestamptz,
  dispatched_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX driver_orders_listing_idx ON public.driver_orders(food_listing_id);
CREATE INDEX driver_orders_np_idx ON public.driver_orders(nonprofit_id);
CREATE INDEX driver_orders_status_idx ON public.driver_orders(status);
GRANT SELECT, UPDATE ON public.driver_orders TO authenticated;
GRANT ALL ON public.driver_orders TO service_role;
ALTER TABLE public.driver_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "driver orders read" ON public.driver_orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.nonprofit_id = driver_orders.nonprofit_id));
CREATE POLICY "driver orders admin update" ON public.driver_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER driver_orders_touch BEFORE UPDATE ON public.driver_orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.pickup_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_listing_id uuid REFERENCES public.food_listings(id) ON DELETE CASCADE,
  driver_order_id uuid REFERENCES public.driver_orders(id) ON DELETE SET NULL,
  nonprofit_id uuid REFERENCES public.nonprofits(id) ON DELETE CASCADE,
  issue_type text NOT NULL,
  description text,
  source text NOT NULL DEFAULT 'nonprofit',
  status text NOT NULL DEFAULT 'open',
  reported_by uuid,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pickup_issues_listing_idx ON public.pickup_issues(food_listing_id);
CREATE INDEX pickup_issues_driver_idx ON public.pickup_issues(driver_order_id);
CREATE INDEX pickup_issues_np_idx ON public.pickup_issues(nonprofit_id);
CREATE UNIQUE INDEX pickup_issues_missed_listing_uq ON public.pickup_issues(food_listing_id) WHERE issue_type = 'missed_window' AND driver_order_id IS NULL;
CREATE UNIQUE INDEX pickup_issues_missed_driver_uq ON public.pickup_issues(driver_order_id) WHERE issue_type = 'missed_window';
GRANT SELECT, INSERT, UPDATE ON public.pickup_issues TO authenticated;
GRANT ALL ON public.pickup_issues TO service_role;
ALTER TABLE public.pickup_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pickup issues read" ON public.pickup_issues FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.nonprofit_id = pickup_issues.nonprofit_id));
CREATE POLICY "nonprofit report issue" ON public.pickup_issues FOR INSERT TO authenticated
  WITH CHECK (
    source = 'nonprofit' AND status = 'open' AND reported_by = auth.uid()
    AND issue_type IN ('no_show','wrong_items','damaged','not_ready','unsafe','other')
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.nonprofit_id = pickup_issues.nonprofit_id)
    AND EXISTS (SELECT 1 FROM public.food_listings fl WHERE fl.id = pickup_issues.food_listing_id AND fl.nonprofit_claimed_id = pickup_issues.nonprofit_id)
  );
CREATE POLICY "admin update issues" ON public.pickup_issues FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER pickup_issues_touch BEFORE UPDATE ON public.pickup_issues FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Admin alert on every new issue
CREATE OR REPLACE FUNCTION public.on_pickup_issue_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.admin_notifications(type, title, description, link)
  VALUES ('system',
    CASE WHEN NEW.source = 'system' THEN 'Pickup missed its window' ELSE 'Pickup problem reported' END,
    replace(NEW.issue_type,'_',' ') || coalesce(': ' || left(NEW.description, 200), ''),
    '/admin/pickup-issues');
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.on_pickup_issue_insert() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER pickup_issue_alert AFTER INSERT ON public.pickup_issues FOR EACH ROW EXECUTE FUNCTION public.on_pickup_issue_insert();

-- Admin alert when a driver order is paid
CREATE OR REPLACE FUNCTION public.on_driver_order_paid() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    INSERT INTO public.admin_notifications(type, title, description, link)
    VALUES ('system', 'Driver order ready to dispatch',
      initcap(NEW.provider) || ' ' || replace(NEW.pickup_kind,'_',' ') || ' — $' || to_char(NEW.estimated_fee_cents/100.0,'FM999990.00'),
      '/admin/driver-orders');
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.on_driver_order_paid() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER driver_order_paid_alert AFTER UPDATE ON public.driver_orders FOR EACH ROW EXECUTE FUNCTION public.on_driver_order_paid();

-- Auto-flag pickups that pass their window unconfirmed
CREATE OR REPLACE FUNCTION public.flag_missed_pickups() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer := 0; c integer;
BEGIN
  INSERT INTO public.pickup_issues(food_listing_id, nonprofit_id, issue_type, description, source)
  SELECT fl.id, fl.nonprofit_claimed_id, 'missed_window',
         'Pickup window ended ' || to_char(fl.pickup_window_end AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI') || ' UTC with no pickup confirmation.', 'system'
  FROM public.food_listings fl
  WHERE fl.status = 'claimed' AND fl.pickup_window_end IS NOT NULL AND fl.pickup_window_end < now()
    AND fl.nonprofit_claimed_id IS NOT NULL
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS c = ROW_COUNT; n := n + c;

  INSERT INTO public.pickup_issues(food_listing_id, driver_order_id, nonprofit_id, issue_type, description, source)
  SELECT d.food_listing_id, d.id, d.nonprofit_id, 'missed_window',
         'Scheduled driver pickup for ' || d.scheduled_date || ' was not confirmed as completed.', 'system'
  FROM public.driver_orders d
  WHERE d.status IN ('paid','dispatched') AND d.scheduled_date IS NOT NULL AND d.scheduled_date < current_date
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS c = ROW_COUNT; n := n + c;
  RETURN n;
END; $$;
REVOKE EXECUTE ON FUNCTION public.flag_missed_pickups() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('flag-missed-pickups', '5 * * * *', $$ SELECT public.flag_missed_pickups(); $$);

-- Fan out nonprofit alerts when a donation posts
CREATE OR REPLACE FUNCTION public.notify_nonprofits_on_donation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.listing_type = 'donation' AND NEW.status = 'posted' THEN
    BEGIN
      PERFORM public.invoke_scheduled_function('nonprofit-donation-alerts', jsonb_build_object('listing_id', NEW.id));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_nonprofits_on_donation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER food_listings_nonprofit_alerts AFTER INSERT ON public.food_listings FOR EACH ROW EXECUTE FUNCTION public.notify_nonprofits_on_donation();
