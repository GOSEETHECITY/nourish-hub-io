-- 1) Add 'mixed' to food_type enum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'food_type' AND e.enumlabel = 'mixed'
  ) THEN
    ALTER TYPE public.food_type ADD VALUE 'mixed';
  END IF;
END $$;

-- 2) Add per-item food_type and pounds to donation_line_items
ALTER TABLE public.donation_line_items
  ADD COLUMN IF NOT EXISTS food_type public.food_type,
  ADD COLUMN IF NOT EXISTS pounds numeric;

-- 3) Disable marketplace for non-consumer venue types
UPDATE public.organizations
   SET marketplace_enabled = false
 WHERE type IN ('arena','convention_center','resort','event','venue_events_group');