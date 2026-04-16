-- Partner leads table for Get Started + Partner Signup forms
create table if not exists public.partner_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  organization text,
  address text,
  pathway text not null default 'donate',
  comments text,
  source text,              -- 'get_started', 'business_signup', 'nonprofit_signup'
  created_at timestamptz not null default now()
);

-- Anyone can submit a lead (no auth required for marketing forms)
alter table public.partner_leads enable row level security;

create policy "Anyone can submit a partner lead"
  on public.partner_leads
  for insert
  to anon, authenticated
  with check (true);

-- Only admins can read leads
create policy "Admins can read partner leads"
  on public.partner_leads
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Admins full access
create policy "Admins full access partner leads"
  on public.partner_leads
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
