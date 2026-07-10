
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link_path text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins read all notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Helper: fan out a notification to all members of an organization
CREATE OR REPLACE FUNCTION public.notify_org_members(
  p_org_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, organization_id, type, title, body, link_path, metadata)
  SELECT p.id, p_org_id, p_type, p_title, p_body, p_link, p_metadata
  FROM public.profiles p
  WHERE p.organization_id = p_org_id;
END;
$$;

-- Trigger: notify when a nonprofit claims a food listing
CREATE OR REPLACE FUNCTION public.notify_on_listing_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_np_name text;
BEGIN
  IF NEW.claimed_by_nonprofit_id IS DISTINCT FROM OLD.claimed_by_nonprofit_id
     AND NEW.claimed_by_nonprofit_id IS NOT NULL THEN
    SELECT organization_name INTO v_np_name
      FROM public.nonprofits WHERE id = NEW.claimed_by_nonprofit_id;
    PERFORM public.notify_org_members(
      NEW.organization_id,
      'listing_claimed',
      'Donation claimed',
      COALESCE(v_np_name, 'A nonprofit') || ' claimed your donation.',
      '/venue/donations',
      jsonb_build_object('listing_id', NEW.id, 'nonprofit_id', NEW.claimed_by_nonprofit_id)
    );
  END IF;

  IF NEW.status = 'picked_up' AND OLD.status IS DISTINCT FROM 'picked_up' THEN
    PERFORM public.notify_org_members(
      NEW.organization_id,
      'listing_picked_up',
      'Pickup confirmed',
      'Your donation was picked up.',
      '/venue/donations',
      jsonb_build_object('listing_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_listing_claim ON public.food_listings;
CREATE TRIGGER trg_notify_on_listing_claim
AFTER UPDATE ON public.food_listings
FOR EACH ROW EXECUTE FUNCTION public.notify_on_listing_claim();
