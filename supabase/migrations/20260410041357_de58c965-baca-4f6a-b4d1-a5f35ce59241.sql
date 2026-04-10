
-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Daily import at 5:00 AM EST = 10:00 UTC
SELECT cron.schedule(
  'daily-grand-opening-import',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://yaicfjdquvfifwtfpmbm.supabase.co/functions/v1/process-grand-openings',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhaWNmamRxdXZmaWZ3dGZwbWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDE0NjksImV4cCI6MjA4NzkxNzQ2OX0.UXqIl_oCqguuaEi-WEVkEJXJ1QDCDoEVQ5FmPqifhTw"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Retry pending images at 6:00 AM EST = 11:00 UTC
SELECT cron.schedule(
  'daily-grand-opening-retry',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://yaicfjdquvfifwtfpmbm.supabase.co/functions/v1/process-grand-openings?retry_pending=true',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhaWNmamRxdXZmaWZ3dGZwbWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDE0NjksImV4cCI6MjA4NzkxNzQ2OX0.UXqIl_oCqguuaEi-WEVkEJXJ1QDCDoEVQ5FmPqifhTw"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
