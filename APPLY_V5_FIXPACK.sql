-- mcipro chat fix pack v5 (adaptive, no hard-coded user_id indexes)
-- Run this in Supabase SQL editor. It’s idempotent and adapts to your existing schema.

-- 1) Make sure RLS is on for rooms (we won't change policies you already have).
do $$ begin
  perform 1 from pg_tables where schemaname='public' and tablename='rooms';
  if not found then
    create table public.rooms (
      id uuid primary key default gen_random_uuid(),
      kind text not null check (kind in ('dm','group')),
      slug text not null unique
    );
    alter table public.rooms enable row level security;
  end if;
end $$;

-- 2) Minimal chat_messages table if you don't have one.
do $$ begin
  perform 1 from pg_tables where schemaname='public' and tablename='chat_messages';
  if not found then
    create table public.chat_messages (
      id uuid primary key default gen_random_uuid(),
      room_id uuid not null references public.rooms(id) on delete cascade,
      sender uuid not null default auth.uid(),
      content text not null,
      created_at timestamptz not null default now()
    );
    alter table public.chat_messages enable row level security;
  end if;
end $$;

-- 3) Helper function to find the membership table/column dynamically.
create or replace function public._mcipro_detect_membership()
returns table(tbl_name text, user_col text) language plpgsql as $$
declare
  t text;
  c text;
begin
  -- preferred table names, in order
  for t in select unnest(ARRAY['conversation_participants','room_participants','room_members','participants']) loop
    if exists (
      select 1 from pg_tables where schemaname='public' and tablename=t
    ) then
      -- preferred column names, in order
      for c in select unnest(ARRAY['user_id','profile_id','member_id','account_id','uid']) loop
        if exists (
          select 1
          from information_schema.columns isc
          where isc.table_schema='public' and isc.table_name=t and isc.column_name=c
        ) then
          tbl_name := t; user_col := c; return next;
          return;
        end if;
      end loop;
      -- If table exists but no known user column, add user_id
      execute format('alter table public.%I add column if not exists user_id uuid', t);
      tbl_name := t; user_col := 'user_id'; return next; return;
    end if;
  end loop;

  -- If none of the tables exists, create a minimal one.
  execute 'create table if not exists public.room_members (room_id uuid references public.rooms(id) on delete cascade, user_id uuid not null, primary key(room_id, user_id))';
  tbl_name := 'room_members'; user_col := 'user_id'; return next;
end $$;

-- 4) Security definer RPC to open/create a DM without any ambiguous column refs.
drop function if exists public.ensure_direct_conversation(uuid);
create or replace function public.ensure_direct_conversation(partner uuid)
returns table(room_id uuid, room_slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid; b uuid;
  slug text;
  rid uuid;
  mtable text; mcol text;
begin
  if me is null then
    raise exception 'auth.uid() is null; user must be authenticated';
  end if;
  if partner is null or partner = me then
    raise exception 'partner must be another user';
  end if;

  if me < partner then a := me; b := partner; else a := partner; b := me; end if;
  slug := 'dm:' || a::text || ':' || b::text;

  select r.id into rid from public.rooms r where r.slug = slug and r.kind = 'dm' limit 1;

  if rid is null then
    insert into public.rooms(kind, slug) values ('dm', slug) returning id into rid;

    -- detect or create membership table+column
    select t.tbl_name, t.user_col into mtable, mcol from public._mcipro_detect_membership() t limit 1;

    -- add two members (me & partner), ignore if conflicts
    execute format('insert into public.%I (room_id,%I) values ($1,$2) on conflict do nothing', mtable, mcol) using rid, me;
    execute format('insert into public.%I (room_id,%I) values ($1,$2) on conflict do nothing', mtable, mcol) using rid, partner;
  end if;

  room_id := rid; room_slug := slug;
  return;
end $$;

-- 5) Permissions
revoke all on function public.ensure_direct_conversation(uuid) from public;
grant execute on function public.ensure_direct_conversation(uuid) to authenticated;

-- 6) RLS for chat_messages: allow room members to read/write.
do $$
declare
  mtable text; mcol text;
begin
  select t.tbl_name, t.user_col into mtable, mcol from public._mcipro_detect_membership() t limit 1;

  -- policies are recreated idempotently
  execute 'drop policy if exists chat_messages_select on public.chat_messages';
  execute 'drop policy if exists chat_messages_insert on public.chat_messages';

  execute format($p$
    create policy chat_messages_select on public.chat_messages
    for select using (
      exists (
        select 1 from public.%I m
        where m.room_id = chat_messages.room_id
          and m.%I = auth.uid()
      )
    )$p$, mtable, mcol);

  execute format($p$
    create policy chat_messages_insert on public.chat_messages
    for insert with check (
      exists (
        select 1 from public.%I m
        where m.room_id = chat_messages.room_id
          and m.%I = auth.uid()
      )
    )$p$, mtable, mcol);
end $$;

-- 7) Optional: keep rooms readable only to members (only if you want).
-- This will not override your existing policies if they already exist.
do $$
declare
  has_policy boolean;
begin
  select exists (select 1 from pg_policies where schemaname='public' and tablename='rooms' and policyname='rooms_select_members') into has_policy;
  if not has_policy then
    -- try to respect existing membership mapping
    begin
      create or replace view public._room_memberships as
      select room_id, user_id from public.room_members
      union all select room_id, user_id from public.conversation_participants where false; -- will be ignored if table missing
      exception when undefined_table then
        -- ignore
      end;
      -- enable RLS if it isn't already
      begin
        alter table public.rooms enable row level security;
      exception when others then
        -- ignore
      end;

      create policy rooms_select_members on public.rooms
      for select using (
        exists (
          select 1 from public._room_memberships rm
          where rm.room_id = rooms.id and rm.user_id = auth.uid()
        )
      );
    end if;
end $$;