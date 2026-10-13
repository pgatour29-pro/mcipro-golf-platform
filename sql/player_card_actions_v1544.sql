-- v1544 PLAYER CARD: the pro shop acts on a golfer from the tee sheet (Pete 2026-10-13, mockups player-card-20261013).
--   1. caddy_bookings.guest_of — a guest's caddy sits UNDER the player who brought them (event panel, booking dialog, card)
--   2. a course's own-PIN desk token also authorises promo_post / promo_withdraw (it was issued by that PIN)
--   3. ONE deal to ONE golfer: pc_deals (their filters + consent + which live deals match) / pc_send_deal
--      — only deals their own filters allow; delivery = deliver_course_offer (alerts switch, 2/day cap, quiet hours)
--   4. course ↔ golfer DIRECT messages (no event): event_course_messages rows with event_id NULL; pc_thread reads a
--      golfer's whole thread with the course; a golfer's reply to COURSE-<slug> is never lost (no thread = direct row)
-- On top of sql/course_thread_*_20261013.sql + sql/course_inbox_alerts_20261013.sql.

begin;

-- ---------- 1. guest caddies ----------
alter table public.caddy_bookings add column if not exists guest_of text;
comment on column public.caddy_bookings.guest_of is 'v1544: this job is a GUEST''s caddy, brought by this player (line id, or n:<lower name>)';

-- ---------- 2. desk token = the course PIN for deals ----------
create or replace function public._promo_pin_check(p_slug text, p_pin text)
returns text language plpgsql security definer set search_path to 'public' as $fn$
begin
  -- v1544: the pro shop's desk token (issued by this course's own PIN login — a facility PIN too) counts as the PIN
  if coalesce(length(p_pin), 0) > 12 and p_slug = any (coalesce(public._desk_keys(p_pin), '{}'::text[])) then return null; end if;
  if not exists (select 1 from public.proshop_pins pp
                  where pp.course_id = p_slug or pp.course_id = (select v.course_ref from public.course_venues v where v.slug = p_slug)) then
    return 'no_pin';
  end if;
  if (select count(*) from public.promo_pin_fails f where f.slug = p_slug and f.at > now() - interval '1 hour') >= 10 then return 'locked'; end if;
  if not public.teetime_pin_ok(p_slug, p_pin) then
    insert into public.promo_pin_fails (slug) values (p_slug);
    delete from public.promo_pin_fails where at < now() - interval '1 day';
    return 'pin';
  end if;
  return null;
end $fn$;

