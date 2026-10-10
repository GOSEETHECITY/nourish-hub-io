ALTER FUNCTION public.gen_pickup_code() SET search_path = public;
ALTER FUNCTION public.gen_referral_code() SET search_path = public;

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT p.oid::regprocedure sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef AND p.prorettype='trigger'::regtype LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.award_badge(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.dispatch_push(text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.invoke_scheduled_function(text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_usage_event(text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_org_members(uuid,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_ein(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_badge(uuid,text,text,text,text), public.dispatch_push(text,jsonb), public.invoke_scheduled_function(text,jsonb), public.log_usage_event(text,jsonb), public.notify_org_members(uuid,text,text,text,text,jsonb), public.verify_ein(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.apply_referral(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.city_referral_leaderboard(text,integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_referral_rank(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_support_thread_viewed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral(text), public.city_referral_leaderboard(text,integer), public.my_referral_rank(text), public.mark_support_thread_viewed(uuid) TO authenticated;