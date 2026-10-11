CREATE TABLE public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24),'hex'),
  org_kind text NOT NULL CHECK (org_kind IN ('venue','nonprofit','one_time_event')),
  organization_type text,
  organization_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  contact_title text,
  address text, city text, state text, zip text,
  ein text,
  event_name text, event_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','applied','verifying','pending_review','active','suspended','rejected')),
  current_step integer NOT NULL DEFAULT 1,
  ein_status text NOT NULL DEFAULT 'not_applicable' CHECK (ein_status IN ('not_applicable','pending','verified','needs_help')),
  ein_result jsonb,
  agreement_bypassed boolean NOT NULL DEFAULT false,
  docs_status text NOT NULL DEFAULT 'missing' CHECK (docs_status IN ('missing','submitted','approved','rejected')),
  rejection_reason text,
  admin_notes text,
  applicant_user_id uuid,
  assisted_by uuid,
  created_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_nonprofit_id uuid REFERENCES public.nonprofits(id) ON DELETE SET NULL,
  submitted_at timestamptz, reviewed_at timestamptz, reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.partner_applications(status);
CREATE INDEX ON public.partner_applications(applicant_user_id);
CREATE INDEX ON public.partner_applications(created_organization_id);
CREATE INDEX ON public.partner_applications(created_nonprofit_id);
REVOKE ALL ON public.partner_applications FROM anon, authenticated;
GRANT SELECT (id, org_kind, organization_type, organization_name, contact_name, contact_email, contact_phone, contact_title, address, city, state, zip, ein, event_name, event_date, status, current_step, ein_status, ein_result, agreement_bypassed, docs_status, rejection_reason, admin_notes, applicant_user_id, assisted_by, created_organization_id, created_nonprofit_id, submitted_at, reviewed_at, reviewed_by, created_at, updated_at) ON public.partner_applications TO authenticated;
GRANT ALL ON public.partner_applications TO service_role;
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read applications" ON public.partner_applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Applicants read own application" ON public.partner_applications FOR SELECT TO authenticated USING (applicant_user_id = auth.uid());
CREATE TRIGGER partner_applications_touch BEFORE UPDATE ON public.partner_applications FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.agreement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_kind text NOT NULL CHECK (org_kind IN ('venue','nonprofit','one_time_event')),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  nonprofit_id uuid REFERENCES public.nonprofits(id) ON DELETE CASCADE,
  version integer NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  is_current boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.agreement_templates(org_kind, is_current);
