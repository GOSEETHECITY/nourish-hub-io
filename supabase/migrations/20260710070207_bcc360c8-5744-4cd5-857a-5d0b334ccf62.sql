
-- Allow consumers to read active flash listings (window still open) so they
-- can discover them on the map and open the detail page.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='food_listings' AND policyname='consumers_read_active_flash') THEN
    CREATE POLICY "consumers_read_active_flash" ON public.food_listings
      FOR SELECT TO authenticated
      USING (
        is_flash = true
        AND pickup_window_end IS NOT NULL
        AND pickup_window_end > now()
      );
  END IF;
END $$;

-- Auto-populate lat/long on flash listings from the parent location if the
-- venue didn't provide them explicitly. Ensures map pins always have coords.
CREATE OR REPLACE FUNCTION public.food_listings_inherit_location_coords()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    SELECT latitude, longitude
      INTO NEW.latitude, NEW.longitude
    FROM public.locations
    WHERE id = NEW.location_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS food_listings_inherit_coords ON public.food_listings;
CREATE TRIGGER food_listings_inherit_coords
  BEFORE INSERT OR UPDATE OF location_id ON public.food_listings
  FOR EACH ROW EXECUTE FUNCTION public.food_listings_inherit_location_coords();

-- Backfill coords for existing flash listings that don't have them.
UPDATE public.food_listings fl
   SET latitude = l.latitude, longitude = l.longitude
  FROM public.locations l
 WHERE fl.location_id = l.id
   AND (fl.latitude IS NULL OR fl.longitude IS NULL)
   AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL;
