
CREATE TABLE public.donation_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_listing_id uuid NOT NULL REFERENCES public.food_listings(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit_value numeric NOT NULL DEFAULT 0 CHECK (unit_value >= 0),
  total_value numeric GENERATED ALWAYS AS (quantity * unit_value) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_donation_line_items_listing ON public.donation_line_items(food_listing_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.donation_line_items TO authenticated;
GRANT ALL ON public.donation_line_items TO service_role;

ALTER TABLE public.donation_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read line items"
ON public.donation_line_items FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.food_listings fl
    JOIN public.profiles p ON p.organization_id = fl.organization_id
    WHERE fl.id = donation_line_items.food_listing_id AND p.id = auth.uid()
  )
);

CREATE POLICY "Claiming nonprofit reads line items"
ON public.donation_line_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.food_listings fl
    JOIN public.profiles p ON p.nonprofit_id = fl.nonprofit_claimed_id
    WHERE fl.id = donation_line_items.food_listing_id AND p.id = auth.uid()
  )
);

CREATE POLICY "Org members insert line items"
ON public.donation_line_items FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.food_listings fl
    JOIN public.profiles p ON p.organization_id = fl.organization_id
    WHERE fl.id = donation_line_items.food_listing_id AND p.id = auth.uid()
  )
);

CREATE POLICY "Org members update line items"
ON public.donation_line_items FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.food_listings fl
    JOIN public.profiles p ON p.organization_id = fl.organization_id
    WHERE fl.id = donation_line_items.food_listing_id AND p.id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.food_listings fl
    JOIN public.profiles p ON p.organization_id = fl.organization_id
    WHERE fl.id = donation_line_items.food_listing_id AND p.id = auth.uid()
  )
);

CREATE POLICY "Org members delete line items"
ON public.donation_line_items FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.food_listings fl
    JOIN public.profiles p ON p.organization_id = fl.organization_id
    WHERE fl.id = donation_line_items.food_listing_id AND p.id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.donation_line_items_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_donation_line_items_updated_at
BEFORE UPDATE ON public.donation_line_items
FOR EACH ROW EXECUTE FUNCTION public.donation_line_items_touch_updated_at();

CREATE OR REPLACE FUNCTION public.sync_food_listing_value_from_line_items()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_listing uuid;
  v_sum numeric;
BEGIN
  v_listing := COALESCE(NEW.food_listing_id, OLD.food_listing_id);
  SELECT COALESCE(SUM(total_value), 0) INTO v_sum
    FROM public.donation_line_items WHERE food_listing_id = v_listing;
  UPDATE public.food_listings
     SET estimated_donation_value = v_sum
   WHERE id = v_listing;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_line_items_sync_ins
AFTER INSERT ON public.donation_line_items
FOR EACH ROW EXECUTE FUNCTION public.sync_food_listing_value_from_line_items();

CREATE TRIGGER trg_line_items_sync_upd
AFTER UPDATE ON public.donation_line_items
FOR EACH ROW EXECUTE FUNCTION public.sync_food_listing_value_from_line_items();

CREATE TRIGGER trg_line_items_sync_del
AFTER DELETE ON public.donation_line_items
FOR EACH ROW EXECUTE FUNCTION public.sync_food_listing_value_from_line_items();
