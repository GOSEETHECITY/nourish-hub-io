
CREATE TABLE IF NOT EXISTS public.tax_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_listing_id uuid NOT NULL REFERENCES public.food_listings(id) ON DELETE CASCADE,
  nonprofit_id uuid NOT NULL REFERENCES public.nonprofits(id) ON DELETE CASCADE,
  venue_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  receipt_type text NOT NULL CHECK (receipt_type IN ('uploaded','generated')),
  pdf_path text NOT NULL,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_receipts TO authenticated;
GRANT ALL ON public.tax_receipts TO service_role;

ALTER TABLE public.tax_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all tax receipts"
  ON public.tax_receipts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Nonprofit members view their tax receipts"
  ON public.tax_receipts FOR SELECT TO authenticated
  USING (
    nonprofit_id IN (
      SELECT p.nonprofit_id FROM public.profiles p WHERE p.id = auth.uid() AND p.nonprofit_id IS NOT NULL
      UNION
      SELECT n.id FROM public.nonprofits n WHERE n.user_id = auth.uid()
    )
  );

CREATE POLICY "Venue members view tax receipts for their donations"
  ON public.tax_receipts FOR SELECT TO authenticated
  USING (
    venue_organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND organization_id IS NOT NULL
    )
  );

CREATE POLICY "Nonprofit members submit tax receipts"
  ON public.tax_receipts FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND nonprofit_id IN (
      SELECT p.nonprofit_id FROM public.profiles p WHERE p.id = auth.uid() AND p.nonprofit_id IS NOT NULL
      UNION
      SELECT n.id FROM public.nonprofits n WHERE n.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.food_listings fl
      WHERE fl.id = food_listing_id
        AND fl.nonprofit_claimed_id = tax_receipts.nonprofit_id
        AND fl.organization_id = tax_receipts.venue_organization_id
    )
  );

CREATE POLICY "Admins manage tax receipts"
  ON public.tax_receipts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.tax_receipts_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_tax_receipts_touch
  BEFORE UPDATE ON public.tax_receipts
  FOR EACH ROW EXECUTE FUNCTION public.tax_receipts_touch_updated_at();

CREATE OR REPLACE FUNCTION public.notify_on_tax_receipt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_np_name text;
BEGIN
  SELECT organization_name INTO v_np_name FROM public.nonprofits WHERE id = NEW.nonprofit_id;
  PERFORM public.notify_org_members(
    NEW.venue_organization_id,
    'tax_receipt_submitted',
    'Tax receipt available',
    COALESCE(v_np_name, 'A nonprofit') || ' submitted a tax receipt for your donation.',
    '/venue/donations',
    jsonb_build_object('listing_id', NEW.food_listing_id, 'receipt_id', NEW.id)
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_on_tax_receipt
  AFTER INSERT ON public.tax_receipts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_tax_receipt();

-- Storage RLS: path convention '<venue_org_id>/<nonprofit_id>/<listing_id>-<uuid>.pdf'
CREATE POLICY "Admins read tax receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tax-receipts' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Nonprofit members read own tax receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tax-receipts'
    AND (storage.foldername(name))[2] IN (
      SELECT p.nonprofit_id::text FROM public.profiles p WHERE p.id = auth.uid() AND p.nonprofit_id IS NOT NULL
      UNION
      SELECT n.id::text FROM public.nonprofits n WHERE n.user_id = auth.uid()
    )
  );

CREATE POLICY "Venue members read receipts for their org"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tax-receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid() AND organization_id IS NOT NULL
    )
  );

CREATE POLICY "Nonprofit members upload their tax receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tax-receipts'
    AND (storage.foldername(name))[2] IN (
      SELECT p.nonprofit_id::text FROM public.profiles p WHERE p.id = auth.uid() AND p.nonprofit_id IS NOT NULL
      UNION
      SELECT n.id::text FROM public.nonprofits n WHERE n.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages tax receipts objects"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'tax-receipts') WITH CHECK (bucket_id = 'tax-receipts');
