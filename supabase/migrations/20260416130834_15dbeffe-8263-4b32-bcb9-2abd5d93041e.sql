-- Drop the insecure anon update policy
DROP POLICY IF EXISTS "Anon can update share_count" ON public.events;

-- Create a security definer function that only increments share_count
CREATE OR REPLACE FUNCTION public.increment_share_count(event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE events
  SET share_count = COALESCE(share_count, 0) + 1
  WHERE id = event_id AND status = 'published';
END;
$$;