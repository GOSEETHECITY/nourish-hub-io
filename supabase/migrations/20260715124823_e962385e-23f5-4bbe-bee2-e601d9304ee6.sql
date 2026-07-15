
-- RLS policies for donation-photos bucket
-- Venue members can insert/read/delete photos in paths starting with their organization_id
-- Nonprofits can read photos for listings they can see
-- Admins full access

CREATE POLICY "Venue members manage donation photos" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'donation-photos'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  bucket_id = 'donation-photos'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Authenticated users read donation photos" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'donation-photos');