CREATE INDEX ON public.agreement_templates(organization_id);
CREATE INDEX ON public.agreement_templates(nonprofit_id);
GRANT SELECT ON public.agreement_templates TO anon;
GRANT SELECT, INSERT, UPDATE ON public.agreement_templates TO authenticated;
GRANT ALL ON public.agreement_templates TO service_role;
ALTER TABLE public.agreement_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Standard templates are public" ON public.agreement_templates FOR SELECT TO anon, authenticated USING (organization_id IS NULL AND nonprofit_id IS NULL);
CREATE POLICY "Admins manage templates" ON public.agreement_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.agreement_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.partner_applications(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  nonprofit_id uuid REFERENCES public.nonprofits(id) ON DELETE SET NULL,
  template_id uuid NOT NULL REFERENCES public.agreement_templates(id),
  template_version integer NOT NULL,
  agreement_title text NOT NULL,
  signed_body text NOT NULL,
  body_sha256 text NOT NULL,
  signer_name text NOT NULL,
  signer_title text NOT NULL,
  signer_email text NOT NULL,
  authorized_attestation boolean NOT NULL CHECK (authorized_attestation),
  consent_to_electronic boolean NOT NULL CHECK (consent_to_electronic),
  ip_address text,
  user_agent text,
  signed_by_user_id uuid,
  signed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.agreement_signatures(application_id);
CREATE INDEX ON public.agreement_signatures(organization_id);
CREATE INDEX ON public.agreement_signatures(nonprofit_id);
CREATE INDEX ON public.agreement_signatures(template_id);
GRANT SELECT ON public.agreement_signatures TO authenticated;
GRANT SELECT, INSERT ON public.agreement_signatures TO service_role;
ALTER TABLE public.agreement_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and members read signatures" ON public.agreement_signatures FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  OR nonprofit_id IN (SELECT nonprofit_id FROM public.profiles WHERE id = auth.uid()));
CREATE OR REPLACE FUNCTION public.agreement_signatures_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.signed_body = OLD.signed_body AND NEW.body_sha256 = OLD.body_sha256
     AND NEW.signer_name = OLD.signer_name AND NEW.signed_at = OLD.signed_at AND NEW.template_id = OLD.template_id THEN
    RETURN NEW; -- linking to created org/nonprofit only
  END IF;
  RAISE EXCEPTION 'Signed agreements cannot be changed or deleted';
END $$;
CREATE TRIGGER agreement_signatures_no_change BEFORE UPDATE OR DELETE ON public.agreement_signatures FOR EACH ROW EXECUTE FUNCTION public.agreement_signatures_immutable();
GRANT UPDATE (organization_id, nonprofit_id) ON public.agreement_signatures TO service_role;

CREATE TABLE public.partner_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.partner_applications(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  nonprofit_id uuid REFERENCES public.nonprofits(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  file_path text NOT NULL,
  file_name text,
  expires_on date,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','approved','rejected','superseded')),
  review_notes text,
  reviewed_by uuid, reviewed_at timestamptz,
  last_reminder_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.partner_documents(application_id);
CREATE INDEX ON public.partner_documents(organization_id);
CREATE INDEX ON public.partner_documents(nonprofit_id);
CREATE INDEX ON public.partner_documents(expires_on);
GRANT SELECT ON public.partner_documents TO authenticated;
GRANT ALL ON public.partner_documents TO service_role;
ALTER TABLE public.partner_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and members read documents" ON public.partner_documents FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  OR nonprofit_id IN (SELECT nonprofit_id FROM public.profiles WHERE id = auth.uid()));
CREATE TRIGGER partner_documents_touch BEFORE UPDATE ON public.partner_documents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Access + pause flags
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS posting_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_reason text;
ALTER TABLE public.nonprofits ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS posting_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_reason text,
  ADD COLUMN IF NOT EXISTS ein_last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS ein_check_result jsonb;
GRANT SELECT (is_active, posting_paused, paused_reason) ON public.organizations TO authenticated;
GRANT SELECT (is_active, posting_paused, paused_reason) ON public.nonprofits TO authenticated;

CREATE OR REPLACE FUNCTION public.food_listings_enforce_partner_access() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; n record;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT is_active, posting_paused, approval_status INTO o FROM organizations WHERE id = NEW.organization_id;
    IF o IS NOT NULL AND (NOT o.is_active OR o.posting_paused OR o.approval_status <> 'approved') THEN
      RAISE EXCEPTION 'Posting is paused for this organization until it is active and approved';
    END IF;
  END IF;
  IF NEW.nonprofit_claimed_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.nonprofit_claimed_id IS DISTINCT FROM OLD.nonprofit_claimed_id) THEN
    SELECT is_active, posting_paused INTO n FROM nonprofits WHERE id = NEW.nonprofit_claimed_id;
    IF n IS NOT NULL AND (NOT n.is_active OR n.posting_paused) THEN
      RAISE EXCEPTION 'Donation activity is paused for this nonprofit until reviewed';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.food_listings_enforce_partner_access() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER food_listings_enforce_partner_access BEFORE INSERT OR UPDATE OF nonprofit_claimed_id ON public.food_listings FOR EACH ROW EXECUTE FUNCTION public.food_listings_enforce_partner_access();

-- Seed version 1 templates
INSERT INTO public.agreement_templates (org_kind, version, title, body) VALUES
('venue',1,'Hariet.AI Venue Partner Agreement','This Venue Partner Agreement is between Hariet.AI and the organization named in this application ("Partner").

1. Participation. Partner may post surplus food donations through the Hariet.AI platform for pickup by verified nonprofit organizations.
2. Food safety. Partner will only donate food that is apparently wholesome and handled in accordance with applicable food safety laws and its health permit.
3. Good Samaritan protection. Donations are made in good faith under the Bill Emerson Good Samaritan Food Donation Act and applicable state law.
4. Insurance. Partner will maintain general liability insurance and keep a current certificate of insurance on file. Posting access pauses if coverage lapses.
5. Accuracy. Partner will describe donations accurately, including weight and food type.
6. Data. Partner authorizes Hariet.AI to report aggregated impact data.
7. Term. Either party may end this agreement with written notice. The Hariet.AI Terms of Service also apply.'),
('nonprofit',1,'Hariet.AI Nonprofit Partner Agreement','This Nonprofit Partner Agreement is between Hariet.AI and the organization named in this application ("Partner").

1. Eligibility. Partner represents that it is a 501(c)(3) public charity in good standing and will notify Hariet.AI of any change in exempt status.
2. Use of food. Partner will use donated food solely for the care of the ill, the needy, or infants, and will not sell or exchange it.
3. Pickup. Partner will pick up claimed donations within the posted window and report problems promptly.
4. Food handling. Partner will store and distribute food safely.
5. Written statements. Partner will provide donors written acknowledgment of donations where requested, including through platform-generated receipts.
6. Insurance. Partner will keep a current certificate of insurance on file. Activity pauses if coverage lapses.
7. Reporting. Partner will complete post-pickup impact surveys in good faith.
8. Term. Either party may end this agreement with written notice. The Hariet.AI Terms of Service also apply.'),
('one_time_event',1,'Hariet.AI One-Time Event Donor Agreement','This One-Time Event Donor Agreement is between Hariet.AI and the event host named in this application ("Donor").

1. Scope. Donor may post surplus food from the single event named in this application. The account becomes dormant after the event.
2. Food safety. Donor will only donate food that is apparently wholesome and was handled safely.
3. Good Samaritan protection. Donations are made in good faith under the Bill Emerson Good Samaritan Food Donation Act.
4. Insurance. Donor (or its caterer/venue) will provide a current certificate of insurance.
5. Accuracy. Donor will describe donations accurately.
6. The Hariet.AI Terms of Service also apply.');

CREATE POLICY "Admins read partner documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'partner-documents' AND public.has_role(auth.uid(),'admin'));

SELECT cron.schedule('partner-insurance-daily','0 14 * * *', $$SELECT public.invoke_scheduled_function('partner-compliance', '{"job":"insurance"}'::jsonb)$$);
SELECT cron.schedule('partner-ein-weekly','0 15 * * 1', $$SELECT public.invoke_scheduled_function('partner-compliance', '{"job":"ein"}'::jsonb)$$);