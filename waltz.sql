-- waltz.sql — 3-man Waltz (1-2-3) Stableford scoring, server-side parity with waltz.ts
-- Pure/immutable helpers + one JSONB RPC. Safe to run in Supabase SQL editor.
-- Schema: keep everything under a dedicated schema so it doesn't collide with app objects.

create schema if not exists waltz;

-- Strokes a player receives on ONE hole. Mirrors strokesReceived() in waltz.ts.
-- NOTE: abs() is taken before integer division so trunc-toward-zero == floor for both signs.
create or replace function waltz.strokes_received(p_course_hcp int, p_stroke_index int)
returns int
language sql immutable
as $$
  select case
    when p_course_hcp >= 0 then
      (p_course_hcp / 18) + (case when p_stroke_index <= (p_course_hcp % 18) then 1 else 0 end)
    else
      -((abs(p_course_hcp) / 18)
        + (case when p_stroke_index > 18 - (abs(p_course_hcp) % 18) then 1 else 0 end))
  end;
$$;

-- Net par=2, birdie=3, eagle=4, albatross=5; bogey=1; net double bogey or worse=0.
-- p_net null (no score / picked up) => 0. Mirrors stablefordPoints() in waltz.ts.
create or replace function waltz.stableford_points(p_net int, p_par int)
returns int
language sql immutable
as $$
  select case when p_net is null then 0 else greatest(0, 2 - (p_net - p_par)) end;
$$;

-- How many scores count on a given hole: 1,4,7,10,13,16->1 ; 2,5,..->2 ; 3,6,..->3
create or replace function waltz.count_for_hole(p_hole int)
returns int
language sql immutable
as $$
  select ((p_hole - 1) % 3) + 1;
$$;

-- Score a full round from JSONB inputs, returning JSONB that mirrors scoreWaltz() in waltz.ts.
--   p_holes   : [{"hole":1,"par":4,"strokeIndex":1}, ...]  (18 entries)
--   p_players : [{"playerId":"A","courseHandicap":10,"gross":[5,6,4,...]}, ...] (gross[] null allowed)
-- Returns    : {"total": <int>, "byHole": [{hole,count,perPlayer:[...],contributing:[...],teamPoints}]}
create or replace function waltz.score_round(p_holes jsonb, p_players jsonb)
returns jsonb
language plpgsql immutable
as $$
declare
  v_by_hole jsonb := '[]'::jsonb;
  v_total   int := 0;
  h         jsonb;
  pl        jsonb;
  v_idx     int;
  v_hole    int;
  v_par     int;
  v_si      int;
  v_count   int;
  v_gross   int;
  v_recv    int;
  v_net     int;
  v_pts     int;
  v_players_pts jsonb;
  v_team    int;
  v_contrib jsonb;
begin
  for v_idx in 0 .. jsonb_array_length(p_holes) - 1 loop
    h       := p_holes -> v_idx;
    v_hole  := (h ->> 'hole')::int;
    v_par   := (h ->> 'par')::int;
    v_si    := (h ->> 'strokeIndex')::int;
    v_count := waltz.count_for_hole(v_hole);

    v_players_pts := '[]'::jsonb;
    for pl in select * from jsonb_array_elements(p_players) loop
      v_gross := nullif(pl -> 'gross' ->> v_idx, '')::int;  -- null-safe per hole
      v_recv  := waltz.strokes_received((pl ->> 'courseHandicap')::int, v_si);
      v_net   := case when v_gross is null then null else v_gross - v_recv end;
      v_pts   := waltz.stableford_points(v_net, v_par);
      v_players_pts := v_players_pts || jsonb_build_object(
        'playerId', pl ->> 'playerId',
        'gross', to_jsonb(v_gross),
        'strokesReceived', v_recv,
        'net', to_jsonb(v_net),
        'points', v_pts
      );
    end loop;

    -- rank by points desc, take top v_count as contributors
    select coalesce(sum((e ->> 'points')::int), 0),
           coalesce(jsonb_agg(e ->> 'playerId'), '[]'::jsonb)
      into v_team, v_contrib
    from (
      select e from jsonb_array_elements(v_players_pts) e
      order by (e ->> 'points')::int desc
      limit v_count
    ) ranked;

    v_by_hole := v_by_hole || jsonb_build_object(
      'hole', v_hole,
      'count', v_count,
      'perPlayer', v_players_pts,
      'contributing', v_contrib,
      'teamPoints', v_team
    );
    v_total := v_total + v_team;
  end loop;

  return jsonb_build_object('total', v_total, 'byHole', v_by_hole);
end;
$$;
