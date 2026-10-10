CREATE OR REPLACE FUNCTION public.gov_state_code(s text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE((jsonb_build_object('alabama','al','alaska','ak','arizona','az','arkansas','ar','california','ca','colorado','co','connecticut','ct','delaware','de','florida','fl','georgia','ga','hawaii','hi','idaho','id','illinois','il','indiana','in','iowa','ia','kansas','ks','kentucky','ky','louisiana','la','maine','me','maryland','md','massachusetts','ma','michigan','mi','minnesota','mn','mississippi','ms','missouri','mo','montana','mt','nebraska','ne','nevada','nv','new hampshire','nh','new jersey','nj','new mexico','nm','new york','ny','north carolina','nc','north dakota','nd','ohio','oh','oklahoma','ok','oregon','or','pennsylvania','pa','rhode island','ri','south carolina','sc','south dakota','sd','tennessee','tn','texas','tx','utah','ut','vermont','vt','virginia','va','washington','wa','west virginia','wv','wisconsin','wi','wyoming','wy') ->> lower(trim(coalesce(s,'')))), lower(trim(coalesce(s,''))));
$$;

CREATE OR REPLACE FUNCTION public.gov_location_in_region(_user_id uuid, _location_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; l record;
BEGIN
  IF _user_id IS NULL OR NOT has_role(_user_id, 'government_partner') OR NOT user_org_is_approved(_user_id) THEN RETURN false; END IF;
  SELECT o.government_regions INTO r FROM profiles p JOIN organizations o ON o.id = p.organization_id WHERE p.id = _user_id;
  IF r IS NULL OR jsonb_typeof(r) <> 'object' THEN RETURN false; END IF;
  SELECT city, state, county INTO l FROM locations WHERE id = _location_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF coalesce((r->>'is_state_wide')::boolean,false) AND coalesce(r->>'state','') <> '' THEN
    RETURN gov_state_code(l.state) = gov_state_code(r->>'state');
  END IF;
  IF jsonb_typeof(r->'cities')='array' AND jsonb_array_length(r->'cities')>0 THEN
    RETURN EXISTS (SELECT 1 FROM jsonb_array_elements_text(r->'cities') c WHERE lower(trim(c)) = lower(trim(coalesce(l.city,''))));
  END IF;
  IF jsonb_typeof(r->'counties')='array' AND jsonb_array_length(r->'counties')>0 THEN
    RETURN EXISTS (SELECT 1 FROM jsonb_array_elements_text(r->'counties') c WHERE lower(trim(c)) = lower(trim(coalesce(l.county,''))));
  END IF;
  RETURN false; -- no regions configured: fail closed
END $$;
REVOKE ALL ON FUNCTION public.gov_location_in_region(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gov_location_in_region(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.gov_region_locations()
RETURNS TABLE(id uuid, organization_id uuid, city text, state text, county text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, l.organization_id, l.city, l.state, l.county FROM locations l
  WHERE gov_location_in_region(auth.uid(), l.id);
$$;
REVOKE ALL ON FUNCTION public.gov_region_locations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gov_region_locations() TO authenticated;

CREATE OR REPLACE FUNCTION public.gov_region_listings()
RETURNS SETOF public.food_listings
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.* FROM food_listings f
  WHERE gov_location_in_region(auth.uid(), f.location_id)
  ORDER BY f.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.gov_region_listings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gov_region_listings() TO authenticated;

DROP POLICY IF EXISTS "Government can read food_listings" ON public.food_listings;
CREATE POLICY "Government can read food_listings in region" ON public.food_listings
  FOR SELECT TO authenticated
  USING (public.gov_location_in_region(auth.uid(), location_id));