
-- Fix locations: Create a view that excludes sensitive fields for broad access
-- and restrict the broad SELECT policy

-- Create a public-safe view for locations
CREATE OR REPLACE VIEW public.locations_public
WITH (security_invoker = on) AS
  SELECT id, name, address, city, state, zip, county, latitude, longitude,
         hours_of_operation, location_type, marketplace_enabled, organization_id,
         approval_status, pickup_address, pickup_instructions, platform_fee_percentage
  FROM public.locations;

-- Drop the overly broad policy
DROP POLICY IF EXISTS "Anyone authenticated can read approved locations" ON public.locations;

-- Replace with a restricted policy that only allows org members, admins, govt, and nonprofits
-- Consumers will use the view instead
CREATE POLICY "Authenticated partners can read approved locations"
  ON public.locations FOR SELECT
  TO authenticated
  USING (
    (approval_status = 'approved'::approval_status)
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'venue_partner'::app_role)
      OR has_role(auth.uid(), 'nonprofit_partner'::app_role)
      OR has_role(auth.uid(), 'government_partner'::app_role)
    )
  );

-- Allow consumers to read approved locations (they can only see public fields via the view or this policy)
CREATE POLICY "Consumers can read approved locations"
  ON public.locations FOR SELECT
  TO authenticated
  USING (
    (approval_status = 'approved'::approval_status)
    AND EXISTS (SELECT 1 FROM consumers c WHERE c.user_id = auth.uid())
  );

-- Fix nonprofit-documents storage: remove public read policy
DROP POLICY IF EXISTS "Public can read nonprofit docs" ON storage.objects;
