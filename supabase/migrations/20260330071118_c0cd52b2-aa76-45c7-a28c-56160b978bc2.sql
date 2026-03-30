
-- Undo the column-level REVOKE since it blocks admins too
GRANT SELECT (join_code) ON public.organizations TO authenticated;
GRANT SELECT (join_code) ON public.nonprofits TO authenticated;

-- Instead, create a SECURITY DEFINER function to safely read join_code for authorized users only
CREATE OR REPLACE FUNCTION public.get_org_join_code(_org_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT join_code FROM organizations
  WHERE id = _org_id
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.get_nonprofit_join_code(_nonprofit_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT join_code FROM nonprofits
  WHERE id = _nonprofit_id
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR user_id = auth.uid()
    OR id IN (SELECT nonprofit_id FROM profiles WHERE id = auth.uid())
  )
$$;
