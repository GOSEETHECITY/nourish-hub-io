
CREATE OR REPLACE FUNCTION public.validate_join_code(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSON;
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check organizations first
  SELECT json_build_object('id', id, 'name', name, 'type', 'venue')
  INTO result
  FROM public.organizations
  WHERE join_code = p_code AND approval_status = 'approved'
  LIMIT 1;

  IF result IS NOT NULL THEN
    RETURN result;
  END IF;

  -- Check nonprofits
  SELECT json_build_object('id', id, 'name', organization_name, 'type', 'nonprofit')
  INTO result
  FROM public.nonprofits
  WHERE join_code = p_code AND approval_status = 'approved'
  LIMIT 1;

  RETURN result;
END;
$$;
