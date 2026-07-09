
ALTER TABLE public.city_thresholds REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.city_thresholds;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
