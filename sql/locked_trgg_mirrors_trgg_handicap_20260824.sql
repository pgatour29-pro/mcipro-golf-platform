-- 2026-08-24 — locked TRGG society_handicaps writes must sync GLOBALLY (Pete).
--
-- Incident: the masterscoreboard pull left user_profiles.trgg_handicap and the TRGG
-- society_handicaps row DISAGREEING for 4 players (alias-vs-direct double match, fixed
-- in puller v786). The organizer Players Directory reads the society row first, other
-- surfaces fall back to trgg_handicap — a split shows two different handicaps at once.
--
-- Fix: extend sync_universal_to_locked_society() (the 2026-08-18 mirror trigger,
-- sql/universal_mirrors_locked_trgg_20260818.sql) so a locked TRGG society-row write
-- also mirrors user_profiles.trgg_handicap. One write to the TRGG row now updates:
--   universal society_handicaps row, user_profiles.handicap_index, trgg_handicap,
--   profile_data.handicap, profile_data.golfInfo.handicap.
-- trgg_handicap only mirrors for the TRGG society id pair — another society adopting a
-- masterscore-style method must not stomp the TRGG number.

CREATE OR REPLACE FUNCTION public.sync_universal_to_locked_society()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uni_method TEXT;
  v_is_trgg BOOLEAN;
BEGIN
  -- Only locked TRGG/masterscore SOCIETY rows drive the universal.
  IF NEW.society_id IS NULL OR NEW.handicap_index IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT (upper(COALESCE(NEW.calculation_method,'')) LIKE 'TRGG%'
       OR upper(COALESCE(NEW.calculation_method,'')) LIKE '%MASTERSCORE%') THEN
    RETURN NEW;
  END IF;

  v_is_trgg := NEW.society_id IN ('7c0e4b72-d925-44bc-afda-38259a7ba346',
                                  '17451cf3-f499-4aa3-83d7-c206149838c4');

  SELECT calculation_method INTO v_uni_method
  FROM public.society_handicaps
  WHERE golfer_id = NEW.golfer_id AND society_id IS NULL;

  -- Explicitly pinned universal never gets overwritten
  IF v_uni_method IS NOT NULL AND upper(v_uni_method) = 'MANUAL' THEN
    -- ...but the TRGG master number itself still syncs (it is a different field).
    IF v_is_trgg THEN
      UPDATE public.user_profiles
      SET trgg_handicap = NEW.handicap_index, updated_at = NOW()
      WHERE line_user_id = NEW.golfer_id
        AND trgg_handicap IS DISTINCT FROM NEW.handicap_index;
    END IF;
    RETURN NEW;
  END IF;

  IF v_uni_method IS NULL THEN
    INSERT INTO public.society_handicaps (
      golfer_id, society_id, handicap_index, rounds_count,
      rounds_since_adjustment, last_calculated_at, calculation_method
    ) VALUES (NEW.golfer_id, NULL, NEW.handicap_index, 0, 0, NOW(), 'ANCHORED');
  ELSE
    UPDATE public.society_handicaps
    SET handicap_index = NEW.handicap_index,
        last_calculated_at = NOW(),
        updated_at = NOW(),
        rounds_since_adjustment = 0
    WHERE golfer_id = NEW.golfer_id AND society_id IS NULL;
  END IF;

  UPDATE public.user_profiles
  SET handicap_index = NEW.handicap_index,
      trgg_handicap = CASE WHEN v_is_trgg THEN NEW.handicap_index ELSE trgg_handicap END,
      profile_data = jsonb_set(
        COALESCE(profile_data, '{}'::jsonb)
          || jsonb_build_object('handicap', NEW.handicap_index),
        '{golfInfo}',
        COALESCE(profile_data->'golfInfo', '{}'::jsonb)
          || jsonb_build_object('handicap', NEW.handicap_index,
                                'lastHandicapUpdate', NOW())
      ),
      updated_at = NOW()
  WHERE line_user_id = NEW.golfer_id;

  RETURN NEW;
END;
$function$;
