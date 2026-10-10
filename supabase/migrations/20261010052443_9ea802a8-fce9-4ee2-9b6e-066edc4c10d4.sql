-- Column-level protection for private contact / payment / compliance fields
REVOKE SELECT ON public.organizations FROM anon, authenticated;
GRANT SELECT (id, name, type, primary_contact_name, billing_contact, address, city, state, zip, county, approval_status, created_at, join_code, government_regions, logo_url, business_bio, hours_of_operation, parent_organization_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted, platform_fee_percentage, credentials_sent_at, website_url, marketplace_enabled, is_verified) ON public.organizations TO authenticated;

REVOKE SELECT ON public.nonprofits FROM anon, authenticated;
GRANT SELECT (id, user_id, organization_name, logo_url, website, social_handles, primary_contact, address, city, state, zip, county, operating_hours, cold_storage, refrigeration, cabinetry, food_types_accepted, estimated_weekly_served, population_served, approval_status, created_at, join_code, credentials_sent_at, primary_contact_name, organization_bio, website_url, is_verified) ON public.nonprofits TO authenticated;

-- Secure lookup: organization private fields for admins and members of that organization
CREATE OR REPLACE FUNCTION public.get_organization_private(p_ids uuid[])
RETURNS TABLE(id uuid, primary_contact_email text, primary_contact_phone text, stripe_account_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT o.id, o.primary_contact_email, o.primary_contact_phone, o.stripe_account_id
  FROM public.organizations o
  WHERE auth.uid() IS NOT NULL
    AND o.id = ANY(p_ids)
    AND (public.has_role(auth.uid(), 'admin')
         OR o.id IN (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid() AND p.organization_id IS NOT NULL));
$$;

-- Secure lookup: nonprofit private fields for admins and that nonprofit's members.
-- Venue members additionally get only the EIN of nonprofits that claimed their donations (needed for tax receipts).
CREATE OR REPLACE FUNCTION public.get_nonprofit_private(p_ids uuid[])
RETURNS TABLE(id uuid, ein text, proof_of_insurance_url text, signed_agreement_url text, primary_contact_email text, primary_contact_phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (
    SELECT (public.has_role(auth.uid(), 'admin')) AS is_admin,
           (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AS org_id,
           (SELECT nonprofit_id FROM public.profiles WHERE id = auth.uid()) AS np_id
  ), scoped AS (
    SELECT n.*,
      (me.is_admin OR n.id = me.np_id OR n.user_id = auth.uid()) AS full_access,
      (me.org_id IS NOT NULL AND EXISTS (
         SELECT 1 FROM public.food_listings fl
         WHERE fl.nonprofit_claimed_id = n.id AND fl.organization_id = me.org_id)) AS donor_access
    FROM public.nonprofits n, me
    WHERE auth.uid() IS NOT NULL AND n.id = ANY(p_ids)
  )
  SELECT s.id, s.ein,
    CASE WHEN s.full_access THEN s.proof_of_insurance_url END,
    CASE WHEN s.full_access THEN s.signed_agreement_url END,
    CASE WHEN s.full_access THEN s.primary_contact_email END,
    CASE WHEN s.full_access THEN s.primary_contact_phone END
  FROM scoped s
  WHERE s.full_access OR s.donor_access;
$$;

REVOKE EXECUTE ON FUNCTION public.get_organization_private(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_nonprofit_private(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_organization_private(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_nonprofit_private(uuid[]) TO authenticated, service_role;