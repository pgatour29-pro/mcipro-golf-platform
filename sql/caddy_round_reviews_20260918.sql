-- 2026-09-18 (v1255) Post-round caddy review — Pete: "a caddy rating and review after each round is
-- completed … once Finish Round has been tapped and the scores posted a separate modal … a rating and
-- some multiple choices … all of these inputs need to go to the caddy master and the marketing and
-- General Managers dashboard."
--
-- The dormant `caddy_reviews` table (0 rows, uuid user_id → auth.users, caddy_id → legacy `caddies`)
-- is rebuilt in place so the account-deletion sweep keeps its entry. Writes go through the RPC below
-- (anon writes on this table were revoked in the 2026-09-06 lockdown and stay revoked); reads stay
-- open (tmp_select) for the Caddy Master + Manager dashboards.
-- Run: npx supabase db query --linked -f sql/caddy_round_reviews_20260918.sql

alter table public.caddy_reviews drop constraint if exists caddy_reviews_caddy_id_fkey;
alter table public.caddy_reviews drop constraint if exists caddy_reviews_user_id_fkey;
alter table public.caddy_reviews drop constraint if exists caddy_reviews_booking_id_key;
alter table public.caddy_reviews drop constraint if exists caddy_reviews_booking_id_fkey;

alter table public.caddy_reviews
  add column if not exists golfer_id    text,
  add column if not exists golfer_name  text,
  add column if not exists caddy_number text,
  add column if not exists caddy_name   text,
  add column if not exists course_id    text,
  add column if not exists course_name  text,
  add column if not exists event_id     text,
  add column if not exists round_key    text,
  add column if not exists round_date   date,
  add column if not exists promptness   smallint,
  add column if not exists professional smallint,
  add column if not exists helpful      smallint,
  add column if not exists book_again   smallint,
  add column if not exists rating_label text,
  add column if not exists source       text default 'post_round',
  add column if not exists updated_at   timestamptz default now();

alter table public.caddy_reviews
  add constraint caddy_reviews_caddy_fk   foreign key (caddy_id)   references public.caddy_profiles(id) on delete set null,
  add constraint caddy_reviews_booking_fk foreign key (booking_id) references public.caddy_bookings(id) on delete set null,
  add constraint caddy_reviews_answers_check check (
    (promptness   is null or promptness   between 1 and 4) and
    (professional is null or professional between 1 and 4) and
    (helpful      is null or helpful      between 1 and 4) and
    (book_again   is null or book_again   between 1 and 4));

create unique index if not exists caddy_reviews_golfer_round_uq on public.caddy_reviews (golfer_id, round_key) where round_key is not null;
create index if not exists caddy_reviews_caddy_idx  on public.caddy_reviews (caddy_id, created_at desc);
create index if not exists caddy_reviews_course_idx on public.caddy_reviews (course_id, round_date desc);
create index if not exists caddy_reviews_cname_idx  on public.caddy_reviews (lower(course_name), round_date desc);

-- live on the Caddy Master dashboard
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'caddy_reviews') then
    alter publication supabase_realtime add table public.caddy_reviews;
  end if;
end $$;

