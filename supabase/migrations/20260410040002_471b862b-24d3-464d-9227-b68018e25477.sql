
-- Create enum for import log status
CREATE TYPE public.import_log_status AS ENUM ('success', 'skipped', 'pending_image_retry', 'error');

-- Create import_logs table
CREATE TABLE public.import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id text NOT NULL,
  event_name text NOT NULL,
  status public.import_log_status NOT NULL DEFAULT 'success',
  error_message text,
  csv_filename text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL
);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access import_logs"
  ON public.import_logs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add import tracking columns to events table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS created_from_import boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS import_batch_id text;

-- Create grand-openings storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('grand-openings', 'grand-openings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for grand-openings bucket
CREATE POLICY "Admins can read grand-openings"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'grand-openings' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can upload grand-openings"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'grand-openings' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update grand-openings"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'grand-openings' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete grand-openings"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'grand-openings' AND has_role(auth.uid(), 'admin'::app_role));
