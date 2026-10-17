-- ROLLBACK v1605: restore the v1577 im_inbox / im_thread and drop the delete-for-me objects
create or replace function public.im_inbox(p_user text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me     text := public._app_golfer(p_user);
  peers  text[];
  people jsonb := '[]'::jsonb;
  dms    jsonb; grps jsonb; evs jsonb; socs jsonb;
begin
  if me is null then return jsonb_build_object('ok', false, 'reason', 'who'); end if;

  -- ---- direct messages: one row per peer -------------------------------------------
  select array_agg(distinct case when d.sender_line_id = me then d.recipient_line_id else d.sender_line_id end)
    into peers
    from public.direct_messages d
   where (d.sender_line_id = me or d.recipient_line_id = me) and d.created_at > now() - interval '400 days';
  if peers is not null then people := public.gfd_dm_people(me, peers); end if;

  with m as (
    select case when d.sender_line_id = me then d.recipient_line_id else d.sender_line_id end as peer, d.*
      from public.direct_messages d
     where (d.sender_line_id = me or d.recipient_line_id = me) and d.created_at > now() - interval '400 days'
  ), agg as (
    select peer, max(created_at) as at,
           count(*) filter (where recipient_line_id = me and not coalesce(is_read, false)) as unread
      from m group by peer
  ), lastm as (
    select distinct on (peer) peer, message_text, attachments, sender_line_id, created_at
      from m order by peer, created_at desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'key', 'u:' || a.peer, 'kind', 'dm', 'id', a.peer,
           'at', a.at, 'unread', a.unread,
           'text', l.message_text, 'att', coalesce(jsonb_array_length(l.attachments), 0),
           'mine', l.sender_line_id = me,
           'who', coalesce(p.x, jsonb_build_object('id', a.peer, 'name', 'Golfer', 'kind', 'golfer', 'folder', 'player'))
         ) order by a.at desc), '[]'::jsonb)
    into dms
    from agg a
    join lastm l on l.peer = a.peer
    left join lateral (select x from jsonb_array_elements(people) x where x->>'dm_id' = a.peer limit 1) p on true;

  -- ---- groups + course chats ---------------------------------------------------------
  with mem as (select group_id from public.group_chat_members where member_line_id = me),
  g as (select gc.* from public.group_chats gc join mem on mem.group_id = gc.id),
  lr as (select group_id, last_read_at from public.group_chat_reads where reader_line_id = me),
  lastm as (
    select distinct on (group_id) group_id, message_text, attachments, sender_line_id, created_at, kind
      from public.group_chat_messages where group_id in (select id from g) order by group_id, created_at desc
  ),
  un as (
    select gm.group_id, count(*) as n
      from public.group_chat_messages gm left join lr on lr.group_id = gm.group_id
     where gm.group_id in (select id from g) and gm.sender_line_id <> me
       and (lr.last_read_at is null or gm.created_at > lr.last_read_at)
     group by gm.group_id
  ),
  mems as (
    select group_id, count(*) as n, jsonb_agg(member_line_id) as ids
      from public.group_chat_members where group_id in (select id from g) group by group_id
  ),
  cad as (
    select gm.group_id, max(cp.caddy_number) as num
      from public.group_chat_members gm join public.caddy_profiles cp on cp.user_id = gm.member_line_id
     where gm.group_id in (select id from g) and coalesce(cp.caddy_number, '') <> '' and not coalesce(cp.is_mock, false)
     group by gm.group_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'key', 'g:' || g.id, 'kind', case when g.course_slug is not null then 'course' else 'group' end, 'id', g.id,
           'name', coalesce(nullif(g.name, ''), case when g.course_slug is not null then 'Pro shop' else 'Group' end),
           'course_slug', g.course_slug, 'golfer_id', g.golfer_id, 'avatar', g.avatar_url,
           'at', coalesce(l.created_at, g.updated_at, g.created_at), 'unread', coalesce(un.n, 0),
           'text', l.message_text, 'att', coalesce(jsonb_array_length(l.attachments), 0),
           'mine', l.sender_line_id = me, 'sys', coalesce(l.kind, '') = 'system',
           'by', case when l.sender_line_id = me or coalesce(l.kind, '') = 'system' then null else public._im_by(l.sender_line_id) end,
           'members', coalesce(mems.n, 0), 'member_ids', coalesce(mems.ids, '[]'::jsonb), 'caddy', cad.num
         ) order by coalesce(l.created_at, g.updated_at, g.created_at) desc), '[]'::jsonb)
    into grps
    from g
    left join lastm l on l.group_id = g.id
    left join un on un.group_id = g.id
    left join mems on mems.group_id = g.id
    left join cad on cad.group_id = g.id;

  -- ---- event chats: events I'm registered for, last week + the next 45 days -----------
  with reg as (select distinct er.event_id::text as eid from public.event_registrations er where er.player_id = me and coalesce(er.status, '') <> 'cancelled'),
  ev as (
    select se.id::text as eid, se.title, se.event_date, se.course_name, se.society_id, se.start_time
      from public.society_events se join reg on reg.eid = se.id::text
     where se.event_date >= current_date - 3 and se.event_date <= current_date + 10 and coalesce(se.status, '') <> 'cancelled'
  ),
  lr as (select event_id, last_read_at from public.event_message_reads where reader_line_id = me),
  lastm as (
    select distinct on (event_id) event_id, message_text, attachments, sender_line_id, created_at
      from public.event_group_messages where event_id in (select eid from ev) order by event_id, created_at desc
  ),
  un as (
    select em.event_id, count(*) as n
      from public.event_group_messages em left join lr on lr.event_id = em.event_id
     where em.event_id in (select eid from ev) and em.sender_line_id <> me
       and (lr.last_read_at is null or em.created_at > lr.last_read_at)
     group by em.event_id
  ),
  cnt as (select er.event_id::text as eid, count(*) as n from public.event_registrations er where er.event_id::text in (select eid from ev) and coalesce(er.status, '') <> 'cancelled' group by 1)
  select coalesce(jsonb_agg(jsonb_build_object(
           'key', 'e:' || ev.eid, 'kind', 'event', 'id', ev.eid,
           'name', ev.title, 'date', ev.event_date, 'course', ev.course_name, 'society_id', ev.society_id,
           'avatar', (select public.gfd_logo_url(sp.society_logo) from public.society_profiles sp where sp.id = ev.society_id),
           'at', coalesce(l.created_at, (ev.event_date::timestamp - interval '30 days')), 'unread', coalesce(un.n, 0),
           'text', l.message_text, 'att', coalesce(jsonb_array_length(l.attachments), 0),
           'mine', l.sender_line_id = me,
           'by', case when l.sender_line_id = me then null else public._im_by(l.sender_line_id) end,
           'members', coalesce(cnt.n, 0)
         ) order by coalesce(l.created_at, (ev.event_date::timestamp - interval '30 days')) desc), '[]'::jsonb)
    into evs
    from ev
    left join lastm l on l.event_id = ev.eid
    left join un on un.event_id = ev.eid
    left join cnt on cnt.eid = ev.eid;

  -- ---- society channels: announcements, read-only for members, organizers post ----
  with ms as (
    select sm.society_id::text as sid from public.society_members sm where sm.golfer_id = me and coalesce(sm.status, 'active') in ('active', 'approved')
    union select sp.id::text from public.society_profiles sp where sp.organizer_id = me
  ),
  sp as (
    select sp.id::text as sid, sp.society_name as name, public.gfd_logo_url(sp.society_logo) as logo, sp.organizer_id
      from public.society_profiles sp join ms on ms.sid = sp.id::text
  ),
  lasta as (
    select distinct on (a.society_id) a.society_id::text as sid, a.title, a.message_text, a.sender_line_id, a.created_at, a.priority
      from public.announcements a where a.society_id::text in (select sid from sp) order by a.society_id, a.created_at desc
  ),
  un as (
    select a.society_id::text as sid, count(*) as n
      from public.announcements a
     where a.society_id::text in (select sid from sp) and a.created_at > now() - interval '30 days'
       and not exists (select 1 from public.announcement_reads r where r.announcement_id = a.id and r.reader_line_id = me)
     group by 1
  ),
  cnt as (select sm.society_id::text as sid, count(*) as n from public.society_members sm where sm.society_id::text in (select sid from sp) and coalesce(sm.status, 'active') in ('active', 'approved') group by 1)
  select coalesce(jsonb_agg(jsonb_build_object(
           'key', 's:' || sp.sid, 'kind', 'society', 'id', sp.sid,
           'name', sp.name, 'avatar', sp.logo,
           'can_post', sp.organizer_id = me or me = 'U2b6d976f19bca4b2f4374ae0e10ed873' or exists (select 1 from public.society_members sm where sm.society_id::text = sp.sid and sm.golfer_id = me and sm.role = 'organizer'),
           'at', coalesce(l.created_at, '1970-01-01'::timestamptz), 'unread', coalesce(un.n, 0),
           'text', case when l.title is not null and l.title <> '' then l.title || ' — ' || coalesce(l.message_text, '') else l.message_text end,
           'att', 0, 'mine', l.sender_line_id = me, 'by', null, 'priority', l.priority,
           'members', coalesce(cnt.n, 0)
         ) order by coalesce(l.created_at, '1970-01-01'::timestamptz) desc), '[]'::jsonb)
    into socs
    from sp
    left join lasta l on l.sid = sp.sid
    left join un on un.sid = sp.sid
    left join cnt on cnt.sid = sp.sid;

  return public._msg_prefs_of(me) || jsonb_build_object('ok', true, 'me', me,
           'threads', coalesce(dms, '[]'::jsonb) || coalesce(grps, '[]'::jsonb) || coalesce(evs, '[]'::jsonb) || coalesce(socs, '[]'::jsonb),
           'now', now());
