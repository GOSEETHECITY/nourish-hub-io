
create extension if not exists pg_net;

create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
grant select on public.app_config to service_role;
alter table public.app_config enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname='admin reads config' and tablename='app_config') then
    create policy "admin reads config" on public.app_config for select
      to authenticated using (public.has_role(auth.uid(), 'admin'::app_role));
  end if;
end $$;

insert into public.app_config(key, value) values
  ('push_fanout_url', 'https://yaicfjdquvfifwtfpmbm.functions.supabase.co/internal-push-fanout')
on conflict (key) do update set value = excluded.value;

create table if not exists public.push_dispatch_log (
  id uuid primary key default gen_random_uuid(),
  trigger_name text not null,
  audience text not null,
  target text,
  title text,
  request_id bigint,
  created_at timestamptz not null default now()
);
grant select, insert on public.push_dispatch_log to service_role;
alter table public.push_dispatch_log enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname='admin reads dispatch log' and tablename='push_dispatch_log') then
    create policy "admin reads dispatch log" on public.push_dispatch_log for select
      to authenticated using (public.has_role(auth.uid(), 'admin'::app_role));
  end if;
end $$;

create or replace function public.dispatch_push(p_trigger text, p_body jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_url text; v_secret text; v_req_id bigint;
begin
  select value into v_url from public.app_config where key = 'push_fanout_url';
  select value into v_secret from public.app_config where key = 'push_internal_secret';
  if v_url is null then return; end if;
  select net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json','X-Internal-Secret', coalesce(v_secret,'')),
    body := p_body
  ) into v_req_id;
  insert into public.push_dispatch_log(trigger_name, audience, target, title, request_id)
  values (p_trigger, coalesce(p_body->>'audience',''), coalesce(p_body->>'city', p_body->>'consumer_id', p_body->>'user_id'), p_body->>'title', v_req_id);
end $$;

create or replace function public.push_on_event_published()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' and new.status = 'published' and new.category = 'grand_opening')
     or (tg_op = 'UPDATE' and new.status = 'published' and coalesce(old.status,'') <> 'published' and new.category = 'grand_opening') then
    perform public.dispatch_push('event_published', jsonb_build_object(
      'audience','city','city', new.city,
      'title','New grand opening near you',
      'body', coalesce(new.business_name, new.title) || ' — ' || to_char(new.event_date,'Mon DD'),
      'url', '/app/events/' || new.id));
  end if;
  return new;
end $$;
drop trigger if exists trg_push_event_published on public.events;
create trigger trg_push_event_published after insert or update on public.events
  for each row execute function public.push_on_event_published();

create or replace function public.push_on_badge_awarded()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.dispatch_push('badge_awarded', jsonb_build_object(
    'audience','consumer','consumer_id', new.consumer_id,
    'title','Badge unlocked: ' || new.badge_name,
    'body', coalesce(new.badge_description,'You earned a new badge.'),
    'url','/app/profile'));
  return new;
end $$;
drop trigger if exists trg_push_badge_awarded on public.consumer_badges;
create trigger trg_push_badge_awarded after insert on public.consumer_badges
  for each row execute function public.push_on_badge_awarded();

create or replace function public.push_on_flash_listing()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_city text; v_venue text;
begin
  if new.is_flash is true and (tg_op = 'INSERT' or coalesce(old.is_flash,false) = false) then
    select l.city, o.name into v_city, v_venue
      from public.locations l join public.organizations o on o.id = new.organization_id
      where l.id = new.location_id;
    if v_city is not null then
      perform public.dispatch_push('flash_listing', jsonb_build_object(
        'audience','city','city', v_city,
        'title','Flash rescue near you',
        'body', coalesce(v_venue,'A venue') || ' — ' || coalesce(new.pounds::text,'?') || ' lb, pick up by ' || to_char(new.pickup_window_end,'HH12:MI AM'),
        'url','/app/flash/' || new.id));
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_push_flash_listing on public.food_listings;
create trigger trg_push_flash_listing after insert or update on public.food_listings
  for each row execute function public.push_on_flash_listing();
