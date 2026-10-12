-- v1537 Event panel Messages: To / Cc / Bcc (Pete 2026-10-13: "I want the To have a cc and bcc so it can go
-- 1 to 1 or add recipients"). On top of sql/course_thread_delivers_to_people_20261013.sql.
--
-- to_kind 'custom': to_ids / cc_ids / bcc_ids hold golfer ids, or the token 'ORGANIZER' (= the event's organizer
-- ids + the society's own inbox). Every id is clamped to THIS event's audience (organizer set + registered
-- players). Recipients' copies show To + Cc names, never Bcc. org_sees = the organizer is on the message (or it
-- went to everyone) — the organizer's tee sheet thread hides 1-to-1 messages that don't include them.

begin;

alter table public.event_course_messages add column if not exists cc_ids    text[];
alter table public.event_course_messages add column if not exists bcc_ids   text[];
alter table public.event_course_messages add column if not exists cc_label  text;
alter table public.event_course_messages add column if not exists bcc_label text;
alter table public.event_course_messages add column if not exists org_sees  boolean;

alter table public.event_course_messages drop constraint if exists event_course_messages_to_kind_check;
alter table public.event_course_messages add constraint event_course_messages_to_kind_check
  check (to_kind is null or to_kind = any (array['event', 'group', 'player', 'custom']));

create or replace function public.ecm_resolve_recipients()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare
  ev   record;
  org  text[];
  regs text[];
  want text[];
begin
  if new.side <> 'course' or new.kind <> 'text' then return new; end if;
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
    where coalesce(x, '') <> '' and (x = any (org) or x = any (regs)));   -- only this event's people
  return new;
end $fn$;

create or replace function public.ecm_deliver()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare
  ev      record;
  v_from  text;
  v_name  text;
  v_head  text;
  v_text  text;
  rid     text;
begin
  if new.side <> 'course' or new.kind <> 'text' or coalesce(array_length(new.delivered_to, 1), 0) = 0 then return null; end if;
  select e.title, e.event_date into ev from public.society_events e where e.id = new.event_id;
  v_from := 'COURSE-' || coalesce(nullif(new.course_slug, ''), 'course');
  v_name := coalesce(nullif(new.sender_name, ''), 'Pro shop');
  insert into public.user_profiles (line_user_id, name, role) values (v_from, v_name, 'proshop')
    on conflict (line_user_id) do nothing;
  v_head := coalesce(ev.title, '') || coalesce(' · ' || to_char(ev.event_date, 'Dy DD Mon'), '');
  -- everyone on the copy sees who else got it (To + Cc) — never the Bcc
  if new.to_kind <> 'event' and (coalesce(nullif(new.cc_label, ''), '') <> '' or coalesce(new.to_label, '') like '%,%') then
    v_head := v_head || E'\nTo: ' || coalesce(new.to_label, '') || coalesce(E'\nCc: ' || nullif(new.cc_label, ''), '');
  end if;
  v_text := v_head || E'\n' || coalesce(new.body, '');
  foreach rid in array new.delivered_to loop
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

-- the 06:07 message was re-delivered to Pete Park only (1-to-1)
update public.event_course_messages set org_sees = false where id = 'a879bec5-98e6-4131-bbca-310cbe144c10';

commit;
