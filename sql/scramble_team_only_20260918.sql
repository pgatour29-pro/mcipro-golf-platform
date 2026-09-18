-- v1253 (2026-09-18) — scramble rounds are the TEAM's record and never a handicap input.
-- Pete: "Make sure at the end of the round it only records the team and not the individual scores
-- and not count towards the hcp". Both bodies below were pulled from the LIVE database and edited
-- in place (repo copies of DB functions are never authoritative — FUCKUPS #37).
--
-- 1) calculate_society_handicap_index: the 8-of-20 window excludes scramble rounds. The trigger
--    auto_update_society_handicaps_on_round already RETURNs on a scramble round, but a later normal
--    round recomputed the index over "the last 20 completed rounds" — team grosses included.
-- 2) finish_scorecard_by_caddy: a caddy-finished scramble card now stamps scoring_formats
--    ["scramble"] on the round it writes, so the engine skips it like every other scramble round.

CREATE OR REPLACE FUNCTION public.calculate_society_handicap_index(p_golfer_id text, p_society_id uuid, OUT new_handicap_index numeric, OUT rounds_used integer, OUT all_differentials jsonb, OUT best_differentials jsonb)
 RETURNS record
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_round RECORD;
  v_differentials DECIMAL[] := ARRAY[]::DECIMAL[];
  v_best_avg DECIMAL;
  v_course_rating DECIMAL;
  v_slope_rating DECIMAL;
  v_differential DECIMAL;
  v_num_to_use INTEGER;
  v_adjustment DECIMAL := 0;
  v_best_diffs DECIMAL[];
  v_max_rounds INTEGER;
BEGIN
  -- Both universal and society use best 8 of last 20 rounds (WHS standard)
  v_max_rounds := 20;

  -- Get completed rounds
  FOR v_round IN
    SELECT
      r.id,
      r.total_gross,
      r.course_id,
      r.tee_marker,
      r.completed_at
    FROM public.rounds r
    WHERE r.golfer_id = p_golfer_id
      AND r.status = 'completed'
      AND r.total_gross IS NOT NULL
      AND r.tee_marker IS NOT NULL
      -- v1253 (2026-09-18): a scramble round is the TEAM's score — never one of this golfer's
      -- differentials (the trigger already skips the scramble round itself; this keeps it out of
      -- the window when a LATER round recomputes). Same detection as the trigger, plus the
      -- explicit team markers the app stamps on both teammates' rows.
      AND COALESCE(r.team_size, 1) <= 1
      AND r.scramble_config IS NULL
      AND NOT (r.scoring_formats::text ILIKE '%scramble%')
      AND COALESCE(r.game_config->>'scramble', 'false') IN ('false', 'null')
      AND (
        p_society_id IS NULL
        OR
        (
          r.primary_society_id = p_society_id
          OR EXISTS (
            SELECT 1 FROM public.round_societies rs
            WHERE rs.round_id = r.id
              AND rs.society_id = p_society_id
          )
        )
      )
    ORDER BY r.completed_at DESC
    LIMIT v_max_rounds
  LOOP
    -- Get course rating and slope rating for the tee played
    SELECT * INTO v_course_rating, v_slope_rating
    FROM get_course_rating_for_tee(v_round.course_id, v_round.tee_marker);

    -- Calculate score differential
    v_differential := calculate_score_differential(
      v_round.total_gross,
      v_course_rating,
      v_slope_rating
    );

    v_differentials := array_append(v_differentials, v_differential);
  END LOOP;

  -- Count rounds
  rounds_used := array_length(v_differentials, 1);

  IF rounds_used IS NULL OR rounds_used = 0 THEN
    new_handicap_index := NULL;
    all_differentials := '[]'::JSONB;
    best_differentials := '[]'::JSONB;
    RETURN;
  END IF;

  all_differentials := to_jsonb(v_differentials);

  -- WHS 8-of-20 adjustment table (same for universal and society)
  CASE
    WHEN rounds_used >= 20 THEN v_num_to_use := 8; v_adjustment := 0;
    WHEN rounds_used = 19 THEN v_num_to_use := 7; v_adjustment := 0;
    WHEN rounds_used = 18 THEN v_num_to_use := 7; v_adjustment := 0;
    WHEN rounds_used = 17 THEN v_num_to_use := 6; v_adjustment := 0;
    WHEN rounds_used = 16 THEN v_num_to_use := 6; v_adjustment := 0;
    WHEN rounds_used = 15 THEN v_num_to_use := 5; v_adjustment := 0;
    WHEN rounds_used = 14 THEN v_num_to_use := 5; v_adjustment := 0;
    WHEN rounds_used = 13 THEN v_num_to_use := 5; v_adjustment := 0;
    WHEN rounds_used = 12 THEN v_num_to_use := 4; v_adjustment := 0;
    WHEN rounds_used = 11 THEN v_num_to_use := 4; v_adjustment := 0;
    WHEN rounds_used = 10 THEN v_num_to_use := 4; v_adjustment := 0;
    WHEN rounds_used = 9 THEN v_num_to_use := 3; v_adjustment := 0;
    WHEN rounds_used = 8 THEN v_num_to_use := 3; v_adjustment := 0;
    WHEN rounds_used = 7 THEN v_num_to_use := 2; v_adjustment := 0;
    WHEN rounds_used = 6 THEN v_num_to_use := 2; v_adjustment := -1.0;
    WHEN rounds_used = 5 THEN v_num_to_use := 1; v_adjustment := 0;
    WHEN rounds_used = 4 THEN v_num_to_use := 1; v_adjustment := -1.0;
    WHEN rounds_used = 3 THEN v_num_to_use := 1; v_adjustment := -2.0;
    ELSE v_num_to_use := 1; v_adjustment := -2.0;
  END CASE;

  -- Sort and get best N differentials
  SELECT ARRAY(
    SELECT unnest(v_differentials) AS diff
    ORDER BY diff ASC
    LIMIT v_num_to_use
  ) INTO v_best_diffs;

  best_differentials := to_jsonb(v_best_diffs);

  -- Calculate average of best differentials
  SELECT AVG(d) INTO v_best_avg
  FROM unnest(v_best_diffs) AS d;

  -- Apply WHS 0.96 multiplier + adjustment
  new_handicap_index := ROUND((v_best_avg * 0.96) + v_adjustment, 1);

  -- Cap at WHS limits (-10.0 to 54.0)
  IF new_handicap_index < -10.0 THEN
    new_handicap_index := -10.0;
  ELSIF new_handicap_index > 54.0 THEN
    new_handicap_index := 54.0;
  END IF;