-- ---------- 3. deals for one golfer ----------
create or replace function public.pc_deals(p_token text, p_slug text, p_golfer text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $fn$
declare
  keys text[] := coalesce(public._desk_keys(nullif(p_token, '')), '{}'::text[]);
  g    public.golfer_deal_prefs;
  out  jsonb;
begin
  if not (p_slug = any (keys)) then return jsonb_build_object('ok', false, 'reason', 'token'); end if;
  select * into g from public.golfer_deal_prefs where golfer_id = p_golfer;
  select jsonb_build_object('ok', true,
    'prefs', case when g.golfer_id is null then null else jsonb_build_object('types', g.types, 'regions', g.regions, 'days', g.days, 'tod', g.tod,
               'max_price', g.max_price, 'scope', g.scope, 'alerts', g.alerts) end,
    'offers_on', coalesce((select np.notify_offers from public.notification_preferences np where np.user_id = p_golfer), false),
    'follows', exists (select 1 from public.course_follows cf where cf.golfer_line_id = p_golfer
                        and (cf.course_id = p_slug or public.course_venue(cf.course_id) = p_slug)),
    'pushed_today', (select count(*) from public.course_offer_reads x where x.reader_line_id = p_golfer and x.pushed_at > now() - interval '24 hours'),
    'cap', 2,
    'deals', coalesce((select jsonb_agg(jsonb_build_object(
        'id', o.id, 'title', o.title, 'type', o.offer_type, 'price', o.price, 'unit', o.unit,
        'play_from', o.play_from, 'play_to', o.play_to, 'time_from', o.time_from, 'time_to', o.time_to, 'valid_to', o.valid_to,
        'left', o.limit_left, 'match', public._deal_for(p_golfer, o),
        'sent_at', (select x.pushed_at from public.course_offer_reads x where x.offer_id = o.id and x.reader_line_id = p_golfer),
        'in_inbox', exists (select 1 from public.course_offer_reads x where x.offer_id = o.id and x.reader_line_id = p_golfer))
        order by public._deal_for(p_golfer, o) desc, o.valid_to)
      from public.course_offers o
      where o.venue_slug = p_slug and o.on_wall and o.status = 'active' and o.valid_to > now()), '[]'::jsonb))
  into out;
  return out;
end $fn$;
grant execute on function public.pc_deals(text, text, text) to anon, authenticated;

create or replace function public.pc_send_deal(p_token text, p_slug text, p_offer uuid, p_golfer text, p_by text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare
  keys text[] := coalesce(public._desk_keys(nullif(p_token, '')), '{}'::text[]);
  o    public.course_offers;
  r    jsonb;
  pushed boolean;
  v_from text;
  v_name text;
  v_text text;
  old_n int; old_at timestamptz;
begin
  if not (p_slug = any (keys)) then return jsonb_build_object('ok', false, 'reason', 'token'); end if;
  select * into o from public.course_offers where id = p_offer;
  if o.id is null or o.venue_slug is distinct from p_slug then return jsonb_build_object('ok', false, 'reason', 'offer'); end if;
  if not public._deal_for(p_golfer, o) then return jsonb_build_object('ok', false, 'reason', 'filters'); end if;   -- the golfer's own choice
  old_n := o.push_recipients; old_at := o.push_sent_at;
  r := public.deliver_course_offer(p_offer, array[p_golfer], 2);
  if r ? 'error' then return jsonb_build_object('ok', false, 'reason', r->>'error'); end if;
  -- deliver_course_offer writes ITS count onto the offer: keep the campaign's own numbers
  pushed := r->'push' ? p_golfer;
  update public.course_offers set push_recipients = coalesce(old_n, 0) + case when pushed then 1 else 0 end,
         push_sent_at = case when pushed then now() else old_at end where id = p_offer;
  if pushed then
    v_from := 'COURSE-' || p_slug;
    v_name := coalesce((select name from public.course_venues where slug = p_slug), o.course_name, 'Pro shop');
    insert into public.user_profiles (line_user_id, name, role) values (v_from, v_name, 'proshop') on conflict (line_user_id) do nothing;
    v_text := '🏷 ' || o.title || coalesce(' · ฿' || to_char(o.price, 'FM999,999'), '')
              || coalesce(E'\n' || nullif(concat_ws(' · ',
                   case when o.play_from is not null then to_char(o.play_from, 'DD/MM') || coalesce('–' || to_char(o.play_to, 'DD/MM'), '') end,
                   case when o.time_from is not null then o.time_from || coalesce('–' || o.time_to, '') end), ''), '')
              || E'\nTee Times › Promotions';
    insert into public.direct_messages (sender_line_id, recipient_line_id, message_text) values (v_from, p_golfer, v_text);
    if p_golfer ~ '^U[0-9a-f]{32}$' then
      perform net.http_post(url := 'https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/line-push-notification',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object('type', 'new_message', 'record',
                  jsonb_build_object('recipient_id', p_golfer, 'sender_id', v_from, 'sender_name', v_name, 'content', v_text)));
    end if;
  end if;
  return jsonb_build_object('ok', true, 'pushed', pushed,
    'why', case when pushed then null
                when r->'suppressed_cap' ? p_golfer then 'cap'
                when r->'suppressed_quiet_hours' ? p_golfer then 'quiet'
                else 'alerts_off' end);
end $fn$;
grant execute on function public.pc_send_deal(text, text, uuid, text, text) to anon, authenticated;

-- ---------- 4. direct course ↔ golfer messages ----------
alter table public.event_course_messages alter column event_id drop not null;
alter table public.event_course_pings alter column event_id drop not null;

create or replace function public.ecm_resolve_recipients()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare
  ev   record;
  org  text[];
  regs text[];
  want text[];
begin
  if new.side <> 'course' or new.kind <> 'text' then return new; end if;
  if new.event_id is null then
    -- v1544 direct message from the course: real golfer accounts only (never a course / system sender)
    want := coalesce(new.to_ids, '{}') || coalesce(new.cc_ids, '{}') || coalesce(new.bcc_ids, '{}');
    new.to_kind := 'custom';
    new.org_sees := false;
    -- only pc_send_message (desk token checked) may address golfers directly; a raw insert reaches nobody
    if coalesce(current_setting('ecm.direct_ok', true), '') <> '1' then new.delivered_to := '{}'; return new; end if;
    new.delivered_to := array(
      select distinct w from unnest(want) w
      where coalesce(w, '') <> '' and w !~ '^(COURSE-|CADDY-MASTER)'
        and exists (select 1 from public.user_profiles p where p.line_user_id = w));
    return new;
  end if;
  select e.id, e.society_id, e.organizer_id into ev from public.society_events e where e.id = new.event_id;
  org := array(
    select distinct x from (
      select ev.organizer_id::text as x
      union all select sp.organizer_id::text from public.society_profiles sp where sp.id::text = ev.society_id::text
      union all select s.organizer_id::text from public.societies s where s.id::text = ev.society_id::text
      union all select ev.society_id::text
    ) q where coalesce(x, '') <> '');
  regs := array(select distinct r.player_id from public.event_registrations r where r.event_id = new.event_id and coalesce(r.player_id, '') <> '');
  if coalesce(new.to_kind, 'event') = 'event' then
    new.to_kind := 'event';
    new.delivered_to := array(select distinct x from unnest(org || regs) x);
    new.org_sees := true;
    return new;
  end if;
  want := coalesce(new.to_ids, '{}') || coalesce(new.cc_ids, '{}') || coalesce(new.bcc_ids, '{}');
  new.org_sees := 'ORGANIZER' = any (want) or want && org;
  new.delivered_to := array(
    select distinct x from (
      select unnest(org) as x where 'ORGANIZER' = any (want)
      union all select w from unnest(want) w where w <> 'ORGANIZER'
    ) q
    where coalesce(x, '') <> '' and (x = any (org) or x = any (regs)));
  return new;
end $fn$;

create or replace function public.ecm_deliver()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare
  ev      record;
  v_from  text;
  v_name  text;
  v_text  text;
  v_lang  text;
  rid     text;
  show_rc boolean;
begin
  if new.side <> 'course' or new.kind <> 'text' or coalesce(array_length(new.delivered_to, 1), 0) = 0 then return null; end if;
  if new.event_id is not null then select e.title, e.event_date into ev from public.society_events e where e.id = new.event_id; end if;
  v_from := 'COURSE-' || coalesce(nullif(new.course_slug, ''), 'course');
  v_name := coalesce(nullif(new.sender_name, ''), 'Pro shop');
  insert into public.user_profiles (line_user_id, name, role) values (v_from, v_name, 'proshop')
    on conflict (line_user_id) do nothing;
  show_rc := new.to_kind <> 'event' and (coalesce(new.cc_label, '') <> '' or coalesce(new.to_label, '') like '%,%');
  foreach rid in array new.delivered_to loop
    v_lang := public.ecm_lang(rid);
    v_text := '';
    if new.event_id is not null then
      v_text := coalesce(ev.title, '') || coalesce(' · ' || case v_lang when 'en' then to_char(ev.event_date, 'Dy DD Mon') else to_char(ev.event_date, 'DD/MM') end, '');
    end if;
    if show_rc then
      v_text := v_text || case when v_text = '' then '' else E'\n' end
        || case v_lang when 'th' then 'ถึง' when 'ko' then '받는 사람' when 'ja' then '宛先' else 'To' end || ': ' || public.ecm_label(new.to_label, v_lang)
        || coalesce(E'\n' || case v_lang when 'th' then 'สำเนา' when 'ko' then '참조' when 'ja' then 'CC' else 'Cc' end || ': ' || public.ecm_label(nullif(new.cc_label, ''), v_lang), '');
    end if;
    v_text := v_text || case when v_text = '' then '' else E'\n' end || coalesce(new.body, '');
    insert into public.direct_messages (sender_line_id, recipient_line_id, message_text) values (v_from, rid, v_text);
    if rid ~ '^U[0-9a-f]{32}$' then
      perform net.http_post(
        url := 'https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/line-push-notification',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object('type', 'new_message', 'record',
                  jsonb_build_object('recipient_id', rid, 'sender_id', v_from, 'sender_name', v_name, 'content', v_text)));
    end if;
  end loop;
  return null;
exception when others then
  raise warning 'ecm_deliver: %', sqlerrm;
  return null;
end $fn$;

-- a golfer's reply to the course: into the thread they were last written to; no thread = a direct message (never lost)
create or replace function public.dm_reply_to_course_thread()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare
  m    record;
  nm   text;
  slug text;
begin
  if new.recipient_line_id not like 'COURSE-%' then return null; end if;
  slug := substr(new.recipient_line_id, 8);
  select c.event_id, c.course_slug, c.org_sees into m from public.event_course_messages c
   where c.side = 'course' and c.course_slug = slug and new.sender_line_id = any (c.delivered_to)
   order by c.created_at desc limit 1;
  select coalesce(nullif(p.name, ''), 'Golfer') into nm from public.user_profiles p where p.line_user_id = new.sender_line_id;
  insert into public.event_course_messages (event_id, course_slug, side, sender_id, sender_name, kind, body, org_sees)
  values (m.event_id, slug, 'golfer', new.sender_line_id, coalesce(nm, 'Golfer'), 'text', left(new.message_text, 2000),
          case when m.event_id is null then false else m.org_sees end);
  return null;
exception when others then
  raise warning 'dm_reply_to_course_thread: %', sqlerrm;
  return null;
end $fn$;

-- the pro shop inbox: event messages AND direct ones (no event = "Direct message")
create or replace function public.ecm_inbox(p_token text)
returns setof jsonb language sql stable security definer set search_path to 'public' as $fn$
  select jsonb_build_object(
           'id', m.id, 'event_id', m.event_id, 'side', m.side, 'kind', m.kind, 'qty', m.qty, 'body', m.body,
           'sender_id', m.sender_id, 'sender_name', m.sender_name, 'created_at', m.created_at, 'course_slug', m.course_slug,
           'seen_at', m.seen_at, 'seen_by', m.seen_by, 'assigned_to', m.assigned_to, 'assigned_at', m.assigned_at, 'assigned_by', m.assigned_by,
           'title', e.title, 'event_date', e.event_date)
  from public.event_course_messages m
  left join public.society_events e on e.id = m.event_id
  cross join (select coalesce(public._desk_keys(nullif(p_token, '')), '{}'::text[]) k) kk
  where m.side in ('society', 'golfer') and m.kind in ('text', 'request')
    and m.done_at is null and m.created_at > now() - interval '14 days'
    and m.course_slug = any (kk.k)
  order by m.created_at desc
  limit 100;
$fn$;

-- the player card's Send: a direct message from the course (To / Cc / Bcc), desk token required
create or replace function public.pc_send_message(p_token text, p_slug text, p_name text, p_to text[], p_to_label text,
  p_cc text[] default null, p_cc_label text default null, p_bcc text[] default null, p_bcc_label text default null, p_body text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare
  m public.event_course_messages;
begin
  if not (p_slug = any (coalesce(public._desk_keys(nullif(p_token, '')), '{}'::text[]))) then return jsonb_build_object('ok', false, 'reason', 'token'); end if;
  if coalesce(trim(p_body), '') = '' then return jsonb_build_object('ok', false, 'reason', 'empty'); end if;
  perform set_config('ecm.direct_ok', '1', true);
  insert into public.event_course_messages (event_id, course_slug, side, sender_id, sender_name, kind, body, to_kind,
    to_ids, to_label, cc_ids, cc_label, bcc_ids, bcc_label)
  values (null, p_slug, 'course', 'course:' || p_slug, left(coalesce(nullif(trim(p_name), ''), 'Pro shop'), 80), 'text', left(trim(p_body), 2000), 'custom',
    p_to, nullif(left(p_to_label, 300), ''), p_cc, nullif(left(p_cc_label, 300), ''), p_bcc, nullif(left(p_bcc_label, 300), ''))
  returning * into m;
  perform set_config('ecm.direct_ok', '', true);
  return jsonb_build_object('ok', true, 'id', m.id, 'created_at', m.created_at, 'delivered', coalesce(array_length(m.delivered_to, 1), 0));
end $fn$;
grant execute on function public.pc_send_message(text, text, text, text[], text, text[], text, text[], text, text) to anon, authenticated;

-- one golfer's whole thread with this course (events + direct), for the player card
create or replace function public.pc_thread(p_token text, p_slug text, p_golfer text)
returns setof jsonb language sql stable security definer set search_path to 'public' as $fn$
  select to_jsonb(m) || jsonb_build_object('title', e.title, 'event_date', e.event_date)
  from public.event_course_messages m
  left join public.society_events e on e.id = m.event_id
  where p_slug = any (coalesce(public._desk_keys(nullif(p_token, '')), '{}'::text[]))
    and m.course_slug = p_slug and m.kind = 'text'
    and (m.sender_id = p_golfer or p_golfer = any (m.delivered_to))
  order by m.created_at
  limit 300;
$fn$;
grant execute on function public.pc_thread(text, text, text) to anon, authenticated;

commit;

-- ---------- 5. a deal made for ONE golfer (the card's "Make a deal for …", wall box unticked) ----------
begin;
create or replace function public.pc_post_private(p_token text, p_slug text, p_golfer text, p jsonb, p_by text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare
  v record; v_type text; v_title text; v_price int; v_from date; v_to date; v_tf text; v_tt text; v_end timestamptz; v_lim int; v_id uuid;
  v_today date := (now() at time zone 'Asia/Bangkok')::date; clean text := '[<>"`]';
begin
  if not (p_slug = any (coalesce(public._desk_keys(nullif(p_token, '')), '{}'::text[]))) then return jsonb_build_object('ok', false, 'reason', 'token'); end if;
  select slug, name into v from public.course_venues where slug = p_slug and coalesce(active, true);
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_course'); end if;
  if not exists (select 1 from public.user_profiles u where u.line_user_id = p_golfer) then return jsonb_build_object('ok', false, 'reason', 'golfer'); end if;
  v_type := p->>'type';
  if v_type not in ('tee_time', 'society_package', 'caddy', 'food_beverage', 'accommodation', 'transport', 'promotion') then return jsonb_build_object('ok', false, 'reason', 'type'); end if;
  v_title := left(trim(regexp_replace(coalesce(p->>'title', ''), clean, '', 'g')), 40);
  if v_title = '' then return jsonb_build_object('ok', false, 'reason', 'title'); end if;
  v_price := case when coalesce(p->>'price', '') ~ '^\d{1,6}$' then (p->>'price')::int end;
  v_from := case when coalesce(p->>'play_from', '') ~ '^\d{4}-\d{2}-\d{2}$' then greatest((p->>'play_from')::date, v_today) end;
  v_to := case when coalesce(p->>'play_to', '') ~ '^\d{4}-\d{2}-\d{2}$' then (p->>'play_to')::date end;
  if v_to is not null and (v_to < v_today or v_to > v_today + 180 or (v_from is not null and v_to < v_from)) then return jsonb_build_object('ok', false, 'reason', 'days'); end if;
  v_tf := case when coalesce(p->>'time_from', '') ~ '^([01]\d|2[0-3]):[0-5]\d$' then p->>'time_from' end;
  v_tt := case when coalesce(p->>'time_to', '') ~ '^([01]\d|2[0-3]):[0-5]\d$' then p->>'time_to' end;
  begin v_end := (p->>'valid_to')::timestamptz; exception when others then v_end := null; end;
  if v_end is null or v_end < now() + interval '5 minutes' or v_end > now() + interval '60 days' then return jsonb_build_object('ok', false, 'reason', 'ends'); end if;
  v_lim := case when coalesce(p->>'limit', '') ~ '^\d{1,3}$' and (p->>'limit')::int between 1 and 999 then (p->>'limit')::int end;
  insert into public.course_offers (course_id, course_name, audience, offer_type, title, body, cta_label, cta_target, segment, priority,
    valid_from, valid_to, status, created_by, on_wall, venue_slug, price, unit, play_from, play_to, time_from, time_to, limit_total, limit_left)
  values (public._promo_course_id(p_slug), v.name, 'golfer', v_type, v_title, '', 'See the deal', 'promo',
    jsonb_build_object('audience', 'one', 'venue', p_slug, 'golfer', p_golfer), 'normal',
    now(), v_end, 'active', left(coalesce(p_by, 'Pro shop'), 80), false, p_slug, v_price, nullif(left(p->>'unit', 30), ''), v_from, v_to, v_tf, v_tt, v_lim, v_lim)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $fn$;
grant execute on function public.pc_post_private(text, text, text, jsonb, text) to anon, authenticated;

-- pc_send_deal: a deal MADE for this golfer is theirs (no filter check); every other deal follows their filters
create or replace function public.pc_send_deal(p_token text, p_slug text, p_offer uuid, p_golfer text, p_by text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare
  keys text[] := coalesce(public._desk_keys(nullif(p_token, '')), '{}'::text[]);
  o    public.course_offers;
  r    jsonb;
  pushed boolean;
  mine boolean;
  v_from text; v_name text; v_text text;
  old_n int; old_at timestamptz;
begin
  if not (p_slug = any (keys)) then return jsonb_build_object('ok', false, 'reason', 'token'); end if;
  select * into o from public.course_offers where id = p_offer;
  if o.id is null or o.venue_slug is distinct from p_slug then return jsonb_build_object('ok', false, 'reason', 'offer'); end if;
  mine := coalesce(o.segment->>'golfer', '') = p_golfer;
  if not mine and not public._deal_for(p_golfer, o) then return jsonb_build_object('ok', false, 'reason', 'filters'); end if;
  old_n := o.push_recipients; old_at := o.push_sent_at;
  r := public.deliver_course_offer(p_offer, array[p_golfer], 2);
  if r ? 'error' then return jsonb_build_object('ok', false, 'reason', r->>'error'); end if;
  pushed := r->'push' ? p_golfer;
  -- a deal made for them: their own Alerts switch decides (deliver only pushes follows + offer consent for non-wall deals)
  if mine and not pushed and not (r->'suppressed_cap' ? p_golfer) and not (r->'suppressed_quiet_hours' ? p_golfer)
     and coalesce((select g.alerts from public.golfer_deal_prefs g where g.golfer_id = p_golfer),
                  (select np.notify_offers from public.notification_preferences np where np.user_id = p_golfer), false) then
    pushed := true;
    update public.course_offer_reads set pushed_at = now() where offer_id = p_offer and reader_line_id = p_golfer;
  end if;
  update public.course_offers set push_recipients = coalesce(old_n, 0) + case when pushed then 1 else 0 end,
         push_sent_at = case when pushed then now() else old_at end where id = p_offer;
  if pushed then
    v_from := 'COURSE-' || p_slug;
    v_name := coalesce((select name from public.course_venues where slug = p_slug), o.course_name, 'Pro shop');
    insert into public.user_profiles (line_user_id, name, role) values (v_from, v_name, 'proshop') on conflict (line_user_id) do nothing;
    v_text := '🏷 ' || o.title || coalesce(' · ฿' || to_char(o.price, 'FM999,999'), '')
              || coalesce(E'\n' || nullif(concat_ws(' · ',
                   case when o.play_from is not null then to_char(o.play_from, 'DD/MM') || coalesce('–' || to_char(o.play_to, 'DD/MM'), '') end,
                   case when o.time_from is not null then o.time_from || coalesce('–' || o.time_to, '') end), ''), '')
              || E'\nTee Times › Promotions';
    insert into public.direct_messages (sender_line_id, recipient_line_id, message_text) values (v_from, p_golfer, v_text);
    if p_golfer ~ '^U[0-9a-f]{32}$' then
      perform net.http_post(url := 'https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/line-push-notification',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object('type', 'new_message', 'record',
                  jsonb_build_object('recipient_id', p_golfer, 'sender_id', v_from, 'sender_name', v_name, 'content', v_text)));
    end if;
  end if;
  return jsonb_build_object('ok', true, 'pushed', pushed,
    'why', case when pushed then null when r->'suppressed_cap' ? p_golfer then 'cap' when r->'suppressed_quiet_hours' ? p_golfer then 'quiet' else 'alerts_off' end);
end $fn$;
commit;
