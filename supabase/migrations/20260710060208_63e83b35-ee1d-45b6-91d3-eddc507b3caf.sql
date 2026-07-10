
CREATE TABLE IF NOT EXISTS public.impact_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  food_listing_id uuid NOT NULL REFERENCES public.food_listings(id) ON DELETE CASCADE,
  nonprofit_id uuid NOT NULL REFERENCES public.nonprofits(id) ON DELETE CASCADE,
  venue_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  food_received boolean,
  date_received date,
  people_fed integer,
  demographics text[] DEFAULT '{}',
  food_condition_good boolean,
  condition_comment text,
  testimonial text,
  photo_urls text[] DEFAULT '{}',
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (food_listing_id)
);

GRANT SELECT, INSERT, UPDATE ON public.impact_surveys TO authenticated;
GRANT ALL ON public.impact_surveys TO service_role;

ALTER TABLE public.impact_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "impact_surveys_admin_all" ON public.impact_surveys
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "impact_surveys_np_select" ON public.impact_surveys
FOR SELECT TO authenticated
USING (
  nonprofit_id IN (SELECT nonprofit_id FROM public.profiles WHERE id = auth.uid())
  OR nonprofit_id IN (SELECT id FROM public.nonprofits WHERE user_id = auth.uid())
);

CREATE POLICY "impact_surveys_venue_select" ON public.impact_surveys
FOR SELECT TO authenticated
USING (
  venue_organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.impact_surveys_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_impact_surveys_updated_at ON public.impact_surveys;
CREATE TRIGGER trg_impact_surveys_updated_at
BEFORE UPDATE ON public.impact_surveys
FOR EACH ROW EXECUTE FUNCTION public.impact_surveys_touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_impact_surveys_listing ON public.impact_surveys(food_listing_id);
CREATE INDEX IF NOT EXISTS idx_impact_surveys_np ON public.impact_surveys(nonprofit_id);
CREATE INDEX IF NOT EXISTS idx_impact_surveys_venue ON public.impact_surveys(venue_organization_id);

-- Storage RLS on impact-survey-photos: authenticated read; uploads happen via edge function (service role)
DROP POLICY IF EXISTS "impact_survey_photos_read" ON storage.objects;
CREATE POLICY "impact_survey_photos_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'impact-survey-photos'
  AND EXISTS (
    SELECT 1 FROM public.impact_surveys s
    WHERE s.id::text = split_part(name, '/', 1)
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR s.venue_organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR s.nonprofit_id IN (SELECT nonprofit_id FROM public.profiles WHERE id = auth.uid())
        OR s.nonprofit_id IN (SELECT id FROM public.nonprofits WHERE user_id = auth.uid())
      )
  )
);

-- Public submission RPC
CREATE OR REPLACE FUNCTION public.submit_impact_survey(
  p_token text,
  p_food_received boolean,
  p_date_received date,
  p_people_fed integer,
  p_demographics text[],
  p_food_condition_good boolean,
  p_condition_comment text,
  p_testimonial text,
  p_photo_urls text[]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_survey_id uuid;
  v_venue_org uuid;
  v_listing uuid;
BEGIN
  IF p_token IS NULL OR length(p_token) < 8 THEN RAISE EXCEPTION 'Invalid token'; END IF;
  IF p_people_fed IS NOT NULL AND (p_people_fed < 0 OR p_people_fed > 1000000) THEN
    RAISE EXCEPTION 'Invalid people_fed';
  END IF;

  UPDATE public.impact_surveys
     SET food_received = p_food_received,
         date_received = p_date_received,
         people_fed = p_people_fed,
         demographics = COALESCE(p_demographics, '{}'),
         food_condition_good = p_food_condition_good,
         condition_comment = NULLIF(p_condition_comment, ''),
         testimonial = NULLIF(p_testimonial, ''),
         photo_urls = COALESCE(p_photo_urls, '{}'),
         submitted_at = now()
   WHERE token = p_token AND submitted_at IS NULL
   RETURNING id, venue_organization_id, food_listing_id INTO v_survey_id, v_venue_org, v_listing;

  IF v_survey_id IS NULL THEN RAISE EXCEPTION 'Survey not found or already submitted'; END IF;

  PERFORM public.notify_org_members(
    v_venue_org,
    'impact_survey_submitted',
    'Impact survey completed',
    'A nonprofit shared results from your donation.',
    '/venue/donations',
    jsonb_build_object('listing_id', v_listing, 'survey_id', v_survey_id)
  );

  RETURN v_survey_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_impact_survey(text, boolean, date, integer, text[], boolean, text, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_impact_survey(text, boolean, date, integer, text[], boolean, text, text, text[]) TO anon, authenticated;

-- Trigger on tax_receipt insert -> create survey + notify NP members
CREATE OR REPLACE FUNCTION public.create_impact_survey_on_receipt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_survey_id uuid;
  v_token text;
BEGIN
  INSERT INTO public.impact_surveys (food_listing_id, nonprofit_id, venue_organization_id)
  VALUES (NEW.food_listing_id, NEW.nonprofit_id, NEW.venue_organization_id)
  ON CONFLICT (food_listing_id) DO NOTHING
  RETURNING id, token INTO v_survey_id, v_token;

  IF v_survey_id IS NULL THEN
    SELECT id, token INTO v_survey_id, v_token
      FROM public.impact_surveys WHERE food_listing_id = NEW.food_listing_id;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link_path, metadata)
  SELECT p.id, 'impact_survey_ready',
         'Share your impact',
         'Tell the donor how their food helped — takes under 2 minutes.',
         '/survey/' || v_token,
         jsonb_build_object('survey_id', v_survey_id, 'token', v_token, 'listing_id', NEW.food_listing_id)
  FROM public.profiles p WHERE p.nonprofit_id = NEW.nonprofit_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_impact_survey_on_receipt ON public.tax_receipts;
CREATE TRIGGER trg_create_impact_survey_on_receipt
AFTER INSERT ON public.tax_receipts
FOR EACH ROW EXECUTE FUNCTION public.create_impact_survey_on_receipt();

-- Public token-based context read
CREATE OR REPLACE FUNCTION public.get_impact_survey_by_token(p_token text)
RETURNS TABLE(
  id uuid,
  submitted_at timestamptz,
  nonprofit_name text,
  venue_name text,
  food_type text,
  pounds numeric,
  donation_date timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.submitted_at, np.organization_name, org.name,
         fl.food_type::text, fl.pounds, fl.created_at
  FROM public.impact_surveys s
  JOIN public.food_listings fl ON fl.id = s.food_listing_id
  JOIN public.nonprofits np ON np.id = s.nonprofit_id
  JOIN public.organizations org ON org.id = s.venue_organization_id
  WHERE s.token = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_impact_survey_by_token(text) TO anon, authenticated;
