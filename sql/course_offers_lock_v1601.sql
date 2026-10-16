-- =====================================================================================
-- v1601 (Pete 2026-10-16): "only the golf courses can send offers, lock those keys down"
-- Before: course_offers took INSERT/UPDATE from anon + authenticated (column grants + policies co_insert/co_update =
-- true), so anyone holding the public app key could create, edit, pause or withdraw any course's offer; the
-- Marketing dashboard opens on the shared 000000 PIN with any course.
-- After: the table is read-only to the app. Every course-side write goes through a SECURITY DEFINER function that
-- checks the course's own pro shop credential — a desk token from proshop_pin_login whose keys cover that course:
--   course_offer_create(token, row)        Marketing campaigns + tee-sheet hot deals
--   course_offer_set_status(token, id, s)  pause / resume / withdraw
-- Untouched (already server-side): promo_post/withdraw (course PIN), create_facility_offer (facility token),
-- claim_hot_deal, promo_claim, promo_seen, teetime_book, golfer_cancel_booking, pc_send_deal, deliver/expire.
-- Rollback: course_offers_lock_v1601_ROLLBACK.sql
-- =====================================================================================
begin;

create or replace function public._offer_course_ok(p_token text, p_course text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_course, '') <> '' and exists (
    select 1 from (select public._desk_keys(p_token) k) q
     where q.k is not null
       and (p_course = any(q.k) or public._import_key_match(p_course, q.k) or coalesce(public.course_venue(p_course), '') = any(q.k)))
$$;
revoke all on function public._offer_course_ok(text, text) from public, anon, authenticated;

create or replace function public.course_offer_create(p_token text, p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_course text := btrim(coalesce(p->>'course_id', '')); v_seg jsonb := coalesce(p->'segment', '{}'::jsonb);
        v_status text := coalesce(p->>'status', 'active'); v_venue text; v_id uuid;
begin
  if not public._offer_course_ok(p_token, v_course) then
    raise exception 'OFFER_COURSE: only the course can send its offers — sign in with its own pro shop PIN' using errcode = '42501';
  end if;
  if jsonb_typeof(v_seg) <> 'object' then raise exception 'OFFER_SEGMENT' using errcode = '22023'; end if;
  if coalesce(v_seg->>'audience', '') like 'fx\_%' then raise exception 'OFFER_SEGMENT: facility groups use create_facility_offer' using errcode = '22023'; end if;
  v_venue := public.course_venue(v_course);
  if v_seg ? 'venue' and v_venue is not null then v_seg := jsonb_set(v_seg, '{venue}', to_jsonb(v_venue)); end if;   -- a course aims at its own venue only
  if v_status not in ('active', 'draft') then raise exception 'OFFER_STATUS' using errcode = '22023'; end if;
  if coalesce(btrim(p->>'title'), '') = '' or coalesce(btrim(p->>'body'), '') = '' then raise exception 'OFFER_EMPTY' using errcode = '22023'; end if;
  insert into public.course_offers (course_id, course_name, audience, offer_type, title, body, cta_label, cta_target, segment, lang, priority,
                                    valid_from, valid_to, status, created_by, deal)
  values (v_course, left(coalesce(nullif(btrim(p->>'course_name'), ''), (select c.name from public.courses c where c.id = v_course), v_course), 160),
          coalesce(p->>'audience', 'golfer'), coalesce(p->>'offer_type', 'promotion'),
          left(btrim(p->>'title'), 160), left(btrim(p->>'body'), 2000), left(nullif(btrim(p->>'cta_label'), ''), 60), left(nullif(btrim(p->>'cta_target'), ''), 500),
          v_seg, case when jsonb_typeof(p->'lang') = 'object' then p->'lang' else '{}'::jsonb end, coalesce(p->>'priority', 'normal'),
          coalesce((p->>'valid_from')::timestamptz, now()), (p->>'valid_to')::timestamptz, v_status,
          left(coalesce(nullif(btrim(p->>'created_by'), ''), 'course'), 80), case when jsonb_typeof(p->'deal') = 'object' then p->'deal' end)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.course_offer_create(text, jsonb) from public;
grant execute on function public.course_offer_create(text, jsonb) to anon, authenticated;

create or replace function public.course_offer_set_status(p_token text, p_id uuid, p_status text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_course text;
begin
  if p_status not in ('active', 'paused', 'deleted') then raise exception 'OFFER_STATUS' using errcode = '22023'; end if;
  select o.course_id into v_course from public.course_offers o where o.id = p_id;
  if not found then return false; end if;
  if not public._offer_course_ok(p_token, v_course) then
    raise exception 'OFFER_COURSE: only the course can change its offers — sign in with its own pro shop PIN' using errcode = '42501';
  end if;
  update public.course_offers set status = p_status, updated_at = now() where id = p_id;
  return true;
end $$;
revoke all on function public.course_offer_set_status(text, uuid, text) from public;
grant execute on function public.course_offer_set_status(text, uuid, text) to anon, authenticated;

-- the app can read offers, never write them
drop policy if exists co_insert on public.course_offers;
drop policy if exists co_update on public.course_offers;
revoke insert, update, delete on public.course_offers from anon, authenticated;
revoke insert (audience,body,course_id,course_name,created_at,created_by,cta_label,cta_target,deal,id,lang,offer_type,priority,push_recipients,push_sent_at,segment,status,title,updated_at,valid_from,valid_to), update (audience,body,course_id,course_name,created_at,created_by,cta_label,cta_target,deal,id,lang,offer_type,priority,push_recipients,push_sent_at,segment,status,title,updated_at,valid_from,valid_to) on public.course_offers from anon, authenticated;

commit;
