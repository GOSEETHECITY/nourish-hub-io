-- Remove the redundant overlapping SELECT policy
DROP POLICY IF EXISTS "Block cross user profile access" ON public.profiles;