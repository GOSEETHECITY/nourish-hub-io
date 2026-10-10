ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS approval_status public.approval_status DEFAULT 'approved'::public.approval_status;
UPDATE public.locations SET approval_status = 'approved' WHERE approval_status IS NULL;

-- Non-admin users may only create an 'approved' location when an admin has
-- already approved their organization; otherwise it starts as 'pending'.
CREATE OR REPLACE FUNCTION public.locations_enforce_insert_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.approval_status IS DISTINCT FROM 'pending'::approval_status THEN
    IF NEW.approval_status = 'approved'::approval_status AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = NEW.organization_id AND o.approval_status = 'approved'::approval_status
    ) THEN
      RETURN NEW;
    END IF;
    NEW.approval_status := 'pending'::approval_status;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS locations_enforce_insert_approval ON public.locations;
CREATE TRIGGER locations_enforce_insert_approval BEFORE INSERT ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.locations_enforce_insert_approval();

DROP TRIGGER IF EXISTS prevent_location_self_approval ON public.locations;
CREATE TRIGGER prevent_location_self_approval BEFORE UPDATE ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.prevent_location_self_approval();