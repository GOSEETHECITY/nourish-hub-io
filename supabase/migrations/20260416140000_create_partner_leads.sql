-- Partner leads table for Get Started + Partner Signup forms
CREATE TABLE IF NOT EXISTS public.partner_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  organization text,
  address text,
  pathway text NOT NULL DEFAULT 'donate',
  comments text,
  source text,              -- 'get_started', 'business_signup', 'nonprofit_signup'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;

-- Grant table-level permissions
GRANT INSERT ON public.partner_leads TO anon, authenticated;
GRANT SELECT ON public.partner_leads TO authenticated;
GRANT UPDATE, DELETE ON public.partner_leads TO authenticated;

-- Anyone can submit a lead (no auth required for marketing forms)
CREATE POLICY "Anyone can submit a partner lead"
  ON public.partner_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can read leads
CREATE POLICY "Authenticated users can read partner leads"
  ON public.partner_leads
  FOR SELECT
  TO authenticated
  USING (true);
