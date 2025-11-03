-- URGENT: Fix rounds table schema mismatch
-- The code expects these columns but they don't exist in production database

-- Check if columns exist and add them if missing
DO $$
BEGIN
    -- Add completed_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'rounds' AND column_name = 'completed_at') THEN
        ALTER TABLE rounds ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN rounds.completed_at IS 'When the round was finished';
    END IF;

    -- Add started_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'rounds' AND column_name = 'started_at') THEN
        ALTER TABLE rounds ADD COLUMN started_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN rounds.started_at IS 'When the round began';
    END IF;

    -- Add golfer_id if it doesn't exist (for new schema)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'rounds' AND column_name = 'golfer_id') THEN
        ALTER TABLE rounds ADD COLUMN golfer_id UUID;
        COMMENT ON COLUMN rounds.golfer_id IS 'Supabase auth user ID';
    END IF;

    -- Add society_event_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'rounds' AND column_name = 'society_event_id') THEN
        ALTER TABLE rounds ADD COLUMN society_event_id UUID;
        COMMENT ON COLUMN rounds.society_event_id IS 'Links to society_events table';
    END IF;

    -- Add course_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'rounds' AND column_name = 'course_name') THEN
        ALTER TABLE rounds ADD COLUMN course_name TEXT;
        COMMENT ON COLUMN rounds.course_name IS 'Name of the golf course';
    END IF;

    -- Add type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'rounds' AND column_name = 'type') THEN
        ALTER TABLE rounds ADD COLUMN type TEXT;
        COMMENT ON COLUMN rounds.type IS 'Round type: practice, private, society';
    END IF;

    -- Add status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'rounds' AND column_name = 'status') THEN
        ALTER TABLE rounds ADD COLUMN status TEXT DEFAULT 'completed';
        COMMENT ON COLUMN rounds.status IS 'Round status: in_progress, completed, abandoned';
    END IF;

    -- Add total_gross if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'rounds' AND column_name = 'total_gross') THEN
        ALTER TABLE rounds ADD COLUMN total_gross INTEGER;
        COMMENT ON COLUMN rounds.total_gross IS 'Total gross score';
    END IF;

    -- Add total_net if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'rounds' AND column_name = 'total_net') THEN
        ALTER TABLE rounds ADD COLUMN total_net INTEGER;
        COMMENT ON COLUMN rounds.total_net IS 'Total net score';
    END IF;

    -- Add total_stableford if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'rounds' AND column_name = 'total_stableford') THEN
        ALTER TABLE rounds ADD COLUMN total_stableford INTEGER;
        COMMENT ON COLUMN rounds.total_stableford IS 'Total stableford points';
    END IF;

    -- Add handicap_used if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'rounds' AND column_name = 'handicap_used') THEN
        ALTER TABLE rounds ADD COLUMN handicap_used NUMERIC(4,1);
        COMMENT ON COLUMN rounds.handicap_used IS 'Handicap used for this round';
    END IF;

    -- Add tee_marker if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'rounds' AND column_name = 'tee_marker') THEN
        ALTER TABLE rounds ADD COLUMN tee_marker TEXT;
        COMMENT ON COLUMN rounds.tee_marker IS 'Tee color: white, blue, black, red';
    END IF;

END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rounds_golfer_id ON rounds(golfer_id);
CREATE INDEX IF NOT EXISTS idx_rounds_society_event_id ON rounds(society_event_id);
CREATE INDEX IF NOT EXISTS idx_rounds_completed_at ON rounds(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_rounds_user_id ON rounds(user_id); -- Old schema compatibility

-- Migrate existing data if needed
UPDATE rounds
SET
    completed_at = played_at,
    started_at = played_at
WHERE completed_at IS NULL AND played_at IS NOT NULL;

UPDATE rounds
SET type = 'practice'
WHERE type IS NULL;

UPDATE rounds
SET status = 'completed'
WHERE status IS NULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ rounds table schema updated successfully';
    RAISE NOTICE '✅ Added columns: completed_at, started_at, golfer_id, society_event_id, etc.';
    RAISE NOTICE '✅ Created performance indexes';
    RAISE NOTICE '✅ Migrated existing data';
END $$;
