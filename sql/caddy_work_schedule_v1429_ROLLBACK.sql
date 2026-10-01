-- ROLLBACK for sql/caddy_work_schedule_v1429.sql — removes the work schedule tables and their writers.
-- The app (public/caddy-work-core.js) treats a failed read as "everyone works their usual hours".
drop function if exists public.caddy_work_day_set(uuid, date, text, time, time, text);
drop function if exists public.caddy_work_week_set(uuid, smallint[], text);
drop function if exists public.caddy_work_week_copy(uuid[], date, date, text);
drop function if exists public.caddy_week_post_set(text, date, text, integer);
drop table if exists public.caddy_week_posts;
drop table if exists public.caddy_work_week;
drop table if exists public.caddy_work_days;
