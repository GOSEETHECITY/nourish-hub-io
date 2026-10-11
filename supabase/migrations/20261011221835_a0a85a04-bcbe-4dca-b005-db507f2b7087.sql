
-- Journey stages
ALTER TABLE public.food_listings
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS en_route_at timestamptz,
  ADD COLUMN IF NOT EXISTS on_site_at timestamptz,
  ADD COLUMN IF NOT EXISTS recurring_schedule_id uuid,
  ADD COLUMN IF NOT EXISTS occurrence_date date;
CREATE UNIQUE INDEX IF NOT EXISTS food_listings_schedule_occurrence_uq ON public.food_listings(recurring_schedule_id, occurrence_date) WHERE recurring_schedule_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.food_listings_stamp_stages() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.nonprofit_claimed_id IS NOT NULL AND OLD.nonprofit_claimed_id IS NULL THEN NEW.claimed_at := now(); END IF;
  IF NEW.nonprofit_claimed_id IS NULL AND OLD.nonprofit_claimed_id IS NOT NULL THEN
    NEW.claimed_at := NULL; NEW.en_route_at := NULL; NEW.on_site_at := NULL;
  END IF;
  IF NEW.on_site_at IS NOT NULL AND NEW.en_route_at IS NULL THEN NEW.en_route_at := NEW.on_site_at; END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.food_listings_stamp_stages() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER b_food_listings_stamp_stages BEFORE UPDATE ON public.food_listings FOR EACH ROW EXECUTE FUNCTION public.food_listings_stamp_stages();

CREATE OR REPLACE FUNCTION public.food_listings_restrict_nonprofit_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  allowed text[] := ARRAY['status','nonprofit_claimed_id','picked_up_at','claimed_at','en_route_at','on_site_at'];
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin')
     OR NOT public.has_role(auth.uid(), 'nonprofit_partner')
     OR (public.has_role(auth.uid(), 'venue_partner') AND OLD.organization_id IN (
           SELECT organization_id FROM public.profiles WHERE id = auth.uid())) THEN
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - allowed) IS DISTINCT FROM (to_jsonb(OLD) - allowed) THEN
    RAISE EXCEPTION 'Nonprofit accounts can only claim, release, or update the status of a donation'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_listing_claim()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_np_name text; v_stage text; v_title text; v_body text;
BEGIN
  SELECT organization_name INTO v_np_name FROM public.nonprofits WHERE id = coalesce(NEW.nonprofit_claimed_id, OLD.nonprofit_claimed_id);
  v_np_name := coalesce(v_np_name, 'A nonprofit');
  IF NEW.nonprofit_claimed_id IS DISTINCT FROM OLD.nonprofit_claimed_id AND NEW.nonprofit_claimed_id IS NOT NULL THEN
    v_stage := 'claimed'; v_title := 'Donation claimed'; v_body := v_np_name || ' claimed your donation.';
  ELSIF NEW.en_route_at IS NOT NULL AND OLD.en_route_at IS NULL AND NEW.on_site_at IS NULL THEN
    v_stage := 'en_route'; v_title := 'Nonprofit on the way'; v_body := v_np_name || ' is on the way to pick up your donation.';
  ELSIF NEW.on_site_at IS NOT NULL AND OLD.on_site_at IS NULL THEN
    v_stage := 'on_site'; v_title := 'Nonprofit on site'; v_body := v_np_name || ' has arrived for pickup.';
  ELSIF NEW.status = 'picked_up' AND OLD.status IS DISTINCT FROM 'picked_up' THEN
    v_stage := 'picked_up'; v_title := 'Pickup confirmed'; v_body := 'Your donation was picked up by ' || v_np_name || '.';
  END IF;
  IF v_stage IS NOT NULL THEN
    PERFORM public.notify_org_members(NEW.organization_id, 'listing_' || v_stage, v_title, v_body, '/venue',
      jsonb_build_object('listing_id', NEW.id, 'nonprofit_id', NEW.nonprofit_claimed_id, 'stage', v_stage));
    BEGIN
      PERFORM public.invoke_scheduled_function('venue-journey-alert',
        jsonb_build_object('organization_id', NEW.organization_id, 'title', v_title, 'body', v_body));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

-- One-time event accounts
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_one_time_event boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS event_name text,
  ADD COLUMN IF NOT EXISTS event_date date;
