create extension if not exists btree_gist;

-- =====================================================================================
-- 1on1 ("oo_") — JOA enterprise private playing-partner booking. 2026-09-03.
-- Spec: project-memory/2026-09-03 1on1 Spec.md
--
-- Members  = approved Korean golfers (normal golfer profiles), invite-link only.
-- Partners = caddies (caddy_profiles rows) who opt in from their caddie dashboard.
-- Bookings = a DATE RANGE anchored to a course / society event. Partners can decline + cancel.
--
-- Security: every oo_* table is RLS to `authenticated` ONLY (anon sees nothing). Identity comes
-- from the Auth v2 claim `line_id` (public.line_id()) which holds user_profiles.line_user_id
-- (LINE U…, KAKAO-…, GOOGLE-…). All state changes go through SECURITY DEFINER RPCs.
-- Run as ONE transaction:  npx supabase db query --linked -f sql/oo_schema_20260903.sql
-- =====================================================================================

-- ---------- program constant (single program today: JOA Golf Pattaya) ----------
create or replace function public.oo_default_society() returns uuid
language sql immutable as $$ select '0f5472a5-5d29-4c08-a16f-8c3dd1d6b22b'::uuid $$;

create or replace function public.oo_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Bangkok')::date $$;

-- ---------- tables ----------
create table if not exists public.oo_admins (
  user_id     text primary key,                       -- user_profiles.line_user_id
  society_id  uuid not null default public.oo_default_society(),
  added_by    text,
  created_at  timestamptz not null default now()
);

create table if not exists public.oo_invites (
  code          text primary key,
  society_id    uuid not null default public.oo_default_society(),
  kind          text not null check (kind in ('member','partner')),
  max_uses      int  not null default 1 check (max_uses > 0),
  used          int  not null default 0,
  auto_approve  boolean not null default false,
  expires_at    timestamptz,
  note          text,
  created_by    text,
  created_at    timestamptz not null default now()
);

