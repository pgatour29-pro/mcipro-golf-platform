-- v1412 (2026-09-30): EVERY caddy in a golfer's My Caddies feeds the pro shop tee sheet roster.
--
-- My Caddies shows three sources: the notebook, caddy_bookings (caddie_name) and event
-- registrations (caddy_numbers). Only the notebook was synced into caddy_profiles, which is the
-- ONLY table the pro shop tee sheet / Caddy Desk reads. So a course's sheet showed the notebook
-- subset (Bangpakong 3 of 12, Pattaya CC 7 of 14, Eastern Star 5 of 13 ...). Pete 2026-09-30:
-- "whatever caddies that are in the My caddies inventory needs to be fed into the Proshop/tee sheet".
--
-- What this does (ONE transaction — any error rolls back everything):
--   1. caddy_resolve_course_id: 'BRC' = Bangpakong Riverside (TRGG's short name on its events).
--   2. caddy_sync_from_notebook: matches numbers with leading zeros stripped, and a caddy seen
--      WITHOUT a name gets the standing 'Caddy #N' placeholder (every surface renders it, and the
--      SAME function swaps in the real name the moment a golfer's notebook, the pro shop roster or
--      the caddy's own registration supplies one). Ownership guards (user_id / created_by) unchanged.
--   3. Triggers: event_registrations (caddy_numbers) and caddy_bookings (caddie_name, unlinked rows)
--      now feed the roster the way the notebook does. Exceptions are swallowed — a roster hiccup
--      never blocks a registration or a booking.
--   4. Backfill from every existing registration / booking / number-only notebook entry.
--      Mocks retired by the standing caddy_real_replaces_mock trigger are recorded in
--      caddy_roster_backfill_20260930 so the ROLLBACK file can put everything back exactly.
--
-- Rollback: sql/caddy_roster_from_my_caddies_v1412_ROLLBACK.sql

-- 1. BRC alias -------------------------------------------------------------------------------
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
END $function$;

-- 2. The one roster writer for golfer-side sources -------------------------------------------
CREATE OR REPLACE FUNCTION public.caddy_sync_from_notebook(p_number text, p_name text, p_course text, p_photo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_num text := trim(coalesce(p_number,''));
        v_key text; v_cid text; v_cname text; v_row record; v_name text;
BEGIN
  IF v_num = '' OR v_num !~ '^[A-Za-z0-9]{1,8}$' THEN RETURN; END IF;
  -- '003' and '3' are the same bib; compare with leading zeros stripped (never store an empty key)
  v_key := ltrim(v_num, '0'); IF v_key = '' THEN v_key := '0'; END IF;
  IF v_num ~ '^\d+$' THEN v_num := v_key; END IF;
  v_cid := caddy_resolve_course_id(p_course);
  IF v_cid IS NOT NULL THEN
    SELECT name INTO v_cname FROM courses WHERE id = v_cid;
  ELSE
    v_cname := nullif(trim(coalesce(p_course,'')), '');
  END IF;
  IF v_cname IS NULL THEN RETURN; END IF;  -- numbers are per-course: no course, no sync

  -- a real name is anything that is not blank and not the placeholder
  v_name := nullif(trim(coalesce(p_name,'')), '');
  IF v_name IS NOT NULL AND v_name ~* '^caddy\s*#?\s*\d*$' THEN v_name := NULL; END IF;

  SELECT * INTO v_row FROM caddy_profiles
   WHERE is_mock = false AND ltrim(caddy_number, '0') = v_key
     AND (   (v_cid IS NOT NULL AND course_id = v_cid)
          OR caddy_facility_key(course_name) = caddy_facility_key(v_cname))
   ORDER BY (course_id = v_cid) DESC NULLS LAST, created_at
   LIMIT 1;

  IF v_row.id IS NOT NULL THEN
    IF v_row.user_id IS NOT NULL THEN RETURN; END IF;     -- caddy owns it now
    IF v_row.created_by IS NOT NULL THEN RETURN; END IF;  -- v1370: the golf course owns it
    UPDATE caddy_profiles SET
      photo_url = coalesce(nullif(p_photo,''), photo_url),
      name = CASE WHEN v_name IS NOT NULL
                   AND (name IS NULL OR name = '' OR name ~* '^caddy\s*#')
                  THEN v_name ELSE name END,
      updated_at = now()
    WHERE id = v_row.id;
    RETURN;
  END IF;

  -- v1412: a caddy a golfer played with is on the course's roster even before anyone typed her
  -- name; 'Caddy #N' is the placeholder every surface renders, replaced above when a name arrives.
  INSERT INTO caddy_profiles (id, name, caddy_number, course_id, course_name, photo_url,
                              is_active, is_mock, bio, created_at, updated_at)
  VALUES (gen_random_uuid(),
          coalesce(v_name, 'Caddy #' || v_num),
          v_num, v_cid, v_cname, nullif(p_photo,''),
          true, false,
          CASE WHEN v_name IS NULL THEN 'Synced from My Caddies (number only)' ELSE 'Synced from My Caddies notebook' END,
          now(), now());
END $function$;

-- 3a. event registrations → roster ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_caddy_reg_numbers_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_course text; v_tok text; v_num text;
BEGIN
  IF coalesce(NEW.player_id,'') LIKE 'TESTQA%' THEN RETURN NEW; END IF;
  IF coalesce(trim(NEW.caddy_numbers),'') = '' THEN RETURN NEW; END IF;
  BEGIN
    SELECT course_name INTO v_course FROM society_events WHERE id = NEW.event_id;
    IF coalesce(v_course,'') = '' THEN RETURN NEW; END IF;
    FOREACH v_tok IN ARRAY regexp_split_to_array(NEW.caddy_numbers, '[,\-.\s:;/|]+') LOOP
      v_num := regexp_replace(v_tok, '\D', '', 'g');
      IF v_num <> '' AND length(v_num) <= 4 THEN
        PERFORM caddy_sync_from_notebook(v_num, NULL, v_course, NULL);
      END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[caddy_reg_numbers_sync] %', sqlerrm;
  END;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS caddy_reg_numbers_sync ON public.event_registrations;
CREATE TRIGGER caddy_reg_numbers_sync
  AFTER INSERT OR UPDATE OF caddy_numbers ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION trg_caddy_reg_numbers_sync();

-- 3b. caddy bookings (unlinked rows: the number lives in caddie_name) → roster ----------------
CREATE OR REPLACE FUNCTION public.trg_caddy_booking_name_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_num text; v_name text;
BEGIN
  IF NEW.caddy_id IS NOT NULL THEN RETURN NEW; END IF;          -- linked rows already have a profile
  IF coalesce(NEW.golfer_id,'') LIKE 'TESTQA%' OR coalesce(NEW.special_requests,'') LIKE 'CLAUDE-TEST%' THEN RETURN NEW; END IF;
  IF coalesce(NEW.course_name,'') = '' OR coalesce(NEW.caddie_name,'') = '' THEN RETURN NEW; END IF;
  BEGIN
    v_num := (regexp_match(NEW.caddie_name, '(\d{1,4})'))[1];
    IF v_num IS NULL THEN RETURN NEW; END IF;
    -- "Caddy #212" carries no name; "#21 Meen" / "Meen (#21)" does
    v_name := nullif(trim(regexp_replace(regexp_replace(NEW.caddie_name, '\(?\s*#?\s*\d{1,4}\s*\)?', ' ', 'g'), '\s+', ' ', 'g')), '');
    IF v_name IS NOT NULL AND v_name ~* '^caddy$' THEN v_name := NULL; END IF;
    PERFORM caddy_sync_from_notebook(v_num, v_name, NEW.course_name, NULL);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[caddy_booking_name_sync] %', sqlerrm;
  END;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS caddy_booking_name_sync ON public.caddy_bookings;
CREATE TRIGGER caddy_booking_name_sync
  AFTER INSERT OR UPDATE OF caddie_name, course_name ON public.caddy_bookings
  FOR EACH ROW EXECUTE FUNCTION trg_caddy_booking_name_sync();

-- 4. Backfill ----------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.caddy_roster_backfill_20260930 (
  kind text NOT NULL,            -- 'mock_active_before' | 'real_before'
  id uuid NOT NULL,
  PRIMARY KEY (kind, id)
);
INSERT INTO public.caddy_roster_backfill_20260930 (kind, id)
  SELECT 'mock_active_before', id FROM caddy_profiles WHERE is_mock = true AND is_active = true
  UNION ALL
  SELECT 'real_before', id FROM caddy_profiles WHERE is_mock = false
ON CONFLICT DO NOTHING;

DO $$
DECLARE r record; v_tok text; v_num text; v_name text; n int := 0;
BEGIN
  -- registrations (all statuses: the golfer played / booked with that caddy at that course)
  FOR r IN SELECT reg.caddy_numbers, e.course_name
             FROM event_registrations reg JOIN society_events e ON e.id = reg.event_id
            WHERE coalesce(trim(reg.caddy_numbers),'') <> '' AND coalesce(reg.player_id,'') NOT LIKE 'TESTQA%'
              AND coalesce(e.course_name,'') <> ''
  LOOP
    FOREACH v_tok IN ARRAY regexp_split_to_array(r.caddy_numbers, '[,\-.\s:;/|]+') LOOP
      v_num := regexp_replace(v_tok, '\D', '', 'g');
      IF v_num <> '' AND length(v_num) <= 4 THEN
        PERFORM caddy_sync_from_notebook(v_num, NULL, r.course_name, NULL); n := n + 1;
      END IF;
    END LOOP;
  END LOOP;
  -- bookings without a linked profile
  FOR r IN SELECT caddie_name, course_name FROM caddy_bookings
            WHERE caddy_id IS NULL AND status IS DISTINCT FROM 'cancelled'
              AND coalesce(course_name,'') <> '' AND coalesce(caddie_name,'') <> ''
              AND coalesce(golfer_id,'') NOT LIKE 'TESTQA%' AND coalesce(special_requests,'') NOT LIKE 'CLAUDE-TEST%'
  LOOP
    v_num := (regexp_match(r.caddie_name, '(\d{1,4})'))[1];
    CONTINUE WHEN v_num IS NULL;
    v_name := nullif(trim(regexp_replace(regexp_replace(r.caddie_name, '\(?\s*#?\s*\d{1,4}\s*\)?', ' ', 'g'), '\s+', ' ', 'g')), '');
    IF v_name IS NOT NULL AND v_name ~* '^caddy$' THEN v_name := NULL; END IF;
    PERFORM caddy_sync_from_notebook(v_num, v_name, r.course_name, NULL); n := n + 1;
  END LOOP;
  -- notebook entries the v1368 gate skipped (number only), never the QA fixtures
  FOR r IN SELECT caddy_number, caddy_name, course_name, photo_url FROM caddy_notebook
            WHERE coalesce(golfer_id,'') NOT LIKE 'TESTQA%' AND coalesce(caddy_name,'') !~* 'qatest|test'
  LOOP
    PERFORM caddy_sync_from_notebook(r.caddy_number, r.caddy_name, r.course_name, r.photo_url); n := n + 1;
  END LOOP;
  RAISE NOTICE '[v1412 backfill] % source rows replayed', n;
END $$;

-- report
SELECT 'real rows now' AS k, count(*)::text AS v FROM caddy_profiles WHERE is_mock = false
UNION ALL SELECT 'added by v1412', count(*)::text FROM caddy_profiles p WHERE is_mock = false
  AND NOT EXISTS (SELECT 1 FROM caddy_roster_backfill_20260930 b WHERE b.kind = 'real_before' AND b.id = p.id)
UNION ALL SELECT 'mocks retired by v1412', count(*)::text FROM caddy_profiles p
  JOIN caddy_roster_backfill_20260930 b ON b.kind = 'mock_active_before' AND b.id = p.id
  WHERE p.is_active = false;
