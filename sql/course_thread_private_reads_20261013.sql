-- v1538 Event panel thread: privacy enforced by the SERVER, and the copies speak the recipient's language.
-- On top of course_thread_delivers_to_people_20261013.sql + course_thread_to_cc_bcc_20261013.sql.
--
-- Before: event_course_messages was SELECT-able by the anon key (tmp_select = true), so a 1-to-1 message or a Bcc
-- list was hidden only by the panel's display. Now:
--   * no direct SELECT for anon/authenticated (policy dropped; RLS on = no rows)
--   * ecm_list(event_ids, token, light): a valid pro shop desk token for the message's course → the full thread
--     (1-to-1s, Bcc). Everyone else (organizer tee sheet, a course on the shared 000000 PIN) → only messages the
--     organizer was on, with every id list and the Bcc label stripped.
--   * realtime rides event_course_pings (event id, side, org_sees, time — no text); the panel fetches through ecm_list
--   * a golfer's reply to a private message is private too (inherits org_sees)
--   * recipient copies: "To / Cc" lines + date in the recipient's language (en/th/ko/ja); label tokens @ORG and
--     @G:<n> (group n, 0 = not paired yet) are written out per language

begin;

-- ---------- reads ----------
drop policy if exists tmp_select on public.event_course_messages;

create or replace function public.ecm_list(p_event_ids uuid[], p_token text default null, p_light boolean default false)
returns setof jsonb language sql stable security definer set search_path to 'public' as $fn$
  select case
           when p_light then jsonb_build_object('id', m.id, 'event_id', m.event_id, 'side', m.side, 'created_at', m.created_at, 'org_sees', m.org_sees)
           when m.course_slug = any (kk.k) then to_jsonb(m)
           else to_jsonb(m) - 'to_ids' - 'cc_ids' - 'bcc_ids' - 'bcc_label' - 'delivered_to'
         end
  from public.event_course_messages m
  cross join (select coalesce(public._desk_keys(nullif(p_token, '')), '{}'::text[]) k) kk
  where m.event_id = any (p_event_ids)
    and (m.course_slug = any (kk.k) or m.org_sees is distinct from false)
  order by m.created_at
  limit 2000;
$fn$;
grant execute on function public.ecm_list(uuid[], text, boolean) to anon, authenticated;

-- ---------- realtime pings (no message content) ----------
create table if not exists public.event_course_pings (
  msg_id     uuid primary key,
  event_id   uuid not null,
  side       text,
  org_sees   boolean,
  created_at timestamptz not null default now()
);
alter table public.event_course_pings enable row level security;
drop policy if exists ecp_read on public.event_course_pings;
create policy ecp_read on public.event_course_pings for select to anon, authenticated using (true);
do $$ begin
  alter publication supabase_realtime add table public.event_course_pings;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime drop table public.event_course_messages;
exception when undefined_object then null; end $$;

create or replace function public.ecm_ping()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
begin
  insert into public.event_course_pings (msg_id, event_id, side, org_sees, created_at)
  values (new.id, new.event_id, new.side, new.org_sees, new.created_at) on conflict (msg_id) do nothing;
  delete from public.event_course_pings where created_at < now() - interval '2 days';
  return null;
exception when others then
  raise warning 'ecm_ping: %', sqlerrm;
  return null;
end $fn$;
drop trigger if exists ecm_ping_trg on public.event_course_messages;
create trigger ecm_ping_trg after insert on public.event_course_messages
  for each row execute function public.ecm_ping();

-- ---------- labels in the recipient's language ----------
create or replace function public.ecm_lang(p_id text)
returns text language sql stable security definer set search_path to 'public' as $fn$
  select case when l like 'th%' or l like 'thai%' then 'th' when l like 'ko%' then 'ko' when l like 'ja%' then 'ja' else 'en' end
  from (select lower(coalesce((select p.language from public.user_profiles p where p.line_user_id = p_id), 'en')) l) x;
$fn$;

create or replace function public.ecm_label(p_label text, p_lang text)
returns text language plpgsql immutable as $fn$
declare
  s text := coalesce(p_label, '');
begin
  s := replace(s, '@ORG', case p_lang when 'th' then 'ผู้จัด' when 'ko' then '주최자' when 'ja' then '主催者' else 'Organizer' end);
  s := replace(s, '@G:0', case p_lang when 'th' then 'ยังไม่จับกลุ่ม' when 'ko' then '조 미편성' when 'ja' then '組未定' else 'Not paired yet' end);
  s := regexp_replace(s, '@G:(\d+)', case p_lang when 'th' then 'กลุ่ม \1' when 'ko' then '\1조' when 'ja' then 'グループ\1' else 'Group \1' end, 'g');
  return s;
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
  select e.title, e.event_date into ev from public.society_events e where e.id = new.event_id;
  v_from := 'COURSE-' || coalesce(nullif(new.course_slug, ''), 'course');
  v_name := coalesce(nullif(new.sender_name, ''), 'Pro shop');
  insert into public.user_profiles (line_user_id, name, role) values (v_from, v_name, 'proshop')
    on conflict (line_user_id) do nothing;
  -- everyone on the copy sees who else got it (To + Cc) — never the Bcc
  show_rc := new.to_kind <> 'event' and (coalesce(new.cc_label, '') <> '' or coalesce(new.to_label, '') like '%,%');
  foreach rid in array new.delivered_to loop
    v_lang := public.ecm_lang(rid);
    v_text := coalesce(ev.title, '') || coalesce(' · ' || case v_lang when 'en' then to_char(ev.event_date, 'Dy DD Mon') else to_char(ev.event_date, 'DD/MM') end, '');
    if show_rc then
      v_text := v_text || E'\n' || case v_lang when 'th' then 'ถึง' when 'ko' then '받는 사람' when 'ja' then '宛先' else 'To' end || ': ' || public.ecm_label(new.to_label, v_lang)
        || coalesce(E'\n' || case v_lang when 'th' then 'สำเนา' when 'ko' then '참조' when 'ja' then 'CC' else 'Cc' end || ': ' || public.ecm_label(nullif(new.cc_label, ''), v_lang), '');
    end if;
    v_text := v_text || E'\n' || coalesce(new.body, '');
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

-- a golfer's reply to a private message stays private
create or replace function public.dm_reply_to_course_thread()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare
  m  record;
  nm text;
begin
  if new.recipient_line_id not like 'COURSE-%' then return null; end if;
  select c.event_id, c.course_slug, c.org_sees into m from public.event_course_messages c
   where c.side = 'course' and c.course_slug = substr(new.recipient_line_id, 8)
     and new.sender_line_id = any (c.delivered_to)
   order by c.created_at desc limit 1;
  if m.event_id is null then return null; end if;
  select coalesce(nullif(p.name, ''), 'Golfer') into nm from public.user_profiles p where p.line_user_id = new.sender_line_id;
  insert into public.event_course_messages (event_id, course_slug, side, sender_id, sender_name, kind, body, org_sees)
  values (m.event_id, m.course_slug, 'golfer', new.sender_line_id, coalesce(nm, 'Golfer'), 'text', left(new.message_text, 2000), m.org_sees);
  return null;
exception when others then
  raise warning 'dm_reply_to_course_thread: %', sqlerrm;
  return null;
end $fn$;

commit;
