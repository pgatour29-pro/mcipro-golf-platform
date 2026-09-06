-- 1on1 (2026-09-06): every PARTNER GALLERY PHOTO is screened before any member can see it.
-- Pete: "do we have safeguards in place for photo uploads to make sure there is no nudity".
-- What existed: content-moderation.js (NSFWJS in the browser) — a good first line, but it is client-side, it
-- FAILS OPEN (CDN blocked / model error = upload allowed), and the storage RLS lets a signed-in partner PUT
-- straight into her own folder and insert the oo_media row with status 'visible'. Nothing server-side ever
-- looked at the bytes. This makes the DB the gate:
--   • a photo inserted from a browser session lands 'pending' — invisible to members (oo_media_sel already
--     requires status='visible'), visible only to her and to admins;
--   • the partner can no longer change a photo's status herself (the oo_media UPDATE policy allowed it);
--   • only the service role, through oo_media_screen(), can publish one — that is the edge function
--     oo-photo-check (Gemini), mirroring the v1100 face-photo rule. Classifier down = photo stays pending
--     (FAIL CLOSED) and waits for Admin → Photos.
-- Run: npx supabase db query --linked -f sql/oo_photo_screen_20260906.sql

alter table public.oo_media add column if not exists screen_check jsonb;

alter table public.oo_media drop constraint if exists oo_media_status_check;
alter table public.oo_media add constraint oo_media_status_check
  check (status in ('pending','visible','hidden','removed'));

-- new photos from a LOGGED-IN session start pending; a direct DB/service-role write (oo_uid() is null) is trusted,
-- and an admin uploading is trusted. A partner can never move her own photo's status.
create or replace function public.oo_media_gate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.kind = 'photo' and public.oo_uid() is not null and not public.oo_is_admin() then
      new.status := 'pending';
      new.screen_check := null;
    end if;
    return new;
  end if;
  if new.status is distinct from old.status and public.oo_uid() is not null and not public.oo_is_admin() then
    raise exception 'oo_media: status is set by the screening service' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists oo_media_gate_trg on public.oo_media;
create trigger oo_media_gate_trg before insert or update on public.oo_media
  for each row execute function public.oo_media_gate();

-- the screening service publishes or destroys a photo (service role only — the browser can never call it)
create or replace function public.oo_media_screen(p_media uuid, p_ok boolean, p_check jsonb default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_row jsonb;
begin
  if p_ok then
    update public.oo_media set status = 'visible', screen_check = coalesce(p_check, screen_check)
    where id = p_media and status = 'pending' returning to_jsonb(oo_media.*) into v_row;
  else
    -- rejected: the bytes are deleted by the caller; the row survives as an audit record only, and 'removed'
    -- keeps it out of every gallery AND out of the 8-photo cap
    update public.oo_media set status = 'removed', storage_path = null, screen_check = coalesce(p_check, screen_check)
    where id = p_media returning to_jsonb(oo_media.*) into v_row;
    update public.oo_partners set cover_media_id = null where cover_media_id = p_media;
  end if;
  if v_row is null then raise exception 'not_found'; end if;
  return v_row;
end $$;
revoke all on function public.oo_media_screen(uuid, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.oo_media_screen(uuid, boolean, jsonb) to service_role;

-- a cover must be a published photo (a pending one would show as a blank card in search)
create or replace function public.oo_cover_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.cover_media_id is not null and new.cover_media_id is distinct from old.cover_media_id then
    if not exists (select 1 from public.oo_media m where m.id = new.cover_media_id and m.partner_id = new.id and m.status = 'visible') then
      raise exception 'oo_partners: cover photo is not approved yet' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists oo_cover_guard_trg on public.oo_partners;
create trigger oo_cover_guard_trg before update on public.oo_partners
  for each row execute function public.oo_cover_guard();

select (select count(*) from public.oo_media where status = 'pending') as pending_now,
       (select count(*) from public.oo_media where status = 'visible') as visible_now;
