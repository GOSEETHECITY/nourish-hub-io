
-- Waste-reduction goals for government accounts (set by admins)
CREATE TABLE public.gov_waste_goals (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  goal_lbs numeric NOT NULL CHECK (goal_lbs > 0),
  period_start date NOT NULL,
  period_end date NOT NULL,
  set_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gov_waste_goals TO authenticated;
GRANT ALL ON public.gov_waste_goals TO service_role;
ALTER TABLE public.gov_waste_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage waste goals" ON public.gov_waste_goals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "gov members read own goal" ON public.gov_waste_goals FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE TRIGGER gov_waste_goals_touch BEFORE UPDATE ON public.gov_waste_goals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Public city counter (embeddable widget). Aggregates only; intentionally public.
CREATE OR REPLACE FUNCTION public.public_city_impact(p_city text, p_state text)
RETURNS TABLE(pounds numeric, donations bigint, reported_meals bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(sum(fl.pounds),0)::numeric,
         count(fl.id),
         coalesce((SELECT sum(ir.meals_served) FROM public.impact_reports ir
                   JOIN public.food_listings f2 ON f2.id = ir.food_listing_id
                   JOIN public.locations l2 ON l2.id = f2.location_id
                   WHERE lower(l2.city) = lower(trim(p_city)) AND (p_state IS NULL OR p_state = '' OR lower(l2.state) = lower(trim(p_state)))),0)::bigint
  FROM public.food_listings fl
  JOIN public.locations l ON l.id = fl.location_id
  WHERE fl.listing_type = 'donation' AND fl.status IN ('picked_up','pending_impact_report','completed')
    AND lower(l.city) = lower(trim(p_city))
    AND (p_state IS NULL OR p_state = '' OR lower(l.state) = lower(trim(p_state)));
$$;
GRANT EXECUTE ON FUNCTION public.public_city_impact(text, text) TO anon, authenticated;

-- Per-city surplus selling switch
ALTER TABLE public.city_thresholds ADD COLUMN IF NOT EXISTS surplus_selling_enabled boolean NOT NULL DEFAULT false;

-- Opt-in donation fallback on surplus sale listings
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS donate_unsold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS donate_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_listing_id uuid REFERENCES public.food_listings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS coupons_converted_listing_idx ON public.coupons(converted_listing_id);
CREATE INDEX IF NOT EXISTS coupons_donate_at_idx ON public.coupons(donate_at) WHERE donate_unsold AND converted_listing_id IS NULL;

CREATE OR REPLACE FUNCTION public.coupons_enforce_selling_gate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_city text; v_state text; v_on boolean; v_stripe boolean;
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  SELECT city, state INTO v_city, v_state FROM public.locations WHERE id = NEW.location_id AND organization_id = NEW.organization_id;
  SELECT bool_or(surplus_selling_enabled) INTO v_on FROM public.city_thresholds
   WHERE lower(city) = lower(coalesce(v_city,'')) AND (state IS NULL OR lower(state) = lower(coalesce(v_state,'')));
  IF NOT coalesce(v_on,false) THEN
    RAISE EXCEPTION 'Surplus selling is not open in this city yet' USING ERRCODE = '42501';
  END IF;
  SELECT stripe_charges_enabled INTO v_stripe FROM public.organizations WHERE id = NEW.organization_id;
  IF NOT coalesce(v_stripe,false) THEN
    RAISE EXCEPTION 'Finish Stripe setup before selling' USING ERRCODE = '42501';
  END IF;
  IF NEW.donate_unsold AND NEW.donate_at IS NULL THEN
    RAISE EXCEPTION 'Choose a cutoff time for the donation fallback';
  END IF;
  IF NOT NEW.donate_unsold THEN NEW.donate_at := NULL; END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.coupons_enforce_selling_gate() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER coupons_enforce_selling_gate BEFORE INSERT ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.coupons_enforce_selling_gate();

-- Convert unsold remainder to a donation, only for listings whose venue opted in.
CREATE OR REPLACE FUNCTION public.convert_unsold_coupons() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_id uuid; n integer := 0; loc record;
BEGIN
  FOR c IN SELECT * FROM public.coupons
    WHERE donate_unsold AND converted_listing_id IS NULL AND donate_at IS NOT NULL
      AND donate_at <= now() AND donate_at > now() - interval '1 day'
      AND coalesce(quantity_remaining, quantity_available - quantity_sold) > 0
      AND status IN ('active','expired')
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      SELECT pickup_address, address INTO loc FROM public.locations WHERE id = c.location_id;
      INSERT INTO public.food_listings(location_id, organization_id, listing_type, food_type, pickup_address,
        pickup_window_start, pickup_window_end, notes, status)
      VALUES (c.location_id, c.organization_id, 'donation', 'mixed', coalesce(c.pickup_address, loc.pickup_address, loc.address),
        now() + interval '5 minutes', now() + interval '3 hours',
        'Unsold surplus automatically donated (venue opted in): ' || c.title, 'posted')
      RETURNING id INTO v_id;
      INSERT INTO public.donation_line_items(food_listing_id, description, quantity, unit_value, food_type)
      VALUES (v_id, c.title, coalesce(c.quantity_remaining, c.quantity_available - c.quantity_sold), coalesce(c.original_price, c.price, 0), 'mixed');
      UPDATE public.coupons SET status = 'expired', converted_listing_id = v_id WHERE id = c.id;
      PERFORM public.notify_org_members(c.organization_id, 'coupon_donated', 'Unsold items donated',
        'The unsold remainder of "' || c.title || '" was converted to a donation and nearby nonprofits were alerted.',
        '/venue/donations', jsonb_build_object('coupon_id', c.id, 'listing_id', v_id));
      n := n + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'coupon % conversion failed: %', c.id, SQLERRM;
    END;
  END LOOP;
  RETURN n;
END; $$;
REVOKE EXECUTE ON FUNCTION public.convert_unsold_coupons() FROM PUBLIC, anon, authenticated;
SELECT cron.schedule('convert-unsold-coupons', '0 * * * *', $$ SELECT public.convert_unsold_coupons(); $$);
