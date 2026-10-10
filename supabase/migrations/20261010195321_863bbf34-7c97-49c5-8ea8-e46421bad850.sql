-- Welcome badge on signup (existing trigger)
CREATE OR REPLACE FUNCTION public.on_consumer_after_insert()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NOT NULL AND NOT public.user_has_any_role(NEW.user_id) THEN
    INSERT INTO public.notifications (user_id, type, title, body, link_path, metadata)
    VALUES (NEW.user_id, 'account_created', 'Your account is set up',
            'Your GO See The City account is live.', '/app/home', '{}'::jsonb);
    PERFORM public.award_badge(NEW.id, 'account_created', 'Welcome aboard',
      'You joined GO See The City.', '👋');
  END IF;
  RETURN NEW;
END $function$;

-- Referral codes: never null or blank
CREATE OR REPLACE FUNCTION public.on_consumer_insert()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(btrim(NEW.referral_code), '') = '' THEN
    IF TG_OP = 'UPDATE' AND coalesce(btrim(OLD.referral_code), '') <> '' THEN
      NEW.referral_code := OLD.referral_code;
    ELSE
      NEW.referral_code := public.gen_referral_code();
    END IF;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_consumers_before_update_refcode ON public.consumers;
CREATE TRIGGER trg_consumers_before_update_refcode BEFORE UPDATE OF referral_code ON public.consumers
  FOR EACH ROW EXECUTE FUNCTION public.on_consumer_insert();

UPDATE public.consumers SET referral_code = public.gen_referral_code()
 WHERE coalesce(btrim(referral_code), '') = '';

CREATE OR REPLACE FUNCTION public.ensure_own_referral_code()
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_code text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT referral_code INTO v_code FROM public.consumers WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'No consumer account'; END IF;
  IF coalesce(btrim(v_code), '') = '' THEN
    v_code := public.gen_referral_code();
    UPDATE public.consumers SET referral_code = v_code WHERE user_id = auth.uid();
  END IF;
  RETURN v_code;
END $function$;
REVOKE ALL ON FUNCTION public.ensure_own_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_own_referral_code() TO authenticated;

-- Check-in badges
CREATE OR REPLACE FUNCTION public.on_event_checkin_insert()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_consumer_id uuid; v_total int; v_ev record; v_tz text; v_start timestamptz; v_biz int;
BEGIN
  SELECT id INTO v_consumer_id FROM public.consumers WHERE user_id = NEW.user_id;
  IF v_consumer_id IS NULL THEN RETURN NEW; END IF;
  SELECT category, freebee_eligible, event_date, start_time, state INTO v_ev FROM public.events WHERE id = NEW.event_id;
  IF v_ev.category = 'grand_opening' THEN
    PERFORM public.award_badge(v_consumer_id, 'first_grand_opening', 'First grand opening',
      'You checked in at your first grand opening event.', '🎉');
  END IF;
  IF coalesce(v_ev.freebee_eligible, false) THEN
    PERFORM public.award_badge(v_consumer_id, 'freebee_rider', 'Freebee Rider',
      'You checked in at an event with a free Freebee ride.', '🛺');
  END IF;
  IF v_ev.event_date IS NOT NULL AND v_ev.start_time IS NOT NULL THEN
    v_tz := CASE
      WHEN upper(coalesce(v_ev.state,'')) IN ('AL','AR','IL','IA','KS','LA','MN','MS','MO','NE','ND','OK','SD','TX','WI') THEN 'America/Chicago'
      WHEN upper(coalesce(v_ev.state,'')) IN ('CO','MT','NM','UT','WY','ID') THEN 'America/Denver'
      WHEN upper(coalesce(v_ev.state,'')) = 'AZ' THEN 'America/Phoenix'
      WHEN upper(coalesce(v_ev.state,'')) IN ('CA','NV','OR','WA') THEN 'America/Los_Angeles'
      WHEN upper(coalesce(v_ev.state,'')) = 'AK' THEN 'America/Anchorage'
      WHEN upper(coalesce(v_ev.state,'')) = 'HI' THEN 'Pacific/Honolulu'
      ELSE 'America/New_York' END;
    v_start := (v_ev.event_date + v_ev.start_time) AT TIME ZONE v_tz;
    IF coalesce(NEW.checked_in_at, now()) >= v_start AND coalesce(NEW.checked_in_at, now()) < v_start + interval '1 hour' THEN
      PERFORM public.award_badge(v_consumer_id, 'early_bird', 'Early Bird',
        'You checked in within the first hour of an event.', '🐦');
    END IF;
  END IF;
  SELECT count(DISTINCT lower(btrim(e.business_name))) INTO v_biz
    FROM public.event_checkins c JOIN public.events e ON e.id = c.event_id
   WHERE c.user_id = NEW.user_id AND coalesce(btrim(e.business_name), '') <> '';
  IF v_biz >= 3 THEN
    PERFORM public.award_badge(v_consumer_id, 'three_new_favorites', 'Three New Favorites',
      'You checked in at events from three different businesses.', '⭐');
  END IF;
  SELECT count(*) INTO v_total FROM public.event_checkins WHERE user_id = NEW.user_id;
  IF v_total >= 5 THEN
    PERFORM public.award_badge(v_consumer_id, 'checkins_5', 'Explorer', 'You checked in at 5 events.', '🗺️');
  END IF;
  IF v_total >= 10 THEN
    PERFORM public.award_badge(v_consumer_id, 'checkins_10', 'City Regular', 'You checked in at 10 events.', '🏆');
  END IF;
  RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION public.on_event_checkin_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_consumer_after_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_consumer_insert() FROM PUBLIC, anon, authenticated;

-- Restore Welcome aboard to existing consumers quietly (no push burst for a restored badge)
ALTER TABLE public.consumer_badges DISABLE TRIGGER trg_push_badge_awarded;
INSERT INTO public.consumer_badges (consumer_id, badge_key, badge_name, badge_description, badge_icon, earned_at)
SELECT c.id, 'account_created', 'Welcome aboard', 'You joined GO See The City.', '👋', coalesce(c.created_at, now())
  FROM public.consumers c
 WHERE NOT EXISTS (SELECT 1 FROM public.consumer_badges b WHERE b.consumer_id = c.id AND b.badge_key = 'account_created');
ALTER TABLE public.consumer_badges ENABLE TRIGGER trg_push_badge_awarded;