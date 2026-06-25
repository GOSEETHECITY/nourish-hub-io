
GRANT EXECUTE ON FUNCTION public.validate_join_code(text)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_and_use_invite_code(text)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_any_role(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_org_is_approved(uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_join_code(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nonprofit_join_code(uuid)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_own_profile(text, text, text)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_share_count(uuid)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_attendee_count(uuid)        TO authenticated;
