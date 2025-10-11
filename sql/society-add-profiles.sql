-- Create society_profiles table for society branding/info
CREATE TABLE IF NOT EXISTS society_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id TEXT NOT NULL UNIQUE, -- LINE user ID of the organizer
    society_name TEXT NOT NULL,
    society_logo TEXT, -- URL to uploaded logo image
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_society_profiles_organizer ON society_profiles(organizer_id);

-- Add RLS policies
ALTER TABLE society_profiles ENABLE ROW LEVEL SECURITY;

-- Allow organizers to read their own profile
CREATE POLICY "Organizers can view own profile"
    ON society_profiles FOR SELECT
    USING (true); -- All users can see society profiles (for golfer browsing)

-- Allow organizers to insert their own profile
CREATE POLICY "Organizers can create own profile"
    ON society_profiles FOR INSERT
    WITH CHECK (true);

-- Allow organizers to update their own profile
CREATE POLICY "Organizers can update own profile"
    ON society_profiles FOR UPDATE
    USING (organizer_id = auth.jwt() ->> 'sub');

-- Add event_format field to society_events for filtering
ALTER TABLE society_events
ADD COLUMN IF NOT EXISTS event_format TEXT; -- '2man_scramble', '4man_scramble', 'strokeplay', 'private', etc.

COMMENT ON COLUMN society_events.event_format IS 'Event format type: 2man_scramble, 4man_scramble, strokeplay, private, etc.';
