-- v1539 Pro shop inbox: every message the course RECEIVES (organizer or golfer, in an event thread) raises a loud
-- alert on the pro shop screen that stays until somebody handles it: seen → (assigned to a department) → done.
-- Pete 2026-10-13: "when the message is received at the Pro shop level it needs a loud and clear visible alert
-- notification to make sure that the message is read and delegated for the correct action."
-- Needs the course's own-PIN desk token (ps_desk_token_v1), like every private read of the thread (v1538).

begin;

alter table public.event_course_messages add column if not exists seen_at     timestamptz;
alter table public.event_course_messages add column if not exists seen_by     text;
alter table public.event_course_messages add column if not exists assigned_to text;
alter table public.event_course_messages add column if not exists assigned_at timestamptz;
alter table public.event_course_messages add column if not exists assigned_by text;
alter table public.event_course_messages add column if not exists done_at     timestamptz;
alter table public.event_course_messages add column if not exists done_by     text;
alter table public.event_course_messages drop constraint if exists event_course_messages_assigned_check;
alter table public.event_course_messages add constraint event_course_messages_assigned_check
  check (assigned_to is null or assigned_to = any (array['proshop', 'caddy', 'reception', 'management', 'fnb']));

-- open items for this desk: received (organizer / golfer), not done, last 14 days
create or replace function public.ecm_inbox(p_token text)
returns setof jsonb language sql stable security definer set search_path to 'public' as $fn$
  select jsonb_build_object(
           'id', m.id, 'event_id', m.event_id, 'side', m.side, 'kind', m.kind, 'qty', m.qty, 'body', m.body,
           'sender_name', m.sender_name, 'created_at', m.created_at, 'course_slug', m.course_slug,
           'seen_at', m.seen_at, 'seen_by', m.seen_by, 'assigned_to', m.assigned_to, 'assigned_at', m.assigned_at, 'assigned_by', m.assigned_by,
           'title', e.title, 'event_date', e.event_date)
  from public.event_course_messages m
  join public.society_events e on e.id = m.event_id
  cross join (select coalesce(public._desk_keys(nullif(p_token, '')), '{}'::text[]) k) kk
  where m.side in ('society', 'golfer') and m.kind in ('text', 'request')
    and m.done_at is null and m.created_at > now() - interval '14 days'
    and m.course_slug = any (kk.k)
  order by m.created_at desc
  limit 100;
$fn$;
grant execute on function public.ecm_inbox(text) to anon, authenticated;

-- seen / assign (posts the job into that department's staff channel) / done
create or replace function public.ecm_handle(p_token text, p_id uuid, p_action text, p_to text default null, p_by text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare
  keys text[] := coalesce(public._desk_keys(nullif(p_token, '')), '{}'::text[]);
  m    record;
  e    record;
  cid  text;
  who  text := left(coalesce(nullif(trim(p_by), ''), 'Pro shop'), 60);
begin
  select * into m from public.event_course_messages where id = p_id;
  if m.id is null or not (m.course_slug = any (keys)) then return jsonb_build_object('ok', false, 'reason', 'token'); end if;
  if p_action = 'seen' then
    update public.event_course_messages set seen_at = coalesce(seen_at, now()), seen_by = coalesce(seen_by, who) where id = p_id;
  elsif p_action = 'assign' then
    if p_to is null or not (p_to = any (array['proshop', 'caddy', 'reception', 'management', 'fnb'])) then
      return jsonb_build_object('ok', false, 'reason', 'department');
    end if;
    update public.event_course_messages
       set assigned_to = p_to, assigned_at = now(), assigned_by = who, seen_at = coalesce(seen_at, now()), seen_by = coalesce(seen_by, who)
     where id = p_id;
    select title, event_date into e from public.society_events where id = m.event_id;
    select t.course_id into cid from public.proshop_desk_tokens t where t.token = p_token;
    insert into public.staff_messages (course_id, department, msg_type, priority, sender_id, sender_name, sender_role, body, meta, status)
    values (coalesce(cid, m.course_slug), p_to, 'request', 'high', 'proshop-desk', who, 'proshop',
            coalesce(e.title, '') || coalesce(' · ' || to_char(e.event_date, 'Dy DD Mon'), '') || E'\n' || coalesce(m.sender_name, '') || ': ' || coalesce(m.body, ''),
            jsonb_build_object('ecm_id', m.id, 'event_id', m.event_id), 'open');
  elsif p_action = 'done' then
    update public.event_course_messages set done_at = now(), done_by = who, seen_at = coalesce(seen_at, now()), seen_by = coalesce(seen_by, who) where id = p_id;
  else
    return jsonb_build_object('ok', false, 'reason', 'action');
  end if;
  insert into public.event_course_pings (msg_id, event_id, side, org_sees, created_at)
  values (gen_random_uuid(), m.event_id, 'handled', false, now());   -- other pro shop screens refresh their alert
  return jsonb_build_object('ok', true);
end $fn$;
grant execute on function public.ecm_handle(text, uuid, text, text, text) to anon, authenticated;

commit;
