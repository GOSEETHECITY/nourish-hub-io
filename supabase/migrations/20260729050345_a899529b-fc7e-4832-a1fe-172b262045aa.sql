CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  support_request_id uuid NOT NULL REFERENCES public.support_requests(id) ON DELETE CASCADE,
  sender_user_id uuid,
  sender_name text,
  sender_role text NOT NULL DEFAULT 'partner',
  body text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_messages_request ON public.support_messages(support_request_id, created_at);

GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all support messages"
  ON public.support_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Requesters read their own thread"
  ON public.support_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_requests r WHERE r.id = support_request_id AND r.user_id = auth.uid()));

CREATE POLICY "Requesters write to their own thread"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND is_system = false
    AND EXISTS (SELECT 1 FROM public.support_requests r WHERE r.id = support_request_id AND r.user_id = auth.uid())
  );

ALTER TABLE public.support_requests
  ADD COLUMN IF NOT EXISTS admin_last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS user_last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_message_role text;

CREATE OR REPLACE FUNCTION public.support_messages_touch_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.support_requests
     SET last_message_at = NEW.created_at,
         last_message_role = NEW.sender_role
   WHERE id = NEW.support_request_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_support_messages_touch
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.support_messages_touch_request();

CREATE OR REPLACE FUNCTION public.mark_support_thread_viewed(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    UPDATE public.support_requests SET admin_last_viewed_at = now() WHERE id = p_request_id;
  ELSE
    UPDATE public.support_requests SET user_last_viewed_at = now()
     WHERE id = p_request_id AND user_id = auth.uid();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_support_thread_viewed(uuid) TO authenticated;