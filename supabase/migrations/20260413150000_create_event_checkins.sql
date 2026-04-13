-- Create event_checkins table for geofenced check-ins
CREATE TABLE IF NOT EXISTS public.event_checkins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude double precision,
  longitude double precision,
  checked_in_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id, (checked_in_at::date))
);

-- Enable RLS
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;

-- Users can insert their own check-ins
CREATE POLICY "Users can insert own checkins"
  ON public.event_checkins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own check-ins
CREATE POLICY "Users can read own checkins"
  ON public.event_checkins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to increment attendee count
CREATE OR REPLACE FUNCTION public.increment_attendee_count(eid uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.events
  SET attendee_count = COALESCE(attendee_count, 0) + 1
  WHERE id = eid;
$$;
