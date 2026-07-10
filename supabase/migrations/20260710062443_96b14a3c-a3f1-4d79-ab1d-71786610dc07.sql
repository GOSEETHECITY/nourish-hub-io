
-- =========================================================
-- Prompt 25: Franchise tier
-- =========================================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON public.organizations(parent_organization_id);

-- Add 'franchise' to organization_type enum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.organization_type'::regtype AND enumlabel = 'franchise') THEN
    ALTER TYPE public.organization_type ADD VALUE 'franchise';
  END IF;
END $$;

-- =========================================================
-- Prompt 26: Compliance states
-- =========================================================
CREATE TABLE IF NOT EXISTS public.compliance_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code text UNIQUE NOT NULL,
  state_name text NOT NULL,
  law_name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.compliance_states TO authenticated;
GRANT ALL ON public.compliance_states TO service_role;
ALTER TABLE public.compliance_states ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='compliance_states' AND policyname='auth_read_compliance_states') THEN
    CREATE POLICY "auth_read_compliance_states" ON public.compliance_states
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='compliance_states' AND policyname='admin_manage_compliance_states') THEN
    CREATE POLICY "admin_manage_compliance_states" ON public.compliance_states
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(),'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
  END IF;
END $$;

CREATE TRIGGER compliance_states_touch_updated_at
  BEFORE UPDATE ON public.compliance_states
  FOR EACH ROW EXECUTE FUNCTION public.donation_line_items_touch_updated_at();

INSERT INTO public.compliance_states (state_code, state_name, law_name, description) VALUES
  ('CA','California','AB 1826 & SB 1383','Mandatory Commercial Organics Recycling and edible food recovery. Tier 1 & 2 generators must arrange donation of edible surplus food.'),
  ('NY','New York','Food Donation & Food Scraps Recycling Law','Designated food scraps generators (2+ tons/week) must donate edible food and recycle remaining scraps within 25 miles of an organics recycler.'),
  ('NJ','New Jersey','Food Waste Recycling Law (P.L.2020, c.24)','Large food waste generators (52+ tons/year) must source-separate and recycle food waste when within 25 miles of a facility.'),
  ('CT','Connecticut','Commercial Food Waste Recycling Law','Commercial generators of 26+ tons/year within 20 miles of a permitted composting facility must recycle organics.'),
  ('MA','Massachusetts','Commercial Food Material Disposal Ban (310 CMR 19.017)','Businesses disposing of 0.5+ tons/week of food material must divert it from disposal.'),
  ('VT','Vermont','Universal Recycling Law (Act 148)','All food scraps banned from landfill for every generator, residential and commercial.'),
  ('RI','Rhode Island','Food Waste Ban','Commercial generators of 2+ tons/week within 15 miles of a composting facility must divert food waste.')
ON CONFLICT (state_code) DO NOTHING;

-- =========================================================
-- Prompt 27: Public impact snapshot + testimonial opt-in
-- =========================================================
CREATE TABLE IF NOT EXISTS public.impact_stats (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  platform_totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  city_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  testimonials jsonb NOT NULL DEFAULT '[]'::jsonb,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.impact_stats TO anon, authenticated;
GRANT ALL ON public.impact_stats TO service_role;
ALTER TABLE public.impact_stats ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='impact_stats' AND policyname='public_read_impact_stats') THEN
    CREATE POLICY "public_read_impact_stats" ON public.impact_stats
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

