-- =====================================================
-- SOCIETY MEMBERSHIP DATABASE
-- Allows societies to maintain their own member rosters
-- =====================================================

-- Table: society_members
-- Links golfers to societies they are official members of
-- Different from golfer_society_subscriptions (which is just "following")

CREATE TABLE IF NOT EXISTS society_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Society identification
    society_name TEXT NOT NULL,
    organizer_id TEXT,  -- Links to society_profiles.organizer_id

    -- Member identification
    golfer_id TEXT NOT NULL,  -- LINE user ID
    member_number TEXT,  -- Optional society-specific member number

    -- Primary society flag
    is_primary_society BOOLEAN DEFAULT false,

    -- Membership status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),

    -- Membership dates
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    renewed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    -- Additional member data (flexible JSONB for society-specific fields)
    member_data JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(society_name, golfer_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_society_members_society ON society_members(society_name);
CREATE INDEX IF NOT EXISTS idx_society_members_golfer ON society_members(golfer_id);
CREATE INDEX IF NOT EXISTS idx_society_members_status ON society_members(status);

-- Partial unique index: Ensures only one primary society per golfer
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_primary_society
    ON society_members(golfer_id)
    WHERE is_primary_society = true;

-- RLS Policies
ALTER TABLE society_members ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active members (for search/discovery)
DROP POLICY IF EXISTS "Society members are viewable by everyone" ON society_members;
CREATE POLICY "Society members are viewable by everyone"
    ON society_members FOR SELECT
    USING (true);

-- Allow public insert/update/delete (app handles authorization via LINE auth)
DROP POLICY IF EXISTS "Society members are manageable by everyone" ON society_members;
CREATE POLICY "Society members are manageable by everyone"
    ON society_members FOR ALL
    USING (true)
    WITH CHECK (true);

-- Enable realtime (ignore if already added)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE society_members;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_society_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_society_members_updated_at_trigger ON society_members;
CREATE TRIGGER update_society_members_updated_at_trigger
    BEFORE UPDATE ON society_members
    FOR EACH ROW
    EXECUTE FUNCTION update_society_members_updated_at();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ society_members table created successfully!';
    RAISE NOTICE 'Societies can now maintain their own member rosters.';
    RAISE NOTICE 'Features: Primary society designation, membership status, member numbers';
END $$;
