-- v1558 MESSAGES HUB (Pete 2026-10-13: "from the tee sheet and caddy desk: messaging system: messaging caddies and
-- notifications along with adding caddies in the messages to the golfer if necessary. also in the message system we have
-- folders but we need to be able to put them in those folders and the ability to Pin those chat threads to keep up on top").
--
--  1. Folders + pins for EVERY inbox: msg_folders / msg_thread_prefs. owner = 'desk:<course or facility>' for the pro shop
--     (every desk device of the course shares them), or the user's own id (golfer Messages, Tap-In, caddy).
--  2. The pro shop inbox (mh_*): one list of the course's golfer / caddy / society threads, behind the course's OWN-PIN
--     desk token like every private read of the course's messages (v1528 / v1538).
--  3. A caddy in the golfer's chat: group_chats.course_slug + golfer_id = ONE chat of golfer + pro shop + caddy
--     (group_chat_messages -> LINE through the existing group trigger).
--  4. Message caddies from the Caddy desk (course_broadcasts): each caddy gets it in their Messages, LINE when they have it.
--  5. Every roster caddy gets an account + a caddy PIN (Staff -> Caddy). The account is a placeholder 'CADDY-<id>' that
--     hands everything over the day the caddy signs up with LINE and claims her roster row.
--  6. Fixes found on the way: course senders filed under Players in Tap-In; an assigned inbox job written as 'open'
--     while every dashboard reads 'active'; hard-coded keys in two notification triggers + a duplicate group LINE push.

begin;

-- ============================================================ 1. folders + pins
create table if not exists public.msg_folders (
  id         uuid primary key default gen_random_uuid(),
  owner      text not null,
  name       text not null check (length(btrim(name)) between 1 and 40),
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists msg_folders_owner_name on public.msg_folders (owner, lower(btrim(name)));
create table if not exists public.msg_thread_prefs (
  owner      text not null,
  thread_key text not null check (length(thread_key) between 3 and 140),
  pinned_at  timestamptz,
  folder     text,
  unread     boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (owner, thread_key)
);
alter table public.msg_folders enable row level security;
alter table public.msg_thread_prefs enable row level security;
revoke all on public.msg_folders, public.msg_thread_prefs from anon, authenticated;

create or replace function public._msg_prefs_of(p_owner text)
returns jsonb language sql stable security definer set search_path to 'public' as $fn$
  select jsonb_build_object(
    'folders', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name) order by f.sort, f.created_at)
                           from public.msg_folders f where f.owner = p_owner), '[]'::jsonb),
    'prefs', coalesce((select jsonb_object_agg(p.thread_key, jsonb_build_object('pin', p.pinned_at, 'folder', p.folder, 'unread', p.unread))
                         from public.msg_thread_prefs p where p.owner = p_owner), '{}'::jsonb))
$fn$;

create or replace function public._msg_pref_set(p_owner text, p_key text, p_action text, p_folder text)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
begin
  if coalesce(p_owner, '') = '' then return jsonb_build_object('ok', false, 'reason', 'who'); end if;
  if p_key is null or length(p_key) < 3 or length(p_key) > 140 or p_key !~ '^[a-z]{1,3}:' then return jsonb_build_object('ok', false, 'reason', 'key'); end if;
  if p_action not in ('pin', 'unpin', 'unread', 'read', 'move') then return jsonb_build_object('ok', false, 'reason', 'action'); end if;
  if p_action = 'move' and coalesce(p_folder, '') <> '' then
    if p_folder !~ '^(f:[0-9a-f-]{36}|[a-z]{1,12})$' then return jsonb_build_object('ok', false, 'reason', 'folder'); end if;
    if p_folder like 'f:%' and not exists (select 1 from public.msg_folders f where f.owner = p_owner and f.id::text = substr(p_folder, 3)) then
      return jsonb_build_object('ok', false, 'reason', 'folder');
    end if;
  end if;
  if (select count(*) from public.msg_thread_prefs where owner = p_owner) > 3000 then return jsonb_build_object('ok', false, 'reason', 'full'); end if;
  insert into public.msg_thread_prefs (owner, thread_key) values (p_owner, p_key) on conflict do nothing;
  update public.msg_thread_prefs set
         pinned_at  = case p_action when 'pin' then now() when 'unpin' then null else pinned_at end,
         unread     = case p_action when 'unread' then true when 'read' then false else unread end,
         folder     = case when p_action = 'move' then nullif(p_folder, '') else folder end,
         updated_at = now()
   where owner = p_owner and thread_key = p_key;
  delete from public.msg_thread_prefs where owner = p_owner and thread_key = p_key and pinned_at is null and folder is null and not unread;
  return jsonb_build_object('ok', true);
end $fn$;

