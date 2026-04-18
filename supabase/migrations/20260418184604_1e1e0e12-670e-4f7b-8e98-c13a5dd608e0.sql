-- Restrict partner_leads SELECT to admins only
DROP POLICY IF EXISTS "Authenticated users can read partner leads" ON public.partner_leads;

CREATE POLICY "Admins can read partner leads"
ON public.partner_leads
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Tighten consumer_badges INSERT: must belong to caller's own consumer record
DROP POLICY IF EXISTS "badges_insert_own" ON public.consumer_badges;

CREATE POLICY "badges_insert_own"
ON public.consumer_badges
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = (SELECT user_id FROM public.consumers WHERE id = consumer_badges.consumer_id)
);