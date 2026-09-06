-- 1on1 MESSAGING (2026-09-06). Pete: "messaging needs a separation from the main messages, so like the society
-- separation lets set it up so there is a 1on1 messaging inbox and sent box".
--
-- Until now a 1on1 "Message" button went through SecureDM → public.direct_messages, i.e. the SAME inbox as every
-- other DM in the app, and the member persona's Messages tab EXITED 1on1 to the main Messages screen. That leaks
-- the separation the whole section is built on (partners are a hidden role that no directory shows) and gives the
-- member no way to tell a 1on1 message from a society one.
--
-- 1on1 messages now live in their own table under the same oo_* identity model: authenticated only, readable ONLY
-- by the two people on the message (and 1on1 admins), written ONLY through oo_send_message(). The main Messages
-- screen never sees them because it reads direct_messages — the separation is structural, not a filter.
-- Names are STAMPED at send time by the SECURITY DEFINER RPC: a partner cannot read oo_members (RLS) and a member
-- cannot read another member, so without the snapshot one side would be looking at a raw LINE id.
-- Run: npx supabase db query --linked -f sql/oo_messages_20260906.sql

create table if not exists public.oo_messages (
  id                 uuid primary key default gen_random_uuid(),
  society_id         uuid not null default public.oo_default_society(),
  sender_id          text not null,
  sender_name        text,
  recipient_id       text not null,
  recipient_name     text,
  booking_id         uuid references public.oo_bookings(id) on delete set null,
  body               text not null check (length(btrim(body)) between 1 and 2000),
  read_at            timestamptz,
  sender_deleted     boolean not null default false,
  recipient_deleted  boolean not null default false,
  created_at         timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index if not exists oo_messages_inbox_idx  on public.oo_messages(recipient_id, created_at desc);
create index if not exists oo_messages_sent_idx   on public.oo_messages(sender_id, created_at desc);
create index if not exists oo_messages_thread_idx on public.oo_messages(sender_id, recipient_id, created_at);

alter table public.oo_messages enable row level security;
revoke all on public.oo_messages from anon, public;
grant select on public.oo_messages to authenticated;      -- writes go through the RPCs below

drop policy if exists oo_messages_sel on public.oo_messages;
create policy oo_messages_sel on public.oo_messages for select to authenticated
  using (sender_id = public.oo_uid() or recipient_id = public.oo_uid() or public.oo_is_admin(society_id));

-- the name to show for a 1on1 identity (partner > member > app profile > the raw id)
create or replace function public.oo_display_name(p_uid text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p.display_name from public.oo_partners p where p.user_id = p_uid),
    (select m.display_name from public.oo_members  m where m.user_id = p_uid),
    (select nullif(coalesce(u.display_name, u.name), '') from public.user_profiles u where u.line_user_id = p_uid),
    p_uid)
$$;

-- send: only between 1on1 identities, only the sides that can actually deal with each other
create or replace function public.oo_send_message(p_to text, p_body text, p_booking uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid text := public.oo_uid(); v_body text := btrim(coalesce(p_body, '')); v_side text; v_to text; v_row jsonb;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  if v_body = '' then raise exception 'empty_message'; end if;
  v_body := left(v_body, 2000);
  if p_to is null or p_to = v_uid then raise exception 'bad_recipient'; end if;

  v_side := case when public.oo_partner_id() is not null then 'partner'
                 when public.oo_is_member() then 'member'
                 when public.oo_is_admin() then 'admin' end;
  if v_side is null then raise exception 'not_allowed' using errcode = '42501'; end if;
  if v_side <> 'admin' and not public.oo_terms_ok(v_uid, v_side) then raise exception 'terms_required' using errcode = '42501'; end if;

  -- admins FIRST: an admin who is also a member is still the support channel, and must stay reachable
  v_to := case
    when exists (select 1 from public.oo_admins   a where a.user_id = p_to) then 'admin'
    when exists (select 1 from public.oo_partners p where p.user_id = p_to and p.status = 'approved' and p.is_active) then 'partner'
    when exists (select 1 from public.oo_members  m where m.user_id = p_to and m.status <> 'removed') then 'member'
  end;
  if v_to is null then raise exception 'recipient_not_in_1on1'; end if;
  if v_side = v_to and v_side <> 'admin' then raise exception 'not_allowed' using errcode = '42501'; end if;  -- no member↔member / partner↔partner

  insert into public.oo_messages (sender_id, sender_name, recipient_id, recipient_name, booking_id, body)
  values (v_uid, public.oo_display_name(v_uid), p_to, public.oo_display_name(p_to), p_booking, v_body)
  returning to_jsonb(oo_messages.*) into v_row;
  return v_row;
end $$;

-- mark everything that person sent me as read
create or replace function public.oo_messages_read(p_from text) returns int
language plpgsql security definer set search_path = public as $$
declare v_uid text := public.oo_uid(); v_n int;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  update public.oo_messages set read_at = now()
   where recipient_id = v_uid and read_at is null and (p_from is null or sender_id = p_from);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- remove from MY box only (the other side keeps their copy)
create or replace function public.oo_message_delete(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid text := public.oo_uid(); v_row public.oo_messages;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  select * into v_row from public.oo_messages where id = p_id;
  if v_row.id is null then raise exception 'not_found'; end if;
  if v_row.sender_id = v_uid then update public.oo_messages set sender_deleted = true where id = p_id;
  elsif v_row.recipient_id = v_uid then update public.oo_messages set recipient_deleted = true where id = p_id;
  else raise exception 'not_your_message' using errcode = '42501'; end if;
  delete from public.oo_messages where id = p_id and sender_deleted and recipient_deleted;   -- gone for both = gone
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.oo_unread_messages() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.oo_messages
   where recipient_id = public.oo_uid() and read_at is null and not recipient_deleted
$$;

revoke all on function public.oo_display_name(text)          from public, anon;
revoke all on function public.oo_send_message(text, text, uuid) from public, anon;
revoke all on function public.oo_messages_read(text)         from public, anon;
revoke all on function public.oo_message_delete(uuid)        from public, anon;
revoke all on function public.oo_unread_messages()           from public, anon;
grant execute on function public.oo_display_name(text)          to authenticated;
grant execute on function public.oo_send_message(text, text, uuid) to authenticated;
grant execute on function public.oo_messages_read(text)         to authenticated;
grant execute on function public.oo_message_delete(uuid)        to authenticated;
grant execute on function public.oo_unread_messages()           to authenticated;

-- live inbox (the module already listens to oo_bookings on the same channel pattern)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'oo_messages') then
    alter publication supabase_realtime add table public.oo_messages;
  end if;
end $$;

select (select count(*) from public.oo_messages) as messages,
       (select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'oo_messages') as realtime;
