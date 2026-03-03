
-- 1. Tighten storage upload policy to restrict to user's own folder
DROP POLICY IF EXISTS "Authenticated upload nonprofit docs" ON storage.objects;

CREATE POLICY "Authenticated upload own nonprofit docs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'nonprofit-documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'nonprofits'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- 2. Tighten nonprofit_locations insert policy
DROP POLICY IF EXISTS "Authenticated can insert nonprofit_locations" ON public.nonprofit_locations;

-- Allow nonprofit partners to insert locations for their own nonprofit
CREATE POLICY "Nonprofit partners insert own locations" ON public.nonprofit_locations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      -- During signup: user just created their nonprofit
      nonprofit_id IN (SELECT id FROM public.nonprofits WHERE user_id = auth.uid())
      -- Or admin
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- Allow join signup: user doesn't own the nonprofit yet but is authenticated
-- This is handled by the existing "Admins full access" and the above policy
-- For join flow, we need a signup-specific insert that checks auth only
CREATE POLICY "Signup insert nonprofit_locations" ON public.nonprofit_locations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role != 'nonprofit_partner'
    )
  );
