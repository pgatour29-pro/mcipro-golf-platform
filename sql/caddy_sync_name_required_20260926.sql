-- v1368: the notebook sync never creates a nameless caddy (number + name + course, always)
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

  -- v1368 (2026-09-26): a caddy is added with THREE things: number, name, course. A golfer's
  -- number-only notebook entry never creates a nameless "Caddy #N" on the course roster.
  IF coalesce(nullif(trim(p_name),''),'') = '' OR trim(p_name) ~* '^caddy\s*#' THEN RETURN; END IF;

  INSERT INTO caddy_profiles (id, name, caddy_number, course_id, course_name, photo_url,
                              is_active, is_mock, bio, created_at, updated_at)
  VALUES (gen_random_uuid(),
          trim(p_name),
          v_num, v_cid, v_cname, nullif(p_photo,''),
          true, false, 'Synced from My Caddies notebook', now(), now());
END $function$
;
