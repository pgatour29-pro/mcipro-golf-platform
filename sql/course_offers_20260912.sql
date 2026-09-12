-- =====================================================================================
-- COURSE OFFERS  (2026-09-12)  — in-app Offers inbox + per-course push opt-in
-- =====================================================================================
-- Pete's model:
--   * Every logged-in golfer sits in a thin targetable directory. A course builds a
--     SEGMENT and sees a COUNT, never a list; the platform delivers. Identity only
--     converts to a named customer when the golfer acts on the offer.
--   * Per-course opt-in is a FOLLOW. Followed -> inbox + LINE push. Not followed ->
--     inbox only, badge, NO push. Default is not-following: a course EARNS push access.
--   * Society ORGANISERS are the second audience (block rates, society-day packages,
--     sponsorship) and get an Enquire thread, because that is a negotiation.
--
-- NAMING: the app already uses "offers" for 19th Hole bids on listings
-- (marketplace_offers, #offers-badge, #dashboard-offers-badge). These are COURSE offers
-- and must never share those names or badge ids.
--
-- course_id is `courses.id`, which is a TEXT SLUG ('phoenix_gold'), NOT a uuid — the live
-- table does not match sql/COURSE_RATING_INTEGRATION.sql. Resolve free text to an id with
-- CourseMatch.resolveId(), which returns the VENUE row (a follow belongs to Phoenix Gold,
-- not to phoenix_ocean).
--
-- RLS posture deliberately MATCHES sql/2026-06-19_event_announcements.sql (anon +
-- authenticated select/insert/update, no delete). That is the app-wide posture today; it
-- is NOT a considered access-control design and should be tightened with the rest of the
-- database, not alone. See project_security_rls.
-- =====================================================================================

create table if not exists public.course_offers (
  id              uuid primary key default gen_random_uuid(),
  course_id       text not null,
  course_name     text,                       -- canonical venue name at send time
  audience        text not null default 'golfer'
                  check (audience in ('golfer','organizer')),
  offer_type      text not null default 'promotion'
                  check (offer_type in ('promotion','tee_time','caddy','food_beverage',
                                        'society_package','sponsorship','other')),
  title           text not null,
  body            text not null,
  cta_label       text,
  cta_target      text,                       -- 'booking' | 'caddy' | 'proshop' | a url
  segment         jsonb not null default '{}'::jsonb,   -- the filter the course built
  lang            jsonb not null default '{}'::jsonb,   -- {th:{title,body}, ko:{...}}
  priority        text not null default 'normal' check (priority in ('normal','urgent')),
  valid_from      timestamptz not null default now(),
  valid_to        timestamptz,                -- an offer EXPIRES; a dead coupon is worse
  status          text not null default 'active'
                  check (status in ('draft','active','paused','expired','deleted')),
  created_by      text,                       -- staff line_user_id
  push_sent_at    timestamptz,
  push_recipients integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_course_offers_course  on public.course_offers(course_id, status);
create index if not exists idx_course_offers_live    on public.course_offers(status, valid_to)
  where status = 'active';
create index if not exists idx_course_offers_aud     on public.course_offers(audience, status);
create index if not exists idx_course_offers_created on public.course_offers(created_at desc);
comment on table public.course_offers is
  'Golf-course offers shown in the in-app Offers inbox. NOT marketplace_offers (19th Hole bids).';

-- Per-recipient state. Same shape as event_announcement_reads so each item is dismissed
-- individually; clicked_at is the attribution hook (an offer you cannot measure is a coupon).
create table if not exists public.course_offer_reads (
  id             uuid primary key default gen_random_uuid(),
  offer_id       uuid not null,
  reader_line_id text not null,
  read_at        timestamptz,
  clicked_at     timestamptz,
  dismissed_at   timestamptz,
  created_at     timestamptz not null default now(),
  unique (offer_id, reader_line_id)
);
create index if not exists idx_course_offer_reads_reader on public.course_offer_reads(reader_line_id);
create index if not exists idx_course_offer_reads_offer  on public.course_offer_reads(offer_id);

-- The follow = per-course push opt-in. No row means NO push (inbox only).
create table if not exists public.course_follows (
  id              uuid primary key default gen_random_uuid(),
  golfer_line_id  text not null,
  course_id       text not null,
  source          text,                      -- where they opted in: 'booking','caddy','manage'
  created_at      timestamptz not null default now(),
  unique (golfer_line_id, course_id)
);
create index if not exists idx_course_follows_golfer on public.course_follows(golfer_line_id);
create index if not exists idx_course_follows_course on public.course_follows(course_id);
comment on table public.course_follows is
  'Golfer opted in to immediate notifications from this course. Absence = inbox only, never push.';

-- Offer push consent. NOTE the polarity: every other notify_* column on this table defaults
-- TRUE and is queried as an OPT-OUT (.eq(col,false) builds an exclusion set). Offers are
-- OPT-IN, so this defaults FALSE and a MISSING ROW MUST ALSO MEAN NO PUSH. Copying the
-- existing opt-out query pattern here would push to every golfer on the platform.
alter table public.notification_preferences
  add column if not exists notify_offers boolean not null default false;
comment on column public.notification_preferences.notify_offers is
  'OPT-IN (default false), unlike every other notify_* column here. No row = no push.';

alter table public.course_offers      enable row level security;
alter table public.course_offer_reads enable row level security;
alter table public.course_follows     enable row level security;

drop policy if exists co_select  on public.course_offers;
drop policy if exists co_insert  on public.course_offers;
drop policy if exists co_update  on public.course_offers;
create policy co_select on public.course_offers for select to anon, authenticated using (true);
create policy co_insert on public.course_offers for insert to anon, authenticated with check (true);
create policy co_update on public.course_offers for update to anon, authenticated using (true) with check (true);

drop policy if exists cor_select on public.course_offer_reads;
drop policy if exists cor_insert on public.course_offer_reads;
drop policy if exists cor_update on public.course_offer_reads;
create policy cor_select on public.course_offer_reads for select to anon, authenticated using (true);
create policy cor_insert on public.course_offer_reads for insert to anon, authenticated with check (true);
create policy cor_update on public.course_offer_reads for update to anon, authenticated using (true) with check (true);

drop policy if exists cf_select on public.course_follows;
drop policy if exists cf_insert on public.course_follows;
drop policy if exists cf_update on public.course_follows;
drop policy if exists cf_delete on public.course_follows;
create policy cf_select on public.course_follows for select to anon, authenticated using (true);
create policy cf_insert on public.course_follows for insert to anon, authenticated with check (true);
create policy cf_update on public.course_follows for update to anon, authenticated using (true) with check (true);
-- unfollow must actually work, so this table DOES allow delete (unlike the others)
create policy cf_delete on public.course_follows for delete to anon, authenticated using (true);

-- Expire offers past valid_to so the badge never counts a dead coupon.
create or replace function public.expire_course_offers()
returns integer language plpgsql security definer set search_path to 'public' as $fn$
declare n integer;
begin
  update public.course_offers
  set status = 'expired', updated_at = now()
  where status = 'active' and valid_to is not null and valid_to < now();
  get diagnostics n = row_count;
  return n;
end; $fn$;
