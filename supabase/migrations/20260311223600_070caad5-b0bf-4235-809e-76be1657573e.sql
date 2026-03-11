-- Revoke anon access to validate_join_code, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.validate_join_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.validate_join_code(text) TO authenticated;