GRANT SELECT (is_one_time_event, event_name, event_date) ON public.organizations TO authenticated;

-- One-time event accounts go dormant 3 days after the event date
CREATE OR REPLACE FUNCTION public.food_listings_block_dormant_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record;
BEGIN
  SELECT is_one_time_event, event_date INTO o FROM public.organizations WHERE id = NEW.organization_id;
  IF o.is_one_time_event AND o.event_date IS NOT NULL AND current_date > o.event_date + 3 THEN
    RAISE EXCEPTION 'This one-time event account is dormant: its event date has passed.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.food_listings_block_dormant_event() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER food_listings_block_dormant_event BEFORE INSERT ON public.food_listings FOR EACH ROW EXECUTE FUNCTION public.food_listings_block_dormant_event();

-- Recurring donation schedules
CREATE TABLE public.donation_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  event_label text,
  recurrence text NOT NULL DEFAULT 'weekly',
  days_of_week integer[] NOT NULL DEFAULT '{}',
  event_dates date[] NOT NULL DEFAULT '{}',
  post_hour integer NOT NULL DEFAULT 21,
  pickup_duration_hours integer NOT NULL DEFAULT 3,
  timezone text NOT NULL DEFAULT 'America/New_York',
  food_type food_type NOT NULL DEFAULT 'prepared_meals',
  estimated_pounds numeric NOT NULL DEFAULT 0,
  item_description text NOT NULL DEFAULT 'Surplus food',
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX donation_schedules_org_idx ON public.donation_schedules(organization_id);
CREATE INDEX donation_schedules_loc_idx ON public.donation_schedules(location_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donation_schedules TO authenticated;
GRANT ALL ON public.donation_schedules TO service_role;
ALTER TABLE public.donation_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue members manage schedules" ON public.donation_schedules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND location_id IN (SELECT id FROM public.locations l WHERE l.organization_id = donation_schedules.organization_id)));
CREATE TRIGGER donation_schedules_touch BEFORE UPDATE ON public.donation_schedules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.generate_scheduled_donations() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; v_local timestamp; v_day date; v_start timestamptz; v_id uuid; n integer := 0; loc record;
BEGIN
  FOR s IN SELECT * FROM public.donation_schedules WHERE active LOOP
    BEGIN
      v_local := now() AT TIME ZONE s.timezone;
      v_day := v_local::date;
      IF extract(hour FROM v_local) < s.post_hour THEN CONTINUE; END IF;
      IF NOT ((s.recurrence = 'weekly' AND extract(dow FROM v_day)::int = ANY(s.days_of_week))
           OR (s.recurrence = 'dates' AND v_day = ANY(s.event_dates))) THEN CONTINUE; END IF;
      v_start := (v_day + make_time(s.post_hour, 0, 0)) AT TIME ZONE s.timezone;
      IF v_start + make_interval(hours => s.pickup_duration_hours) <= now() THEN CONTINUE; END IF;
      SELECT pickup_address, address INTO loc FROM public.locations WHERE id = s.location_id;
      INSERT INTO public.food_listings(location_id, organization_id, listing_type, food_type, pounds, pickup_address,
        pickup_window_start, pickup_window_end, notes, status, recurring_schedule_id, occurrence_date)
      VALUES (s.location_id, s.organization_id, 'donation', s.food_type, NULLIF(s.estimated_pounds,0),
        coalesce(loc.pickup_address, loc.address), v_start, v_start + make_interval(hours => s.pickup_duration_hours),
        trim(concat_ws(' — ', s.event_label, s.name, s.notes)), 'posted', s.id, v_day)
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_id;
      IF v_id IS NOT NULL THEN
        INSERT INTO public.donation_line_items(food_listing_id, description, quantity, unit_value, food_type, pounds)
        VALUES (v_id, s.item_description, 1, 0, s.food_type, NULLIF(s.estimated_pounds,0));
        n := n + 1; v_id := NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'schedule % failed: %', s.id, SQLERRM;
    END;
  END LOOP;
  RETURN n;
END; $$;
REVOKE EXECUTE ON FUNCTION public.generate_scheduled_donations() FROM PUBLIC, anon, authenticated;
SELECT cron.schedule('generate-scheduled-donations', '0 * * * *', $$ SELECT public.generate_scheduled_donations(); $$);
