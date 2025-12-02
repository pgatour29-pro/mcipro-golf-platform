-- =============================================================================
-- ADD TEAM_ID COLUMN TO POOL_ENTRANTS TABLE
-- =============================================================================
-- Date: 2025-12-02
-- Purpose: Support team competitions in public games system
-- Allows tracking which players are on the same team
-- =============================================================================

-- Add team_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'pool_entrants'
        AND column_name = 'team_id'
    ) THEN
        ALTER TABLE pool_entrants
        ADD COLUMN team_id TEXT NULL;

        -- Add index for team queries
        CREATE INDEX idx_pool_entrants_team_id ON pool_entrants(team_id);

        -- Add comment
        COMMENT ON COLUMN pool_entrants.team_id IS 'Team identifier for team games (null for individual games)';

        RAISE NOTICE 'Successfully added team_id column to pool_entrants';
    ELSE
        RAISE NOTICE 'team_id column already exists in pool_entrants';
    END IF;
END $$;

-- Verify the change
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'pool_entrants'
ORDER BY ordinal_position;
