-- 4. Stop persisting partner temp passwords; force password change on first sign-in
ALTER TABLE public.partner_credentials DROP COLUMN IF EXISTS temp_password;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.profiles_protect_must_change_password()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.must_change_password IS DISTINCT FROM OLD.must_change_password
     AND auth.uid() IS NOT NULL
     AND coalesce(current_setting('app.clearing_password_flag', true), '') <> 'on' THEN
    NEW.must_change_password := OLD.must_change_password;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_protect_must_change_password ON public.profiles;
CREATE TRIGGER profiles_protect_must_change_password
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_protect_must_change_password();

CREATE OR REPLACE FUNCTION public.clear_own_must_change_password()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM set_config('app.clearing_password_flag', 'on', true);
  UPDATE public.profiles SET must_change_password = false WHERE id = auth.uid();
END $$;
REVOKE EXECUTE ON FUNCTION public.clear_own_must_change_password() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_own_must_change_password() TO authenticated;

-- 2. Grand opening agent: scheduled run now authenticates with the cron secret
DO $$ BEGIN PERFORM cron.unschedule('grand-opening-agent-daily'); EXCEPTION WHEN others THEN NULL; END $$;
SELECT cron.schedule('grand-opening-agent-daily', '0 8 * * *',
  $$ SELECT public.invoke_scheduled_function('grand-opening-agent', '{"source":"cron"}'::jsonb); $$);