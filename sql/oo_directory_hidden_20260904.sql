-- 1on1 (v1101): keep partners (user_profiles.role = 'oo_partner') OUT of every server-side directory/search.
-- Pete 2026-09-04: "i do not want them as part of the public directory". Client-side reads are filtered by the
-- directory guard in public/oo-1on1.js; these are the SQL surfaces the client cannot filter:
--   • global_players / unified_player_profiles (views over user_profiles) — feed get_top_players, find_similar_players,
--     get_directory_analytics, search_players_global(8-arg), search_unified_profiles;
--   • search_players_global(6-arg) and get_buddy_suggestions read user_profiles directly.
-- Definitions below = LIVE pg_get_viewdef / pg_get_functiondef of 2026-09-04 with ONLY the role predicate added.

CREATE OR REPLACE VIEW public.global_players AS
 SELECT line_user_id AS player_id,
    name AS player_name,
    name AS display_name,
    NULL::text AS username,
    NULL::text AS avatar_url,
    COALESCE((profile_data -> 'golfInfo'::text) ->> 'handicap'::text, profile_data ->> 'handicap'::text) AS handicap,
    home_course_name,
    home_course_id,
    society_name AS primary_society,
    society_id AS primary_society_id,
    ( SELECT array_agg(DISTINCT sm.society_id::text) AS array_agg
           FROM society_members sm
          WHERE (sm.golfer_id = up.line_user_id OR sm.user_id::text = up.line_user_id) AND sm.status = 'active'::text) AS societies,
    ( SELECT count(DISTINCT sm.society_id) AS count
           FROM society_members sm
          WHERE (sm.golfer_id = up.line_user_id OR sm.user_id::text = up.line_user_id) AND sm.status = 'active'::text) AS society_count,
    ( SELECT count(*) AS count
           FROM rounds r
          WHERE r.golfer_id = up.line_user_id) AS total_rounds,
    ( SELECT max(r.created_at) AS max
           FROM rounds r
          WHERE r.golfer_id = up.line_user_id) AS last_round_date,
    (( SELECT avg(r.total_gross::numeric) AS avg
           FROM rounds r
          WHERE r.golfer_id = up.line_user_id AND r.total_gross IS NOT NULL AND r.total_gross > 0))::numeric(5,1) AS avg_score,
    COALESCE(profile_data, '{}'::jsonb) AS profile_data,
    'user_profiles'::text AS data_source,
    created_at,
    updated_at
   FROM user_profiles up
  WHERE name IS NOT NULL AND name <> ''::text AND role IS DISTINCT FROM 'oo_partner';

CREATE OR REPLACE VIEW public.unified_player_profiles AS
 SELECT line_user_id AS player_id,
    name AS display_name,
    NULL::text AS username,
    NULL::text AS avatar_url,
    COALESCE(((profile_data -> 'golfInfo'::text) ->> 'handicap'::text)::numeric, (profile_data ->> 'handicap'::text)::numeric) AS handicap_index,
    home_course_name,
    home_course_id,
    COALESCE((profile_data -> 'golfInfo'::text) ->> 'preferredTee'::text, profile_data ->> 'preferredTee'::text, 'White'::text) AS preferred_tee,
    society_name AS primary_society,
    society_id AS primary_society_id,
    COALESCE(profile_data ->> 'email'::text, email) AS email,
    COALESCE(profile_data ->> 'phone'::text, phone) AS phone,
    ( SELECT count(*) AS count
           FROM rounds r
          WHERE r.golfer_id = up.line_user_id) AS total_rounds,
    (( SELECT avg(r.total_gross::numeric) AS avg
           FROM rounds r
          WHERE r.golfer_id = up.line_user_id AND r.total_gross IS NOT NULL AND r.total_gross > 0))::numeric(5,1) AS avg_gross_score,
    ( SELECT min(r.total_gross) AS min
           FROM rounds r
          WHERE r.golfer_id = up.line_user_id AND r.total_gross IS NOT NULL AND r.total_gross > 50) AS best_gross_score,
    ( SELECT max(r.created_at) AS max
           FROM rounds r
          WHERE r.golfer_id = up.line_user_id) AS last_round_date,
    (( SELECT avg(sub.total_gross::numeric) AS avg
           FROM ( SELECT r.total_gross
                   FROM rounds r
                  WHERE r.golfer_id = up.line_user_id AND r.total_gross IS NOT NULL AND r.total_gross > 0
                  ORDER BY r.created_at DESC
                 LIMIT 20) sub))::numeric(5,1) AS recent_avg_score,
    ( SELECT array_agg(DISTINCT sm.society_id::text) AS array_agg
           FROM society_members sm
          WHERE (sm.golfer_id = up.line_user_id OR sm.user_id::text = up.line_user_id) AND sm.status = 'active'::text) AS society_memberships,
    ( SELECT count(DISTINCT sm.society_id) AS count
           FROM society_members sm
          WHERE (sm.golfer_id = up.line_user_id OR sm.user_id::text = up.line_user_id) AND sm.status = 'active'::text) AS society_count,
    COALESCE(profile_data, '{}'::jsonb) AS profile_data,
    'user_profiles'::text AS data_source,
    created_at,
    updated_at
   FROM user_profiles up
  WHERE line_user_id IS NOT NULL AND role IS DISTINCT FROM 'oo_partner';

