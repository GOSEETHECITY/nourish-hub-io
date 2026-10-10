DROP POLICY IF EXISTS "Nonprofits can read available donations" ON public.food_listings;
CREATE POLICY "Nonprofits can read available donations" ON public.food_listings
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'nonprofit_partner'::app_role)
  AND listing_type = 'donation'::listing_type
  AND (
    (status = 'posted'::listing_status AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.nonprofit_id IS NOT NULL))
    OR nonprofit_claimed_id IN (SELECT p.nonprofit_id FROM public.profiles p WHERE p.id = auth.uid() AND p.nonprofit_id IS NOT NULL)
  )
);

-- push_subscriptions.endpoint already has a UNIQUE constraint; ensure upsert works.
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_uidx ON public.push_subscriptions (endpoint);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

-- Spam protection for public marketing forms, using the shared rate_limit_attempts table.
CREATE OR REPLACE FUNCTION public.rate_limit_public_form()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bucket text := 'form_' || TG_TABLE_NAME;
  v_email text;
  v_ip text;
  v_count int;
BEGIN
  IF auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;
  IF current_user = 'service_role' THEN RETURN NEW; END IF;

  v_email := lower(btrim(COALESCE(
    CASE WHEN TG_TABLE_NAME = 'partner_leads' THEN NEW.email ELSE NULL END,
    CASE WHEN TG_TABLE_NAME = 'onboarding_submissions' THEN NEW.contact_email ELSE NULL END, '')));
  BEGIN
    v_ip := split_part(COALESCE((current_setting('request.headers', true)::json ->> 'x-forwarded-for'), ''), ',', 1);
  EXCEPTION WHEN others THEN v_ip := '';
  END;

  IF v_email <> '' THEN
    SELECT count(*) INTO v_count FROM public.rate_limit_attempts
    WHERE bucket = v_bucket AND key = 'email:' || v_email AND created_at > now() - interval '1 hour';
    IF v_count >= 3 THEN RAISE EXCEPTION 'Too many submissions. Please try again later.'; END IF;
  END IF;
  IF btrim(v_ip) <> '' THEN
    SELECT count(*) INTO v_count FROM public.rate_limit_attempts
    WHERE bucket = v_bucket AND key = 'ip:' || btrim(v_ip) AND created_at > now() - interval '1 hour';
    IF v_count >= 10 THEN RAISE EXCEPTION 'Too many submissions. Please try again later.'; END IF;
    INSERT INTO public.rate_limit_attempts (bucket, key, success) VALUES (v_bucket, 'ip:' || btrim(v_ip), true);
  END IF;
  IF v_email <> '' THEN
    INSERT INTO public.rate_limit_attempts (bucket, key, success) VALUES (v_bucket, 'email:' || v_email, true);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.rate_limit_public_form() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS rate_limit_partner_leads ON public.partner_leads;
CREATE TRIGGER rate_limit_partner_leads BEFORE INSERT ON public.partner_leads
FOR EACH ROW EXECUTE FUNCTION public.rate_limit_public_form();
DROP TRIGGER IF EXISTS rate_limit_onboarding_submissions ON public.onboarding_submissions;
CREATE TRIGGER rate_limit_onboarding_submissions BEFORE INSERT ON public.onboarding_submissions
FOR EACH ROW EXECUTE FUNCTION public.rate_limit_public_form();