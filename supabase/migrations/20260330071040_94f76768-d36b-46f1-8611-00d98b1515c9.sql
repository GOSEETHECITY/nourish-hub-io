
-- Fix 1: Remove the overly broad storage INSERT policy for nonprofit-documents
DROP POLICY IF EXISTS "Authenticated users can upload nonprofit docs" ON storage.objects;

-- Fix 2: Revoke SELECT on join_code columns from authenticated/anon to prevent leakage
-- Join code validation is already handled via SECURITY DEFINER RPCs
REVOKE SELECT (join_code) ON public.organizations FROM authenticated, anon;
REVOKE SELECT (join_code) ON public.nonprofits FROM authenticated, anon;
