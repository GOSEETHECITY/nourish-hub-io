
ALTER TABLE public.consumer_badges ALTER COLUMN badge_id DROP NOT NULL;
ALTER TABLE public.consumer_badges ADD COLUMN IF NOT EXISTS badge_key text;
CREATE UNIQUE INDEX IF NOT EXISTS consumer_badges_consumer_key_uidx
  ON public.consumer_badges(consumer_id, badge_key) WHERE badge_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.award_badge(
  p_consumer_id uuid, p_key text, p_name text, p_description text, p_icon text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.consumer_badges WHERE consumer_id = p_consumer_id AND badge_key = p_key) THEN RETURN; END IF;
  INSERT INTO public.consumer_badges (consumer_id, badge_key, badge_name, badge_description, badge_icon, earned_at)
  VALUES (p_consumer_id, p_key, p_name, p_description, p_icon, now());
  SELECT user_id INTO v_user FROM public.consumers WHERE id = p_consumer_id;
  IF v_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link_path, metadata)
    VALUES (v_user, 'badge_awarded', 'Badge unlocked: ' || p_name, p_description, '/app/profile',
            jsonb_build_object('badge_key', p_key, 'badge_icon', p_icon));
  END IF;
END $$;

ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS referral_code text;

CREATE OR REPLACE FUNCTION public.gen_referral_code() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; code text; i int; ok boolean := false;
BEGIN
  WHILE NOT ok LOOP
    code := '';
    FOR i IN 1..8 LOOP code := code || substr(chars, 1 + floor(random()*length(chars))::int, 1); END LOOP;
    PERFORM 1 FROM public.consumers WHERE referral_code = code;
    IF NOT FOUND THEN ok := true; END IF;
  END LOOP;
  RETURN code;
END $$;

