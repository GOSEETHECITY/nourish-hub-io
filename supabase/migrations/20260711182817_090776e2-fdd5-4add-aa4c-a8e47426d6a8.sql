
-- Push subscriptions (Web Push)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id uuid NOT NULL REFERENCES public.consumers(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  city text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='push_subscriptions' AND policyname='own_push_subs') THEN
    CREATE POLICY own_push_subs ON public.push_subscriptions
      FOR ALL TO authenticated
      USING (consumer_id IN (SELECT id FROM public.consumers WHERE user_id = auth.uid()))
      WITH CHECK (consumer_id IN (SELECT id FROM public.consumers WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Referrals table (idempotent — only create if missing)
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_consumer_id uuid NOT NULL REFERENCES public.consumers(id) ON DELETE CASCADE,
  referee_consumer_id uuid NOT NULL REFERENCES public.consumers(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referee_consumer_id)
);
GRANT SELECT, INSERT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='referrals' AND policyname='own_referrals_read') THEN
    CREATE POLICY own_referrals_read ON public.referrals FOR SELECT TO authenticated
      USING (referrer_consumer_id IN (SELECT id FROM public.consumers WHERE user_id = auth.uid())
          OR referee_consumer_id IN (SELECT id FROM public.consumers WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Apply-referral RPC: called by consumer after signup with the code they used.
CREATE OR REPLACE FUNCTION public.apply_referral(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid;
  v_ref uuid;
  v_row uuid;
BEGIN
  IF auth.uid() IS NULL OR p_code IS NULL OR length(p_code) < 4 THEN RETURN NULL; END IF;
  SELECT id INTO v_me FROM public.consumers WHERE user_id = auth.uid();
  IF v_me IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO v_ref FROM public.consumers WHERE upper(referral_code) = upper(p_code);
  IF v_ref IS NULL OR v_ref = v_me THEN RETURN NULL; END IF;
  INSERT INTO public.referrals (referrer_consumer_id, referee_consumer_id, referral_code)
  VALUES (v_ref, v_me, upper(p_code))
  ON CONFLICT (referee_consumer_id) DO NOTHING
  RETURNING id INTO v_row;
  -- award first-referral badge to referrer (idempotent — table has unique(consumer_id,badge_key))
  BEGIN
    INSERT INTO public.consumer_badges (consumer_id, badge_key, badge_name, badge_icon)
    VALUES (v_ref, 'first_referral', 'First friend referred', '🎁');
    INSERT INTO public.notifications (user_id, type, title, body, link_path)
    SELECT c.user_id, 'badge_awarded', 'Badge unlocked!', 'You earned "First friend referred" 🎁', '/app/profile'
    FROM public.consumers c WHERE c.id = v_ref;
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.apply_referral(text) TO authenticated;