create table if not exists public.oo_members (
  user_id       text primary key,                     -- user_profiles.line_user_id
  society_id    uuid not null default public.oo_default_society(),
  status        text not null default 'pending' check (status in ('pending','active','suspended','expired')),
  invite_code   text references public.oo_invites(code) on delete set null,
  display_name  text,
  approved_by   text,
  approved_at   timestamptz,
  expires_at    date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.oo_partners (
  id                uuid primary key default gen_random_uuid(),
  society_id        uuid not null default public.oo_default_society(),
  caddy_profile_id  uuid unique references public.caddy_profiles(id) on delete set null,
  user_id           text not null unique,             -- the caddie's login id
  display_name      text not null,
  bio               text,
  languages         text[] not null default '{}',
  handicap          numeric,
  home_course_name  text,
  courses_known     text[] not null default '{}',     -- local knowledge
  area_tips         text,
  availability_days text[] not null default '{mon,tue,wed,thu,fri,sat,sun}',
  day_rate          numeric check (day_rate is null or day_rate >= 0),
  currency          text not null default 'THB',
  cover_media_id    uuid,
  status            text not null default 'pending' check (status in ('pending','approved','suspended')),
  is_active         boolean not null default true,
  approved_by       text,
  approved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.oo_media (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid not null references public.oo_partners(id) on delete cascade,
  kind          text not null default 'photo' check (kind in ('photo','post')),
  storage_path  text,                                 -- oo-media object name: partners/<partner_id>/<file>
  caption       text,
  body          text,
  sort_order    int not null default 0,
  status        text not null default 'visible' check (status in ('visible','hidden','removed')),
  created_at    timestamptz not null default now()
);
create index if not exists oo_media_partner_idx on public.oo_media(partner_id, sort_order);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'oo_partners_cover_fk') then
    alter table public.oo_partners
      add constraint oo_partners_cover_fk foreign key (cover_media_id)
      references public.oo_media(id) on delete set null;
  end if;
end $$;

create table if not exists public.oo_blackouts (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references public.oo_partners(id) on delete cascade,
  date_from   date not null,
  date_to     date not null,
  note        text,
  created_at  timestamptz not null default now(),
  check (date_to >= date_from)
);
create index if not exists oo_blackouts_partner_idx on public.oo_blackouts(partner_id, date_from, date_to);

create table if not exists public.oo_bookings (
  id                 uuid primary key default gen_random_uuid(),
  society_id         uuid not null default public.oo_default_society(),
  partner_id         uuid not null references public.oo_partners(id),
  member_id          text not null references public.oo_members(user_id),
  date_from          date not null,
  date_to            date not null,
  course_name        text,
  course_id          text,
  society_event_id   uuid,
  holes              int not null default 18 check (holes in (9,18,27,36)),
  tee_time           time,
  notes              text,
  status             text not null default 'requested'
                     check (status in ('requested','accepted','declined','cancelled','completed','expired')),
  cancelled_by       text check (cancelled_by is null or cancelled_by in ('member','partner','admin')),
  decline_reason     text,
  cancel_reason      text,
  fee_quoted         numeric,
  currency           text not null default 'THB',
  payment_status     text not null default 'unpaid' check (payment_status in ('unpaid','paid')),
  dayoff_request_id  uuid,                            -- caddy_dayoff_requests auto-filed on accept
  requested_at       timestamptz not null default now(),
  responded_at       timestamptz,
  cancelled_at       timestamptz,
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (date_to >= date_from),
  check (date_to - date_from < 90),
  -- one ACCEPTED booking per partner per day, enforced by the database
  exclude using gist (partner_id with =, daterange(date_from, date_to, '[]') with &&) where (status = 'accepted')
);
create index if not exists oo_bookings_member_idx  on public.oo_bookings(member_id, status);
create index if not exists oo_bookings_partner_idx on public.oo_bookings(partner_id, status, date_from);

create table if not exists public.oo_reports (
  id              uuid primary key default gen_random_uuid(),
  society_id      uuid not null default public.oo_default_society(),
  reporter_id     text not null,
  target_user_id  text not null,
  booking_id      uuid references public.oo_bookings(id) on delete set null,
  reason          text not null,
  details         text,
  status          text not null default 'open' check (status in ('open','reviewed','actioned','dismissed')),
  created_at      timestamptz not null default now()
);

-- ---------- updated_at ----------
create or replace function public.oo_touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists oo_members_touch  on public.oo_members;
create trigger oo_members_touch  before update on public.oo_members  for each row execute function public.oo_touch_updated_at();
drop trigger if exists oo_partners_touch on public.oo_partners;
create trigger oo_partners_touch before update on public.oo_partners for each row execute function public.oo_touch_updated_at();
drop trigger if exists oo_bookings_touch on public.oo_bookings;
create trigger oo_bookings_touch before update on public.oo_bookings for each row execute function public.oo_touch_updated_at();

-- ---------- identity helpers (STABLE, read the JWT claim) ----------
create or replace function public.oo_uid() returns text
language sql stable as $$ select nullif(public.line_id(), '') $$;

create or replace function public.oo_is_admin(p_society uuid default null) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.oo_admins a
    where a.user_id = public.oo_uid()
      and (p_society is null or a.society_id = p_society)
  )
$$;

create or replace function public.oo_is_member(p_society uuid default null) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.oo_members m
    where m.user_id = public.oo_uid()
      and m.status = 'active'
      and (m.expires_at is null or m.expires_at >= public.oo_today())
      and (p_society is null or m.society_id = p_society)
  )
$$;

create or replace function public.oo_partner_id() returns uuid
language sql stable security definer set search_path = public as $$
  select p.id from public.oo_partners p where p.user_id = public.oo_uid() limit 1
$$;

-- any 1on1 identity at all (admin / active member / partner) — gates media reads
create or replace function public.oo_can_view() returns boolean
language sql stable security definer set search_path = public as $$
  select public.oo_is_admin() or public.oo_is_member() or public.oo_partner_id() is not null
$$;

-- ---------- partner column guard: partners edit their profile, never their status ----------
create or replace function public.oo_partners_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.oo_is_admin(old.society_id) then return new; end if;
  if new.status is distinct from old.status
     or new.approved_by is distinct from old.approved_by
     or new.approved_at is distinct from old.approved_at
     or new.society_id is distinct from old.society_id
     or new.user_id is distinct from old.user_id
     or new.caddy_profile_id is distinct from old.caddy_profile_id then
    raise exception 'oo_partners: protected column' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists oo_partners_guard_trg on public.oo_partners;
create trigger oo_partners_guard_trg before update on public.oo_partners
  for each row execute function public.oo_partners_guard();

