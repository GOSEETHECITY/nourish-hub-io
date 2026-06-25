
DROP POLICY IF EXISTS "Anon can upload to incoming oxd70c_0" ON storage.objects;

DROP POLICY IF EXISTS "Government read locations non-sensitive" ON public.locations;
DROP POLICY IF EXISTS "Government can read organizations" ON public.organizations;
DROP POLICY IF EXISTS "Nonprofit partners can read organizations" ON public.organizations;
DROP POLICY IF EXISTS "Government can read nonprofits" ON public.nonprofits;

DROP VIEW IF EXISTS public.nonprofits_public CASCADE;
CREATE VIEW public.nonprofits_public
WITH (security_invoker = true) AS
SELECT
  id, organization_name, website, logo_url, primary_contact,
  address, city, state, zip, county, operating_hours, approval_status,
  population_served, estimated_weekly_served, food_types_accepted,
  refrigeration, cold_storage, cabinetry, social_handles, user_id, created_at
FROM public.nonprofits
WHERE approval_status = 'approved';

DROP VIEW IF EXISTS public.organizations_public CASCADE;
CREATE VIEW public.organizations_public
WITH (security_invoker = true) AS
SELECT
  id, name, type, address, city, state, zip, county,
  government_regions, approval_status, created_at
FROM public.organizations
WHERE approval_status = 'approved';

GRANT SELECT ON public.nonprofits_public TO anon, authenticated;
GRANT SELECT ON public.organizations_public TO anon, authenticated;
GRANT SELECT ON public.locations_public TO anon, authenticated;
GRANT SELECT ON public.locations_government TO authenticated;

DROP POLICY IF EXISTS "Approved nonprofits readable to authenticated" ON public.nonprofits;
CREATE POLICY "Approved nonprofits readable to authenticated"
  ON public.nonprofits FOR SELECT TO authenticated
  USING (approval_status = 'approved');

DROP POLICY IF EXISTS "Approved locations readable to authenticated" ON public.locations;
CREATE POLICY "Approved locations readable to authenticated"
  ON public.locations FOR SELECT TO authenticated
  USING (approval_status = 'approved');

DROP POLICY IF EXISTS "orders_update_own" ON public.consumer_orders;
CREATE POLICY "orders_update_own"
  ON public.consumer_orders FOR UPDATE TO authenticated
  USING (auth.uid() = (SELECT user_id FROM public.consumers WHERE id = consumer_orders.consumer_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.consumers WHERE id = consumer_orders.consumer_id));

DROP POLICY IF EXISTS "orders_delete_own" ON public.consumer_orders;
CREATE POLICY "orders_delete_own"
  ON public.consumer_orders FOR DELETE TO authenticated
  USING (auth.uid() = (SELECT user_id FROM public.consumers WHERE id = consumer_orders.consumer_id));

DROP POLICY IF EXISTS "Nonprofits read own documents" ON storage.objects;
CREATE POLICY "Nonprofits read own documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'nonprofit-documents'
    AND (storage.foldername(name))[1] = 'nonprofits'
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Anyone can submit a partner lead" ON public.partner_leads;
CREATE POLICY "Anyone can submit a partner lead"
  ON public.partner_leads FOR INSERT TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL AND length(btrim(email)) BETWEEN 5 AND 320
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND name IS NOT NULL AND length(btrim(name)) BETWEEN 1 AND 200
  );

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_has_any_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_org_is_approved(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_org_join_code(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_nonprofit_join_code(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_own_profile(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.validate_and_use_invite_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_share_count(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_attendee_count(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.validate_join_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_join_code(text) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_any_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_org_is_approved(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_join_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nonprofit_join_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_own_profile(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_and_use_invite_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_share_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_attendee_count(uuid) TO authenticated;
