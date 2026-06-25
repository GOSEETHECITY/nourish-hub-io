
-- Switch views to security invoker so they enforce the caller's RLS
ALTER VIEW public.locations_public SET (security_invoker = true);
ALTER VIEW public.organizations_public SET (security_invoker = true);
ALTER VIEW public.nonprofits_public SET (security_invoker = true);
ALTER VIEW public.locations_government SET (security_invoker = true);
ALTER VIEW public.venue_partner_orders SET (security_invoker = true);

-- Allow authenticated users to read approved rows on base tables (used by *_public views)
DROP POLICY IF EXISTS "Authenticated read approved locations" ON public.locations;
CREATE POLICY "Authenticated read approved locations"
  ON public.locations FOR SELECT TO authenticated
  USING (approval_status = 'approved'::approval_status);

DROP POLICY IF EXISTS "Authenticated read approved organizations" ON public.organizations;
CREATE POLICY "Authenticated read approved organizations"
  ON public.organizations FOR SELECT TO authenticated
  USING (approval_status = 'approved'::approval_status);

DROP POLICY IF EXISTS "Authenticated read approved nonprofits" ON public.nonprofits;
CREATE POLICY "Authenticated read approved nonprofits"
  ON public.nonprofits FOR SELECT TO authenticated
  USING (approval_status = 'approved'::approval_status);

-- Government partners need to see all locations (used by locations_government view)
DROP POLICY IF EXISTS "Government partners read all locations" ON public.locations;
CREATE POLICY "Government partners read all locations"
  ON public.locations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'government_partner'::app_role));
