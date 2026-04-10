ALTER TABLE public.invitation_codes ADD COLUMN state TEXT NOT NULL DEFAULT '';
ALTER TABLE public.invitation_codes ADD COLUMN role_type TEXT NOT NULL DEFAULT 'Consumer'
  CONSTRAINT invitation_codes_role_type_check CHECK (role_type IN ('Consumer', 'Restaurant', 'Nonprofit'));
ALTER TABLE public.invitation_codes ADD COLUMN max_uses INTEGER NOT NULL DEFAULT 100;