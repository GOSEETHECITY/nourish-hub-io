-- =============================================
-- HarietAI Full Database Schema Migration
-- Run this SQL in your Supabase SQL Editor
-- =============================================

-- ========================
-- 1. ENUMS
-- ========================
CREATE TYPE public.app_role AS ENUM ('admin', 'venue_partner', 'nonprofit_partner', 'government_partner');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected', 'deactivated');
CREATE TYPE public.listing_type AS ENUM ('donation', 'discounted_sale');
CREATE TYPE public.listing_status AS ENUM ('posted', 'claimed', 'picked_up', 'pending_impact_report', 'completed', 'cancelled');
CREATE TYPE public.coupon_status AS ENUM ('active', 'sold_out', 'expired', 'taken_down');
CREATE TYPE public.event_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.invitation_code_status AS ENUM ('active', 'inactive');
CREATE TYPE public.billing_cycle AS ENUM ('free', 'monthly', 'annual');
CREATE TYPE public.payment_status AS ENUM ('paid', 'unpaid', 'free');
CREATE TYPE public.support_status AS ENUM ('new', 'in_progress', 'resolved');
CREATE TYPE public.organization_type AS ENUM (
  'restaurant', 'catering_company', 'event', 'hotel', 'convention_center',
  'stadium', 'arena', 'farm', 'grocery_store', 'food_truck',
  'airport', 'festival', 'municipal_government', 'county_government', 'state_government'
);
CREATE TYPE public.food_type AS ENUM (
  'prepared_meals', 'produce', 'dairy', 'meat_protein', 'baked_goods', 'shelf_stable', 'frozen'
);

