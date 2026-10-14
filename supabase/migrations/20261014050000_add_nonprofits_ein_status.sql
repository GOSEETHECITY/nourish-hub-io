-- Adds ein_status to nonprofits so the online signup flow can persist the
-- EIN verification result (verified / needs_help) alongside the EIN itself.
-- The signup edge function complete-partner-signup writes this column.
ALTER TABLE public.nonprofits
  ADD COLUMN IF NOT EXISTS ein_status text NOT NULL DEFAULT 'unverified'
  CHECK (ein_status IN ('unverified', 'pending', 'verified', 'needs_help'));