create or replace function public._msg_folder_set(p_owner text, p_action text, p_name text, p_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare nm text := left(btrim(coalesce(p_name, '')), 40); fid uuid;
begin
  if coalesce(p_owner, '') = '' then return jsonb_build_object('ok', false, 'reason', 'who'); end if;
  if p_action = 'create' then
    if nm = '' then return jsonb_build_object('ok', false, 'reason', 'name'); end if;
    select id into fid from public.msg_folders where owner = p_owner and lower(btrim(name)) = lower(nm);
    if fid is null then
      if (select count(*) from public.msg_folders where owner = p_owner) >= 30 then return jsonb_build_object('ok', false, 'reason', 'full'); end if;
      insert into public.msg_folders (owner, name, sort)
      values (p_owner, nm, coalesce((select max(sort) + 1 from public.msg_folders where owner = p_owner), 0)) returning id into fid;
    end if;
    return jsonb_build_object('ok', true, 'id', fid, 'name', nm);
  elsif p_action = 'rename' then
    if nm = '' then return jsonb_build_object('ok', false, 'reason', 'name'); end if;
    update public.msg_folders set name = nm where owner = p_owner and id = p_id;
    return jsonb_build_object('ok', true);
  elsif p_action = 'delete' then
    delete from public.msg_folders where owner = p_owner and id = p_id;
    update public.msg_thread_prefs set folder = null where owner = p_owner and folder = 'f:' || p_id::text;
    delete from public.msg_thread_prefs where owner = p_owner and pinned_at is null and folder is null and not unread;
    return jsonb_build_object('ok', true);
  end if;
  return jsonb_build_object('ok', false, 'reason', 'action');
end $fn$;
revoke all on function public._msg_prefs_of(text), public._msg_pref_set(text, text, text, text), public._msg_folder_set(text, text, text, uuid) from public, anon, authenticated;

-- the desk's owner key: a facility shares one inbox, a course has its own
create or replace function public._desk_owner(p_token text)
returns text language sql stable security definer set search_path to 'public' as $fn$
  select 'desk:' || coalesce(nullif(t.facility_id, ''), t.course_id)
    from public.proshop_desk_tokens t where t.token = p_token and t.expires_at > now() limit 1
$fn$;
revoke all on function public._desk_owner(text) from public, anon, authenticated;

create or replace function public.mh_pref(p_token text, p_key text, p_action text, p_folder text default null)
returns jsonb language sql security definer set search_path to 'public' as $fn$
  select public._msg_pref_set(public._desk_owner(nullif(p_token, '')), p_key, p_action, p_folder)
$fn$;
create or replace function public.mh_folder(p_token text, p_action text, p_name text default null, p_id uuid default null)
returns jsonb language sql security definer set search_path to 'public' as $fn$
  select public._msg_folder_set(public._desk_owner(nullif(p_token, '')), p_action, p_name, p_id)
$fn$;

-- golfer / caddy side: the app's own account (signed in = the app's user, like every profile setting, v1526)
create or replace function public.msg_prefs(p_user text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $fn$
declare me text := public._app_golfer(p_user);
begin
  if me is null then return jsonb_build_object('ok', false, 'reason', 'who'); end if;
  return public._msg_prefs_of(me) || jsonb_build_object('ok', true,
    -- messages that reached me as one of many caddies (the caddy phone tags them "All caddies")
    'bcast', coalesce((select jsonb_agg(x) from (
        select unnest(b.dm_ids) x from public.course_broadcasts b
         where me = any (b.delivered_to) and b.created_at > now() - interval '30 days') q), '[]'::jsonb));
end $fn$;
create or replace function public.msg_pref(p_user text, p_key text, p_action text, p_folder text default null)
returns jsonb language sql security definer set search_path to 'public' as $fn$
  select public._msg_pref_set(public._app_golfer(p_user), p_key, p_action, p_folder)
$fn$;
create or replace function public.msg_folder(p_user text, p_action text, p_name text default null, p_id uuid default null)
returns jsonb language sql security definer set search_path to 'public' as $fn$
  select public._msg_folder_set(public._app_golfer(p_user), p_action, p_name, p_id)
$fn$;

-- ============================================================ 3. course chats (golfer + pro shop + caddy)
alter table public.group_chats add column if not exists course_slug text;
alter table public.group_chats add column if not exists golfer_id text;
create unique index if not exists group_chats_course_golfer on public.group_chats (course_slug, golfer_id) where course_slug is not null;
alter table public.group_chat_messages add column if not exists kind text;   -- 'system' = "Pro shop added caddy #3 …"

-- ============================================================ 4. caddy broadcasts
create table if not exists public.course_broadcasts (
  id           uuid primary key default gen_random_uuid(),
  course_slug  text not null,
  audience     text not null check (audience in ('duty', 'course', 'free', 'one')),
  label        text,
  body         text not null,
  to_ids       text[] not null default '{}',
  delivered_to text[] not null default '{}',
  live_n       int not null default 0,
  dm_ids       uuid[] not null default '{}',
  ecm_id       uuid,
  sent_by      text,
  created_at   timestamptz not null default now()
);
create index if not exists course_broadcasts_slug on public.course_broadcasts (course_slug, created_at desc);
alter table public.course_broadcasts enable row level security;
revoke all on public.course_broadcasts from anon, authenticated;

-- ============================================================ 5. caddy accounts + PINs
alter table public.caddy_pin_logins add column if not exists last_login_at timestamptz;

create or replace function public.caddy_pin_login(p_pin text)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid text; v_name text; v_num text; v_course text; v_miss int;
begin
  if p_pin is null or p_pin !~ '^\d{6}$' then return null; end if;
  select count(*) into v_miss from caddy_pin_misses where at > now() - interval '15 minutes';
  if v_miss >= 20 then perform pg_sleep(0.4); return null; end if;   -- ceiling: nobody gets in while it is hot
  select user_id into v_uid from caddy_pin_logins where pin = p_pin;
  if v_uid is null then
    insert into caddy_pin_misses default values;
    delete from caddy_pin_misses where at < now() - interval '1 day';
    perform pg_sleep(0.4);
    return null;
  end if;
  update caddy_pin_logins set last_login_at = now() where pin = p_pin;   -- v1558: "has the app" for the desk's delivery count
  select coalesce(cp.name, up.name), cp.caddy_number::text, cp.course_name into v_name, v_num, v_course
    from user_profiles up left join caddy_profiles cp on cp.user_id = up.line_user_id and cp.is_active
   where up.line_user_id = v_uid limit 1;
  return jsonb_build_object('user_id', v_uid, 'name', v_name, 'caddy_number', v_num, 'course_name', v_course);
end $fn$;
revoke all on function public.caddy_pin_login(text) from public;
grant execute on function public.caddy_pin_login(text) to anon, authenticated;

-- a roster caddy without an account gets one: user_profiles 'CADDY-<id>' (role caddie) + a 6-digit caddy PIN
create or replace function public._caddy_account(p_id uuid)
returns text language plpgsql security definer set search_path to 'public' as $fn$
declare cp record; uid text; v_pin text; n int := 0;
begin
  select * into cp from caddy_profiles where id = p_id;
  if cp.id is null then return null; end if;
  if cp.user_id is not null then return cp.user_id; end if;
  if coalesce(cp.is_mock, false) or not coalesce(cp.is_active, true) or cp.left_at is not null
     or coalesce(btrim(cp.caddy_number), '') = '' or coalesce(cp.course_id, '') = '' then return null; end if;
  uid := 'CADDY-' || replace(cp.id::text, '-', '');
  insert into user_profiles (line_user_id, name, role, profile_data)
  values (uid, coalesce(nullif(btrim(cp.name), ''), 'Caddy ' || cp.caddy_number), 'caddie',
          jsonb_build_object('golfInfo', '{}'::jsonb, 'media', '{}'::jsonb, 'privacy', '{}'::jsonb, 'skills', '{}'::jsonb,
            'professionalInfo', '{}'::jsonb, 'personalInfo', '{}'::jsonb, 'preferences', jsonb_build_object('language', 'th'),
            'linePictureUrl', cp.photo_url,
            'roleSpecific', jsonb_build_object('caddyNumber', cp.caddy_number, 'homeClub', cp.course_id, 'homeClubName', cp.course_name)))
  on conflict (line_user_id) do nothing;
  update caddy_profiles set user_id = uid where id = cp.id and user_id is null;
  if not exists (select 1 from caddy_pin_logins where user_id = uid) then
    loop
      n := n + 1;
      v_pin := lpad(((('x' || substr(md5(gen_random_uuid()::text), 1, 8))::bit(32)::bigint) % 1000000)::text, 6, '0');
      exit when n > 50 or (v_pin !~ '^(\d)\1{5}$' and v_pin !~ '^0000' and v_pin not in ('123456', '654321', '012345', '234567', '345678', '456789', '987654', '121212', '112233', '000010')
                and not exists (select 1 from caddy_pin_logins l where l.pin = v_pin));
    end loop;
    if n <= 50 then insert into caddy_pin_logins (pin, user_id, note) values (v_pin, uid, 'roster v1558'); end if;
  end if;
  return uid;
end $fn$;
revoke all on function public._caddy_account(uuid) from public, anon, authenticated;

create or replace function public.caddy_account_trg()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
begin
  if new.user_id is null then perform public._caddy_account(new.id); end if;
  return null;
exception when others then
  raise warning 'caddy_account_trg: %', sqlerrm;
  return null;
end $fn$;
drop trigger if exists caddy_account_trg on public.caddy_profiles;
create trigger caddy_account_trg after insert or update of caddy_number, course_id, is_active, is_mock, left_at, user_id
  on public.caddy_profiles for each row execute function public.caddy_account_trg();

-- the day a caddy signs up with LINE and claims her roster row, the placeholder hands EVERYTHING over and goes away
create or replace function public._caddy_handover(p_old text, p_new text)
returns void language plpgsql security definer set search_path to 'public' as $fn$
begin
  if p_old is null or p_old !~ '^CADDY-[0-9a-f]{32}$' or coalesce(p_new, '') = '' or p_old = p_new then return; end if;
  update direct_messages set sender_line_id = p_new where sender_line_id = p_old;
  update direct_messages set recipient_line_id = p_new where recipient_line_id = p_old;
  delete from group_chat_members m where m.member_line_id = p_old and exists (select 1 from group_chat_members x where x.group_id = m.group_id and x.member_line_id = p_new);
  update group_chat_members set member_line_id = p_new where member_line_id = p_old;
  update group_chat_messages set sender_line_id = p_new where sender_line_id = p_old;
  delete from group_chat_reads r where r.reader_line_id = p_old and exists (select 1 from group_chat_reads x where x.group_id = r.group_id and x.reader_line_id = p_new);
  update group_chat_reads set reader_line_id = p_new where reader_line_id = p_old;
  update course_broadcasts set delivered_to = array_replace(delivered_to, p_old, p_new), to_ids = array_replace(to_ids, p_old, p_new)
   where p_old = any (delivered_to) or p_old = any (to_ids);
  update event_course_messages set delivered_to = array_replace(delivered_to, p_old, p_new), to_ids = array_replace(to_ids, p_old, p_new)
   where p_old = any (delivered_to) or p_old = any (to_ids);
  update msg_thread_prefs p set owner = p_new where owner = p_old and not exists (select 1 from msg_thread_prefs x where x.owner = p_new and x.thread_key = p.thread_key);
  delete from msg_thread_prefs where owner = p_old;
  update msg_folders f set owner = p_new where owner = p_old and not exists (select 1 from msg_folders x where x.owner = p_new and lower(btrim(x.name)) = lower(btrim(f.name)));
  delete from msg_folders where owner = p_old;
  update caddy_bookings set user_id = p_new where user_id = p_old;
  delete from caddy_pin_logins where user_id = p_old;
  delete from user_profiles where line_user_id = p_old;
exception when others then
  raise warning '_caddy_handover: %', sqlerrm;
end $fn$;
revoke all on function public._caddy_handover(text, text) from public, anon, authenticated;

-- claim: a placeholder-held row is free to its real caddy (the course listed her; the number + course match is the claim)
do $do$
declare src text;
begin
  select pg_get_functiondef('public.caddy_profile_write(text,text,uuid,jsonb)'::regprocedure) into src;
  if position('_caddy_handover' in src) = 0 then
    src := replace(src,
      'if v_row.user_id is not null and v_row.user_id <> v_actor then',
      'if v_row.user_id is not null and v_row.user_id <> v_actor and v_row.user_id !~ ''^CADDY-[0-9a-f]{32}$'' then');
    src := replace(src,
      E'    where id = p_id;\n    return jsonb_build_array(jsonb_build_object(''id'', p_id));',
      E'    where id = p_id;\n    if p_op = ''claim'' and v_row.user_id ~ ''^CADDY-[0-9a-f]{32}$'' and v_row.user_id <> v_actor then perform public._caddy_handover(v_row.user_id, v_actor); end if;\n    return jsonb_build_array(jsonb_build_object(''id'', p_id));');
    if position('_caddy_handover' in src) = 0 or position('!~ ''^CADDY-' in src) = 0 then
      raise exception 'caddy_profile_write patch did not apply';
    end if;
    execute src;
  end if;
end $do$;

-- (security review) a placeholder that has SIGNED IN with its caddy PIN is someone's account in use: it is not free to
-- claim by number. Only a never-used placeholder is (same rule as an unclaimed roster row before v1558).
do $do$
declare src text;
begin
  select pg_get_functiondef('public.caddy_profile_write(text,text,uuid,jsonb)'::regprocedure) into src;
  if position('l.last_login_at is not null' in src) = 0 then
    src := replace(src,
      'if v_row.user_id is not null and v_row.user_id <> v_actor and v_row.user_id !~ ''^CADDY-[0-9a-f]{32}$'' then',
      'if v_row.user_id is not null and v_row.user_id <> v_actor and (v_row.user_id !~ ''^CADDY-[0-9a-f]{32}$'' or exists (select 1 from caddy_pin_logins l where l.user_id = v_row.user_id and l.last_login_at is not null)) then');
    if position('l.last_login_at is not null' in src) = 0 then raise exception 'claim guard patch did not apply'; end if;
    execute src;
  end if;
end $do$;

-- backfill: every real roster caddy (the change log is for people's edits, not this one-off)
alter table public.caddy_profiles disable trigger course_change_log_trg;
select public._caddy_account(cp.id) from public.caddy_profiles cp
 where cp.user_id is null and not coalesce(cp.is_mock, false) and coalesce(cp.is_active, true) and cp.left_at is null
   and coalesce(btrim(cp.caddy_number), '') <> '' and coalesce(cp.course_id, '') <> '';
alter table public.caddy_profiles enable trigger course_change_log_trg;

-- ============================================================ 2. the pro shop inbox
create or replace function public._mh_course_profile(p_slug text, p_name text)
returns text language plpgsql security definer set search_path to 'public' as $fn$
declare v text := 'COURSE-' || p_slug;
begin
  insert into public.user_profiles (line_user_id, name, role) values (v, left(coalesce(nullif(btrim(p_name), ''), 'Pro shop'), 80), 'proshop')
  on conflict (line_user_id) do nothing;
  return v;
end $fn$;
revoke all on function public._mh_course_profile(text, text) from public, anon, authenticated;

create or replace function public.mh_inbox(p_token text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $fn$
declare
  keys  text[] := coalesce(public._desk_keys(nullif(p_token, '')), '{}'::text[]);
  own   text := public._desk_owner(nullif(p_token, ''));
  ids   text[];
  dms   jsonb; grp jsonb; evs jsonb; bc jsonb;
begin
  if cardinality(keys) = 0 or own is null then return jsonb_build_object('ok', false, 'reason', 'token'); end if;
  ids := array(select 'COURSE-' || k from unnest(keys) k);

  -- people: whoever wrote to the course, or got a message from the course addressed to them (not an event round-robin)
  with dm as (
    select case when d.sender_line_id = any (ids) then d.recipient_line_id else d.sender_line_id end peer,
           d.sender_line_id, d.recipient_line_id, d.message_text, d.created_at, d.is_read
      from public.direct_messages d
     where (d.sender_line_id = any (ids) or d.recipient_line_id = any (ids)) and d.created_at > now() - interval '180 days'
  ), qual as (
    select peer from dm where recipient_line_id = any (ids)
    union
    select unnest(m.delivered_to) from public.event_course_messages m
     where m.event_id is null and m.side = 'course' and m.course_slug = any (keys) and m.created_at > now() - interval '180 days'
       and not exists (select 1 from public.course_broadcasts b where b.ecm_id = m.id)   -- a caddy round-robin is not a conversation
  ), last as (
    select distinct on (peer) peer, sender_line_id, message_text, created_at from dm
     where peer in (select peer from qual) and peer not like 'COURSE-%' order by peer, created_at desc
  ), un as (
    select peer, count(*) n from dm where recipient_line_id = any (ids) and not coalesce(is_read, false) group by peer
  )
  select coalesce(jsonb_agg(x order by (x ->> 'at') desc), '[]'::jsonb) into dms from (
    select jsonb_build_object('peer', l.peer, 'mine', l.sender_line_id = any (ids), 'text', left(l.message_text, 200), 'at', l.created_at,
             'unread', coalesce(un.n, 0),
             'name', coalesce(nullif(btrim(cp.name), ''), nullif(btrim(up.name), ''), so.name, 'Golfer'),
             'kind', case when cp.id is not null then 'c' when so.name is not null then 's' when st.id is not null then 'st' else 'g' end,
             'num', cp.caddy_number,
             'photo', coalesce(nullif(cp.photo_url, ''), up.profile_data -> 'media' ->> 'profilePhoto', up.profile_data ->> 'linePictureUrl')) x
      from last l
      left join un on un.peer = l.peer
      left join public.user_profiles up on up.line_user_id = l.peer
      left join lateral (select c.id, c.name, c.caddy_number, c.photo_url from public.caddy_profiles c
                          where c.user_id = l.peer order by (c.course_id = any (keys)) desc limit 1) cp on true
      left join lateral (select s.society_name as name from public.society_profiles s where s.id::text = l.peer
                         union all select s2.name from public.societies s2 where s2.id::text = l.peer limit 1) so on true
      left join lateral (select x.id from public.course_staff x where x.user_id = l.peer and x.course_id = any (keys) limit 1) st on true
     order by l.created_at desc limit 250) q;

  -- golfer + pro shop + caddy chats
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', g.id, 'golfer', g.golfer_id, 'slug', g.course_slug,
           'gname', (select coalesce(nullif(btrim(p.name), ''), 'Golfer') from public.user_profiles p where p.line_user_id = g.golfer_id),
           'gphoto', (select coalesce(p.profile_data -> 'media' ->> 'profilePhoto', p.profile_data ->> 'linePictureUrl') from public.user_profiles p where p.line_user_id = g.golfer_id),
           'caddies', coalesce((select jsonb_agg(jsonb_build_object('uid', m.member_line_id, 'num', c.caddy_number, 'name', c.name))
                                  from public.group_chat_members m join public.caddy_profiles c on c.user_id = m.member_line_id
                                 where m.group_id = g.id), '[]'::jsonb),
           'last', (select jsonb_build_object('text', left(x.message_text, 200), 'at', x.created_at, 'mine', x.sender_line_id like 'COURSE-%', 'kind', x.kind,
                                              'by', coalesce((select '#' || c.caddy_number || ' ' || split_part(btrim(c.name), ' ', 1) from public.caddy_profiles c where c.user_id = x.sender_line_id limit 1),
                                                             (select p.name from public.user_profiles p where p.line_user_id = x.sender_line_id)))
                      from public.group_chat_messages x where x.group_id = g.id order by x.created_at desc limit 1),
           'unread', (select count(*) from public.group_chat_messages x
                       where x.group_id = g.id and x.sender_line_id not like 'COURSE-%'
                         and x.created_at > coalesce((select max(r.last_read_at) from public.group_chat_reads r where r.group_id = g.id and r.reader_line_id = any (ids)), '-infinity'::timestamptz))
         )), '[]'::jsonb) into grp
    from public.group_chats g where g.course_slug = any (keys);

  -- society event threads (the Societies panel owns them; the inbox lists them)
  select coalesce(jsonb_agg(jsonb_build_object('event_id', e.event_id, 'title', se.title, 'date', se.event_date, 'at', e.at, 'unread', e.unread,
                                               'text', left(lm.body, 200), 'by', lm.sender_name, 'mine', lm.side = 'course') order by e.at desc), '[]'::jsonb) into evs
    from (select m.event_id, max(m.created_at) at,
                 count(*) filter (where m.side in ('society', 'golfer') and m.seen_at is null and m.done_at is null) unread
            from public.event_course_messages m
           where m.event_id is not null and m.course_slug = any (keys) and m.kind = 'text' and m.created_at > now() - interval '60 days'
           group by m.event_id) e
    join public.society_events se on se.id = e.event_id
    left join lateral (select m.body, m.sender_name, m.side from public.event_course_messages m
                        where m.event_id = e.event_id and m.course_slug = any (keys) and m.kind = 'text' order by m.created_at desc limit 1) lm on true;

  -- caddy broadcasts, one thread per audience
  select coalesce(jsonb_agg(jsonb_build_object('aud', b.audience, 'label', b.label, 'text', left(b.body, 200), 'at', b.created_at, 'n', cardinality(b.delivered_to)) order by b.created_at desc), '[]'::jsonb) into bc
    from (select distinct on (audience) * from public.course_broadcasts where course_slug = any (keys) order by audience, created_at desc) b;

  return public._msg_prefs_of(own) || jsonb_build_object('ok', true, 'keys', to_jsonb(keys), 'dms', dms, 'groups', grp, 'events', evs, 'bcasts', bc);
