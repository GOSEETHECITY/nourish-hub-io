
-- 1. Make nonprofit-documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'nonprofit-documents';

-- 2. Add storage RLS policies for nonprofit documents
-- Drop any existing policies first
DROP POLICY IF EXISTS "Nonprofit document access" ON storage.objects;
DROP POLICY IF EXISTS "Nonprofit document upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin view nonprofit docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload nonprofit docs" ON storage.objects;

-- Only admins can view nonprofit documents
CREATE POLICY "Admin view nonprofit docs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'nonprofit-documents'
    AND public.has_role(auth.uid(), 'admin')
  );

-- Authenticated users can upload to their own folder during signup
CREATE POLICY "Authenticated upload nonprofit docs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'nonprofit-documents'
    AND auth.uid() IS NOT NULL
  );

-- 3. Create validate_join_code function (if not exists, replace)
CREATE OR REPLACE FUNCTION public.validate_join_code(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSON;
BEGIN
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

-- 4. Add proper RLS policies for nonprofit_locations (read access for nonprofit partners)
DROP POLICY IF EXISTS "Nonprofit partners manage own locations" ON public.nonprofit_locations;
DROP POLICY IF EXISTS "Nonprofit users read assigned locations" ON public.nonprofit_locations;
DROP POLICY IF EXISTS "Government can read nonprofit_locations" ON public.nonprofit_locations;

CREATE POLICY "Nonprofit partners manage own locations" ON public.nonprofit_locations
  FOR ALL USING (
    public.has_role(auth.uid(), 'nonprofit_partner')
    AND nonprofit_id IN (SELECT id FROM public.nonprofits WHERE user_id = auth.uid())
  );

CREATE POLICY "Nonprofit users read assigned locations" ON public.nonprofit_locations
  FOR SELECT USING (
    id IN (SELECT nonprofit_location_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Government can read nonprofit_locations" ON public.nonprofit_locations
  FOR SELECT USING (public.has_role(auth.uid(), 'government_partner'));
