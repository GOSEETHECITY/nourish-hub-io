-- Grant authenticated users permission to call validate_join_code RPC
GRANT EXECUTE ON FUNCTION public.validate_join_code(text) TO authenticated;