-- ---------- RLS: authenticated only, anon sees NOTHING ----------
alter table public.oo_admins    enable row level security;
alter table public.oo_invites   enable row level security;
alter table public.oo_members   enable row level security;
alter table public.oo_partners  enable row level security;
alter table public.oo_media     enable row level security;
alter table public.oo_blackouts enable row level security;
alter table public.oo_bookings  enable row level security;
alter table public.oo_reports   enable row level security;

revoke all on public.oo_admins, public.oo_invites, public.oo_members, public.oo_partners,
              public.oo_media, public.oo_blackouts, public.oo_bookings, public.oo_reports
  from anon, public;
grant select on public.oo_admins, public.oo_invites, public.oo_members, public.oo_partners,
                public.oo_media, public.oo_blackouts, public.oo_bookings, public.oo_reports
  to authenticated;
grant update on public.oo_partners to authenticated;                 -- own profile (guard trigger)
grant insert, update, delete on public.oo_media     to authenticated; -- own media (policies)
grant insert, update, delete on public.oo_blackouts to authenticated; -- own blackouts (policies)
grant insert on public.oo_reports to authenticated;

-- oo_admins
drop policy if exists oo_admins_sel on public.oo_admins;
create policy oo_admins_sel on public.oo_admins for select to authenticated
  using (user_id = public.oo_uid() or public.oo_is_admin(society_id));

-- oo_invites (admin only; redeem goes through the RPC)
drop policy if exists oo_invites_sel on public.oo_invites;
create policy oo_invites_sel on public.oo_invites for select to authenticated
  using (public.oo_is_admin(society_id));

-- oo_members
drop policy if exists oo_members_sel on public.oo_members;
create policy oo_members_sel on public.oo_members for select to authenticated
  using (user_id = public.oo_uid() or public.oo_is_admin(society_id));

-- oo_partners: members see approved+active; partner sees self; admin sees all
drop policy if exists oo_partners_sel on public.oo_partners;
create policy oo_partners_sel on public.oo_partners for select to authenticated
  using (
    (status = 'approved' and is_active and public.oo_is_member(society_id))
    or user_id = public.oo_uid()
    or public.oo_is_admin(society_id)
  );
drop policy if exists oo_partners_upd on public.oo_partners;
create policy oo_partners_upd on public.oo_partners for update to authenticated
  using (user_id = public.oo_uid() or public.oo_is_admin(society_id))
  with check (user_id = public.oo_uid() or public.oo_is_admin(society_id));

-- oo_media: visible when the parent partner is visible to the caller
drop policy if exists oo_media_sel on public.oo_media;
create policy oo_media_sel on public.oo_media for select to authenticated
  using (
    exists (select 1 from public.oo_partners p where p.id = oo_media.partner_id
            and (p.user_id = public.oo_uid() or public.oo_is_admin(p.society_id)
                 or (oo_media.status = 'visible' and p.status = 'approved' and p.is_active
                     and public.oo_is_member(p.society_id))))
  );
drop policy if exists oo_media_ins on public.oo_media;
create policy oo_media_ins on public.oo_media for insert to authenticated
  with check (partner_id = public.oo_partner_id()
              and (storage_path is null or storage_path like 'partners/' || partner_id::text || '/%'));
drop policy if exists oo_media_upd on public.oo_media;
create policy oo_media_upd on public.oo_media for update to authenticated
  using (partner_id = public.oo_partner_id() or public.oo_is_admin())
  with check ((partner_id = public.oo_partner_id() or public.oo_is_admin())
              and (storage_path is null or storage_path like 'partners/' || partner_id::text || '/%'));
drop policy if exists oo_media_del on public.oo_media;
create policy oo_media_del on public.oo_media for delete to authenticated
  using (partner_id = public.oo_partner_id() or public.oo_is_admin());

-- oo_blackouts: own (+ admin read)
drop policy if exists oo_blackouts_sel on public.oo_blackouts;
create policy oo_blackouts_sel on public.oo_blackouts for select to authenticated
  using (partner_id = public.oo_partner_id() or public.oo_is_admin());
drop policy if exists oo_blackouts_ins on public.oo_blackouts;
create policy oo_blackouts_ins on public.oo_blackouts for insert to authenticated
  with check (partner_id = public.oo_partner_id());
