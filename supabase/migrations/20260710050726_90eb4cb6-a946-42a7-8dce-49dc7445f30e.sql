
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS business_bio text,
  ADD COLUMN IF NOT EXISTS hours_of_operation jsonb;

DROP POLICY IF EXISTS "Org members can update their own organization profile" ON public.organizations;
CREATE POLICY "Org members can update their own organization profile"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND organization_id IS NOT NULL)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND organization_id IS NOT NULL)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Storage policies for the private organization-logos bucket.
-- Path convention enforced by policies: <organization_id>/<filename>.
DROP POLICY IF EXISTS "Org members read their logo" ON storage.objects;
CREATE POLICY "Org members read their logo"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'organization-logos'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR (NULLIF(split_part(name, '/', 1), ''))::uuid IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND organization_id IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "Org members upload their logo" ON storage.objects;
CREATE POLICY "Org members upload their logo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'organization-logos'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR (NULLIF(split_part(name, '/', 1), ''))::uuid IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND organization_id IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "Org members update their logo" ON storage.objects;
CREATE POLICY "Org members update their logo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'organization-logos'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR (NULLIF(split_part(name, '/', 1), ''))::uuid IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND organization_id IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "Org members delete their logo" ON storage.objects;
CREATE POLICY "Org members delete their logo"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'organization-logos'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR (NULLIF(split_part(name, '/', 1), ''))::uuid IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND organization_id IS NOT NULL
      )
    )
  );