-- ========================
-- 2. PROFILES TABLE (linked to auth.users)
-- ========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ========================
-- 3. USER ROLES TABLE (separate for security)
-- ========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ========================
-- 4. SECURITY DEFINER FUNCTION for role checks
-- ========================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ========================
-- 4b. VALIDATE JOIN CODE FUNCTION
-- ========================
CREATE OR REPLACE FUNCTION public.validate_join_code(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object('id', id, 'name', name, 'type', 'venue')
  INTO result
  FROM public.organizations
  WHERE join_code = p_code AND approval_status = 'approved'
  LIMIT 1;

  IF result IS NOT NULL THEN
    RETURN result;
  END IF;

  SELECT json_build_object('id', id, 'name', organization_name, 'type', 'nonprofit')
  INTO result
  FROM public.nonprofits
  WHERE join_code = p_code AND approval_status = 'approved'
  LIMIT 1;

  RETURN result;
END;
$$;

-- ========================
-- 5. ORGANIZATIONS TABLE
-- ========================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.organization_type NOT NULL,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  billing_contact TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  county TEXT,
  approval_status public.approval_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Add FK from profiles to organizations
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_organization FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- ========================
-- 6. LOCATIONS TABLE
-- ========================
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  county TEXT,
  pickup_address TEXT,
  pickup_instructions TEXT,
  hours_of_operation TEXT,
  estimated_surplus_frequency TEXT,
  marketplace_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  stripe_connect_account_id TEXT,
  stripe_onboarding_status TEXT DEFAULT 'not_started',
  platform_fee_percentage NUMERIC(5,2) DEFAULT 15.00 NOT NULL,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- ========================
-- 7. NONPROFITS TABLE
-- ========================
CREATE TABLE public.nonprofits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_name TEXT NOT NULL,
  logo_url TEXT,
  ein TEXT,
  website TEXT,
  social_handles JSONB,
  proof_of_insurance_url TEXT,
  signed_agreement_url TEXT,
  primary_contact TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  county TEXT,
  operating_hours TEXT,
  cold_storage BOOLEAN DEFAULT FALSE,
  refrigeration BOOLEAN DEFAULT FALSE,
  cabinetry BOOLEAN DEFAULT FALSE,
  food_types_accepted public.food_type[],
  estimated_weekly_served INTEGER,
  population_served TEXT,
  approval_status public.approval_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.nonprofits ENABLE ROW LEVEL SECURITY;

-- ========================
-- 7b. NONPROFIT LOCATIONS TABLE
-- ========================
CREATE TABLE public.nonprofit_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nonprofit_id UUID REFERENCES public.nonprofits(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  county TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  operating_hours TEXT,
  pickup_dropoff_instructions TEXT,
  cold_storage BOOLEAN DEFAULT FALSE,
  refrigeration BOOLEAN DEFAULT FALSE,
  cabinetry BOOLEAN DEFAULT FALSE,
  food_types_accepted public.food_type[],
  estimated_weekly_served INTEGER,
  population_served TEXT,
  approval_status public.approval_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.nonprofit_locations ENABLE ROW LEVEL SECURITY;

-- Add FK from profiles to nonprofit_locations
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_nonprofit_location
  FOREIGN KEY (nonprofit_location_id) REFERENCES public.nonprofit_locations(id) ON DELETE SET NULL;

-- ========================
-- 8. FOOD LISTINGS TABLE
-- ========================
CREATE TABLE public.food_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  listing_type public.listing_type NOT NULL,
  food_type public.food_type,
  pounds NUMERIC(10,2),
  estimated_donation_value NUMERIC(10,2),
  pickup_window_start TIMESTAMPTZ,
  pickup_window_end TIMESTAMPTZ,
  pickup_address TEXT,
  photo_urls TEXT[],
  notes TEXT,
  status public.listing_status DEFAULT 'posted' NOT NULL,
  nonprofit_claimed_id UUID REFERENCES public.nonprofits(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.food_listings ENABLE ROW LEVEL SECURITY;

-- ========================
-- 9. COUPONS TABLE
-- ========================
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  quantity_available INTEGER NOT NULL DEFAULT 0,
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  quantity_remaining INTEGER GENERATED ALWAYS AS (quantity_available - quantity_sold) STORED,
  coupon_active_start TIMESTAMPTZ,
  coupon_active_end TIMESTAMPTZ,
  pickup_address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  status public.coupon_status DEFAULT 'active' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- ========================
-- 10. IMPACT REPORTS TABLE
-- ========================
CREATE TABLE public.impact_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_listing_id UUID REFERENCES public.food_listings(id) ON DELETE CASCADE NOT NULL,
  nonprofit_id UUID REFERENCES public.nonprofits(id) ON DELETE CASCADE NOT NULL,
  meals_served INTEGER,
  date_distributed DATE,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.impact_reports ENABLE ROW LEVEL SECURITY;

-- ========================
-- 11. EVENTS TABLE
-- ========================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  event_date DATE,
  start_time TIME,
  end_time TIME,
  address TEXT,
  city TEXT,
  state TEXT,
  external_link TEXT,
  status public.event_status DEFAULT 'draft' NOT NULL,
  attendee_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- ========================
-- 12. INVITATION CODES TABLE
-- ========================
CREATE TABLE public.invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  label TEXT,
  city TEXT,
  times_used INTEGER DEFAULT 0 NOT NULL,
  expiration_date TIMESTAMPTZ,
  status public.invitation_code_status DEFAULT 'active' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

-- ========================
-- 13. SUSTAINABILITY BASELINE TABLE
-- ========================
CREATE TABLE public.sustainability_baseline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  generates_surplus BOOLEAN DEFAULT FALSE,
  estimated_daily_surplus TEXT,
  surplus_types TEXT[],
  current_handling TEXT,
  donation_frequency TEXT,
  priority_outcomes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.sustainability_baseline ENABLE ROW LEVEL SECURITY;

-- ========================
-- 14. BILLING TABLE
-- ========================
CREATE TABLE public.billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  assigned_price NUMERIC(10,2),
  billing_cycle public.billing_cycle DEFAULT 'free' NOT NULL,
  payment_status public.payment_status DEFAULT 'free' NOT NULL,
  next_billing_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;

-- ========================
-- 15. SUPPORT REQUESTS TABLE
-- ========================
CREATE TABLE public.support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_name TEXT,
  user_name TEXT,
  email TEXT,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status public.support_status DEFAULT 'new' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- ========================
-- 16. AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================
-- 17. RLS POLICIES
-- ========================

-- Profiles: users read own, admins read all
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- User roles: users read own, admins read all
CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Organizations: admins full access, org members read own
CREATE POLICY "Admins full access organizations" ON public.organizations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members can read own org" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- Locations: admins full access, org members read own
CREATE POLICY "Admins full access locations" ON public.locations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members can read own locations" ON public.locations
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Venue partners can manage own locations" ON public.locations
  FOR ALL USING (
    public.has_role(auth.uid(), 'venue_partner')
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- Food listings: admins full, venue partners manage own, nonprofits read posted
CREATE POLICY "Admins full access food_listings" ON public.food_listings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue partners manage own listings" ON public.food_listings
  FOR ALL USING (
    public.has_role(auth.uid(), 'venue_partner')
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Nonprofits can read available donations" ON public.food_listings
  FOR SELECT USING (
    public.has_role(auth.uid(), 'nonprofit_partner')
    AND listing_type = 'donation'
  );

-- Coupons: admins full, venue partners manage own
CREATE POLICY "Admins full access coupons" ON public.coupons
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue partners manage own coupons" ON public.coupons
  FOR ALL USING (
    public.has_role(auth.uid(), 'venue_partner')
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- Nonprofits table: admins full, nonprofit users read own
CREATE POLICY "Admins full access nonprofits" ON public.nonprofits
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Nonprofit users read own" ON public.nonprofits
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Nonprofit users update own" ON public.nonprofits
  FOR UPDATE USING (user_id = auth.uid());

-- Nonprofit locations: admins full, nonprofit partners manage own, assigned users read
CREATE POLICY "Admins full access nonprofit_locations" ON public.nonprofit_locations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Nonprofit partners manage own locations" ON public.nonprofit_locations
  FOR ALL USING (
    public.has_role(auth.uid(), 'nonprofit_partner')
    AND nonprofit_id IN (SELECT id FROM public.nonprofits WHERE user_id = auth.uid())
  );

CREATE POLICY "Nonprofit users read assigned locations" ON public.nonprofit_locations
  FOR SELECT USING (
    id IN (SELECT nonprofit_location_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Government can read nonprofit_locations" ON public.nonprofit_locations
  FOR SELECT USING (public.has_role(auth.uid(), 'government_partner'));

CREATE POLICY "Authenticated can insert nonprofit_locations" ON public.nonprofit_locations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Impact reports: admins full, nonprofits manage own
CREATE POLICY "Admins full access impact_reports" ON public.impact_reports
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Nonprofits manage own reports" ON public.impact_reports
  FOR ALL USING (
    public.has_role(auth.uid(), 'nonprofit_partner')
    AND nonprofit_id IN (SELECT id FROM public.nonprofits WHERE user_id = auth.uid())
  );

-- Events: admins full, all authenticated read published
CREATE POLICY "Admins full access events" ON public.events
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All can read published events" ON public.events
  FOR SELECT USING (status = 'published');

-- Invitation codes: admins full
CREATE POLICY "Admins full access invitation_codes" ON public.invitation_codes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Sustainability baseline: admins full, org members read own
CREATE POLICY "Admins full access sustainability_baseline" ON public.sustainability_baseline
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members read own baseline" ON public.sustainability_baseline
  FOR SELECT USING (
    location_id IN (
      SELECT l.id FROM public.locations l
      JOIN public.profiles p ON p.organization_id = l.organization_id
      WHERE p.id = auth.uid()
    )
  );

-- Billing: admins full
CREATE POLICY "Admins full access billing" ON public.billing
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Support requests: admins full, users create own and read own
CREATE POLICY "Admins full access support_requests" ON public.support_requests
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create support requests" ON public.support_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own support requests" ON public.support_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Government partners: read-only access to food_listings and impact_reports
CREATE POLICY "Government can read food_listings" ON public.food_listings
  FOR SELECT USING (public.has_role(auth.uid(), 'government_partner'));

CREATE POLICY "Government can read impact_reports" ON public.impact_reports
  FOR SELECT USING (public.has_role(auth.uid(), 'government_partner'));

CREATE POLICY "Government can read organizations" ON public.organizations
  FOR SELECT USING (public.has_role(auth.uid(), 'government_partner'));

CREATE POLICY "Government can read nonprofits" ON public.nonprofits
  FOR SELECT USING (public.has_role(auth.uid(), 'government_partner'));
