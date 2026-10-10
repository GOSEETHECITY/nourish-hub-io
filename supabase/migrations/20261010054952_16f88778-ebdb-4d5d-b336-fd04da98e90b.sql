CREATE OR REPLACE FUNCTION public.rate_limit_public_form()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bucket text := 'form_' || TG_TABLE_NAME;
  v_row jsonb := to_jsonb(NEW);
  v_email text;
  v_ip text;
  v_count int;
BEGIN
  IF auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;
  IF current_user = 'service_role' THEN RETURN NEW; END IF;

  v_email := lower(btrim(COALESCE(v_row->>'email', v_row->>'contact_email', '')));
  BEGIN
    v_ip := btrim(split_part(COALESCE((current_setting('request.headers', true)::json ->> 'x-forwarded-for'), ''), ',', 1));
  EXCEPTION WHEN others THEN v_ip := '';
  END;

  IF v_email <> '' THEN
    SELECT count(*) INTO v_count FROM public.rate_limit_attempts
    WHERE bucket = v_bucket AND key = 'email:' || v_email AND created_at > now() - interval '1 hour';
    IF v_count >= 3 THEN RAISE EXCEPTION 'Too many submissions. Please try again later.'; END IF;
  END IF;
  IF v_ip <> '' THEN
    SELECT count(*) INTO v_count FROM public.rate_limit_attempts
    WHERE bucket = v_bucket AND key = 'ip:' || v_ip AND created_at > now() - interval '1 hour';
    IF v_count >= 10 THEN RAISE EXCEPTION 'Too many submissions. Please try again later.'; END IF;
    INSERT INTO public.rate_limit_attempts (bucket, key, success) VALUES (v_bucket, 'ip:' || v_ip, true);
  END IF;
  IF v_email <> '' THEN
    INSERT INTO public.rate_limit_attempts (bucket, key, success) VALUES (v_bucket, 'email:' || v_email, true);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.rate_limit_public_form() FROM PUBLIC, anon, authenticated;