drop policy if exists oo_blackouts_upd on public.oo_blackouts;
create policy oo_blackouts_upd on public.oo_blackouts for update to authenticated
  using (partner_id = public.oo_partner_id()) with check (partner_id = public.oo_partner_id());
drop policy if exists oo_blackouts_del on public.oo_blackouts;
create policy oo_blackouts_del on public.oo_blackouts for delete to authenticated
  using (partner_id = public.oo_partner_id());

-- oo_bookings: read own side; ALL writes via RPCs
drop policy if exists oo_bookings_sel on public.oo_bookings;
create policy oo_bookings_sel on public.oo_bookings for select to authenticated
  using (member_id = public.oo_uid() or partner_id = public.oo_partner_id() or public.oo_is_admin(society_id));

-- oo_reports
drop policy if exists oo_reports_sel on public.oo_reports;
create policy oo_reports_sel on public.oo_reports for select to authenticated
  using (reporter_id = public.oo_uid() or public.oo_is_admin(society_id));
drop policy if exists oo_reports_ins on public.oo_reports;
create policy oo_reports_ins on public.oo_reports for insert to authenticated
  with check (reporter_id = public.oo_uid() and public.oo_can_view());

-- ---------- RPCs ----------

-- who am I in 1on1 (one call for cube gating on every dashboard)
create or replace function public.oo_me() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_uid text := public.oo_uid(); v_member jsonb; v_partner jsonb; v_admin boolean;
begin
  if v_uid is null then return jsonb_build_object('signed_in', false); end if;
  v_admin := public.oo_is_admin();
  select to_jsonb(m) into v_member from public.oo_members m where m.user_id = v_uid;
  select to_jsonb(p) into v_partner from public.oo_partners p where p.user_id = v_uid;
  return jsonb_build_object(
    'signed_in', true, 'uid', v_uid, 'admin', v_admin,
    'member', v_member, 'partner', v_partner,
    'member_active', public.oo_is_member(),
    'is_caddie', exists (select 1 from public.caddy_profiles c where c.user_id = v_uid),
    'today', public.oo_today()
  );
end $$;

