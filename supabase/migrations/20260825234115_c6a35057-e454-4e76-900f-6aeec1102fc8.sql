CREATE OR REPLACE FUNCTION public.set_own_location(p_location_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.locations l
    JOIN public.profiles p ON p.organization_id = l.organization_id
    WHERE l.id = p_location_id AND p.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Location does not belong to your organization';
  END IF;

  UPDATE public.profiles SET location_id = p_location_id WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.set_own_nonprofit_location(p_location_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.nonprofit_locations nl
    JOIN public.profiles p ON p.nonprofit_id = nl.nonprofit_id
    WHERE nl.id = p_location_id AND p.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Location does not belong to your nonprofit';
  END IF;

  UPDATE public.profiles SET nonprofit_location_id = p_location_id WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.set_own_location(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.set_own_nonprofit_location(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_own_location(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_own_nonprofit_location(uuid) TO authenticated;