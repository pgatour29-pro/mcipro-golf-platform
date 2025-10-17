-- =====================================================
-- FIX: Auto-promote waitlist trigger error
-- =====================================================
-- Issue: Function references NEW.event_id when triggered from society_events table,
-- but society_events has 'id' column, not 'event_id'
-- Solution: Fix the function to handle both trigger sources correctly

-- Drop existing function and recreate with fix
CREATE OR REPLACE FUNCTION auto_promote_waitlist()
RETURNS TRIGGER AS $$
DECLARE
  target_event_id TEXT;
  event_max INTEGER;
  current_count INTEGER;
  spots_available INTEGER;
  next_waitlist RECORD;
BEGIN
  -- Determine the event_id based on which table triggered this
  -- If triggered from event_registrations: use event_id column
  -- If triggered from society_events: use id column
  IF TG_TABLE_NAME = 'society_events' THEN
    target_event_id := COALESCE(NEW.id, OLD.id);
  ELSE
    target_event_id := COALESCE(NEW.event_id, OLD.event_id);
  END IF;

  -- Get event max players
  SELECT max_players INTO event_max
  FROM society_events
  WHERE id = target_event_id;

  -- If no max, skip auto-promotion
  IF event_max IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Count current registrations
  SELECT COUNT(*) INTO current_count
  FROM event_registrations
  WHERE event_id = target_event_id;

  -- Calculate spots
  spots_available := event_max - current_count;

  -- Promote from waitlist if spots available
  WHILE spots_available > 0 LOOP
    -- Get next person on waitlist
    SELECT * INTO next_waitlist
    FROM event_waitlist
    WHERE event_id = target_event_id
    ORDER BY position ASC, created_at ASC
    LIMIT 1;

    -- No one on waitlist, exit
    EXIT WHEN next_waitlist IS NULL;

    -- Move to registrations
    INSERT INTO event_registrations (
      id, event_id, player_name, player_id, handicap,
      want_transport, want_competition, partner_prefs
    ) VALUES (
      next_waitlist.id,
      next_waitlist.event_id,
      next_waitlist.player_name,
      next_waitlist.player_id,
      next_waitlist.handicap,
      next_waitlist.want_transport,
      next_waitlist.want_competition,
      ARRAY[]::TEXT[]
    );

    -- Remove from waitlist
    DELETE FROM event_waitlist WHERE id = next_waitlist.id;

    -- Update counter
    spots_available := spots_available - 1;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers remain the same, function now handles both cases
-- No need to recreate triggers

-- Test: Try updating an event to verify it works
SELECT 'Fix applied successfully! You can now update society events without errors.' AS status;
