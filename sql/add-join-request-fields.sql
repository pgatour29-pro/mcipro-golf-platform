-- Add registration fields to event_join_requests table
-- Run this after creating the table

ALTER TABLE event_join_requests
ADD COLUMN IF NOT EXISTS want_transport BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS want_competition BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS partner_prefs JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN event_join_requests.want_transport IS 'Whether the golfer wants transportation';
COMMENT ON COLUMN event_join_requests.want_competition IS 'Whether the golfer wants to enter the competition';
COMMENT ON COLUMN event_join_requests.partner_prefs IS 'JSON array of preferred partners [{playerId, playerName}]';
