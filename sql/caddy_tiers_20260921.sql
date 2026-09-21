-- Caddy service tiers (v1305, 2026-09-21)
-- Pete: Bangpakong Riverside runs "Caddy Buddy" (caddies who PLAY the round with you, the
-- golfer covers her golf for the day); Phoenix Gold runs "Pretty Caddy" (premium caddy,
-- does not play, 700 baht plus tips). Both are COURSE PROGRAMMES, so they are data, not code:
-- any course can add a tier without a deploy.
--
-- One transaction. Safe to re-run.

begin;

-- ---------------------------------------------------------------- the catalogue
create table if not exists public.caddy_tiers (
    id            uuid primary key default uuid_generate_v4(),
    course_id     text,
    course_name   text not null,
    code          text not null,                       -- 'buddy' | 'pretty' | <course's own>
    label         text not null,                       -- what the golfer sees
    tagline       text,
    description   text,
    plays_golf    boolean not null default false,      -- she tees off with the group
    fee_amount    numeric,                             -- NULL = "at course rate" (never invent a price)
    fee_unit      text default 'per round',
    tips_note     text,
    covered_items jsonb   not null default '[]'::jsonb, -- [{"label":"Her green fee","amount":null}]
    perks         text[]  not null default '{}',
    accent        text    not null default 'amber',    -- amber | sky | emerald  (NO purple/pink)
    icon          text    not null default 'workspace_premium',
    terms         text,
    sort          int     not null default 0,
    is_active     boolean not null default true,
    created_at    timestamptz default now(),
    updated_at    timestamptz default now(),
    constraint caddy_tiers_accent_chk check (accent in ('amber','sky','emerald')),
    constraint caddy_tiers_course_code_uq unique (course_name, code)
);

create index if not exists caddy_tiers_course_idx on public.caddy_tiers (course_id);
create index if not exists caddy_tiers_name_idx   on public.caddy_tiers (course_name);

-- the roster carries the assignment; NULL = the course's standard caddy
alter table public.caddy_profiles add column if not exists tier_code     text;
alter table public.caddy_profiles add column if not exists golf_handicap numeric;
create index if not exists caddy_profiles_tier_idx on public.caddy_profiles (course_name, tier_code);

-- a booking remembers the deal that was struck (the tier row can change later)
alter table public.caddy_bookings add column if not exists tier_code  text;
alter table public.caddy_bookings add column if not exists tier_label text;
alter table public.caddy_bookings add column if not exists tier_fee   numeric;
alter table public.caddy_bookings add column if not exists tier_terms jsonb;

-- ---------------------------------------------------------------- RLS
-- Read-only to the browser: the course owns its programmes (same rule as a caddy's number).
alter table public.caddy_tiers enable row level security;
drop policy if exists caddy_tiers_read on public.caddy_tiers;
create policy caddy_tiers_read on public.caddy_tiers for select using (true);
grant select on public.caddy_tiers to anon, authenticated;

-- ---------------------------------------------------------------- the two programmes
insert into public.caddy_tiers
    (course_id, course_name, code, label, tagline, description, plays_golf,
     fee_amount, fee_unit, tips_note, covered_items, perks, accent, icon, terms, sort)
values
(
 'bangpakong', 'Bangpakong Riverside Country Club', 'buddy', 'Caddy Buddy',
 'She plays the round with you',
 'A Caddy Buddy tees off with your group and plays the full round alongside you — caddy and playing partner in one. Her golf for the day is on your group.',
 true,
 null, 'per round', 'Tips at your discretion',
 '[{"label":"Her green fee","amount":null},
   {"label":"Her caddy fee","amount":null},
   {"label":"Her cart seat","amount":null},
   {"label":"Caddy Buddy fee","amount":null}]'::jsonb,
 array['Plays the full round with your group',
       'Knows every line on the course she plays',
       'Still caddies for you between shots',
       'Four-ball stays a four-ball — book early'],
 'sky', 'sports_golf',
 'Everything she needs to play the round is charged to your group at the pro shop. Settle the total there before you tee off.',
 10
),
(
 'phoenix-gold', 'Phoenix Gold Golf & Country Club', 'pretty', 'Pretty Caddy',
 'Premium caddy — ฿700 plus tips',
 'Phoenix Gold''s premium caddy service. She caddies your round at a premium over the standard caddy fee. She does not play.',
 false,
 700, 'per round', 'plus tips',
 '[]'::jsonb,
 array['Premium caddy service',
       'Presentation and turnout to Phoenix Gold standard',
       'Full 18-hole round',
       'Tips go straight to your caddy'],
 'amber', 'workspace_premium',
 '฿700 per round, settled at the pro shop. Tips are at your discretion and go directly to your caddy.',
 10
)
on conflict (course_name, code) do update set
    course_id     = excluded.course_id,
    label         = excluded.label,
    tagline       = excluded.tagline,
    description   = excluded.description,
    plays_golf    = excluded.plays_golf,
    fee_amount    = excluded.fee_amount,
    fee_unit      = excluded.fee_unit,
    tips_note     = excluded.tips_note,
    covered_items = excluded.covered_items,
    perks         = excluded.perks,
    accent        = excluded.accent,
    icon          = excluded.icon,
    terms         = excluded.terms,
    sort          = excluded.sort,
    is_active     = true,
    updated_at    = now();

-- ---------------------------------------------------------------- who is in each programme
-- WHICH caddies belong to a programme is the course's call — these are starting assignments
-- Pete can move with one update. Nothing else on the roster is touched.

-- Pete 2026-09-21: "Bangpakong only 243" — #91 and #161 are standard caddies.
update public.caddy_profiles
   set tier_code = 'buddy', updated_at = now()
 where course_name ilike 'Bangpakong Riverside%'
   and is_active
   and caddy_number = '243';

update public.caddy_profiles
   set tier_code = null, updated_at = now()
 where course_name ilike 'Bangpakong Riverside%'
   and tier_code = 'buddy'
   and caddy_number <> '243';

update public.caddy_profiles
   set tier_code = 'pretty', updated_at = now()
 where course_name = 'Phoenix Gold Golf & Country Club'
   and is_active
   and caddy_number in ('PHX001','PHX003','PHX004');

commit;

-- what landed
select course_name, code, label, fee_amount, plays_golf from public.caddy_tiers order by course_name;
select course_name, caddy_number, name, tier_code, golf_handicap
  from public.caddy_profiles where tier_code is not null order by course_name, caddy_number;
