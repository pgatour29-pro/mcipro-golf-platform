-- 1on1 (v1102): partners may upload UP TO 8 photos per profile — Pete 2026-09-04: "for the female golfers they can
-- upload up to 8 photos per profile". The client cap moves 12 → 8; this trigger makes the DB the authority
-- (photos still count while 'hidden' by an admin; 'removed' ones do not). Cap lives in oo_settings.max_partner_photos.
alter table public.oo_settings add column if not exists max_partner_photos int not null default 8;

create or replace function public.oo_media_cap() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_max int; v_n int;
begin
  if new.kind = 'photo' and new.status <> 'removed' then
    select coalesce((select s.max_partner_photos from public.oo_settings s limit 1), 8) into v_max;
    select count(*) into v_n from public.oo_media m
     where m.partner_id = new.partner_id and m.kind = 'photo' and m.status <> 'removed' and m.id <> new.id;
    if v_n >= v_max then raise exception 'max_photos' using errcode = '23514'; end if;
  end if;
  return new;
end $$;
drop trigger if exists oo_media_cap on public.oo_media;
create trigger oo_media_cap before insert or update of status, kind on public.oo_media
  for each row execute function public.oo_media_cap();
