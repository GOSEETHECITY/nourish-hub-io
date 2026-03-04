
-- =============================================
-- FIX: Convert ALL RESTRICTIVE policies to PERMISSIVE
-- RESTRICTIVE means ALL must pass; PERMISSIVE means ANY can pass
-- This is the root cause of notification bell and data access issues
-- =============================================

-- ─── ORGANIZATIONS ───
DROP POLICY IF EXISTS "Admins full access organizations" ON public.organizations;
DROP POLICY IF EXISTS "Government can read organizations" ON public.organizations;
DROP POLICY IF EXISTS "Org members can read own org" ON public.organizations;
DROP POLICY IF EXISTS "signup_insert_organizations" ON public.organizations;

CREATE POLICY "Admins full access organizations" ON public.organizations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Government can read organizations" ON public.organizations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'government_partner'::app_role));

CREATE POLICY "Org members can read own org" ON public.organizations FOR SELECT TO authenticated
  USING (id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "signup_insert_organizations" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── LOCATIONS ───
DROP POLICY IF EXISTS "Admins full access locations" ON public.locations;
DROP POLICY IF EXISTS "Org members can read own locations" ON public.locations;
DROP POLICY IF EXISTS "Venue partners can manage own locations" ON public.locations;
DROP POLICY IF EXISTS "signup_insert_locations" ON public.locations;

CREATE POLICY "Admins full access locations" ON public.locations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org members can read own locations" ON public.locations FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Venue partners can manage own locations" ON public.locations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'venue_partner'::app_role) AND organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'venue_partner'::app_role) AND organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "signup_insert_locations" ON public.locations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── PROFILES ───
DROP POLICY IF EXISTS "Admins full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile only" ON public.profiles;

CREATE POLICY "Admins full access profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can read own profile only" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile only" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── USER_ROLES ───
DROP POLICY IF EXISTS "Admins full access user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "signup_insert_user_roles" ON public.user_roles;

CREATE POLICY "Admins full access user_roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "signup_insert_user_roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ─── NONPROFITS ───
DROP POLICY IF EXISTS "Admins full access nonprofits" ON public.nonprofits;
DROP POLICY IF EXISTS "Government can read nonprofits" ON public.nonprofits;
DROP POLICY IF EXISTS "Nonprofit users read by profile" ON public.nonprofits;
DROP POLICY IF EXISTS "Nonprofit users read own" ON public.nonprofits;
DROP POLICY IF EXISTS "Nonprofit users update own" ON public.nonprofits;
DROP POLICY IF EXISTS "signup_insert_nonprofits" ON public.nonprofits;

CREATE POLICY "Admins full access nonprofits" ON public.nonprofits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Government can read nonprofits" ON public.nonprofits FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'government_partner'::app_role));

CREATE POLICY "Nonprofit users read by profile" ON public.nonprofits FOR SELECT TO authenticated
  USING (id IN (SELECT nonprofit_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Nonprofit users read own" ON public.nonprofits FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Nonprofit users update own" ON public.nonprofits FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "signup_insert_nonprofits" ON public.nonprofits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── NONPROFIT_LOCATIONS ───
DROP POLICY IF EXISTS "Admins full access nonprofit_locations" ON public.nonprofit_locations;
DROP POLICY IF EXISTS "Government can read nonprofit_locations" ON public.nonprofit_locations;
DROP POLICY IF EXISTS "Nonprofit partners manage own locations" ON public.nonprofit_locations;
DROP POLICY IF EXISTS "Nonprofit users read assigned locations" ON public.nonprofit_locations;
DROP POLICY IF EXISTS "Signup insert nonprofit_locations" ON public.nonprofit_locations;

CREATE POLICY "Admins full access nonprofit_locations" ON public.nonprofit_locations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Government can read nonprofit_locations" ON public.nonprofit_locations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'government_partner'::app_role));

CREATE POLICY "Nonprofit partners manage own locations" ON public.nonprofit_locations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'nonprofit_partner'::app_role) AND nonprofit_id IN (SELECT id FROM nonprofits WHERE user_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'nonprofit_partner'::app_role) AND nonprofit_id IN (SELECT id FROM nonprofits WHERE user_id = auth.uid()));

