-- Allow nonprofit partners to read organization names (needed for donation org display)
CREATE POLICY "Nonprofit partners can read organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'nonprofit_partner'::app_role)
  );