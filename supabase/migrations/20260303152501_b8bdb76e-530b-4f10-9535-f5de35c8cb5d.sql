
-- ═══════════════════════════════════════════════════════════════
-- ISSUE 1: Add parent organization category enum values + location_type column
-- ═══════════════════════════════════════════════════════════════
ALTER TYPE public.organization_type ADD VALUE IF NOT EXISTS 'food_beverage_group';
ALTER TYPE public.organization_type ADD VALUE IF NOT EXISTS 'hospitality_group';
ALTER TYPE public.organization_type ADD VALUE IF NOT EXISTS 'venue_events_group';
ALTER TYPE public.organization_type ADD VALUE IF NOT EXISTS 'farm_grocery_group';
ALTER TYPE public.organization_type ADD VALUE IF NOT EXISTS 'government_entity';
ALTER TYPE public.organization_type ADD VALUE IF NOT EXISTS 'nonprofit_organization';

-- Add location_type text column to locations table
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS location_type text;

-- ═══════════════════════════════════════════════════════════════
-- ISSUE 5: Add government_regions JSONB column to organizations
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS government_regions jsonb;

-- ═══════════════════════════════════════════════════════════════
-- ISSUE 3: Fix ALL admin RLS policies with WITH CHECK clause
-- ═══════════════════════════════════════════════════════════════

-- billing
DROP POLICY IF EXISTS "Admins full access billing" ON public.billing;
CREATE POLICY "Admins full access billing" ON public.billing FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- coupons
DROP POLICY IF EXISTS "Admins full access coupons" ON public.coupons;
CREATE POLICY "Admins full access coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- events
DROP POLICY IF EXISTS "Admins full access events" ON public.events;
CREATE POLICY "Admins full access events" ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- food_listings
DROP POLICY IF EXISTS "Admins full access food_listings" ON public.food_listings;
CREATE POLICY "Admins full access food_listings" ON public.food_listings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- impact_reports
DROP POLICY IF EXISTS "Admins full access impact_reports" ON public.impact_reports;
CREATE POLICY "Admins full access impact_reports" ON public.impact_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- invitation_codes
DROP POLICY IF EXISTS "Admins full access invitation_codes" ON public.invitation_codes;
CREATE POLICY "Admins full access invitation_codes" ON public.invitation_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- locations
DROP POLICY IF EXISTS "Admins full access locations" ON public.locations;
CREATE POLICY "Admins full access locations" ON public.locations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- nonprofit_locations
DROP POLICY IF EXISTS "Admins full access nonprofit_locations" ON public.nonprofit_locations;
CREATE POLICY "Admins full access nonprofit_locations" ON public.nonprofit_locations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- nonprofits
DROP POLICY IF EXISTS "Admins full access nonprofits" ON public.nonprofits;
CREATE POLICY "Admins full access nonprofits" ON public.nonprofits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- organizations (also clean up redundant individual policies)
DROP POLICY IF EXISTS "Admins full access organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can delete organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON public.organizations;
CREATE POLICY "Admins full access organizations" ON public.organizations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- profiles (consolidate separate read/update into single ALL)
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins full access profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- support_requests
DROP POLICY IF EXISTS "Admins full access support_requests" ON public.support_requests;
CREATE POLICY "Admins full access support_requests" ON public.support_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- sustainability_baseline
DROP POLICY IF EXISTS "Admins full access sustainability_baseline" ON public.sustainability_baseline;
CREATE POLICY "Admins full access sustainability_baseline" ON public.sustainability_baseline FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- user_roles (consolidate separate manage/read into single ALL)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
CREATE POLICY "Admins full access user_roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