end $$;

create or replace function public.im_thread(p_user text, p_key text, p_limit int default 200) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me   text := public._app_golfer(p_user);
  kind text := split_part(p_key, ':', 1);
  tid   text := substr(p_key, 3);
  lim  int  := least(greatest(coalesce(p_limit, 200), 20), 500);
  msgs jsonb := '[]'::jsonb;
  head jsonb := '{}'::jsonb;
  members jsonb := '[]'::jsonb;
  g record;
begin
  if me is null then return jsonb_build_object('ok', false, 'reason', 'who'); end if;
  if coalesce(tid, '') = '' then return jsonb_build_object('ok', false, 'reason', 'key'); end if;

  if kind = 'u' then
    select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'from', d.sender_line_id, 'mine', d.sender_line_id = me,
             'text', d.message_text, 'att', d.attachments, 'at', d.created_at, 'read', coalesce(d.is_read, false),
             'rid', d.reply_to_id, 'rtext', d.reply_to_text, 'rname', d.reply_to_name) order by d.created_at), '[]'::jsonb)
      into msgs
      from (select * from public.direct_messages d
             where (d.sender_line_id = me and d.recipient_line_id = tid) or (d.sender_line_id = tid and d.recipient_line_id = me)
             order by d.created_at desc limit lim) d;
    head := coalesce((select x from jsonb_array_elements(public.gfd_dm_people(me, array[tid])) x limit 1),
                     jsonb_build_object('id', tid, 'name', 'Golfer', 'kind', 'golfer', 'folder', 'player'));
    -- a course desk peer: the course's name
    if tid like 'COURSE-%' then
      head := head || jsonb_build_object('name', coalesce((select v.name from public.course_venues v where v.slug = substr(tid, 8) limit 1), head->>'name'), 'kind', 'course', 'folder', 'course');
    end if;

  elsif kind = 'g' then
    select gc.* into g from public.group_chats gc where gc.id::text = tid;
    if g.id is null then return jsonb_build_object('ok', false, 'reason', 'gone'); end if;
    if not exists (select 1 from public.group_chat_members m where m.group_id = g.id and m.member_line_id = me) then
      return jsonb_build_object('ok', false, 'reason', 'member');
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'from', m.sender_line_id, 'mine', m.sender_line_id = me,
             'name', public._im_by(m.sender_line_id), 'text', m.message_text, 'att', m.attachments, 'at', m.created_at,
             'sys', coalesce(m.kind, '') = 'system', 'rid', m.reply_to_id, 'rtext', m.reply_to_text, 'rname', m.reply_to_name) order by m.created_at), '[]'::jsonb)
      into msgs
      from (select * from public.group_chat_messages m where m.group_id = g.id order by m.created_at desc limit lim) m;
    select coalesce(jsonb_agg(jsonb_build_object('id', gm.member_line_id, 'name', public._im_by(gm.member_line_id), 'role', gm.role,
             'read_at', (select r.last_read_at from public.group_chat_reads r where r.group_id = g.id and r.reader_line_id = gm.member_line_id))), '[]'::jsonb)
      into members from public.group_chat_members gm where gm.group_id = g.id;
    head := jsonb_build_object('id', g.id, 'name', coalesce(nullif(g.name, ''), case when g.course_slug is not null then 'Pro shop' else 'Group' end),
              'kind', case when g.course_slug is not null then 'course' else 'group' end, 'avatar', g.avatar_url,
              'course_slug', g.course_slug, 'creator', g.creator_line_id, 'description', g.description);

  elsif kind = 'e' then
    if not exists (select 1 from public.event_registrations er where er.event_id::text = tid and er.player_id = me) then
      return jsonb_build_object('ok', false, 'reason', 'member');
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'from', m.sender_line_id, 'mine', m.sender_line_id = me,
             'name', public._im_by(m.sender_line_id), 'text', m.message_text, 'att', m.attachments, 'at', m.created_at,
             'rid', m.reply_to_id, 'rtext', m.reply_to_text, 'rname', m.reply_to_name) order by m.created_at), '[]'::jsonb)
      into msgs
      from (select * from public.event_group_messages m where m.event_id = tid order by m.created_at desc limit lim) m;
    select coalesce(jsonb_agg(jsonb_build_object('id', er.player_id, 'name', coalesce(nullif(er.player_name, ''), public._im_by(er.player_id)),
             'read_at', (select r.last_read_at from public.event_message_reads r where r.event_id = tid and r.reader_line_id = er.player_id))), '[]'::jsonb)
      into members from public.event_registrations er where er.event_id::text = tid and coalesce(er.status, '') <> 'cancelled';
    head := (select jsonb_build_object('id', se.id, 'name', se.title, 'kind', 'event', 'date', se.event_date, 'course', se.course_name,
                      'society_id', se.society_id, 'start_time', se.start_time,
                      'avatar', (select public.gfd_logo_url(sp.society_logo) from public.society_profiles sp where sp.id = se.society_id))
               from public.society_events se where se.id::text = tid);

  elsif kind = 's' then
    if not exists (select 1 from public.society_members sm where sm.society_id::text = tid and sm.golfer_id = me)
       and not exists (select 1 from public.society_profiles sp where sp.id::text = tid and sp.organizer_id = me) then
      return jsonb_build_object('ok', false, 'reason', 'member');
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'from', a.sender_line_id, 'mine', a.sender_line_id = me,
             'name', case when a.sender_line_id = 'U2b6d976f19bca4b2f4374ae0e10ed873' then 'Admin' else public._im_by(a.sender_line_id) end,
             'title', a.title, 'text', a.message_text, 'at', a.created_at, 'priority', a.priority, 'pinned', coalesce(a.is_pinned, false),
             'read', exists (select 1 from public.announcement_reads r where r.announcement_id = a.id and r.reader_line_id = me)) order by a.created_at), '[]'::jsonb)
      into msgs
      from (select * from public.announcements a where a.society_id::text = tid order by a.created_at desc limit lim) a;
    head := (select jsonb_build_object('id', sp.id, 'name', sp.society_name, 'kind', 'society', 'avatar', public.gfd_logo_url(sp.society_logo),
                      'can_post', sp.organizer_id = me or me = 'U2b6d976f19bca4b2f4374ae0e10ed873' or exists (select 1 from public.society_members sm where sm.society_id::text = tid and sm.golfer_id = me and sm.role = 'organizer'),
                      'members', (select count(*) from public.society_members sm where sm.society_id::text = tid and coalesce(sm.status, 'active') in ('active', 'approved')))
               from public.society_profiles sp where sp.id::text = tid);
  else
    return jsonb_build_object('ok', false, 'reason', 'kind');
  end if;

  return jsonb_build_object('ok', true, 'me', me, 'key', p_key, 'kind', kind, 'head', coalesce(head, '{}'::jsonb), 'messages', msgs, 'members', members, 'now', now());
end $$;

drop function if exists public.im_clear(text, text[]);
drop function if exists public.im_hide(text, text, text[]);
drop function if exists public.im_leave_group(text, text);
drop function if exists public._im_cut(text, text);
drop function if exists public._im_hid(text, text);
-- tables kept (data): drop table public.im_cleared; drop table public.im_hidden;
