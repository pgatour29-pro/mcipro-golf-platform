-- Nickname-aware player search (server side). Mirrors the JS window._NICK_GROUPS table in
-- public/index.html. name_nickname_variants(w) returns w plus every nickname-equivalent form
-- (John↔Johnny↔Jon, Richard↔Rick, Peter↔Pete, Robert↔Bob …). search_players_global then matches
-- a typed word if ANY of its variants appears in the name — so "Peter" finds "Pete", "Bob" finds
-- "Robert", etc. Recall-oriented (a human picks from the results).
CREATE OR REPLACE FUNCTION public.name_nickname_variants(w text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $function$
  WITH g(grp) AS (VALUES
    (ARRAY['richard','rick','ricky','rich','richie','dick','dickie']),
    (ARRAY['robert','rob','robbie','bob','bobby']),
    (ARRAY['william','will','willie','bill','billy']),
    (ARRAY['james','jim','jimmy','jamie']),
    (ARRAY['john','johnny','jon','jonny','jack']),
    (ARRAY['jonathan','jon','jonny','jonathon']),
    (ARRAY['michael','mike','mikey','mick','mickey']),
    (ARRAY['thomas','tom','tommy']),
    (ARRAY['charles','charlie','chuck','chas']),
    (ARRAY['christopher','chris','kris']),
    (ARRAY['daniel','dan','danny']),
    (ARRAY['david','dave','davey']),
    (ARRAY['edward','ed','eddie','ted','teddy','ned']),
    (ARRAY['anthony','tony']),
    (ARRAY['joseph','joe','joey']),
    (ARRAY['matthew','matt','matty']),
    (ARRAY['andrew','andy','drew']),
    (ARRAY['benjamin','ben','benny']),
    (ARRAY['nicholas','nick','nicky']),
    (ARRAY['samuel','sam','sammy']),
    (ARRAY['alexander','alex','alec','xander','sandy']),
    (ARRAY['stephen','steve','stevie','steven']),
    (ARRAY['kenneth','ken','kenny']),
    (ARRAY['ronald','ron','ronnie']),
    (ARRAY['donald','don','donnie']),
    (ARRAY['gerald','gerry','jerry']),
    (ARRAY['gregory','greg','gregg']),
    (ARRAY['timothy','tim','timmy']),
    (ARRAY['patrick','pat','paddy']),
    (ARRAY['peter','pete','petey']),
    (ARRAY['frederick','fred','freddie','freddy']),
    (ARRAY['francis','frank','frankie']),
    (ARRAY['lawrence','larry','laurie']),
    (ARRAY['vincent','vince','vinny']),
    (ARRAY['theodore','theo','ted','teddy']),
    (ARRAY['philip','phil']),
    (ARRAY['raymond','ray']),
    (ARRAY['douglas','doug']),
    (ARRAY['zachary','zach','zack']),
    (ARRAY['joshua','josh']),
    (ARRAY['jacob','jake']),
    (ARRAY['nathaniel','nathan','nate']),
    (ARRAY['albert','bert','albie'])
  )
  SELECT COALESCE(
    (SELECT array_agg(DISTINCT m) FROM g, unnest(g.grp) AS m WHERE lower(w) = ANY(g.grp)),
    ARRAY[lower(w)]
  );
$function$;

-- Rewrite the primary overload's search predicate to match ANY nickname variant of each typed word.
-- Everything else is unchanged.
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
