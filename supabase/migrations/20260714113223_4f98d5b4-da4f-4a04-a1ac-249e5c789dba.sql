
-- 1. Pickup code on consumer orders
ALTER TABLE public.consumer_orders
  ADD COLUMN IF NOT EXISTS pickup_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz;

CREATE OR REPLACE FUNCTION public.gen_pickup_code() RETURNS text LANGUAGE plpgsql AS $$
DECLARE chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; code text; i int; ok boolean := false;
BEGIN
  WHILE NOT ok LOOP
    code := '';
    FOR i IN 1..6 LOOP code := code || substr(chars, 1 + floor(random()*length(chars))::int, 1); END LOOP;
    PERFORM 1 FROM public.consumer_orders WHERE pickup_code = code;
    IF NOT FOUND THEN ok := true; END IF;
  END LOOP;
  RETURN code;
END $$;

CREATE OR REPLACE FUNCTION public.set_pickup_code() RETURNS trigger LANGUAGE plpgsql
SET search_path = public AS $$
BEGIN
  IF NEW.pickup_code IS NULL THEN NEW.pickup_code := public.gen_pickup_code(); END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_consumer_orders_pickup_code ON public.consumer_orders;
CREATE TRIGGER trg_consumer_orders_pickup_code BEFORE INSERT ON public.consumer_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_pickup_code();

UPDATE public.consumer_orders SET pickup_code = public.gen_pickup_code() WHERE pickup_code IS NULL;

-- 2. Organizations: track when credentials were emailed to the primary contact
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS credentials_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS primary_contact_email text,
  ADD COLUMN IF NOT EXISTS primary_contact_name text,
  ADD COLUMN IF NOT EXISTS primary_contact_phone text,
  ADD COLUMN IF NOT EXISTS temp_password_hint text;

ALTER TABLE public.nonprofits
  ADD COLUMN IF NOT EXISTS credentials_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS primary_contact_email text,
  ADD COLUMN IF NOT EXISTS primary_contact_name text,
  ADD COLUMN IF NOT EXISTS primary_contact_phone text,
  ADD COLUMN IF NOT EXISTS temp_password_hint text;

-- 3. Onboarding submissions from the public partner-signup form
CREATE TABLE IF NOT EXISTS public.onboarding_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL,
  organization_type text NOT NULL,
  address text,
  city text,
  state text,
  zip_code text,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  ein text,
  parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  parent_organization_name text,
  ein_verified boolean,
  ein_verification_result jsonb,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_nonprofit_id uuid REFERENCES public.nonprofits(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.onboarding_submissions TO anon, authenticated;
GRANT SELECT, UPDATE ON public.onboarding_submissions TO authenticated;
GRANT ALL ON public.onboarding_submissions TO service_role;
ALTER TABLE public.onboarding_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_submit_anon ON public.onboarding_submissions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY onboarding_submit_auth ON public.onboarding_submissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY onboarding_admin_read ON public.onboarding_submissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY onboarding_admin_update ON public.onboarding_submissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.onboarding_submissions_touch() RETURNS trigger LANGUAGE plpgsql
SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_onboarding_touch ON public.onboarding_submissions;
CREATE TRIGGER trg_onboarding_touch BEFORE UPDATE ON public.onboarding_submissions
  FOR EACH ROW EXECUTE FUNCTION public.onboarding_submissions_touch();

-- 4. Per-user notification preferences (email + sms toggles per category)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_prefs_owner_all ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. IRS Pub 78 EIN dataset for nonprofit verification
CREATE TABLE IF NOT EXISTS public.irs_pub78_orgs (
  ein text PRIMARY KEY,
  organization_name text,
  city text,
  state text,
  country text,
  deductibility_status text,
  last_synced_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.irs_pub78_orgs TO authenticated, anon;
GRANT ALL ON public.irs_pub78_orgs TO service_role;
ALTER TABLE public.irs_pub78_orgs ENABLE ROW LEVEL SECURITY;
CREATE POLICY irs_pub78_read ON public.irs_pub78_orgs FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.verify_ein(p_ein text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN r.ein IS NULL
    THEN jsonb_build_object('verified', false, 'reason', 'EIN not found in IRS Pub 78 dataset')
    ELSE jsonb_build_object('verified', true, 'organization_name', r.organization_name,
      'city', r.city, 'state', r.state, 'deductibility_status', r.deductibility_status)
  END
  FROM (SELECT ein, organization_name, city, state, deductibility_status
        FROM public.irs_pub78_orgs
        WHERE ein = regexp_replace(coalesce(p_ein,''), '\D', '', 'g') LIMIT 1) r
  RIGHT JOIN (SELECT 1) x ON true;
$$;
