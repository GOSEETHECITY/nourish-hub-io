
-- Create events storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('events', 'events', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view event images
CREATE POLICY "Event images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'events');

-- Allow admins to upload event images
CREATE POLICY "Admins can upload event images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'events' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update event images
CREATE POLICY "Admins can update event images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'events' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete event images
CREATE POLICY "Admins can delete event images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'events' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Update validate_join_code to work for anonymous users
CREATE OR REPLACE FUNCTION public.validate_join_code(p_code text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Grant execute to anon role so unauthenticated users can validate join codes during signup
GRANT EXECUTE ON FUNCTION public.validate_join_code(text) TO anon;
