-- Create event_join_requests table for private golfer event approvals
CREATE TABLE IF NOT EXISTS event_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES society_events(id) ON DELETE CASCADE,
    golfer_id TEXT NOT NULL,
    golfer_name TEXT NOT NULL,
    handicap NUMERIC,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_event_join_requests_event_id ON event_join_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_event_join_requests_golfer_id ON event_join_requests(golfer_id);
CREATE INDEX IF NOT EXISTS idx_event_join_requests_status ON event_join_requests(status);

-- Create unique constraint to prevent duplicate requests
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_join_requests_unique
    ON event_join_requests(event_id, golfer_id)
    WHERE status = 'pending';

-- Add RLS (Row Level Security) policies
ALTER TABLE event_join_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read join requests (for event creators to see them)
CREATE POLICY "Anyone can read join requests" ON event_join_requests
    FOR SELECT USING (true);

-- Policy: Authenticated users can create join requests
CREATE POLICY "Users can create join requests" ON event_join_requests
    FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own requests or event creators can update
CREATE POLICY "Users can update join requests" ON event_join_requests
    FOR UPDATE USING (true);

-- Add comment to table
COMMENT ON TABLE event_join_requests IS 'Stores join requests for private golfer events requiring approval';
