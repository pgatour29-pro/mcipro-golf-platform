-- v1607 ROLLBACK: restore the per-course caddy key + resolver as they were before the Barcelona pool
CREATE OR REPLACE FUNCTION public.caddy_facility_key(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT array_to_string(
    (string_to_array(trim(regexp_replace(lower(coalesce(p,'')), '[^a-z0-9]+', ' ', 'g')), ' '))[1:2],
    ' ')
$function$
;

CREATE OR REPLACE FUNCTION public.caddy_resolve_course_id(p_course text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE norm text := trim(lower(regexp_replace(coalesce(p_course,''), '\s+', ' ', 'g')));
        w2 text; rid text;
BEGIN
  IF norm = '' THEN RETURN NULL; END IF;
  IF norm LIKE 'pattaya c%'          THEN RETURN 'pattaya_county'; END IF;
  IF norm LIKE '%hermes%'            THEN RETURN 'hermes'; END IF;
  IF norm LIKE '%bangpra%'           THEN RETURN 'bangpra'; END IF;
  IF norm LIKE '%royal lakeside%'    THEN RETURN 'royal_lakeside'; END IF;
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
END $function$
;
update public.facilities set flagship_slug = 'green-valley-rayong', updated_at = now() where id = 'barcelona-golf';
-- data repairs (roster rows / backfilled jobs) are in sql/ops/caddy_barcelona_pool_repair_20261017.sql;
-- rows as they were: backups/caddy_barcelona_rows_before_v1607.json; backfilled jobs carry booking_source 'v1607_backfill'.