CREATE POLICY "Nonprofit users read assigned locations" ON public.nonprofit_locations FOR SELECT TO authenticated
  USING (id IN (SELECT nonprofit_location_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Signup insert nonprofit_locations" ON public.nonprofit_locations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── FOOD_LISTINGS ───
DROP POLICY IF EXISTS "Admins full access food_listings" ON public.food_listings;
DROP POLICY IF EXISTS "Government can read food_listings" ON public.food_listings;
DROP POLICY IF EXISTS "Nonprofits can claim donations" ON public.food_listings;
DROP POLICY IF EXISTS "Nonprofits can read available donations" ON public.food_listings;
DROP POLICY IF EXISTS "Venue partners manage own listings" ON public.food_listings;

CREATE POLICY "Admins full access food_listings" ON public.food_listings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Government can read food_listings" ON public.food_listings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'government_partner'::app_role));

CREATE POLICY "Nonprofits can claim donations" ON public.food_listings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'nonprofit_partner'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'nonprofit_partner'::app_role));

CREATE POLICY "Nonprofits can read available donations" ON public.food_listings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'nonprofit_partner'::app_role) AND listing_type = 'donation'::listing_type);

CREATE POLICY "Venue partners manage own listings" ON public.food_listings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'venue_partner'::app_role) AND organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'venue_partner'::app_role) AND organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ─── IMPACT_REPORTS ───
DROP POLICY IF EXISTS "Admins full access impact_reports" ON public.impact_reports;
DROP POLICY IF EXISTS "Government can read impact_reports" ON public.impact_reports;
DROP POLICY IF EXISTS "Nonprofits manage own reports" ON public.impact_reports;

CREATE POLICY "Admins full access impact_reports" ON public.impact_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Government can read impact_reports" ON public.impact_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'government_partner'::app_role));

CREATE POLICY "Nonprofits manage own reports" ON public.impact_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'nonprofit_partner'::app_role) AND nonprofit_id IN (SELECT id FROM nonprofits WHERE user_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'nonprofit_partner'::app_role) AND nonprofit_id IN (SELECT id FROM nonprofits WHERE user_id = auth.uid()));

-- ─── COUPONS ───
DROP POLICY IF EXISTS "Admins full access coupons" ON public.coupons;
DROP POLICY IF EXISTS "Venue partners manage own coupons" ON public.coupons;

CREATE POLICY "Admins full access coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue partners manage own coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'venue_partner'::app_role) AND organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'venue_partner'::app_role) AND organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ─── EVENTS ───
DROP POLICY IF EXISTS "Admins full access events" ON public.events;
DROP POLICY IF EXISTS "All can read published events" ON public.events;

CREATE POLICY "Admins full access events" ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All can read published events" ON public.events FOR SELECT TO authenticated
  USING (status = 'published'::event_status);

-- ─── BILLING ───
DROP POLICY IF EXISTS "Admins full access billing" ON public.billing;
DROP POLICY IF EXISTS "Org members can view own billing" ON public.billing;

CREATE POLICY "Admins full access billing" ON public.billing FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org members can view own billing" ON public.billing FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ─── SUPPORT_REQUESTS ───
DROP POLICY IF EXISTS "Admins full access support_requests" ON public.support_requests;
DROP POLICY IF EXISTS "Users can create support requests" ON public.support_requests;
DROP POLICY IF EXISTS "Users can read own support requests" ON public.support_requests;

CREATE POLICY "Admins full access support_requests" ON public.support_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create support requests" ON public.support_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own support requests" ON public.support_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ─── SUSTAINABILITY_BASELINE ───
DROP POLICY IF EXISTS "Admins full access sustainability_baseline" ON public.sustainability_baseline;
DROP POLICY IF EXISTS "Org members read own baseline" ON public.sustainability_baseline;
DROP POLICY IF EXISTS "Venue partners insert baseline" ON public.sustainability_baseline;
DROP POLICY IF EXISTS "signup_insert_sustainability" ON public.sustainability_baseline;

CREATE POLICY "Admins full access sustainability_baseline" ON public.sustainability_baseline FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org members read own baseline" ON public.sustainability_baseline FOR SELECT TO authenticated
  USING (location_id IN (SELECT l.id FROM locations l JOIN profiles p ON p.organization_id = l.organization_id WHERE p.id = auth.uid()));

CREATE POLICY "Venue partners insert baseline" ON public.sustainability_baseline FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'venue_partner'::app_role));

CREATE POLICY "signup_insert_sustainability" ON public.sustainability_baseline FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── INVITATION_CODES ───
DROP POLICY IF EXISTS "Admins full access invitation_codes" ON public.invitation_codes;

CREATE POLICY "Admins full access invitation_codes" ON public.invitation_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
