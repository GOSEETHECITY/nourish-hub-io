-- ============ A1: move temp passwords to admin-only table ============
CREATE TABLE IF NOT EXISTS public.partner_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind text NOT NULL CHECK (entity_kind IN ('org','nonprofit')),
  entity_id uuid NOT NULL,
  temp_password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_kind, entity_id)
);
GRANT ALL ON public.partner_credentials TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_credentials TO authenticated;
ALTER TABLE public.partner_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage partner credentials" ON public.partner_credentials
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.partner_credentials (entity_kind, entity_id, temp_password)
SELECT 'org', id, temp_password_hint FROM public.organizations
WHERE temp_password_hint IS NOT NULL AND credentials_sent_at IS NULL
ON CONFLICT (entity_kind, entity_id) DO NOTHING;

INSERT INTO public.partner_credentials (entity_kind, entity_id, temp_password)
SELECT 'nonprofit', id, temp_password_hint FROM public.nonprofits
WHERE temp_password_hint IS NOT NULL AND credentials_sent_at IS NULL
ON CONFLICT (entity_kind, entity_id) DO NOTHING;

ALTER TABLE public.organizations DROP COLUMN IF EXISTS temp_password_hint;
ALTER TABLE public.nonprofits DROP COLUMN IF EXISTS temp_password_hint;

CREATE TRIGGER partner_credentials_touch BEFORE UPDATE ON public.partner_credentials
  FOR EACH ROW EXECUTE FUNCTION public.tax_receipts_touch_updated_at();

-- ============ B4: admin audit log ============
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  donation_id uuid,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins write audit log" ON public.admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND admin_user_id = auth.uid());
CREATE INDEX IF NOT EXISTS admin_audit_log_donation_idx ON public.admin_audit_log(donation_id, created_at DESC);

-- ============ C4: usage events ============
CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  role text,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read usage events" ON public.usage_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS usage_events_type_idx ON public.usage_events(event_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_usage_event(p_event_type text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text;
BEGIN
  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
  INSERT INTO public.usage_events (user_id, role, event_type, metadata)
  VALUES (auth.uid(), COALESCE(v_role, 'consumer'), p_event_type, COALESCE(p_metadata, '{}'::jsonb));
END; $$;
GRANT EXECUTE ON FUNCTION public.log_usage_event(text, jsonb) TO authenticated;

-- server-side triggers for donation lifecycle events
CREATE OR REPLACE FUNCTION public.usage_event_on_listing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.usage_events (user_id, role, event_type, metadata)
    VALUES (auth.uid(), 'venue_partner', 'donation_posted',
      jsonb_build_object('listing_id', NEW.id, 'organization_id', NEW.organization_id, 'pounds', NEW.pounds));
  ELSE
    IF NEW.nonprofit_claimed_id IS DISTINCT FROM OLD.nonprofit_claimed_id AND NEW.nonprofit_claimed_id IS NOT NULL THEN
      INSERT INTO public.usage_events (user_id, role, event_type, metadata)
      VALUES (auth.uid(), 'nonprofit_partner', 'donation_claimed',
        jsonb_build_object('listing_id', NEW.id, 'nonprofit_id', NEW.nonprofit_claimed_id));
    END IF;
    IF NEW.status = 'picked_up' AND OLD.status IS DISTINCT FROM 'picked_up' THEN
      INSERT INTO public.usage_events (user_id, role, event_type, metadata)
      VALUES (auth.uid(), 'nonprofit_partner', 'pickup_completed', jsonb_build_object('listing_id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS usage_event_listing_ins ON public.food_listings;
CREATE TRIGGER usage_event_listing_ins AFTER INSERT ON public.food_listings
  FOR EACH ROW EXECUTE FUNCTION public.usage_event_on_listing();
DROP TRIGGER IF EXISTS usage_event_listing_upd ON public.food_listings;
CREATE TRIGGER usage_event_listing_upd AFTER UPDATE ON public.food_listings
  FOR EACH ROW EXECUTE FUNCTION public.usage_event_on_listing();

CREATE OR REPLACE FUNCTION public.usage_event_on_receipt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.usage_events (user_id, role, event_type, metadata)
  VALUES (COALESCE(NEW.submitted_by, auth.uid()), 'nonprofit_partner', 'receipt_submitted',
    jsonb_build_object('listing_id', NEW.food_listing_id, 'receipt_id', NEW.id));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS usage_event_receipt_ins ON public.tax_receipts;
CREATE TRIGGER usage_event_receipt_ins AFTER INSERT ON public.tax_receipts
  FOR EACH ROW EXECUTE FUNCTION public.usage_event_on_receipt();

CREATE OR REPLACE FUNCTION public.usage_event_on_survey()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.submitted_at IS NOT NULL AND OLD.submitted_at IS NULL THEN
    INSERT INTO public.usage_events (user_id, role, event_type, metadata)
    VALUES (auth.uid(), 'nonprofit_partner', 'survey_submitted',
      jsonb_build_object('survey_id', NEW.id, 'listing_id', NEW.food_listing_id));
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS usage_event_survey_upd ON public.impact_surveys;
CREATE TRIGGER usage_event_survey_upd AFTER UPDATE ON public.impact_surveys
  FOR EACH ROW EXECUTE FUNCTION public.usage_event_on_survey();

-- ============ C1: idempotent donation alert log ============
CREATE TABLE IF NOT EXISTS public.donation_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_listing_id uuid NOT NULL,
  alert_type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (food_listing_id, alert_type)
);
GRANT SELECT ON public.donation_alerts TO authenticated;
GRANT ALL ON public.donation_alerts TO service_role;
ALTER TABLE public.donation_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read donation alerts" ON public.donation_alerts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ A2/C2: cron invoker that sends the shared secret ============
CREATE OR REPLACE FUNCTION public.invoke_scheduled_function(p_name text, p_body jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_secret text; v_url text;
BEGIN
  SELECT value INTO v_secret FROM public.app_config WHERE key = 'cron_secret';
  v_url := 'https://yaicfjdquvfifwtfpmbm.supabase.co/functions/v1/' || p_name;
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json','X-Cron-Secret', coalesce(v_secret,'')),
    body := coalesce(p_body, '{}'::jsonb)
  );
END; $$;