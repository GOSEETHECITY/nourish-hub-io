
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  events_found int NOT NULL DEFAULT 0,
  events_inserted int NOT NULL DEFAULT 0,
  duplicates_skipped int NOT NULL DEFAULT 0,
  errors int NOT NULL DEFAULT 0,
  breakdown jsonb,
  error_log text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_runs TO authenticated;
GRANT ALL ON public.agent_runs TO service_role;

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view agent runs"
  ON public.agent_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS agent_runs_started_at_idx ON public.agent_runs (started_at DESC);
