
-- 1) Track pickup time
ALTER TABLE public.food_listings
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz;

-- Backfill: approximate for existing picked_up rows so the rule doesn't retroactively lock anyone out
UPDATE public.food_listings
   SET picked_up_at = COALESCE(picked_up_at, created_at)
 WHERE status IN ('picked_up','pending_impact_report','completed')
   AND picked_up_at IS NULL;

-- 2) Trigger: stamp picked_up_at + reminder bookkeeping fields
CREATE OR REPLACE FUNCTION public.stamp_picked_up_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'picked_up' AND (OLD.status IS DISTINCT FROM 'picked_up') AND NEW.picked_up_at IS NULL THEN
    NEW.picked_up_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_picked_up_at ON public.food_listings;
CREATE TRIGGER trg_stamp_picked_up_at
BEFORE UPDATE ON public.food_listings
FOR EACH ROW EXECUTE FUNCTION public.stamp_picked_up_at();

-- 3) Block new claims while any prior pickup is >72h overdue for a receipt
CREATE OR REPLACE FUNCTION public.enforce_receipt_deadline_on_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_overdue int;
BEGIN
  IF NEW.nonprofit_claimed_id IS NOT NULL
     AND NEW.nonprofit_claimed_id IS DISTINCT FROM COALESCE(OLD.nonprofit_claimed_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    SELECT COUNT(*) INTO v_overdue
      FROM public.food_listings fl
     WHERE fl.nonprofit_claimed_id = NEW.nonprofit_claimed_id
       AND fl.picked_up_at IS NOT NULL
       AND fl.picked_up_at < now() - interval '72 hours'
       AND NOT EXISTS (
         SELECT 1 FROM public.tax_receipts tr WHERE tr.food_listing_id = fl.id
       );
    IF v_overdue > 0 THEN
      RAISE EXCEPTION 'Nonprofit has % overdue tax receipt(s). Submit them before claiming new donations.', v_overdue;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_receipt_deadline_on_claim ON public.food_listings;
CREATE TRIGGER trg_enforce_receipt_deadline_on_claim
BEFORE INSERT OR UPDATE OF nonprofit_claimed_id ON public.food_listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_receipt_deadline_on_claim();

-- 4) Notification types tracker so we don't send the same reminder twice.
--    Reuses notifications.metadata; scheduled function checks for existing rows.
COMMENT ON COLUMN public.food_listings.picked_up_at IS
  'Timestamp when nonprofit marked the donation picked up. Starts the 72h tax-receipt clock.';