-- The ONLY writer. Keyed on a caller-supplied LINE id like the other user-scoped RPCs (see
-- project_security_rls — bind to auth.jwt() at Auth Phase 2). One review per golfer per round
-- (round_key): sending again overwrites. Resolves the caddy row from number + course when the
-- client could not, then refreshes caddy_profiles.rating / total_reviews so the caddie's own
-- dashboard tile moves too.
create or replace function public.submit_caddy_review(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_golfer   text := nullif(trim(coalesce(p->>'golfer_id', '')), '');
  v_key      text := nullif(trim(coalesce(p->>'round_key', '')), '');
  v_rating   int  := nullif(p->>'rating', '')::int;
  v_caddy    uuid := null;
  v_booking  uuid := null;
  v_num      text := nullif(trim(coalesce(p->>'caddy_number', '')), '');
  v_cid      text := nullif(trim(coalesce(p->>'course_id', '')), '');
  v_cname    text := nullif(trim(coalesce(p->>'course_name', '')), '');
  v_prefix   text;
  v_caddy_name text := nullif(trim(coalesce(p->>'caddy_name', '')), '');
  v_id       uuid;
  q1 int := nullif(p->>'promptness', '')::int;
  q2 int := nullif(p->>'professional', '')::int;
  q3 int := nullif(p->>'helpful', '')::int;
  q4 int := nullif(p->>'book_again', '')::int;
begin
  if v_golfer is null or v_key is null then return jsonb_build_object('ok', false, 'reason', 'missing_id'); end if;
  if v_rating is null or v_rating < 1 or v_rating > 5 then return jsonb_build_object('ok', false, 'reason', 'bad_rating'); end if;
  if q1 is not null and (q1 < 1 or q1 > 4) then q1 := null; end if;
  if q2 is not null and (q2 < 1 or q2 > 4) then q2 := null; end if;
  if q3 is not null and (q3 < 1 or q3 > 4) then q3 := null; end if;
  if q4 is not null and (q4 < 1 or q4 > 4) then q4 := null; end if;

  begin v_caddy := nullif(p->>'caddy_id', '')::uuid; exception when others then v_caddy := null; end;
  begin v_booking := nullif(p->>'booking_id', '')::uuid; exception when others then v_booking := null; end;
  if v_caddy is not null and not exists (select 1 from public.caddy_profiles where id = v_caddy) then v_caddy := null; end if;
  if v_booking is not null and not exists (select 1 from public.caddy_bookings where id = v_booking) then v_booking := null; end if;

  -- the caddy row from number + course (the app's number-plus-course rule: a number is not unique across clubs)
  if v_caddy is null and v_num is not null then
    v_prefix := split_part(coalesce(v_cname, ''), ' ', 1);
    select id into v_caddy from public.caddy_profiles
     where is_mock = false and caddy_number = v_num
       and ((v_cid is not null and course_id = v_cid)
            or (length(v_prefix) >= 4 and course_name ilike v_prefix || '%'))
     order by (course_id = v_cid) desc nulls last, is_active desc
     limit 1;
  end if;
  if v_num is null and v_caddy is not null then select caddy_number into v_num from public.caddy_profiles where id = v_caddy; end if;
  if v_caddy is not null and coalesce(nullif(trim(p->>'caddy_name'), ''), '') = '' then select name into v_caddy_name from public.caddy_profiles where id = v_caddy; end if;

  insert into public.caddy_reviews (golfer_id, golfer_name, caddy_id, caddy_number, caddy_name, booking_id,
      course_id, course_name, event_id, round_key, round_date, promptness, professional, helpful, book_again,
      rating, rating_label, review_text, source, created_at, updated_at)
  values (v_golfer, left(coalesce(p->>'golfer_name', ''), 120), v_caddy, left(v_num, 20), left(coalesce(v_caddy_name, ''), 120), v_booking,
      v_cid, left(coalesce(v_cname, ''), 160), nullif(p->>'event_id', ''), v_key,
      coalesce(nullif(p->>'round_date', '')::date, (now() at time zone 'Asia/Bangkok')::date),
      q1, q2, q3, q4, v_rating,
      case v_rating when 5 then 'excellent' when 4 then 'good' when 3 then 'average' when 2 then 'needs_work' else 'bad' end,
      left(nullif(trim(coalesce(p->>'review_text', '')), ''), 1000), coalesce(nullif(p->>'source', ''), 'post_round'), now(), now())
  on conflict (golfer_id, round_key) where round_key is not null do update set
      golfer_name = excluded.golfer_name, caddy_id = excluded.caddy_id, caddy_number = excluded.caddy_number,
      caddy_name = excluded.caddy_name, booking_id = excluded.booking_id, course_id = excluded.course_id,
      course_name = excluded.course_name, event_id = excluded.event_id, round_date = excluded.round_date,
      promptness = excluded.promptness, professional = excluded.professional, helpful = excluded.helpful,
      book_again = excluded.book_again, rating = excluded.rating, rating_label = excluded.rating_label,
      review_text = excluded.review_text, updated_at = now()
  returning id into v_id;

  if v_caddy is not null then
    update public.caddy_profiles c set
      rating = s.avg_r, total_reviews = s.n, updated_at = now()
    from (select round(avg(rating)::numeric, 2) as avg_r, count(*) as n from public.caddy_reviews where caddy_id = v_caddy) s
    where c.id = v_caddy;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id, 'caddy_id', v_caddy, 'caddy_number', v_num);
end
$fn$;
grant execute on function public.submit_caddy_review(jsonb) to anon, authenticated;