-- redeem an invite code (member: creates the access row; partner: opt-in prefilled from caddy_profiles)
create or replace function public.oo_redeem_invite(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid text := public.oo_uid(); v_inv public.oo_invites; v_name text; v_row jsonb;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  select * into v_inv from public.oo_invites where code = upper(trim(p_code)) for update;
  if v_inv.code is null then raise exception 'invite_invalid'; end if;
  if v_inv.expires_at is not null and v_inv.expires_at < now() then raise exception 'invite_expired'; end if;
  if v_inv.used >= v_inv.max_uses then raise exception 'invite_used_up'; end if;
  select coalesce(display_name, name) into v_name from public.user_profiles where line_user_id = v_uid;

  if v_inv.kind = 'member' then
    insert into public.oo_members (user_id, society_id, status, invite_code, display_name, approved_by, approved_at)
    values (v_uid, v_inv.society_id, case when v_inv.auto_approve then 'active' else 'pending' end,
            v_inv.code, v_name, case when v_inv.auto_approve then 'invite:'||v_inv.code end,
            case when v_inv.auto_approve then now() end)
    on conflict (user_id) do update
      set status = case when oo_members.status in ('suspended') then oo_members.status
                        when v_inv.auto_approve then 'active' else oo_members.status end,
          invite_code = excluded.invite_code
    returning to_jsonb(oo_members.*) into v_row;
  else
    v_row := public.oo_partner_optin(jsonb_build_object('invite_code', v_inv.code));
    if v_inv.auto_approve then
      update public.oo_partners set status = 'approved', approved_by = 'invite:'||v_inv.code, approved_at = now()
      where user_id = v_uid and status = 'pending' returning to_jsonb(oo_partners.*) into v_row;
    end if;
  end if;
  update public.oo_invites set used = used + 1 where code = v_inv.code;
  return v_row;
end $$;

-- caddie opts in as a partner (prefilled from her caddy_profiles row). Upsert of the editable fields.
create or replace function public.oo_partner_optin(p jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid text := public.oo_uid(); v_c public.caddy_profiles; v_row jsonb; v_hcp numeric;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  select * into v_c from public.caddy_profiles where user_id = v_uid and coalesce(is_mock,false) = false
    order by created_at limit 1;
  if v_c.id is null then raise exception 'not_a_caddie'; end if;
  select handicap_index into v_hcp from public.user_profiles where line_user_id = v_uid;

  insert into public.oo_partners (caddy_profile_id, user_id, display_name, bio, languages, handicap,
                                  home_course_name, courses_known, area_tips, availability_days, day_rate)
  values (v_c.id, v_uid,
          coalesce(p->>'display_name', v_c.name),
          coalesce(p->>'bio', v_c.bio),
          coalesce((select array_agg(x) from jsonb_array_elements_text(p->'languages') x), v_c.languages, '{}'),
          coalesce((p->>'handicap')::numeric, v_hcp),
          coalesce(p->>'home_course_name', v_c.course_name),
          coalesce((select array_agg(x) from jsonb_array_elements_text(p->'courses_known') x),
                   case when v_c.course_name is not null then array[v_c.course_name] else '{}' end),
          p->>'area_tips',
          coalesce((select array_agg(x) from jsonb_array_elements_text(p->'availability_days') x), '{mon,tue,wed,thu,fri,sat,sun}'),
          (p->>'day_rate')::numeric)
  on conflict (user_id) do update set
    display_name      = coalesce(p->>'display_name', oo_partners.display_name),
    bio               = coalesce(p->>'bio', oo_partners.bio),
    languages         = coalesce((select array_agg(x) from jsonb_array_elements_text(p->'languages') x), oo_partners.languages),
    handicap          = coalesce((p->>'handicap')::numeric, oo_partners.handicap),
    home_course_name  = coalesce(p->>'home_course_name', oo_partners.home_course_name),
    courses_known     = coalesce((select array_agg(x) from jsonb_array_elements_text(p->'courses_known') x), oo_partners.courses_known),
    area_tips         = coalesce(p->>'area_tips', oo_partners.area_tips),
    availability_days = coalesce((select array_agg(x) from jsonb_array_elements_text(p->'availability_days') x), oo_partners.availability_days),
    day_rate          = coalesce((p->>'day_rate')::numeric, oo_partners.day_rate),
    caddy_profile_id  = coalesce(oo_partners.caddy_profile_id, excluded.caddy_profile_id)
  returning to_jsonb(oo_partners.*) into v_row;
  return v_row;
end $$;

-- availability check used by search + booking
create or replace function public.oo_partner_free(p_partner uuid, p_from date, p_to date, p_exclude_booking uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.oo_partners p where p.id = p_partner and p.status = 'approved' and p.is_active
                 and not exists (select 1 from generate_series(p_from, least(p_to, p_from + 6), interval '1 day') d
                                 where lower(to_char(d, 'dy')) <> all (p.availability_days)))
     and not exists (select 1 from public.oo_blackouts b where b.partner_id = p_partner
                     and daterange(b.date_from, b.date_to, '[]') && daterange(p_from, p_to, '[]'))
     and not exists (select 1 from public.oo_bookings k where k.partner_id = p_partner and k.status = 'accepted'
                     and (p_exclude_booking is null or k.id <> p_exclude_booking)
                     and daterange(k.date_from, k.date_to, '[]') && daterange(p_from, p_to, '[]'))
$$;

-- member search: approved partners free for the whole range (+ optional course / language filters)
create or replace function public.oo_search(p_from date, p_to date, p_course text default null, p_lang text default null)
returns table (id uuid, display_name text, bio text, languages text[], handicap numeric, home_course_name text,
               courses_known text[], area_tips text, day_rate numeric, currency text, cover_path text, photo_count int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.oo_is_member() then raise exception 'not_a_member' using errcode = '42501'; end if;
  if p_from is null or p_to is null or p_to < p_from or p_from < public.oo_today() or p_to - p_from >= 90 then
    raise exception 'bad_range';
  end if;
  return query
    select p.id, p.display_name, p.bio, p.languages, p.handicap, p.home_course_name, p.courses_known, p.area_tips,
           p.day_rate, p.currency,
           (select m.storage_path from public.oo_media m where m.id = p.cover_media_id and m.status = 'visible'),
           (select count(*)::int from public.oo_media m where m.partner_id = p.id and m.kind = 'photo' and m.status = 'visible')
    from public.oo_partners p
    where p.society_id = public.oo_default_society()
      and p.status = 'approved' and p.is_active
      and public.oo_partner_free(p.id, p_from, p_to)
      and (p_course is null or p.home_course_name ilike '%'||p_course||'%'
           or exists (select 1 from unnest(p.courses_known) c where c ilike '%'||p_course||'%'))
      and (p_lang is null or exists (select 1 from unnest(p.languages) l where l ilike p_lang||'%'))
    order by p.display_name;
end $$;

-- member requests a booking
create or replace function public.oo_book(p_partner uuid, p_from date, p_to date, p_course_name text default null,
                                          p_course_id text default null, p_event uuid default null,
                                          p_holes int default 18, p_tee time default null, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid text := public.oo_uid(); v_p public.oo_partners; v_row jsonb; v_days int;
begin
  if not public.oo_is_member() then raise exception 'not_a_member' using errcode = '42501'; end if;
  if p_from is null or p_to is null or p_to < p_from or p_from < public.oo_today() or p_to - p_from >= 90 then
    raise exception 'bad_range';
  end if;
  select * into v_p from public.oo_partners where id = p_partner;
  if v_p.id is null or v_p.status <> 'approved' or not v_p.is_active then raise exception 'partner_unavailable'; end if;
  if not public.oo_partner_free(p_partner, p_from, p_to) then raise exception 'partner_busy'; end if;
  if exists (select 1 from public.oo_bookings b where b.member_id = v_uid and b.partner_id = p_partner
             and b.status = 'requested' and daterange(b.date_from, b.date_to, '[]') && daterange(p_from, p_to, '[]')) then
    raise exception 'already_requested';
  end if;
  v_days := p_to - p_from + 1;
  insert into public.oo_bookings (society_id, partner_id, member_id, date_from, date_to, course_name, course_id,
                                  society_event_id, holes, tee_time, notes, fee_quoted, currency)
  values (v_p.society_id, p_partner, v_uid, p_from, p_to, p_course_name, p_course_id, p_event,
          coalesce(p_holes, 18), p_tee, p_notes,
          case when v_p.day_rate is not null then v_p.day_rate * v_days end, v_p.currency)
  returning to_jsonb(oo_bookings.*) into v_row;
  return v_row;
end $$;

-- partner accepts / declines. Accept auto-files a caddy day-off request for the range (rotation stays right).
create or replace function public.oo_respond(p_booking uuid, p_accept boolean, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid text := public.oo_uid(); v_b public.oo_bookings; v_c public.caddy_profiles; v_dayoff uuid; v_row jsonb;
begin
  select * into v_b from public.oo_bookings where id = p_booking for update;
  if v_b.id is null then raise exception 'not_found'; end if;
  if v_b.partner_id is distinct from public.oo_partner_id() and not public.oo_is_admin(v_b.society_id) then
    raise exception 'not_your_booking' using errcode = '42501';
  end if;
  if v_b.status <> 'requested' then raise exception 'not_requested'; end if;

  if p_accept then
    if not public.oo_partner_free(v_b.partner_id, v_b.date_from, v_b.date_to) then raise exception 'partner_busy'; end if;
    begin
      select c.* into v_c from public.oo_partners p join public.caddy_profiles c on c.id = p.caddy_profile_id where p.id = v_b.partner_id;
      if v_c.id is not null then
        insert into public.caddy_dayoff_requests (caddy_user_id, caddy_name, caddy_number, course_name, date_from, date_to, reason, status)
        values (v_c.user_id, v_c.name, v_c.caddy_number, v_c.course_name, v_b.date_from, v_b.date_to, '1on1 booking', 'pending')
        returning id into v_dayoff;
      end if;
    exception when others then v_dayoff := null; end;  -- day-off filing must never block the accept
    update public.oo_bookings set status = 'accepted', responded_at = now(), dayoff_request_id = v_dayoff
    where id = p_booking returning to_jsonb(oo_bookings.*) into v_row;
  else
    update public.oo_bookings set status = 'declined', responded_at = now(), decline_reason = p_reason
    where id = p_booking returning to_jsonb(oo_bookings.*) into v_row;
  end if;
  return v_row;
exception when exclusion_violation then
  raise exception 'partner_busy';
end $$;

-- member, partner or admin cancels a requested/accepted booking
create or replace function public.oo_cancel(p_booking uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid text := public.oo_uid(); v_b public.oo_bookings; v_by text; v_row jsonb;
begin
  select * into v_b from public.oo_bookings where id = p_booking for update;
  if v_b.id is null then raise exception 'not_found'; end if;
  if v_b.member_id = v_uid then v_by := 'member';
  elsif v_b.partner_id = public.oo_partner_id() then v_by := 'partner';
  elsif public.oo_is_admin(v_b.society_id) then v_by := 'admin';
  else raise exception 'not_your_booking' using errcode = '42501'; end if;
  if v_b.status not in ('requested','accepted') then raise exception 'not_cancellable'; end if;
  if v_b.dayoff_request_id is not null then
    delete from public.caddy_dayoff_requests where id = v_b.dayoff_request_id and status = 'pending';
  end if;
  update public.oo_bookings set status = 'cancelled', cancelled_by = v_by, cancel_reason = p_reason, cancelled_at = now()
  where id = p_booking returning to_jsonb(oo_bookings.*) into v_row;
  return v_row;
end $$;

-- partner marks paid/unpaid or completed
create or replace function public.oo_partner_mark(p_booking uuid, p_payment text default null, p_completed boolean default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_b public.oo_bookings; v_row jsonb;
begin
  select * into v_b from public.oo_bookings where id = p_booking for update;
  if v_b.id is null then raise exception 'not_found'; end if;
  if v_b.partner_id is distinct from public.oo_partner_id() and not public.oo_is_admin(v_b.society_id) then
    raise exception 'not_your_booking' using errcode = '42501';
  end if;
  update public.oo_bookings set
    payment_status = coalesce(p_payment, payment_status),
    status = case when p_completed and status = 'accepted' then 'completed' else status end,
    completed_at = case when p_completed and status = 'accepted' then now() else completed_at end
  where id = p_booking returning to_jsonb(oo_bookings.*) into v_row;
  return v_row;
end $$;

-- ---------- admin RPCs ----------
create or replace function public.oo_admin_set_member(p_user text, p_status text, p_expires date default null, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row jsonb;
begin
  if not public.oo_is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  if p_status not in ('pending','active','suspended','expired') then raise exception 'bad_status'; end if;
  insert into public.oo_members (user_id, status, expires_at, notes, approved_by, approved_at,
                                 display_name)
  values (p_user, p_status, p_expires, p_notes,
          case when p_status = 'active' then public.oo_uid() end, case when p_status = 'active' then now() end,
          (select coalesce(display_name, name) from public.user_profiles where line_user_id = p_user))
  on conflict (user_id) do update set
    status = excluded.status, expires_at = excluded.expires_at, notes = coalesce(excluded.notes, oo_members.notes),
    approved_by = case when excluded.status = 'active' then public.oo_uid() else oo_members.approved_by end,
    approved_at = case when excluded.status = 'active' then now() else oo_members.approved_at end
  returning to_jsonb(oo_members.*) into v_row;
  return v_row;
end $$;

create or replace function public.oo_admin_set_partner(p_partner uuid, p_status text, p_active boolean default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row jsonb;
begin
  if not public.oo_is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  if p_status not in ('pending','approved','suspended') then raise exception 'bad_status'; end if;
  update public.oo_partners set status = p_status, is_active = coalesce(p_active, is_active),
    approved_by = case when p_status = 'approved' then public.oo_uid() else approved_by end,
    approved_at = case when p_status = 'approved' then now() else approved_at end
  where id = p_partner returning to_jsonb(oo_partners.*) into v_row;
  if v_row is null then raise exception 'not_found'; end if;
  return v_row;
end $$;

create or replace function public.oo_admin_create_invite(p_kind text, p_max_uses int default 1, p_auto_approve boolean default false,
                                                         p_expires timestamptz default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_code text; v_row jsonb; v_alpha text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if not public.oo_is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  loop
    v_code := '';
    for i in 1..8 loop v_code := v_code || substr(v_alpha, 1 + floor(random() * length(v_alpha))::int, 1); end loop;
    exit when not exists (select 1 from public.oo_invites where code = v_code);
  end loop;
  insert into public.oo_invites (code, kind, max_uses, auto_approve, expires_at, note, created_by)
  values (v_code, p_kind, greatest(coalesce(p_max_uses,1),1), coalesce(p_auto_approve,false), p_expires, p_note, public.oo_uid())
  returning to_jsonb(oo_invites.*) into v_row;
  return v_row;
end $$;

create or replace function public.oo_admin_set_media(p_media uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row jsonb;
begin
  if not public.oo_is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  update public.oo_media set status = p_status where id = p_media returning to_jsonb(oo_media.*) into v_row;
  return v_row;
end $$;

-- unanswered requests expire once their start date has passed (pg_cron, daily 00:05 Bangkok = 17:05 UTC)
create or replace function public.oo_expire_requests() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.oo_bookings set status = 'expired' where status = 'requested' and date_from < public.oo_today();
  get diagnostics n = row_count;
  update public.oo_members set status = 'expired' where status = 'active' and expires_at is not null and expires_at < public.oo_today();
  return n;
end $$;

-- ---------- grants on RPCs: authenticated only ----------
revoke all on function public.oo_me(), public.oo_redeem_invite(text), public.oo_partner_optin(jsonb),
  public.oo_partner_free(uuid,date,date,uuid), public.oo_search(date,date,text,text),
  public.oo_book(uuid,date,date,text,text,uuid,int,time,text), public.oo_respond(uuid,boolean,text),
  public.oo_cancel(uuid,text), public.oo_partner_mark(uuid,text,boolean),
  public.oo_admin_set_member(text,text,date,text), public.oo_admin_set_partner(uuid,text,boolean),
  public.oo_admin_create_invite(text,int,boolean,timestamptz,text), public.oo_admin_set_media(uuid,text),
  public.oo_expire_requests(), public.oo_is_admin(uuid), public.oo_is_member(uuid), public.oo_partner_id(),
  public.oo_can_view(), public.oo_uid()
  from anon, public;
grant execute on function public.oo_me(), public.oo_redeem_invite(text), public.oo_partner_optin(jsonb),
  public.oo_partner_free(uuid,date,date,uuid), public.oo_search(date,date,text,text),
  public.oo_book(uuid,date,date,text,text,uuid,int,time,text), public.oo_respond(uuid,boolean,text),
  public.oo_cancel(uuid,text), public.oo_partner_mark(uuid,text,boolean),
  public.oo_admin_set_member(text,text,date,text), public.oo_admin_set_partner(uuid,text,boolean),
  public.oo_admin_create_invite(text,int,boolean,timestamptz,text), public.oo_admin_set_media(uuid,text),
  public.oo_is_admin(uuid), public.oo_is_member(uuid), public.oo_partner_id(), public.oo_can_view(), public.oo_uid()
  to authenticated;

-- ---------- storage: PRIVATE bucket, read only for 1on1 identities, write only to own partner folder ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('oo-media', 'oo-media', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists oo_media_read on storage.objects;
create policy oo_media_read on storage.objects for select to authenticated
  using (bucket_id = 'oo-media' and public.oo_can_view());
drop policy if exists oo_media_write on storage.objects;
create policy oo_media_write on storage.objects for insert to authenticated
  with check (bucket_id = 'oo-media'
              and (storage.foldername(name))[1] = 'partners'
              and (storage.foldername(name))[2] = public.oo_partner_id()::text);
drop policy if exists oo_media_update on storage.objects;
create policy oo_media_update on storage.objects for update to authenticated
  using (bucket_id = 'oo-media' and ((storage.foldername(name))[2] = public.oo_partner_id()::text or public.oo_is_admin()));
drop policy if exists oo_media_delete on storage.objects;
create policy oo_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'oo-media' and ((storage.foldername(name))[2] = public.oo_partner_id()::text or public.oo_is_admin()));

-- ---------- realtime (RLS-respecting for authenticated clients) ----------
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'oo_bookings') then
    alter publication supabase_realtime add table public.oo_bookings;
  end if;
end $$;

-- ---------- cron ----------
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'oo_expire_requests';
    perform cron.schedule('oo_expire_requests', '5 17 * * *', 'select public.oo_expire_requests()');
  end if;
end $$;

-- ---------- seed admins: Jason (JOA organizer, Kakao login) + Pete ----------
insert into public.oo_admins (user_id, added_by) values
  ('KAKAO-4911042963', 'seed'),
  ('U2b6d976f19bca4b2f4374ae0e10ed873', 'seed')
on conflict (user_id) do nothing;