end $fn$;

-- one person's thread: the 1:1 messages + their course chat (if a caddy was added) + who's on their booking today
create or replace function public.mh_thread(p_token text, p_peer text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $fn$
declare
  keys text[] := coalesce(public._desk_keys(nullif(p_token, '')), '{}'::text[]);
  ids  text[];
  g    record;
  msgs jsonb; gm jsonb; who jsonb; today jsonb; bc jsonb;
  d    date := (now() at time zone 'Asia/Bangkok')::date;
begin
  if cardinality(keys) = 0 then return jsonb_build_object('ok', false, 'reason', 'token'); end if;
  ids := array(select 'COURSE-' || k from unnest(keys) k);
  if p_peer like 'b:%' then
    select coalesce(jsonb_agg(jsonb_build_object('text', b.body, 'at', b.created_at, 'n', cardinality(b.delivered_to), 'live', b.live_n, 'label', b.label, 'by', b.sent_by) order by b.created_at), '[]'::jsonb) into bc
      from (select * from public.course_broadcasts where course_slug = any (keys) and audience = substr(p_peer, 3) order by created_at desc limit 100) b;
    return jsonb_build_object('ok', true, 'bcasts', bc);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'mine', x.sender_line_id = any (ids), 'text', x.message_text, 'at', x.created_at) order by x.created_at), '[]'::jsonb) into msgs
    from (select * from public.direct_messages m
           where (m.sender_line_id = any (ids) and m.recipient_line_id = p_peer) or (m.sender_line_id = p_peer and m.recipient_line_id = any (ids))
           order by m.created_at desc limit 300) x;

  select * into g from public.group_chats where course_slug = any (keys) and golfer_id = p_peer limit 1;
  if g.id is not null then
    select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'mine', x.sender_line_id like 'COURSE-%', 'text', x.message_text, 'at', x.created_at, 'kind', x.kind,
             'cad', exists (select 1 from public.caddy_profiles c where c.user_id = x.sender_line_id),
             'by', coalesce((select '#' || c.caddy_number || ' ' || split_part(btrim(c.name), ' ', 1) from public.caddy_profiles c where c.user_id = x.sender_line_id limit 1),
                            (select p.name from public.user_profiles p where p.line_user_id = x.sender_line_id))) order by x.created_at), '[]'::jsonb) into gm
      from (select * from public.group_chat_messages m where m.group_id = g.id order by m.created_at desc limit 300) x;
  end if;

  select jsonb_build_object('id', p_peer, 'name', coalesce(nullif(btrim(cp.name), ''), nullif(btrim(up.name), ''), 'Golfer'),
           'kind', case when cp.id is not null then 'c' else 'g' end, 'num', cp.caddy_number,
           'photo', coalesce(nullif(cp.photo_url, ''), up.profile_data -> 'media' ->> 'profilePhoto', up.profile_data ->> 'linePictureUrl'),
           'line', p_peer ~ '^U[0-9a-f]{32}$')
    into who
    from (select 1) one
    left join public.user_profiles up on up.line_user_id = p_peer
    left join lateral (select c.id, c.name, c.caddy_number, c.photo_url from public.caddy_profiles c where c.user_id = p_peer limit 1) cp on true;

  -- the caddies on this golfer's tee time today (theirs first, then the group's)
  select coalesce(jsonb_agg(t order by (t ->> 'mine') desc, t ->> 'time'), '[]'::jsonb) into today from (
    select distinct on (cb.caddy_id) jsonb_build_object('caddy', cb.caddy_id, 'num', c.caddy_number, 'name', c.name, 'time', to_char(coalesce(cb.tee_time, cb.start_time), 'HH24:MI'),
             'mine', cb.golfer_id = p_peer or cb.user_id = p_peer, 'uid', c.user_id,
             'live', c.user_id ~ '^U' or exists (select 1 from public.caddy_pin_logins l where l.user_id = c.user_id and l.last_login_at is not null),
             'in', g.id is not null and exists (select 1 from public.group_chat_members m where m.group_id = g.id and m.member_line_id = c.user_id)) t
      from public.caddy_bookings cb
      join public.caddy_profiles c on c.id = cb.caddy_id
     where cb.booking_date = d and coalesce(cb.status, '') not in ('cancelled', 'declined')
       and (cb.golfer_id = p_peer or cb.user_id = p_peer
            or (cb.teesheet_booking_id is not null and cb.teesheet_booking_id in (select x.teesheet_booking_id from public.caddy_bookings x
                 where x.booking_date = d and (x.golfer_id = p_peer or x.user_id = p_peer) and x.teesheet_booking_id is not null)))
     order by cb.caddy_id, (cb.golfer_id = p_peer or cb.user_id = p_peer) desc) q;

  return jsonb_build_object('ok', true, 'who', who, 'msgs', msgs, 'group', case when g.id is null then null else jsonb_build_object('id', g.id,
           'caddies', coalesce((select jsonb_agg(jsonb_build_object('uid', m.member_line_id, 'num', c.caddy_number, 'name', c.name))
                                  from public.group_chat_members m join public.caddy_profiles c on c.user_id = m.member_line_id where m.group_id = g.id), '[]'::jsonb)) end,
         'gmsgs', coalesce(gm, '[]'::jsonb), 'today', today);
