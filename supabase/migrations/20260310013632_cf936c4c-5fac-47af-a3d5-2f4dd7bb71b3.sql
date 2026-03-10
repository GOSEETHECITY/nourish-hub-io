-- Grant anon access to validate_join_code for unauthenticated signup flow
GRANT EXECUTE ON FUNCTION public.validate_join_code(text) TO anon;