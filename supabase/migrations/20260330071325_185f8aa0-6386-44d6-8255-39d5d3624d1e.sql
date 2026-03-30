
-- Revoke direct SELECT on join_code columns - access now only via SECURITY DEFINER RPCs
REVOKE SELECT (join_code) ON public.organizations FROM authenticated, anon;
REVOKE SELECT (join_code) ON public.nonprofits FROM authenticated, anon;
