
-- Create organizations_public view that excludes join_code for broad reads
CREATE OR REPLACE VIEW public.organizations_public
WITH (security_invoker = on) AS
  SELECT id, name, type, address, city, state, zip, county, 
         primary_contact_name, primary_contact_email, primary_contact_phone,
         billing_contact, government_regions, approval_status, created_at
  FROM public.organizations;

-- Create nonprofits_public view that excludes join_code
CREATE OR REPLACE VIEW public.nonprofits_public  
WITH (security_invoker = on) AS
  SELECT id, organization_name, ein, website, logo_url, primary_contact,
         primary_contact_email, primary_contact_phone, address, city, state, zip, county,
         operating_hours, approval_status, population_served, estimated_weekly_served,
         food_types_accepted, refrigeration, cold_storage, cabinetry,
         social_handles, user_id, created_at,
         proof_of_insurance_url, signed_agreement_url
  FROM public.nonprofits;