CREATE OR REPLACE FUNCTION public.search_players_global(p_search_query text DEFAULT ''::text, p_society_id uuid DEFAULT NULL::uuid, p_handicap_min double precision DEFAULT NULL::double precision, p_handicap_max double precision DEFAULT NULL::double precision, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(player_id text, player_name text, handicap text, home_course text, total_rounds bigint, avg_gross double precision, societies text[])
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  WITH player_rounds AS (
    SELECT
      r.golfer_id,
      COUNT(*) as round_count,
      ROUND(AVG(r.total_gross)::NUMERIC, 1)::DOUBLE PRECISION as avg_score
    FROM rounds r
    WHERE r.total_gross >= 50  -- Only full rounds
    GROUP BY r.golfer_id
  ),
  player_societies AS (
    SELECT
      sm.golfer_id,
      ARRAY_AGG(sp.society_name) as society_names
    FROM society_members sm
    JOIN society_profiles sp ON sm.society_id = sp.id
    GROUP BY sm.golfer_id
  )
  SELECT
    up.line_user_id AS player_id,
    COALESCE(up.display_name, up.name) AS player_name,
    -- Return handicap as TEXT to preserve "+" sign for plus handicaps
    COALESCE(
      up.handicap_index::TEXT,
      up.profile_data->'golfInfo'->>'handicap',
      up.profile_data->>'handicap'
    ) AS handicap,
    COALESCE(up.home_club, up.profile_data->'golfInfo'->>'homeClub') AS home_course,
    COALESCE(pr.round_count, 0) AS total_rounds,
    pr.avg_score AS avg_gross,
    ps.society_names AS societies
  FROM user_profiles up
  LEFT JOIN player_rounds pr ON pr.golfer_id = up.line_user_id
  LEFT JOIN player_societies ps ON ps.golfer_id = up.line_user_id
  WHERE
    up.role IS DISTINCT FROM 'oo_partner' AND   -- 1on1 (v1101): partners are never in the directory
    -- Search filter: every typed word (or a nickname variant of it) must appear somewhere in
    -- name/display_name/line_user_id (any order).
    (COALESCE(TRIM(p_search_query), '') = '' OR COALESCE((
      SELECT bool_and(
        EXISTS (
          SELECT 1 FROM unnest(public.name_nickname_variants(w)) v
          WHERE LOWER(COALESCE(up.display_name,'') || ' ' || COALESCE(up.name,'') || ' ' || COALESCE(up.line_user_id,'')) LIKE '%' || v || '%'
        )
      )
      FROM unnest(regexp_split_to_array(LOWER(TRIM(regexp_replace(p_search_query, '[,()*\\]', ' ', 'g'))), '\s+')) AS w
      WHERE w <> ''
    ), true))
    -- Handicap filter
    AND (p_handicap_min IS NULL OR COALESCE(
      up.handicap_index,
      (up.profile_data->'golfInfo'->>'handicap')::DOUBLE PRECISION,
      (up.profile_data->>'handicap')::DOUBLE PRECISION
    ) >= p_handicap_min)
    AND (p_handicap_max IS NULL OR COALESCE(
      up.handicap_index,
      (up.profile_data->'golfInfo'->>'handicap')::DOUBLE PRECISION,
      (up.profile_data->>'handicap')::DOUBLE PRECISION
    ) <= p_handicap_max)
    -- Society filter (check if player is member of specified society)
    AND (p_society_id IS NULL OR EXISTS (
      SELECT 1 FROM society_members sm
      WHERE sm.golfer_id = up.line_user_id
      AND sm.society_id = p_society_id
    ))
  ORDER BY
    COALESCE(pr.round_count, 0) DESC,
    up.display_name ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_buddy_suggestions(p_user_id text)
 RETURNS TABLE(buddy_id text, buddy_name text, times_played integer, last_played timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH pair_plays AS (
        -- Same society event, both completed
        SELECT
            CASE WHEN r1.golfer_id = p_user_id THEN r2.golfer_id ELSE r1.golfer_id END AS partner_id,
            'evt:' || r1.society_event_id::text AS play_key,
            MAX(COALESCE(r1.completed_at, r1.created_at)) AS played_at
        FROM rounds r1
        JOIN rounds r2 ON (
            r1.society_event_id IS NOT NULL
            AND r1.society_event_id = r2.society_event_id
        )
        WHERE
            (r1.golfer_id = p_user_id OR r2.golfer_id = p_user_id)
            AND r1.golfer_id != r2.golfer_id
            AND r1.status = 'completed'
            AND r2.status = 'completed'
        GROUP BY 1, 2

        UNION

        -- Same live-scoring group (covers casual rounds with no society event)
        SELECT
            s2.player_id AS partner_id,
            'grp:' || s1.group_id::text AS play_key,
            MAX(COALESCE(s1.updated_at, s1.created_at)) AS played_at
        FROM scorecards s1
        JOIN scorecards s2 ON (
            s1.group_id IS NOT NULL
            AND s1.group_id = s2.group_id
        )
        WHERE
            s1.player_id = p_user_id
            AND s2.player_id != p_user_id
        GROUP BY 1, 2
    ),
    play_partners AS (
        SELECT
            pp.partner_id,
            COUNT(DISTINCT pp.play_key)::INTEGER AS times_together,
            MAX(pp.played_at) AS last_played_date
        FROM pair_plays pp
        GROUP BY pp.partner_id
    )
    SELECT
        p.partner_id,
        up.name AS buddy_name,
        p.times_together,
        p.last_played_date
    FROM play_partners p
    JOIN user_profiles up ON up.line_user_id = p.partner_id
    LEFT JOIN golf_buddies gb ON gb.user_id = p_user_id AND gb.buddy_id = p.partner_id
    WHERE gb.id IS NULL AND up.role IS DISTINCT FROM 'oo_partner'   -- 1on1 (v1101)
    ORDER BY p.times_together DESC, p.last_played_date DESC
    LIMIT 15;
END;
$function$;
