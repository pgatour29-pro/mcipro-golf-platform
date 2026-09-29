-- ROLLBACK for sql/caddy_roster_from_my_caddies_v1412.sql (one transaction).
-- Removes the two new triggers, deletes the rows v1412 added (never a row that existed before,
-- never a row a caddy has since claimed or a course has since edited), reactivates exactly the
-- mocks it retired, and restores the v1370 sync function (name required for a NEW row).

DROP TRIGGER IF EXISTS caddy_reg_numbers_sync ON public.event_registrations;
DROP TRIGGER IF EXISTS caddy_booking_name_sync ON public.caddy_bookings;
DROP FUNCTION IF EXISTS public.trg_caddy_reg_numbers_sync();
DROP FUNCTION IF EXISTS public.trg_caddy_booking_name_sync();

DELETE FROM caddy_profiles p
 WHERE p.is_mock = false
   AND p.user_id IS NULL AND p.created_by IS NULL
   AND NOT EXISTS (SELECT 1 FROM caddy_roster_backfill_20260930 b WHERE b.kind = 'real_before' AND b.id = p.id);

UPDATE caddy_profiles p SET is_active = true, updated_at = now()
  FROM caddy_roster_backfill_20260930 b
 WHERE b.kind = 'mock_active_before' AND b.id = p.id AND p.is_active = false;

-- v1370 sync function (from sql/caddy_sync_ownership_20260926.sql)
CREATE OR REPLACE FUNCTION public.caddy_sync_from_notebook(p_number text, p_name text, p_course text, p_photo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF v_cname IS NULL THEN RETURN; END IF;

  SELECT * INTO v_row FROM caddy_profiles
   WHERE is_mock = false AND caddy_number = v_num
     AND (   (v_cid IS NOT NULL AND course_id = v_cid)
          OR caddy_facility_key(course_name) = caddy_facility_key(v_cname))
   ORDER BY (course_id = v_cid) DESC NULLS LAST, created_at
   LIMIT 1;

  IF v_row.id IS NOT NULL THEN
    IF v_row.user_id IS NOT NULL THEN RETURN; END IF;
    IF v_row.created_by IS NOT NULL THEN RETURN; END IF;
    UPDATE caddy_profiles SET
      photo_url = coalesce(nullif(p_photo,''), photo_url),
      name = CASE WHEN coalesce(nullif(trim(p_name),''),'') <> ''
                   AND (name IS NULL OR name = '' OR name = 'Caddy #' || v_num)
                  THEN trim(p_name) ELSE name END,
      updated_at = now()
    WHERE id = v_row.id;
    RETURN;
  END IF;

  IF coalesce(nullif(trim(p_name),''),'') = '' OR trim(p_name) ~* '^caddy\s*#' THEN RETURN; END IF;

  INSERT INTO caddy_profiles (id, name, caddy_number, course_id, course_name, photo_url,
                              is_active, is_mock, bio, created_at, updated_at)
  VALUES (gen_random_uuid(),
          trim(p_name),
          v_num, v_cid, v_cname, nullif(p_photo,''),
          true, false, 'Synced from My Caddies notebook', now(), now());
END $function$;

SELECT 'real rows now' AS k, count(*)::text AS v FROM caddy_profiles WHERE is_mock = false
UNION ALL SELECT 'mocks active now', count(*)::text FROM caddy_profiles WHERE is_mock = true AND is_active = true;
