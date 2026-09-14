-- Caddie profile media + personal tee sheet (Pete 2026-09-14)
-- "Profile settings: needs photo upload and up to 3 more photos allowed in their bio.
--  also in the My Assignment section create a Calendar with Monday through Sunday and
--  create like a Tee Sheet with defaults at 6am to 4pm but the times are adjustable...
--  make sure that each booking is always blocked out for min 4:15 before accepting or
--  receiving a new booking"
--
-- caddy_profiles already carries photo_url + bio. This adds the gallery, the emergency
-- contact the profile form has always asked for but never stored, and the three columns
-- that drive her own tee sheet.

alter table public.caddy_profiles
  add column if not exists gallery_urls      text[],
  add column if not exists emergency_contact text,
  add column if not exists sheet_start       time without time zone not null default '06:00',
  add column if not exists sheet_end         time without time zone not null default '16:00',
  add column if not exists block_minutes     integer                not null default 255;

-- A round blocks the caddie for FOUR HOURS FIFTEEN, minimum. She may lengthen that,
-- never shorten it — the floor is the rule, the column is only the adjustment.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'caddy_profiles_block_minutes_floor') then
    alter table public.caddy_profiles
      add constraint caddy_profiles_block_minutes_floor check (block_minutes >= 255);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'caddy_profiles_sheet_window') then
    alter table public.caddy_profiles
      add constraint caddy_profiles_sheet_window check (sheet_end > sheet_start);
  end if;
  -- at most three EXTRA photos beside photo_url
  if not exists (select 1 from pg_constraint where conname = 'caddy_profiles_gallery_max3') then
    alter table public.caddy_profiles
      add constraint caddy_profiles_gallery_max3
      check (gallery_urls is null or array_length(gallery_urls, 1) <= 3);
  end if;
end $$;

comment on column public.caddy_profiles.gallery_urls  is 'Up to 3 extra profile photos shown under her bio. Screened server-side before upload (fail closed).';
comment on column public.caddy_profiles.sheet_start   is 'First row of her own tee sheet. Default 06:00, she adjusts it.';
comment on column public.caddy_profiles.sheet_end     is 'Last row of her own tee sheet. Default 16:00, she adjusts it.';
comment on column public.caddy_profiles.block_minutes is 'Minutes a booking blocks her for. 255 = 4h15m, the enforced minimum.';

-- The tee sheet reads a WEEK of her bookings at a time.
create index if not exists caddy_bookings_caddy_date_idx
  on public.caddy_bookings (caddy_id, booking_date)
  where caddy_id is not null;
