-- v1607 (Pete 2026-10-17): Barcelona Resorts' three courses on one property — St Andrews 2000 (flagship),
-- Green Valley Rayong and Silky Oak — share ONE caddy pool. "Whichever you play on uses the same caddies."
-- A caddy number there is one person at all three courses. Every DB matcher that pairs a caddy number with a
-- course goes through caddy_facility_key (notebook sync, booking fill, roster import, leave-course, mock
-- replace), so folding the three courses into one key here makes all of them pool-aware.
-- Tokens mirror facility_courses (match 'green valley' / 'andrews' / 'silky', veto 'summit' = Chiang Mai).
create or replace function public.caddy_facility_key(p text)
 returns text
 language sql
 immutable
as $function$
  select case
    when n ~ '(andrews|silky|barcelona)' or (n ~ 'green ?valley' and n !~ '(summit|chiang)') then 'barcelona golf'
    else array_to_string((string_to_array(n, ' '))[1:2], ' ')
  end
  from (select trim(regexp_replace(lower(coalesce(p, '')), '[^a-z0-9]+', ' ', 'g')) n) s
$function$;

-- "St Andrews 2000" never resolved: courses.name is "St. Andrews 2000 Golf Club" and the two-word prefix
-- fallback trips on the dot, so golfer-entered St Andrews caddies landed with course_id NULL (outside the pool).
create or replace function public.caddy_resolve_course_id(p_course text)
 returns text
 language plpgsql
 stable
as $function$
DECLARE norm text := trim(lower(regexp_replace(coalesce(p_course,''), '\s+', ' ', 'g')));
        w2 text; rid text;
BEGIN
  IF norm = '' THEN RETURN NULL; END IF;
  IF norm LIKE 'pattaya c%'          THEN RETURN 'pattaya_county'; END IF;
  IF norm LIKE '%hermes%'            THEN RETURN 'hermes'; END IF;
  IF norm LIKE '%bangpra%'           THEN RETURN 'bangpra'; END IF;
  IF norm LIKE '%royal lakeside%'    THEN RETURN 'royal_lakeside'; END IF;
  IF norm LIKE '%andrews%' OR norm LIKE '%barcelona%' THEN RETURN 'st-andrews-2000'; END IF;   -- v1607
  IF norm LIKE '%silky%'             THEN RETURN 'silky_oak'; END IF;                            -- v1607
  IF norm LIKE '%green valley%' AND norm NOT LIKE '%summit%' THEN RETURN 'green_valley_rayong'; END IF;
  IF norm LIKE '%pattavia%'          THEN RETURN 'pattavia'; END IF;
  IF norm LIKE '%plutaluang%'        THEN RETURN 'plutaluang'; END IF;
  IF norm LIKE '%burapha%east%'      THEN RETURN 'burapha_east'; END IF;
  IF norm LIKE '%burapha%west%'      THEN RETURN 'burapha_west'; END IF;
  IF norm LIKE '%burapha%'           THEN RETURN 'burapha'; END IF;
  IF norm LIKE '%eastern star%'      THEN RETURN 'eastern_star'; END IF;
  IF norm LIKE '%greenwood%'         THEN RETURN 'greenwood_a'; END IF;
  IF norm LIKE '%khao kheow%'        THEN RETURN 'khao_kheow_a'; END IF;
  IF norm LIKE '%phoenix%'           THEN RETURN 'phoenix_mountain'; END IF;
  IF norm LIKE '%bangpakong%'        THEN RETURN 'bangpakong'; END IF;
  IF norm = 'brc' OR norm LIKE 'brc %' OR norm LIKE '% brc' OR norm LIKE '% brc %' THEN RETURN 'bangpakong'; END IF;  -- v1412
  IF norm LIKE '%pleasant valley%'   THEN RETURN 'pleasant_valley'; END IF;
  SELECT id INTO rid FROM courses WHERE lower(name) = norm LIMIT 1;
  IF rid IS NOT NULL THEN RETURN rid; END IF;
  w2 := array_to_string((string_to_array(norm, ' '))[1:2], ' ');
  SELECT id INTO rid FROM courses WHERE lower(name) LIKE w2 || '%' ORDER BY name LIMIT 1;
  RETURN rid;  -- may be NULL: caller keeps the raw course_name
END $function$;

-- St Andrews 2000 is Barcelona's flagship (facility PIN lands there, ★ on the rail, "flagship regulars" segment)
update public.facilities set flagship_slug = 'st-andrews-2000', updated_at = now() where id = 'barcelona-golf';
