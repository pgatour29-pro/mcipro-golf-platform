-- v1591 (2026-10-16) Pete: "All of the courses should be populated" — Call PINs next to the golfer on EVERY course's
-- pro shop, not only the seven with their own PIN. A course on the shared login had no desk token, so desk_call_pins
-- never ran. Now the shared login gets a token for the course it picked. A course WITH its own PIN (or inside a
-- facility with one) is refused here: it signs in with its own PIN as before. Exposure check before shipping:
-- call_pin_get(p_golfer) already returns any golfer's PIN to the anon key (no JWT for LIFF users yet), so this token
-- adds no new read path; desk_call_pins still answers only for golfers tied to that course.
alter table public.proshop_desk_tokens add column if not exists shared boolean not null default false;
-- v1591b (security review): who minted a shared token, so minting is rate-limited per IP and auditable
alter table public.proshop_desk_tokens add column if not exists ip text;

create or replace function public.proshop_shared_desk_token(p_course text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  k    text := nullif(btrim(coalesce(p_course, '')), '');
  cid  text;
  ks   text[];
  own  text[];
  tok  text;
  h    jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  v_ip text := coalesce(h->>'cf-connecting-ip', split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1));
begin
  if k is null then return jsonb_build_object('ok', false, 'reason', 'course'); end if;
  select c.id into cid from public.courses c where c.id = k limit 1;
  if cid is null then select coalesce(v.course_ref, v.slug) into cid from public.course_venues v where v.slug = k limit 1; end if;
  if cid is null then return jsonb_build_object('ok', false, 'reason', 'course'); end if;
  select array_agg(distinct x) into ks from (
    select cid x union select v.slug from public.course_venues v where v.course_ref = cid or v.slug = cid or v.slug = k) q;
  select array_agg(distinct x) into own from (
    select p.course_id x from public.proshop_pins p
    union select v.slug from public.proshop_pins p join public.course_venues v on v.course_ref = p.course_id or v.slug = p.course_id
    union select fc.slug from public.proshop_facility_pins fp join public.facility_courses fc on fc.facility_id = fp.facility_id
    union select fc.course_ref from public.proshop_facility_pins fp join public.facility_courses fc on fc.facility_id = fp.facility_id) q;
  if ks && coalesce(own, '{}') then return jsonb_build_object('ok', false, 'reason', 'own_pin'); end if;
  if nullif(v_ip, '') is not null and (select count(*) from public.proshop_desk_tokens t
        where t.shared and t.ip = v_ip and t.created_at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('ok', false, 'reason', 'busy');
  end if;
  tok := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.proshop_desk_tokens (token, course_id, shared, expires_at, ip) values (tok, cid, true, now() + interval '30 days', nullif(v_ip, ''));
  delete from public.proshop_desk_tokens where expires_at < now();
  return jsonb_build_object('ok', true, 'desk_token', tok, 'course_id', cid);
end $$;
revoke all on function public.proshop_shared_desk_token(text) from public;
grant execute on function public.proshop_shared_desk_token(text) to anon, authenticated;
