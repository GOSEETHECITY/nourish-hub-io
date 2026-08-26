ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gstc_welcome_seen boolean NOT NULL DEFAULT false;

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
  -- Partner accounts (venue / nonprofit / government / admin) should not receive
  -- consumer badge alerts in their partner notification bell.
  IF v_user IS NOT NULL AND NOT public.user_has_any_role(v_user) THEN
    INSERT INTO public.notifications (user_id, type, title, body, link_path, metadata)
    VALUES (v_user, 'badge_awarded', 'Badge unlocked: ' || p_name, p_description, '/app/profile',
            jsonb_build_object('badge_key', p_key, 'badge_icon', p_icon));
  END IF;
END $$;

DELETE FROM public.notifications n
WHERE n.type = 'badge_awarded'
  AND public.user_has_any_role(n.user_id);