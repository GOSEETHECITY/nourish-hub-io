DROP POLICY IF EXISTS "signup_insert_user_roles" ON public.user_roles;

CREATE POLICY "signup_insert_user_roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role IN ('venue_partner', 'nonprofit_partner', 'government_partner')
  );