end $fn$;

-- read: the course's unread from this person (1:1 + their course chat); a desk "mark unread" is cleared too
create or replace function public.mh_read(p_token text, p_peer text)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare
  keys text[] := coalesce(public._desk_keys(nullif(p_token, '')), '{}'::text[]);
  ids  text[];
  g    record;
begin
  if cardinality(keys) = 0 then return jsonb_build_object('ok', false, 'reason', 'token'); end if;
  ids := array(select 'COURSE-' || k from unnest(keys) k);
  update public.direct_messages set is_read = true, read_at = now()
   where recipient_line_id = any (ids) and sender_line_id = p_peer and not coalesce(is_read, false);
  for g in select id, course_slug from public.group_chats where course_slug = any (keys) and golfer_id = p_peer loop
    insert into public.group_chat_reads (group_id, reader_line_id, last_read_at) values (g.id, 'COURSE-' || g.course_slug, now())
    on conflict (group_id, reader_line_id) do update set last_read_at = now();
  end loop;
  perform public._msg_pref_set(public._desk_owner(p_token), 'u:' || p_peer, 'read', null);
  return jsonb_build_object('ok', true);
end $fn$;

-- send to a person: into their course chat when a caddy is in it, else the course's direct message (pc_send_message)
create or replace function public.mh_send(p_token text, p_slug text, p_peer text, p_body text, p_by text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare
  keys text[] := coalesce(public._desk_keys(nullif(p_token, '')), '{}'::text[]);
  g    record;
  nm   text;
  body text := left(btrim(coalesce(p_body, '')), 2000);
  mid  uuid;
begin
  if not (p_slug = any (keys)) then return jsonb_build_object('ok', false, 'reason', 'token'); end if;
  if body = '' then return jsonb_build_object('ok', false, 'reason', 'empty'); end if;
  select * into g from public.group_chats where course_slug = any (keys) and golfer_id = p_peer limit 1;
  if g.id is not null then
    perform public._mh_course_profile(g.course_slug, p_by);
    insert into public.group_chat_messages (group_id, sender_line_id, message_text) values (g.id, 'COURSE-' || g.course_slug, body) returning id into mid;
    insert into public.group_chat_reads (group_id, reader_line_id, last_read_at) values (g.id, 'COURSE-' || g.course_slug, now())
    on conflict (group_id, reader_line_id) do update set last_read_at = now();
    return jsonb_build_object('ok', true, 'via', 'group', 'id', mid,
      'delivered', (select count(*) from public.group_chat_members m where m.group_id = g.id and m.member_line_id not like 'COURSE-%'));
  end if;
  select coalesce(nullif(btrim(c.name), ''), nullif(btrim(p.name), ''), 'Golfer') into nm
    from public.user_profiles p left join public.caddy_profiles c on c.user_id = p.line_user_id where p.line_user_id = p_peer limit 1;
  if nm is null then return jsonb_build_object('ok', false, 'reason', 'who'); end if;
  return public.pc_send_message(p_token, p_slug, p_by, array[p_peer], replace(nm, ',', ' '), null, null, null, null, body) || jsonb_build_object('via', 'direct');
end $fn$;

-- the course's caddies with "has the app" (LINE account, or signed in with their caddy PIN); PINs only when asked
create or replace function public.mh_caddies(p_token text, p_pins boolean default false)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $fn$
declare keys text[] := coalesce(public._desk_keys(nullif(p_token, '')), '{}'::text[]);
begin
  if cardinality(keys) = 0 then return jsonb_build_object('ok', false, 'reason', 'token'); end if;
  return jsonb_build_object('ok', true, 'caddies', coalesce((select jsonb_agg(jsonb_build_object(
           'id', c.id, 'num', c.caddy_number, 'name', c.name, 'uid', c.user_id,
           'live', c.user_id ~ '^U' or l.last_login_at is not null,
           'pin', case when p_pins and c.user_id ~ '^CADDY-[0-9a-f]{32}$' then l.pin end) order by nullif(regexp_replace(c.caddy_number, '\D', '', 'g'), '')::int nulls last, c.caddy_number)
      from public.caddy_profiles c left join public.caddy_pin_logins l on l.user_id = c.user_id
     where c.course_id = any (keys) and coalesce(c.is_active, true) and c.left_at is null and not coalesce(c.is_mock, false)), '[]'::jsonb));
end $fn$;

-- put a caddy into the golfer's chat (creates the course chat the first time)
create or replace function public.mh_add_caddy(p_token text, p_slug text, p_golfer text, p_caddy uuid, p_by text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare
  keys text[] := coalesce(public._desk_keys(nullif(p_token, '')), '{}'::text[]);
  cp   record;
  gid  uuid;
  me   text;
  gnm  text;
begin
  if not (p_slug = any (keys)) then return jsonb_build_object('ok', false, 'reason', 'token'); end if;
  select * into cp from public.caddy_profiles where id = p_caddy and course_id = any (keys) and left_at is null;
  if cp.id is null then return jsonb_build_object('ok', false, 'reason', 'caddy'); end if;
  if cp.user_id is null then cp.user_id := public._caddy_account(cp.id); end if;
  if cp.user_id is null then return jsonb_build_object('ok', false, 'reason', 'noapp'); end if;
  if not exists (select 1 from public.user_profiles where line_user_id = p_golfer) or p_golfer like 'COURSE-%' then
    return jsonb_build_object('ok', false, 'reason', 'who');
  end if;
  gnm := left(coalesce(nullif(btrim(p_by), ''), 'Pro shop'), 80);
  me := public._mh_course_profile(p_slug, gnm);
  select id into gid from public.group_chats where course_slug = any (keys) and golfer_id = p_golfer limit 1;
  if gid is null then
    insert into public.group_chats (name, description, creator_line_id, course_slug, golfer_id)
    values (gnm, 'Golfer + pro shop + caddy', me, p_slug, p_golfer) returning id into gid;
    insert into public.group_chat_members (group_id, member_line_id, role) values (gid, me, 'admin'), (gid, p_golfer, 'member') on conflict do nothing;
  else
    select 'COURSE-' || course_slug into me from public.group_chats where id = gid;
  end if;
  if exists (select 1 from public.group_chat_members where group_id = gid and member_line_id = cp.user_id) then
    return jsonb_build_object('ok', true, 'group', gid, 'already', true);
  end if;
  insert into public.group_chat_members (group_id, member_line_id, role) values (gid, cp.user_id, 'member');
  insert into public.group_chat_messages (group_id, sender_line_id, message_text, kind)
  values (gid, me, 'Pro shop added caddy #' || cp.caddy_number || ' ' || split_part(btrim(cp.name), ' ', 1) || ' to this chat', 'system');
  return jsonb_build_object('ok', true, 'group', gid);
end $fn$;

-- message caddies: each one gets it in their Messages (from the course), LINE when they have it
create or replace function public.mh_caddy_send(p_token text, p_slug text, p_aud text, p_label text, p_ids uuid[], p_body text, p_by text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare
  keys    text[] := coalesce(public._desk_keys(nullif(p_token, '')), '{}'::text[]);
  targets text[];
  m       public.event_course_messages;
  dmids   uuid[];
  live    int;
  body    text := left(btrim(coalesce(p_body, '')), 2000);
begin
  if not (p_slug = any (keys)) then return jsonb_build_object('ok', false, 'reason', 'token'); end if;
  if body = '' then return jsonb_build_object('ok', false, 'reason', 'empty'); end if;
  if p_aud not in ('duty', 'course', 'free', 'one') then return jsonb_build_object('ok', false, 'reason', 'audience'); end if;
  perform public._caddy_account(c.id) from public.caddy_profiles c where c.id = any (p_ids) and c.user_id is null and c.course_id = any (keys);
  targets := array(select distinct c.user_id from public.caddy_profiles c
                    where c.id = any (coalesce(p_ids, '{}'::uuid[])) and c.course_id = any (keys) and c.user_id is not null and c.left_at is null);
  if cardinality(targets) = 0 then return jsonb_build_object('ok', false, 'reason', 'nobody'); end if;
  perform public._mh_course_profile(p_slug, p_by);
  perform set_config('ecm.direct_ok', '1', true);
  insert into public.event_course_messages (event_id, course_slug, side, sender_id, sender_name, kind, body, to_kind, to_ids, to_label)
  values (null, p_slug, 'course', 'course:' || p_slug, left(coalesce(nullif(btrim(p_by), ''), 'Pro shop'), 80), 'text', body, 'custom', targets,
          left(replace(coalesce(nullif(btrim(p_label), ''), 'Caddies'), ',', ' '), 120))
  returning * into m;
  perform set_config('ecm.direct_ok', '', true);
  dmids := array(select d.id from public.direct_messages d
                  where d.sender_line_id = 'COURSE-' || p_slug and d.recipient_line_id = any (m.delivered_to) and d.created_at >= m.created_at);
  live := (select count(*) from unnest(m.delivered_to) u
            where u ~ '^U' or exists (select 1 from public.caddy_pin_logins l where l.user_id = u and l.last_login_at is not null));
  -- one caddy = her own conversation with the pro shop (u:<her id>), not a round-robin thread
  if p_aud <> 'one' then
    insert into public.course_broadcasts (course_slug, audience, label, body, to_ids, delivered_to, live_n, dm_ids, ecm_id, sent_by)
    values (p_slug, p_aud, left(p_label, 120), body, targets, m.delivered_to, live, coalesce(dmids, '{}'), m.id, left(p_by, 80));
  end if;
  return jsonb_build_object('ok', true, 'sent', cardinality(m.delivered_to), 'live', live);
end $fn$;

grant execute on function public.mh_pref(text, text, text, text), public.mh_folder(text, text, text, uuid),
  public.msg_prefs(text), public.msg_pref(text, text, text, text), public.msg_folder(text, text, text, uuid),
  public.mh_inbox(text), public.mh_thread(text, text), public.mh_read(text, text), public.mh_send(text, text, text, text, text),
  public.mh_caddies(text, boolean), public.mh_add_caddy(text, text, text, uuid, text),
  public.mh_caddy_send(text, text, text, text, uuid[], text, text) to anon, authenticated;

-- ============================================================ 6. fixes
-- Tap-In: a course's message sender (COURSE-<slug>) is a Course, not a Player
create or replace function public.gfd_dm_people(p_user text, p_ids text[])
returns jsonb language sql stable security definer set search_path to 'public' as $fn$
  select coalesce(jsonb_agg(
           public.gfd_person(x.norm)
           || jsonb_build_object('dm_id', x.id, 'folder', x.folder)
         ), '[]'::jsonb)
  from (
    select i.id,
           -- a page can arrive either as its bare id (direct_messages) or already prefixed (Tap-In)
           case
             when i.id like 'society:%' or i.id like 'course:%' then i.id
             when exists (select 1 from public.society_profiles s where s.id::text = i.id) then 'society:' || i.id
             when exists (select 1 from public.societies s where s.id::text = i.id) then
               coalesce((select 'society:' || sp.id::text from public.society_profiles sp
                          join public.societies so on so.id::text = i.id
                         where lower(sp.society_name) = lower(so.name) limit 1), i.id)
             when exists (select 1 from public.courses c where c.id = i.id) then 'course:' || i.id
             else i.id
           end as norm,
           case
             when i.id like 'COURSE-%' or i.id like 'course:%' or exists (select 1 from public.courses c where c.id = i.id) then 'course'
             when i.id like 'society:%' or exists (select 1 from public.society_profiles s where s.id::text = i.id)
                  or exists (select 1 from public.societies s where s.id::text = i.id) then 'society'
             when exists (select 1 from public.caddy_profiles cp
                           where cp.user_id = i.id and coalesce(cp.caddy_number,'') <> '' and cp.course_id is not null
                             and coalesce(cp.is_active, true) and not coalesce(cp.is_mock, false)) then 'caddy'
             when exists (select 1 from public.marketplace_listings l
                           where l.seller_line_id = i.id
                             and (exists (select 1 from public.marketplace_enquiries e where e.listing_id = l.id and e.buyer_id = p_user)
                               or exists (select 1 from public.marketplace_offers o where o.listing_id = l.id and o.buyer_line_id = p_user))) then 'vendor'
             else 'player'
           end as folder
    from unnest(coalesce(p_ids, '{}'::text[])) with ordinality as i(id, ord)
    where i.id is not null and i.id <> ''
    order by i.ord
  ) x
$fn$;

-- an assigned inbox job lands in the department's Messages tab (dashboards read status 'active')
do $do$
declare src text;
begin
  select pg_get_functiondef('public.ecm_handle(text,uuid,text,text,text)'::regprocedure) into src;
  if position('''open'');' in src) > 0 then
    execute replace(src, 'jsonb_build_object(''ecm_id'', m.id, ''event_id'', m.event_id), ''open'');', 'jsonb_build_object(''ecm_id'', m.id, ''event_id'', m.event_id), ''active'');');
  end if;
end $do$;
update public.staff_messages set status = 'active' where status = 'open' and sender_id = 'proshop-desk';

-- no keys in function bodies: line-push-notification runs with verify_jwt = false (config.toml), so the trigger needs no
-- Authorization header at all; the duplicate group push (a second trigger calling LINE directly) is dropped — the
-- edge function's group handler already sends it, mapped to the Messaging-API id.
do $do$
declare src text;
begin
  select pg_get_functiondef('public.trigger_line_notification()'::regprocedure) into src;
  src := regexp_replace(src, 'service_role_key TEXT := ''[^'']*'';', 'service_role_key TEXT := NULL;');
  src := replace(src, 'headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer '' || service_role_key),',
                      'headers := jsonb_build_object(''Content-Type'', ''application/json''),');
  if src ~ 'eyJ' then raise exception 'trigger_line_notification still carries a key'; end if;
  execute src;
end $do$;
create or replace function public.notify_group_chat_message()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
begin
  perform net.http_post(
    url := 'https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/line-push-notification',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('type', 'group_message', 'record', jsonb_build_object(
      'group_id', new.group_id, 'sender_line_id', new.sender_line_id, 'message_text', new.message_text)));
  return new;
exception when others then
  raise warning 'notify_group_chat_message: %', sqlerrm;
  return new;
end $fn$;
drop trigger if exists trigger_group_chat_notification on public.group_chat_messages;
-- direct_messages -> trigger_line_notification sent row_to_json (recipient_line_id) to a handler that reads recipient_id:
-- a no-op on every DM that still spent the edge function's per-IP budget (30/min, shared by EVERY database push).
-- DM pushes are sent by secure-dm and ecm_deliver themselves.
drop trigger if exists trigger_new_message_notification on public.direct_messages;

commit;
