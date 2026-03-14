-- Drop the overly permissive blanket policies that expose PII to unauthenticated users
DROP POLICY IF EXISTS "consumers_all" ON public.consumers;
DROP POLICY IF EXISTS "checkins_all" ON public.consumer_checkins;