END;
$function$
;

CREATE OR REPLACE FUNCTION public.finish_scorecard_by_caddy(p_scorecard_id text, p_caddy_user_id text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  sc record;
  v_link record;
  r_id uuid;
  v_gross int; v_net int; v_stb int; v_holes int;
  v_day timestamptz;
  v_event uuid;
  v_fmt jsonb;
begin
  select * into sc from scorecards where id = p_scorecard_id;
  if sc is null then raise exception 'scorecard not found'; end if;
  -- v1253: a scramble card's round must carry the scramble tag (the handicap engine skips tagged rounds)
  v_fmt := case when coalesce(sc.scoring_format, '') ilike '%scramble%' then '["scramble"]'::jsonb else null end;

  select * into v_link from caddy_score_links
    where scorecard_id = p_scorecard_id
      and caddy_user_id = p_caddy_user_id
      and status = 'accepted'
    order by created_at desc limit 1;
  if v_link is null then raise exception 'no accepted marking link for this caddy'; end if;

  select coalesce(sum(gross_score),0), coalesce(sum(net_score),0),
         coalesce(sum(stableford_points),0), count(*)
    into v_gross, v_net, v_stb, v_holes
    from scores where scorecard_id = p_scorecard_id and gross_score is not null;
  if v_holes = 0 then raise exception 'no scores on card'; end if;

  begin v_event := nullif(sc.event_id, '')::uuid; exception when others then v_event := null; end;

  v_day := date_trunc('day', coalesce(sc.started_at, now()));

  select id into r_id from rounds
    where golfer_id = sc.player_id
      and played_at >= v_day and played_at < v_day + interval '1 day'
      and (nullif(sc.course_id, '') is null or course_id = sc.course_id)
    limit 1;

  if r_id is not null then
    update rounds set
      total_gross = v_gross, total_net = v_net, total_stableford = v_stb,
      handicap_used = sc.handicap, holes_played = v_holes, scoring_formats = coalesce(v_fmt, scoring_formats),
      completed_at = now(), status = 'completed', player_name = sc.player_name
    where id = r_id;
    delete from round_holes where round_id = r_id;
  else
    begin
      insert into rounds (golfer_id, course_id, course_name, type, society_event_id,
        played_at, started_at, completed_at, status, total_gross, total_net,
        total_stableford, handicap_used, tee_marker, holes_played, player_name, scoring_formats)
      values (sc.player_id, nullif(sc.course_id, ''), sc.course_name,
        case when v_event is not null then 'society' else 'private' end,
        v_event, coalesce(sc.started_at, now()), coalesce(sc.started_at, now()),
        now(), 'completed', v_gross, v_net, v_stb, sc.handicap, sc.tee_marker,
        v_holes, sc.player_name, v_fmt)
      returning id into r_id;
    exception when foreign_key_violation then
      insert into rounds (golfer_id, course_name, type, society_event_id,
        played_at, started_at, completed_at, status, total_gross, total_net,
        total_stableford, handicap_used, tee_marker, holes_played, player_name, scoring_formats)
      values (sc.player_id, sc.course_name,
        case when v_event is not null then 'society' else 'private' end,
        v_event, coalesce(sc.started_at, now()), coalesce(sc.started_at, now()),
        now(), 'completed', v_gross, v_net, v_stb, sc.handicap, sc.tee_marker,
        v_holes, sc.player_name, v_fmt)
      returning id into r_id;
    end;
  end if;

  insert into round_holes (round_id, hole_number, par, stroke_index, gross_score,
    net_score, stableford_points, handicap_strokes)
  select r_id, hole_number, par, stroke_index, gross_score, net_score,
    stableford_points, handicap_strokes
  from scores where scorecard_id = p_scorecard_id and gross_score is not null;

  update scorecards set status = 'completed', completed_at = now(), updated_at = now()
    where id = p_scorecard_id;
  update caddy_score_links set status = 'completed', responded_at = now()
    where id = v_link.id;

  return r_id;
end $function$
;
