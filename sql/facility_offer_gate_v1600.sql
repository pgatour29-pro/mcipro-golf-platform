-- =====================================================================================
-- v1600: Send offer to a facility group (fx_* audiences) needs that facility's own pro shop PIN.
-- v1599 let the browser insert the offer row itself; course_offers takes inserts from anon, so anyone with the
-- public key could have aimed an fx_* offer at a facility's golfers without its PIN. Now:
--   create_facility_offer(token, ...)  checks proshop_desk_tokens.facility_id, builds the row server-side
--   course_offers_fx_guard trigger     refuses any anon/authenticated insert, or segment change, carrying fx_*
-- Rollback: facility_offer_gate_v1600_ROLLBACK.sql
-- =====================================================================================
begin;

create or replace function public.course_offers_fx_guard() returns trigger language plpgsql as $$
begin
  if coalesce(new.segment->>'audience', '') like 'fx\_%'
     and (tg_op = 'INSERT' or new.segment is distinct from old.segment)
     and current_user in ('anon', 'authenticated') then
    raise exception 'FACILITY_OFFER: facility groups are sent from the pro shop (create_facility_offer)' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists course_offers_fx_guard on public.course_offers;
create trigger course_offers_fx_guard before insert or update on public.course_offers
  for each row execute function public.course_offers_fx_guard();

create or replace function public.create_facility_offer(p_token text, p_facility text, p_segment text, p_days integer,
  p_title text, p_body text, p_cta text default null, p_valid_to timestamptz default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_flag record; v_name text; v_id uuid; v_days int := greatest(7, least(730, coalesce(p_days, 90)));
begin
  if not exists (select 1 from public.proshop_desk_tokens t where t.token = p_token and t.expires_at > now() and t.facility_id = p_facility) then
    raise exception 'FACILITY_TOKEN: sign in with this facility''s pro shop PIN' using errcode = '42501';
  end if;
  if p_segment not in ('flagship_only', 'members_idle_30', 'weekend_only', 'guests_3plus') then raise exception 'FACILITY_SEGMENT' using errcode = '22023'; end if;
  if coalesce(btrim(p_title), '') = '' or coalesce(btrim(p_body), '') = '' then raise exception 'FACILITY_OFFER_EMPTY' using errcode = '22023'; end if;
  if p_cta is not null and p_cta not in ('booking', 'caddy', 'proshop') then raise exception 'FACILITY_OFFER_CTA' using errcode = '22023'; end if;
  if p_valid_to is not null and p_valid_to <= now() then raise exception 'FACILITY_OFFER_ENDED' using errcode = '22023'; end if;
  select f.name into v_name from public.facilities f where f.id = p_facility;
  select fc.slug, fc.course_ref into v_flag from public.facility_courses fc join public.facilities f on f.id = fc.facility_id
   where fc.facility_id = p_facility order by (fc.slug = f.flagship_slug) desc, fc.sort limit 1;
  insert into public.course_offers (course_id, course_name, audience, offer_type, title, body, cta_label, cta_target, segment, lang,
                                    priority, valid_from, valid_to, status, created_by)
  values (coalesce(v_flag.course_ref, v_flag.slug), v_name, 'golfer', 'promotion', left(btrim(p_title), 120), left(btrim(p_body), 1000),
          case p_cta when 'booking' then 'Book a tee time' when 'caddy' then 'Book a caddy' when 'proshop' then 'Pro shop' end, p_cta,
          jsonb_build_object('audience', 'fx_' || p_segment, 'venue', p_facility, 'days', v_days), '{}'::jsonb,
          'normal', now(), p_valid_to, 'active', 'proshop:' || p_facility)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.create_facility_offer(text, text, text, integer, text, text, text, timestamptz) from public;
grant execute on function public.create_facility_offer(text, text, text, integer, text, text, text, timestamptz) to anon, authenticated;

commit;
