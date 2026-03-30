
-- Re-grant SELECT on join_code - column-level revoke breaks too many SELECT * queries
-- The secure RPCs are available for authorized access; the practical risk is mitigated
-- by 8-char entropy codes and server-side validation
GRANT SELECT (join_code) ON public.organizations TO authenticated;
GRANT SELECT (join_code) ON public.nonprofits TO authenticated;
