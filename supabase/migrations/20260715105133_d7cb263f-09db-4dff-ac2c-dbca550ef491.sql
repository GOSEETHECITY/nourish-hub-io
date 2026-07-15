
CREATE POLICY "Nonprofit members read their logo"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND (NULLIF(split_part(name,'/',1),''))::uuid IN (
    SELECT nonprofit_id FROM public.profiles
    WHERE id = auth.uid() AND nonprofit_id IS NOT NULL
  )
);
CREATE POLICY "Nonprofit members upload their logo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos'
  AND (NULLIF(split_part(name,'/',1),''))::uuid IN (
    SELECT nonprofit_id FROM public.profiles
    WHERE id = auth.uid() AND nonprofit_id IS NOT NULL
  )
);
CREATE POLICY "Nonprofit members update their logo"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND (NULLIF(split_part(name,'/',1),''))::uuid IN (
    SELECT nonprofit_id FROM public.profiles
    WHERE id = auth.uid() AND nonprofit_id IS NOT NULL
  )
);
CREATE POLICY "Nonprofit members delete their logo"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND (NULLIF(split_part(name,'/',1),''))::uuid IN (
    SELECT nonprofit_id FROM public.profiles
    WHERE id = auth.uid() AND nonprofit_id IS NOT NULL
  )
);

CREATE POLICY "Users read own avatar"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'user-avatars' AND (NULLIF(split_part(name,'/',1),''))::uuid = auth.uid());
CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'user-avatars' AND (NULLIF(split_part(name,'/',1),''))::uuid = auth.uid());
CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'user-avatars' AND (NULLIF(split_part(name,'/',1),''))::uuid = auth.uid());
CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'user-avatars' AND (NULLIF(split_part(name,'/',1),''))::uuid = auth.uid());

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
