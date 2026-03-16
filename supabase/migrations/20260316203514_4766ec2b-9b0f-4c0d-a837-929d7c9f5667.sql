-- Fix: Replace blanket public read on invite_codes with authenticated-only read
DROP POLICY IF EXISTS "invite_codes_public_read" ON public.invite_codes;

CREATE POLICY "invite_codes_authenticated_read"
ON public.invite_codes
FOR SELECT
TO authenticated
USING (true);