
-- Ensure uniqueness so ON CONFLICT works and to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS consumers_user_id_key ON public.consumers(user_id);

CREATE OR REPLACE FUNCTION public.ensure_consumer_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.consumers (user_id, first_name, last_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_ensure_consumer ON auth.users;
CREATE TRIGGER on_auth_user_created_ensure_consumer
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.ensure_consumer_for_new_user();

INSERT INTO public.consumers (user_id, first_name, last_name, email, phone)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'first_name', ''),
  COALESCE(u.raw_user_meta_data->>'last_name', ''),
  u.email,
  NULLIF(u.raw_user_meta_data->>'phone', '')
FROM auth.users u
LEFT JOIN public.consumers c ON c.user_id = u.id
WHERE c.id IS NULL
ON CONFLICT (user_id) DO NOTHING;
