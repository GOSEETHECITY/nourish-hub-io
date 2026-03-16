-- 1. Restrict invite_codes read to admins only
DROP POLICY IF EXISTS "invite_codes_authenticated_read" ON public.invite_codes;

CREATE POLICY "invite_codes_admin_read"
ON public.invite_codes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Prevent consumers from self-assigning partner roles
-- Add check: user must NOT have a consumer profile
DROP POLICY IF EXISTS "signup_insert_user_roles" ON public.user_roles;

CREATE POLICY "signup_insert_user_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id)
  AND (role = ANY (ARRAY['venue_partner'::app_role, 'nonprofit_partner'::app_role]))
  AND (NOT user_has_any_role(auth.uid()))
  AND (NOT EXISTS (SELECT 1 FROM public.consumers c WHERE c.user_id = auth.uid()))
);

-- Also restrict org/location/nonprofit signup inserts from consumers
DROP POLICY IF EXISTS "signup_insert_organizations" ON public.organizations;
CREATE POLICY "signup_insert_organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (
  (NOT user_has_any_role(auth.uid()))
  AND (NOT EXISTS (SELECT 1 FROM public.consumers c WHERE c.user_id = auth.uid()))
);

DROP POLICY IF EXISTS "signup_insert_locations" ON public.locations;
CREATE POLICY "signup_insert_locations"
ON public.locations
FOR INSERT
TO authenticated
WITH CHECK (
  (NOT user_has_any_role(auth.uid()))
  AND (NOT EXISTS (SELECT 1 FROM public.consumers c WHERE c.user_id = auth.uid()))
);

DROP POLICY IF EXISTS "signup_insert_nonprofits" ON public.nonprofits;
CREATE POLICY "signup_insert_nonprofits"
ON public.nonprofits
FOR INSERT
TO authenticated
WITH CHECK (
  (NOT user_has_any_role(auth.uid()))
  AND (NOT EXISTS (SELECT 1 FROM public.consumers c WHERE c.user_id = auth.uid()))
);