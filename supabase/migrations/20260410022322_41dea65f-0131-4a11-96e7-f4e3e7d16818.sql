-- ============================================================
-- Section 4: Regions table
-- ============================================================
CREATE TYPE public.region_status AS ENUM ('locked', 'unlocked');

CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  state text NOT NULL,
  cities jsonb DEFAULT '[]'::jsonb,
  user_count integer NOT NULL DEFAULT 0,
  status region_status NOT NULL DEFAULT 'locked',
  unlocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access regions" ON public.regions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read regions" ON public.regions FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- Section 5: Organization Pricing Overrides
-- ============================================================
CREATE TYPE public.override_billing_cycle AS ENUM ('monthly', 'annual');
CREATE TYPE public.override_status AS ENUM ('active', 'expired', 'scheduled');

CREATE TABLE public.organization_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  override_amount numeric NOT NULL,
  override_currency text NOT NULL DEFAULT 'USD',
  billing_cycle override_billing_cycle NOT NULL DEFAULT 'monthly',
  notes text,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access organization_pricing" ON public.organization_pricing FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Section 6: Admin Notifications table
-- ============================================================
CREATE TYPE public.admin_notification_type AS ENUM (
  'new_donation', 'new_signup', 'new_coupon', 'region_unlocked', 'billing_alert', 'system'
);

CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type admin_notification_type NOT NULL DEFAULT 'system',
  title text NOT NULL,
  description text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access admin_notifications" ON public.admin_notifications FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed sample notifications
INSERT INTO public.admin_notifications (type, title, description, link, is_read, created_at) VALUES
  ('new_donation', 'New Donation Posted', 'Orlando Kitchen posted 50 lbs of prepared meals', '/food-listings/donations', false, now() - interval '10 minutes'),
  ('new_signup', 'New Organization Signup', 'Tampa Bay Catering registered and is pending approval', '/organizations', false, now() - interval '30 minutes'),
  ('new_coupon', 'New Coupon Created', 'Rita''s Italian Ice created a new surplus coupon', '/food-listings/discounted-sale', false, now() - interval '1 hour'),
  ('system', 'Platform Update', 'System maintenance scheduled for this weekend', null, false, now() - interval '2 hours'),
  ('region_unlocked', 'Region Unlocked', 'Orlando region reached 500 users and is now unlocked', '/regions', true, now() - interval '1 day'),
  ('billing_alert', 'Payment Overdue', 'Sunshine Catering has an overdue payment', '/billing', false, now() - interval '3 hours');

-- Seed sample regions
INSERT INTO public.regions (name, state, cities, user_count, status, unlocked_at) VALUES
  ('Orlando Metro', 'FL', '["Orlando", "Kissimmee", "Winter Park"]'::jsonb, 523, 'unlocked', now() - interval '7 days'),
  ('Tampa Bay', 'FL', '["Tampa", "St. Petersburg", "Clearwater"]'::jsonb, 312, 'locked', null),
  ('Miami-Dade', 'FL', '["Miami", "Hialeah", "Miami Beach"]'::jsonb, 89, 'locked', null),
  ('Jacksonville', 'FL', '["Jacksonville", "Jacksonville Beach"]'::jsonb, 45, 'locked', null);

-- Grant access
GRANT ALL ON public.regions TO authenticated;
GRANT ALL ON public.organization_pricing TO authenticated;
GRANT ALL ON public.admin_notifications TO authenticated;
