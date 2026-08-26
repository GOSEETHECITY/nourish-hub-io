CREATE OR REPLACE FUNCTION public.on_consumer_after_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NOT public.user_has_any_role(NEW.user_id) THEN
    INSERT INTO public.notifications (user_id, type, title, body, link_path, metadata)
    VALUES (NEW.user_id, 'account_created', 'Your account is set up',
            'Your GO See The City account is live.', '/app/home', '{}'::jsonb);
  END IF;
  RETURN NEW;
END $$;

DELETE FROM public.consumer_badges WHERE badge_key = 'account_created';

DELETE FROM public.notifications
WHERE type = 'badge_awarded'
  AND (title = 'Badge unlocked: Welcome aboard' OR metadata->>'badge_key' = 'account_created');