INSERT INTO public.impact_stats (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.impact_surveys
  ADD COLUMN IF NOT EXISTS testimonial_public boolean NOT NULL DEFAULT false;

-- =========================================================
-- Prompt 28: Flash food rescue
-- =========================================================
ALTER TABLE public.food_listings
  ADD COLUMN IF NOT EXISTS is_flash boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_free_to_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flash_price_cents integer,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

CREATE TABLE IF NOT EXISTS public.flash_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_listing_id uuid NOT NULL REFERENCES public.food_listings(id) ON DELETE CASCADE,
  consumer_id uuid NOT NULL REFERENCES public.consumers(id) ON DELETE CASCADE,
  reserved_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  picked_up_at timestamptz,
  released_at timestamptz,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','picked_up','released','cancelled')),
  stripe_payment_intent_id text,
  amount_paid_cents integer NOT NULL DEFAULT 0,
  application_fee_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.flash_reservations TO authenticated;
GRANT ALL ON public.flash_reservations TO service_role;
ALTER TABLE public.flash_reservations ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS flash_res_active_one_per_listing
  ON public.flash_reservations(food_listing_id) WHERE status = 'reserved';
CREATE INDEX IF NOT EXISTS flash_res_consumer ON public.flash_reservations(consumer_id);
CREATE INDEX IF NOT EXISTS flash_res_listing ON public.flash_reservations(food_listing_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='flash_reservations' AND policyname='flash_res_select') THEN
    CREATE POLICY "flash_res_select" ON public.flash_reservations FOR SELECT TO authenticated
      USING (
        consumer_id IN (SELECT id FROM public.consumers WHERE user_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.food_listings fl
          JOIN public.profiles p ON p.organization_id = fl.organization_id
          WHERE fl.id = food_listing_id AND p.id = auth.uid()
        )
        OR public.has_role(auth.uid(),'admin'::app_role)
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='flash_reservations' AND policyname='flash_res_insert') THEN
    CREATE POLICY "flash_res_insert" ON public.flash_reservations FOR INSERT TO authenticated
      WITH CHECK (consumer_id IN (SELECT id FROM public.consumers WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='flash_reservations' AND policyname='flash_res_update') THEN
    CREATE POLICY "flash_res_update" ON public.flash_reservations FOR UPDATE TO authenticated
      USING (
        public.has_role(auth.uid(),'admin'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.food_listings fl
          JOIN public.profiles p ON p.organization_id = fl.organization_id
          WHERE fl.id = food_listing_id AND p.id = auth.uid()
        )
        OR consumer_id IN (SELECT id FROM public.consumers WHERE user_id = auth.uid())
      );
  END IF;
END $$;

CREATE TRIGGER flash_res_touch_updated_at
  BEFORE UPDATE ON public.flash_reservations
  FOR EACH ROW EXECUTE FUNCTION public.donation_line_items_touch_updated_at();

-- Realtime
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.flash_reservations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.food_listings; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Atomic reserve RPC (first-come-first-served enforced by unique partial index)
CREATE OR REPLACE FUNCTION public.reserve_flash_listing(p_listing_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consumer_id uuid;
  v_res_id uuid;
  v_window_end timestamptz;
  v_is_flash boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id INTO v_consumer_id FROM public.consumers WHERE user_id = auth.uid();
  IF v_consumer_id IS NULL THEN RAISE EXCEPTION 'No consumer profile'; END IF;

  SELECT is_flash, pickup_window_end
    INTO v_is_flash, v_window_end
  FROM public.food_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF NOT v_is_flash THEN RAISE EXCEPTION 'Not a flash listing'; END IF;
  IF v_window_end IS NULL OR v_window_end < now() THEN RAISE EXCEPTION 'Flash window closed'; END IF;

  BEGIN
    INSERT INTO public.flash_reservations (food_listing_id, consumer_id, expires_at)
    VALUES (p_listing_id, v_consumer_id, v_window_end)
    RETURNING id INTO v_res_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Already reserved by another consumer';
  END;

  RETURN v_res_id;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_flash_listing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_flash_listing(uuid) TO authenticated;

-- Release a flash reservation
CREATE OR REPLACE FUNCTION public.release_flash_reservation(p_reservation_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.flash_reservations
     SET status = 'released', released_at = now()
   WHERE id = p_reservation_id
     AND status = 'reserved'
     AND (
       consumer_id IN (SELECT id FROM public.consumers WHERE user_id = auth.uid())
       OR public.has_role(auth.uid(),'admin'::app_role)
       OR EXISTS (
         SELECT 1 FROM public.food_listings fl
         JOIN public.profiles p ON p.organization_id = fl.organization_id
         WHERE fl.id = food_listing_id AND p.id = auth.uid()
       )
     );
END;
$$;
REVOKE ALL ON FUNCTION public.release_flash_reservation(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_flash_reservation(uuid, text) TO authenticated;

-- =========================================================
-- Prompt 29: Stripe Connect + checkout
-- =========================================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS platform_fee_percentage numeric NOT NULL DEFAULT 10.00;

ALTER TABLE public.consumer_orders
  ADD COLUMN IF NOT EXISTS food_listing_id uuid REFERENCES public.food_listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS application_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS venue_payout_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_reason text,
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_pi ON public.consumer_orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_org ON public.consumer_orders(organization_id);

-- Venues/admins can read orders for their organization (so Venue Orders view works)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='consumer_orders' AND policyname='org_members_read_orders') THEN
    CREATE POLICY "org_members_read_orders" ON public.consumer_orders FOR SELECT TO authenticated
      USING (
        public.has_role(auth.uid(),'admin'::app_role)
        OR (organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.organization_id = consumer_orders.organization_id
        ))
      );
  END IF;
END $$;
