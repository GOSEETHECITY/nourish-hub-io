DROP POLICY IF EXISTS "Nonprofit users update own" ON public.nonprofits;
CREATE POLICY "Nonprofit users update own"
  ON public.nonprofits FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND approval_status IS NOT DISTINCT FROM (
      SELECT n.approval_status FROM public.nonprofits n WHERE n.id = nonprofits.id
    )
  );