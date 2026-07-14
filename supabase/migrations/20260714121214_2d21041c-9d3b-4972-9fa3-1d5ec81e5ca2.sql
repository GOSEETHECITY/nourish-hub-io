
create or replace function public.push_on_event_published()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' and new.status = 'published' and new.category = 'grand_opening')
     or (tg_op = 'UPDATE' and new.status = 'published' and (old.status is null or old.status <> 'published') and new.category = 'grand_opening') then
    perform public.dispatch_push('event_published', jsonb_build_object(
      'audience','city','city', new.city,
      'title','New grand opening near you',
      'body', coalesce(new.business_name, new.title) || ' — ' || to_char(new.event_date,'Mon DD'),
      'url', '/app/events/' || new.id));
  end if;
  return new;
end $$;
