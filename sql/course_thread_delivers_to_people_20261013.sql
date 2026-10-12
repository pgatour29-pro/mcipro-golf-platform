-- v1535 Pro shop tee sheet › Societies › event panel › Messages: a message now REACHES people.
-- Pete 2026-10-13: the pro shop wrote "hello, Khun Peter. Nim might not work saturday, do you want a
-- different caddy?" in the event panel — it saved to event_course_messages, which only the pro shop and
-- the organizer's tee sheet (behind the golf-course button) read, with no LINE push. The golfer never
-- got it. Rule: a message box goes to whoever the panel is about — the society event (organizer + every
-- registered player), one group, or one player — in their Messages inbox AND on LINE.
--
-- to_kind 'event' (or NULL = an older client) → organizer + society inbox + every registered player
--         'group' / 'player'                   → exactly the ids the pro shop picked (to_ids)
-- Delivery = direct_messages row (the golfer's inbox) from the course's sender profile COURSE-<slug> +
-- line-push-notification {type:new_message, record:{recipient_id,sender_id,sender_name,content}} (the
-- shape handleDirectMessage reads — direct_messages' own trigger posts recipient_line_id, which the
-- function skips, so the push is explicit here, exactly like secure-dm does).
-- A golfer's reply to COURSE-<slug> lands back in that event's thread (side 'golfer').

begin;

alter table public.event_course_messages add column if not exists to_kind  text;
alter table public.event_course_messages add column if not exists to_ids   text[];
alter table public.event_course_messages add column if not exists to_label text;
alter table public.event_course_messages add column if not exists delivered_to text[];

alter table public.event_course_messages drop constraint if exists event_course_messages_side_check;
alter table public.event_course_messages add constraint event_course_messages_side_check
  check (side = any (array['course', 'society', 'golfer']));
alter table public.event_course_messages drop constraint if exists event_course_messages_to_kind_check;
alter table public.event_course_messages add constraint event_course_messages_to_kind_check
  check (to_kind is null or to_kind = any (array['event', 'group', 'player']));

-- BEFORE INSERT: resolve the recipients server-side (an old cached client sends no to_kind = whole event)
create or replace function public.ecm_resolve_recipients()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare
  ev  record;
  ids text[] := '{}';
begin
  if new.side <> 'course' or new.kind <> 'text' then return new; end if;
  select e.id, e.society_id, e.organizer_id into ev from public.society_events e where e.id = new.event_id;
  if coalesce(new.to_kind, 'event') = 'event' then
    new.to_kind := 'event';
    ids := array(
      select distinct x from (
        select ev.organizer_id::text as x
        union all select sp.organizer_id::text from public.society_profiles sp where sp.id::text = ev.society_id::text
        union all select s.organizer_id::text from public.societies s where s.id::text = ev.society_id::text
        union all select ev.society_id::text
        union all select r.player_id from public.event_registrations r where r.event_id = new.event_id
      ) q where coalesce(x, '') <> '');
  else
    ids := array(select distinct x from unnest(coalesce(new.to_ids, '{}')) x where coalesce(x, '') <> '');
  end if;
  new.delivered_to := ids;
  return new;
end $fn$;

-- AFTER INSERT: inbox row + LINE push per recipient
create or replace function public.ecm_deliver()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare
  ev      record;
  v_from  text;
  v_name  text;
  v_text  text;
  rid     text;
begin
  if new.side <> 'course' or new.kind <> 'text' or coalesce(array_length(new.delivered_to, 1), 0) = 0 then return null; end if;
  select e.title, e.event_date into ev from public.society_events e where e.id = new.event_id;
  v_from := 'COURSE-' || coalesce(nullif(new.course_slug, ''), 'course');
  v_name := coalesce(nullif(new.sender_name, ''), 'Pro shop');
  insert into public.user_profiles (line_user_id, name, role) values (v_from, v_name, 'proshop')
    on conflict (line_user_id) do nothing;
  v_text := coalesce(ev.title, '') || coalesce(' · ' || to_char(ev.event_date, 'Dy DD Mon'), '') || E'\n' || coalesce(new.body, '');
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
  raise warning 'ecm_deliver: %', sqlerrm;   -- never lose the pro shop's message over a delivery hiccup
  return null;
end $fn$;

drop trigger if exists ecm_resolve_trg on public.event_course_messages;
create trigger ecm_resolve_trg before insert on public.event_course_messages
  for each row execute function public.ecm_resolve_recipients();
drop trigger if exists ecm_deliver_trg on public.event_course_messages;
create trigger ecm_deliver_trg after insert on public.event_course_messages
  for each row execute function public.ecm_deliver();

-- A golfer's reply to the course (direct_messages → COURSE-<slug>) shows in the event thread it answers
create or replace function public.dm_reply_to_course_thread()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare
  m  record;
  nm text;
begin
  if new.recipient_line_id not like 'COURSE-%' then return null; end if;
  select c.event_id, c.course_slug into m from public.event_course_messages c
   where c.side = 'course' and c.course_slug = substr(new.recipient_line_id, 8)
     and new.sender_line_id = any (c.delivered_to)
   order by c.created_at desc limit 1;
  if m.event_id is null then return null; end if;
  select coalesce(nullif(p.name, ''), 'Golfer') into nm from public.user_profiles p where p.line_user_id = new.sender_line_id;
  insert into public.event_course_messages (event_id, course_slug, side, sender_id, sender_name, kind, body)
  values (m.event_id, m.course_slug, 'golfer', new.sender_line_id, coalesce(nm, 'Golfer'), 'text', left(new.message_text, 2000));
  return null;
exception when others then
  raise warning 'dm_reply_to_course_thread: %', sqlerrm;
  return null;
end $fn$;

drop trigger if exists dm_reply_to_course_thread_trg on public.direct_messages;
create trigger dm_reply_to_course_thread_trg after insert on public.direct_messages
  for each row execute function public.dm_reply_to_course_thread();

commit;
