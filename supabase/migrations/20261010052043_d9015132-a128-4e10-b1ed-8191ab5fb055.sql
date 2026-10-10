-- Fix 2: partner_leads readable by admins only (anon/auth INSERT policy left untouched)
DROP POLICY IF EXISTS "Authenticated read partner leads" ON public.partner_leads;
DROP POLICY IF EXISTS "Authenticated can read partner leads" ON public.partner_leads;
DROP POLICY IF EXISTS "Admins can read partner leads" ON public.partner_leads;
CREATE POLICY "Admins can read partner leads" ON public.partner_leads
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix 3: donation photos scoped to own org, admins, claiming nonprofit
DROP POLICY IF EXISTS "Authenticated users read donation photos" ON storage.objects;
CREATE POLICY "Admins read donation photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'donation-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Venue members read own donation photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'donation-photos' AND (storage.foldername(name))[1] IN (
    SELECT p.organization_id::text FROM public.profiles p
    WHERE p.id = auth.uid() AND p.organization_id IS NOT NULL));
CREATE POLICY "Claiming nonprofit reads donation photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'donation-photos' AND (storage.foldername(name))[2] IN (
    SELECT fl.id::text FROM public.food_listings fl
    WHERE fl.nonprofit_claimed_id IN (
      SELECT p.nonprofit_id FROM public.profiles p WHERE p.id = auth.uid() AND p.nonprofit_id IS NOT NULL
      UNION
      SELECT n.id FROM public.nonprofits n WHERE n.user_id = auth.uid())));