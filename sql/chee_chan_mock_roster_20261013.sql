-- Chee Chan sample model (Pete 2026-10-13: "Load our mock caddies from the system so we can test everything").
-- The system's mock caddies (is_mock, with real photos) are cloned onto Chee Chan as ONE coherent roster:
-- one person per photo (50), numbered 1-50. The 24 placeholder "Test <nick>" rows keep their ids/numbers
-- (today's jobs + the daily sample day point at them) and take a mock caddy's name, photo and profile;
-- 25-50 are new rows. Clones are is_mock=false (the desk and queue only list real rows), no user_id
-- (no LINE), created_by 'claude-test-chee-chan' (the zero-out key). The mock rows at other courses are untouched.
with people as (
  select distinct on (photo_url) name, photo_url, languages, rating, experience_years, specialties, bio, personality, strengths, total_rounds, total_reviews, specialty, gallery_urls
  from caddy_profiles where is_mock and photo_url is not null
  order by photo_url, rating desc nulls last
), numbered as (
  select p.*, row_number() over (order by p.photo_url) as n from people p
)
update caddy_profiles c set name = x.name, photo_url = x.photo_url, languages = x.languages, rating = x.rating,
  experience_years = x.experience_years, specialties = x.specialties, bio = x.bio, personality = x.personality,
  strengths = x.strengths, total_rounds = x.total_rounds, total_reviews = x.total_reviews, specialty = x.specialty,
  gallery_urls = x.gallery_urls, updated_at = now()
from numbered x
where c.created_by = 'claude-test-chee-chan' and c.caddy_number::text = x.n::text;

with people as (
  select distinct on (photo_url) name, photo_url, languages, rating, experience_years, specialties, bio, personality, strengths, total_rounds, total_reviews, specialty, gallery_urls
  from caddy_profiles where is_mock and photo_url is not null
  order by photo_url, rating desc nulls last
), numbered as (
  select p.*, row_number() over (order by p.photo_url) as n from people p
)
insert into caddy_profiles (name, photo_url, languages, rating, experience_years, specialties, bio, personality, strengths, total_rounds, total_reviews, specialty, gallery_urls,
  course_id, course_name, caddy_number, is_active, is_mock, created_by, availability_status)
select x.name, x.photo_url, x.languages, x.rating, x.experience_years, x.specialties, x.bio, x.personality, x.strengths, x.total_rounds, x.total_reviews, x.specialty, x.gallery_urls,
  'cheechan', 'Chee Chan Golf Resort', x.n::text, true, false, 'claude-test-chee-chan', 'available'
from numbered x
where x.n > 24 and not exists (select 1 from caddy_profiles c where c.created_by = 'claude-test-chee-chan' and c.caddy_number::text = x.n::text);

-- today's sample jobs carry the caddy's name: follow the new names
update caddy_bookings b set caddie_name = c.name from caddy_profiles c
 where b.caddy_id = c.id and c.created_by = 'claude-test-chee-chan' and b.teesheet_booking_id like 'psgtest-%';

select count(*) roster, count(photo_url) photos, count(distinct name) names, min(caddy_number::int) lo, max(caddy_number::int) hi
from caddy_profiles where created_by = 'claude-test-chee-chan' and is_active;
with dup as (
  select id, row_number() over (order by caddy_number::int) rn from (
    select id, caddy_number, row_number() over (partition by name order by caddy_number::int) k
    from caddy_profiles where created_by='claude-test-chee-chan' and is_active) z where k > 1
), spare as (
  select name, row_number() over (order by name) rn from (
    select distinct name from caddy_profiles where is_mock and name is not null
    except select name from caddy_profiles where created_by='claude-test-chee-chan') s
)
update caddy_profiles c set name = s.name, updated_at = now() from dup d join spare s on s.rn = d.rn where c.id = d.id;
update caddy_bookings b set caddie_name = c.name from caddy_profiles c where b.caddy_id = c.id and c.created_by = 'claude-test-chee-chan' and b.teesheet_booking_id like 'psgtest-%';
select count(*) roster, count(distinct name) names, count(distinct photo_url) photos from caddy_profiles where created_by='claude-test-chee-chan' and is_active;
