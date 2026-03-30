-- Part 1: Add new fields to events table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS offer_badge text,
  ADD COLUMN IF NOT EXISTS share_url text,
  ADD COLUMN IF NOT EXISTS share_count integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS flyer_url text;

-- Part 1: Create city_thresholds table
CREATE TABLE IF NOT EXISTS public.city_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  state text,
  threshold integer DEFAULT 500 NOT NULL,
  current_consumer_count integer DEFAULT 0 NOT NULL,
  marketplace_unlocked boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.city_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access city_thresholds" ON public.city_thresholds
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read city_thresholds" ON public.city_thresholds
  FOR SELECT TO authenticated USING (true);

-- Part 1: Create venue_waitlist table
CREATE TABLE IF NOT EXISTS public.venue_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  city text,
  state text,
  date_added timestamptz DEFAULT now() NOT NULL,
  notified boolean DEFAULT false NOT NULL,
  marketplace_unlocked boolean DEFAULT false NOT NULL
);

ALTER TABLE public.venue_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access venue_waitlist" ON public.venue_waitlist
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue partners read own waitlist" ON public.venue_waitlist
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Add city column to consumers table
ALTER TABLE public.consumers ADD COLUMN IF NOT EXISTS city text;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.city_thresholds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_waitlist TO authenticated;

-- Allow anon to read published events (for gated preview page)
CREATE POLICY "Anon can read published events" ON public.events
  FOR SELECT TO anon USING (status = 'published'::event_status);

-- Allow anon to increment share_count
CREATE POLICY "Anon can update share_count" ON public.events
  FOR UPDATE TO anon USING (status = 'published'::event_status)
  WITH CHECK (status = 'published'::event_status);