-- 2026-07-09: order-agnostic player search (Pete: "make it show regardless in which order").
-- Names are stored "Last, First"; the old single-phrase LIKE meant "tom britt" could never match
-- "Britt, Tom". Now EVERY typed word must appear somewhere in display_name/name/line_user_id
-- (overload 1) or player_name (overload 2) — word order and commas no longer matter.

-- Overload 1: p_-prefixed params (used by registrations roster typeahead + global-player-directory.js)
CREATE OR REPLACE FUNCTION public.search_players_global(
  p_search_query text DEFAULT ''::text,
  p_society_id uuid DEFAULT NULL::uuid,
  p_handicap_min double precision DEFAULT NULL::double precision,
  p_handicap_max double precision DEFAULT NULL::double precision,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
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
    -- Search filter: every word must appear somewhere in name/display_name/line_user_id (any order)
    (COALESCE(TRIM(p_search_query), '') = '' OR COALESCE((
      SELECT bool_and(
        LOWER(COALESCE(up.display_name,'') || ' ' || COALESCE(up.name,'') || ' ' || COALESCE(up.line_user_id,'')) LIKE '%' || w || '%'
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

-- Overload 2: global_players variant (named params search_query/society_filter/...)
CREATE OR REPLACE FUNCTION public.search_players_global(
  search_query text DEFAULT NULL::text,
  society_filter text DEFAULT NULL::text,
  handicap_min numeric DEFAULT NULL::numeric,
  handicap_max numeric DEFAULT NULL::numeric,
  home_course_filter text DEFAULT NULL::text,
  sort_by text DEFAULT 'name'::text,
  result_limit integer DEFAULT 50,
  result_offset integer DEFAULT 0
)
RETURNS TABLE(player_id text, player_name text, handicap text, home_course text, primary_society text, societies text[], society_count bigint, total_rounds bigint, last_round_date timestamp with time zone, avg_score numeric, profile_data jsonb, match_score numeric, data_source text)
LANGUAGE plpgsql
STABLE
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        gp.player_id,
        gp.player_name,
        gp.handicap,
        gp.home_course_name as home_course,
        gp.primary_society,
        gp.societies,
        gp.society_count,
        gp.total_rounds,
        gp.last_round_date,
        gp.avg_score,
        gp.profile_data,
        CASE
            WHEN search_query IS NULL OR search_query = '' THEN 1.0
            ELSE similarity(gp.player_name, search_query) * 100
        END as match_score,
        gp.data_source
    FROM global_players gp
    WHERE
        (search_query IS NULL OR COALESCE(TRIM(search_query), '') = '' OR COALESCE((
          SELECT bool_and(LOWER(COALESCE(gp.player_name,'')) LIKE '%' || w || '%')
          FROM unnest(regexp_split_to_array(LOWER(TRIM(regexp_replace(search_query, '[,()*\\]', ' ', 'g'))), '\s+')) AS w
          WHERE w <> ''
        ), true))
        AND (society_filter IS NULL OR
             gp.primary_society = society_filter OR
             society_filter = ANY(gp.societies))
        AND (handicap_min IS NULL OR
             (gp.handicap IS NOT NULL AND gp.handicap::numeric >= handicap_min))
        AND (handicap_max IS NULL OR
             (gp.handicap IS NOT NULL AND gp.handicap::numeric <= handicap_max))
        AND (home_course_filter IS NULL OR
             gp.home_course_name ILIKE '%' || home_course_filter || '%')
    ORDER BY
        CASE WHEN sort_by = 'name' THEN gp.player_name ELSE NULL END ASC,
        CASE WHEN sort_by = 'handicap' THEN gp.handicap::numeric ELSE NULL END ASC NULLS LAST,
        CASE WHEN sort_by = 'rounds' THEN gp.total_rounds ELSE NULL END DESC NULLS LAST,
        CASE WHEN sort_by = 'last_played' THEN gp.last_round_date ELSE NULL END DESC NULLS LAST,
        gp.player_name ASC
    LIMIT result_limit
    OFFSET result_offset;
END;
$function$;