UPDATE public.consumers SET referral_code = public.gen_referral_code() WHERE referral_code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS consumers_referral_code_uidx ON public.consumers(referral_code);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_consumer_id uuid NOT NULL REFERENCES public.consumers(id) ON DELETE CASCADE,
  referee_consumer_id uuid NOT NULL REFERENCES public.consumers(id) ON DELETE CASCADE,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referee_consumer_id)
);
GRANT SELECT, INSERT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consumers see their own referrals" ON public.referrals;
CREATE POLICY "consumers see their own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (referrer_consumer_id IN (SELECT id FROM public.consumers WHERE user_id = auth.uid())
      OR referee_consumer_id IN (SELECT id FROM public.consumers WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "authenticated can insert own-as-referee referral" ON public.referrals;
CREATE POLICY "authenticated can insert own-as-referee referral" ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (referee_consumer_id IN (SELECT id FROM public.consumers WHERE user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals(referrer_consumer_id);

CREATE OR REPLACE FUNCTION public.on_referral_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.award_badge(NEW.referrer_consumer_id, 'first_referral',
    'First friend referred', 'You invited your first friend to GO See The City.', '🎁');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_referrals_award ON public.referrals;
CREATE TRIGGER trg_referrals_award AFTER INSERT ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.on_referral_insert();

CREATE OR REPLACE FUNCTION public.on_consumer_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN NEW.referral_code := public.gen_referral_code(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_consumers_before_insert ON public.consumers;
CREATE TRIGGER trg_consumers_before_insert BEFORE INSERT ON public.consumers
  FOR EACH ROW EXECUTE FUNCTION public.on_consumer_insert();

CREATE OR REPLACE FUNCTION public.on_consumer_after_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.award_badge(NEW.id, 'account_created', 'Welcome aboard',
    'Your GO See The City account is live.', '👋');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_consumers_after_insert ON public.consumers;
CREATE TRIGGER trg_consumers_after_insert AFTER INSERT ON public.consumers
  FOR EACH ROW EXECUTE FUNCTION public.on_consumer_after_insert();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.consumers LOOP
    PERFORM public.award_badge(r.id, 'account_created', 'Welcome aboard',
      'Your GO See The City account is live.', '👋');
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.on_event_checkin_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_consumer_id uuid; v_total int; v_is_grand_opening boolean;
BEGIN
  SELECT id INTO v_consumer_id FROM public.consumers WHERE user_id = NEW.user_id;
  IF v_consumer_id IS NULL THEN RETURN NEW; END IF;
  SELECT (category = 'grand_opening') INTO v_is_grand_opening FROM public.events WHERE id = NEW.event_id;
  IF v_is_grand_opening THEN
    PERFORM public.award_badge(v_consumer_id, 'first_grand_opening', 'First grand opening',
      'You checked in at your first grand opening event.', '🎉');
  END IF;
  SELECT count(*) INTO v_total FROM public.event_checkins WHERE user_id = NEW.user_id;
  IF v_total >= 5 THEN
    PERFORM public.award_badge(v_consumer_id, 'checkins_5', 'Explorer', 'You checked in at 5 events.', '🗺️');
  END IF;
  IF v_total >= 10 THEN
    PERFORM public.award_badge(v_consumer_id, 'checkins_10', 'City Regular', 'You checked in at 10 events.', '🏆');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_event_checkins_award ON public.event_checkins;
CREATE TRIGGER trg_event_checkins_award AFTER INSERT ON public.event_checkins
  FOR EACH ROW EXECUTE FUNCTION public.on_event_checkin_insert();

CREATE OR REPLACE FUNCTION public.on_consumer_order_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.award_badge(NEW.consumer_id, 'first_order', 'First rescue order',
    'You saved food from the landfill with your first order.', '🥡');
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_consumer_orders_award ON public.consumer_orders;
CREATE TRIGGER trg_consumer_orders_award AFTER INSERT ON public.consumer_orders
  FOR EACH ROW EXECUTE FUNCTION public.on_consumer_order_insert();

DO $$ BEGIN
  CREATE TYPE public.lead_status AS ENUM ('new','contacted','in_progress','converted','not_interested');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.partner_leads
  ADD COLUMN IF NOT EXISTS status public.lead_status NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP POLICY IF EXISTS "admin update leads" ON public.partner_leads;
CREATE POLICY "admin update leads" ON public.partner_leads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.on_partner_lead_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, description, link, is_read)
  VALUES ('new_lead',
    'New partner lead: ' || COALESCE(NEW.organization, NEW.name),
    COALESCE(NEW.name, '') || ' — ' || COALESCE(NEW.email,'') || ' (' || COALESCE(NEW.source,'form') || ')',
    '/admin/leads', false);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_partner_leads_notify ON public.partner_leads;
CREATE TRIGGER trg_partner_leads_notify AFTER INSERT ON public.partner_leads
  FOR EACH ROW EXECUTE FUNCTION public.on_partner_lead_insert();

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id uuid NOT NULL REFERENCES public.consumers(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL, auth text NOT NULL, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consumers manage own push subs" ON public.push_subscriptions;
CREATE POLICY "consumers manage own push subs" ON public.push_subscriptions FOR ALL TO authenticated
  USING (consumer_id IN (SELECT id FROM public.consumers WHERE user_id = auth.uid()))
  WITH CHECK (consumer_id IN (SELECT id FROM public.consumers WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.organization_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL, organization_type text NOT NULL,
  address text, city text, state text,
  contact_name text NOT NULL, contact_email text NOT NULL, contact_phone text,
  ein text, irs_verification_status text, irs_verification_notes text,
  status text NOT NULL DEFAULT 'pending', rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz, reviewed_by uuid, created_organization_id uuid
);
GRANT SELECT, INSERT ON public.organization_submissions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.organization_submissions TO authenticated;
GRANT ALL ON public.organization_submissions TO service_role;
ALTER TABLE public.organization_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone submits an application" ON public.organization_submissions;
CREATE POLICY "anyone submits an application" ON public.organization_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin reads submissions" ON public.organization_submissions;
CREATE POLICY "admin reads submissions" ON public.organization_submissions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "admin updates submissions" ON public.organization_submissions;
CREATE POLICY "admin updates submissions" ON public.organization_submissions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.on_org_submission_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, description, link, is_read)
  VALUES ('new_submission',
    'New partner application: ' || NEW.organization_name,
    NEW.organization_type || ' — ' || COALESCE(NEW.city,'') || ', ' || COALESCE(NEW.state,''),
    '/admin/submissions', false);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_org_submission_notify ON public.organization_submissions;
CREATE TRIGGER trg_org_submission_notify AFTER INSERT ON public.organization_submissions
  FOR EACH ROW EXECUTE FUNCTION public.on_org_submission_insert();

DO $$
DECLARE j record;
BEGIN
  FOR j IN SELECT jobname FROM cron.job WHERE jobname IN
    ('grand-opening-agent-daily','enforce-receipt-deadline-hourly','release-flash-every-5min','refresh-impact-weekly')
  LOOP PERFORM cron.unschedule(j.jobname); END LOOP;
END $$;

SELECT cron.schedule('grand-opening-agent-daily','0 8 * * *', $$
  SELECT net.http_post(url:='https://yaicfjdquvfifwtfpmbm.supabase.co/functions/v1/grand-opening-agent',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhaWNmamRxdXZmaWZ3dGZwbWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDE0NjksImV4cCI6MjA4NzkxNzQ2OX0.UXqIl_oCqguuaEi-WEVkEJXJ1QDCDoEVQ5FmPqifhTw"}'::jsonb,
    body:='{"source":"cron"}'::jsonb);
$$);
SELECT cron.schedule('enforce-receipt-deadline-hourly','0 * * * *', $$
  SELECT net.http_post(url:='https://yaicfjdquvfifwtfpmbm.supabase.co/functions/v1/enforce-receipt-deadline',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhaWNmamRxdXZmaWZ3dGZwbWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDE0NjksImV4cCI6MjA4NzkxNzQ2OX0.UXqIl_oCqguuaEi-WEVkEJXJ1QDCDoEVQ5FmPqifhTw"}'::jsonb,
    body:='{"source":"cron"}'::jsonb);
$$);
SELECT cron.schedule('release-flash-every-5min','*/5 * * * *', $$
  SELECT net.http_post(url:='https://yaicfjdquvfifwtfpmbm.supabase.co/functions/v1/release-expired-flash-reservations',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhaWNmamRxdXZmaWZ3dGZwbWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDE0NjksImV4cCI6MjA4NzkxNzQ2OX0.UXqIl_oCqguuaEi-WEVkEJXJ1QDCDoEVQ5FmPqifhTw"}'::jsonb,
    body:='{"source":"cron"}'::jsonb);
$$);
SELECT cron.schedule('refresh-impact-weekly','0 0 * * 0', $$
  SELECT net.http_post(url:='https://yaicfjdquvfifwtfpmbm.supabase.co/functions/v1/refresh-impact-snapshot',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhaWNmamRxdXZmaWZ3dGZwbWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDE0NjksImV4cCI6MjA4NzkxNzQ2OX0.UXqIl_oCqguuaEi-WEVkEJXJ1QDCDoEVQ5FmPqifhTw"}'::jsonb,
    body:='{"source":"cron"}'::jsonb);
$$);

CREATE OR REPLACE FUNCTION public.city_referral_leaderboard(p_city text, p_limit int DEFAULT 20)
RETURNS TABLE(consumer_id uuid, first_name text, referral_count bigint, rank bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH counts AS (
    SELECT c.id, c.first_name, count(r.id) AS cnt FROM public.consumers c
    LEFT JOIN public.referrals r ON r.referrer_consumer_id = c.id
    WHERE (p_city IS NULL OR lower(c.city) = lower(p_city))
    GROUP BY c.id, c.first_name
  )
  SELECT id, first_name, cnt, RANK() OVER (ORDER BY cnt DESC, first_name ASC) AS rnk
  FROM counts WHERE cnt > 0 ORDER BY rnk LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.my_referral_rank(p_city text)
RETURNS TABLE(referral_count bigint, rank bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH counts AS (
    SELECT c.id, count(r.id) AS cnt FROM public.consumers c
    LEFT JOIN public.referrals r ON r.referrer_consumer_id = c.id
    WHERE (p_city IS NULL OR lower(c.city) = lower(p_city))
    GROUP BY c.id
  ),
  ranked AS (SELECT id, cnt, RANK() OVER (ORDER BY cnt DESC) AS rnk FROM counts)
  SELECT r.cnt, r.rnk FROM ranked r
  JOIN public.consumers c ON c.id = r.id WHERE c.user_id = auth.uid();
$$;
