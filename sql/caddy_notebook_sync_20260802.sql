-- 2026-08-02: LIVE sync My Caddies (caddy_notebook) -> booking roster (caddy_profiles),
-- plus mock phase-out: every REAL caddy that arrives deactivates ONE mock at the same
-- facility (deactivated, never deleted). Claimed rows (user_id set) are NEVER touched —
-- once a caddy owns their profile, no golfer's notebook can overwrite it.

-- ============================================================
-- 1) Course resolution for loose notebook course names
--    (mirrors the client normalizeCourse alias map)
-- ============================================================
CREATE OR REPLACE FUNCTION public.caddy_resolve_course_id(p_course text)
RETURNS text LANGUAGE plpgsql STABLE AS $$
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
  IF norm LIKE '%pleasant valley%'   THEN RETURN 'pleasant_valley'; END IF;
  SELECT id INTO rid FROM courses WHERE lower(name) = norm LIMIT 1;
  IF rid IS NOT NULL THEN RETURN rid; END IF;
  w2 := array_to_string((string_to_array(norm, ' '))[1:2], ' ');
  SELECT id INTO rid FROM courses WHERE lower(name) LIKE w2 || '%' ORDER BY name LIMIT 1;
  RETURN rid;  -- may be NULL: caller keeps the raw course_name
END $$;

-- Facility key: first two words of a course name — 'Phoenix Gold - Mountain Nine' and
-- mock 'Phoenix Gold Golf & Country Club' both key to 'phoenix gold'.
CREATE OR REPLACE FUNCTION public.caddy_facility_key(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT array_to_string(
    (string_to_array(trim(regexp_replace(lower(coalesce(p,'')), '[^a-z0-9]+', ' ', 'g')), ' '))[1:2],
    ' ')
$$;

-- ============================================================
-- 2) Core sync: one notebook entry -> the real roster
-- ============================================================
CREATE OR REPLACE FUNCTION public.caddy_sync_from_notebook(
  p_number text, p_name text, p_course text, p_photo text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_num text := trim(coalesce(p_number,''));
        v_cid text; v_cname text; v_row record;
BEGIN
  IF v_num = '' OR v_num !~ '^[A-Za-z0-9]{1,8}$' THEN RETURN; END IF;
  v_cid := caddy_resolve_course_id(p_course);
  IF v_cid IS NOT NULL THEN
    SELECT name INTO v_cname FROM courses WHERE id = v_cid;
  ELSE
    v_cname := nullif(trim(coalesce(p_course,'')), '');
  END IF;
  IF v_cname IS NULL THEN RETURN; END IF;  -- numbers are per-course: no course, no sync

  SELECT * INTO v_row FROM caddy_profiles
   WHERE is_mock = false AND caddy_number = v_num
     AND (   (v_cid IS NOT NULL AND course_id = v_cid)
          OR caddy_facility_key(course_name) = caddy_facility_key(v_cname))
   ORDER BY (course_id = v_cid) DESC NULLS LAST, created_at
   LIMIT 1;

  IF v_row.id IS NOT NULL THEN
    IF v_row.user_id IS NOT NULL THEN RETURN; END IF;  -- caddy owns it now
    UPDATE caddy_profiles SET
      photo_url = coalesce(nullif(p_photo,''), photo_url),
      name = CASE WHEN coalesce(nullif(trim(p_name),''),'') <> ''
                   AND (name IS NULL OR name = '' OR name = 'Caddy #' || v_num)
                  THEN trim(p_name) ELSE name END,
      updated_at = now()
    WHERE id = v_row.id;
    RETURN;
  END IF;

  INSERT INTO caddy_profiles (id, name, caddy_number, course_id, course_name, photo_url,
                              is_active, is_mock, bio, created_at, updated_at)
  VALUES (gen_random_uuid(),
          coalesce(nullif(trim(p_name),''), 'Caddy #' || v_num),
          v_num, v_cid, v_cname, nullif(p_photo,''),
          true, false, 'Synced from My Caddies notebook', now(), now());
END $$;

-- ============================================================
-- 3) Trigger on caddy_notebook: fire on add + edits of the synced fields.
--    Exceptions are swallowed — a sync hiccup must never block the golfer's save.
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_caddy_notebook_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(NEW.golfer_id,'') LIKE 'TESTQA%' THEN RETURN NEW; END IF;
  BEGIN
    PERFORM caddy_sync_from_notebook(NEW.caddy_number, NEW.caddy_name, NEW.course_name, NEW.photo_url);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[caddy_notebook_sync] %', sqlerrm;
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS caddy_notebook_sync ON public.caddy_notebook;
CREATE TRIGGER caddy_notebook_sync
AFTER INSERT OR UPDATE OF caddy_number, caddy_name, course_name, photo_url
ON public.caddy_notebook
FOR EACH ROW EXECUTE FUNCTION public.trg_caddy_notebook_sync();

-- ============================================================
-- 4) Retroactive notebook pass (photo/name refresh on unclaimed rows; inserts
--    anything not yet in the roster). Runs BEFORE the replacement trigger exists
--    so the one-time baseline below stays the single source of mock retirement.
-- ============================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM caddy_notebook
            WHERE coalesce(golfer_id,'') NOT LIKE 'TESTQA%'
            ORDER BY created_at
  LOOP
    PERFORM caddy_sync_from_notebook(r.caddy_number, r.caddy_name, r.course_name, r.photo_url);
  END LOOP;
END $$;

-- ============================================================
-- 5) One-time mock retirement baseline: one active mock off per existing real
--    caddy at the same facility (lowest number first — deterministic).
-- ============================================================
DO $$
DECLARE f record; m record; n int;
BEGIN
  FOR f IN SELECT caddy_facility_key(course_name) AS fk, count(*) AS cnt
             FROM caddy_profiles
            WHERE is_mock = false AND is_active = true AND course_name IS NOT NULL
            GROUP BY 1
  LOOP
    n := f.cnt;
    FOR m IN SELECT id FROM caddy_profiles
              WHERE is_mock = true AND is_active = true
                AND caddy_facility_key(course_name) = f.fk
              ORDER BY caddy_number
    LOOP
      EXIT WHEN n <= 0;
      UPDATE caddy_profiles SET is_active = false, updated_at = now() WHERE id = m.id;
      n := n - 1;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 6) Replacement trigger on caddy_profiles: EVERY future real arrival — notebook
--    sync OR caddy self-registration — retires one mock at its facility.
--    Created AFTER the baseline pass so nothing double-counts.
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_caddy_real_replaces_mock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_mock uuid;
BEGIN
  IF NEW.is_mock IS DISTINCT FROM false OR NEW.course_name IS NULL THEN RETURN NEW; END IF;
  BEGIN
    SELECT id INTO v_mock FROM caddy_profiles
     WHERE is_mock = true AND is_active = true
       AND caddy_facility_key(course_name) = caddy_facility_key(NEW.course_name)
     ORDER BY caddy_number LIMIT 1;
    IF v_mock IS NOT NULL THEN
      UPDATE caddy_profiles SET is_active = false, updated_at = now() WHERE id = v_mock;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[caddy_real_replaces_mock] %', sqlerrm;
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS caddy_real_replaces_mock ON public.caddy_profiles;
CREATE TRIGGER caddy_real_replaces_mock
AFTER INSERT ON public.caddy_profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_caddy_real_replaces_mock();

-- ============================================================
-- 7) Verify
-- ============================================================
SELECT is_mock, is_active, count(*) AS rows, count(photo_url) AS with_photo
FROM caddy_profiles GROUP BY is_mock, is_active ORDER BY is_mock, is_active;
