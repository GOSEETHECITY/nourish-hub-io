ALTER TABLE public.events ADD COLUMN county TEXT NOT NULL DEFAULT '';
ALTER TABLE public.events ADD COLUMN ai_generated_description BOOLEAN NOT NULL DEFAULT false;