-- Society Organizer PIN Authentication - Per Organizer
-- Each society organizer can set their own PIN for their dashboard

-- Drop old table if exists
DROP TABLE IF EXISTS society_organizer_access CASCADE;

-- Create new table with organizer_id
CREATE TABLE IF NOT EXISTS society_organizer_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id TEXT NOT NULL UNIQUE,  -- LINE user ID of the organizer
    access_pin TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE society_organizer_access ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (PIN verification)
CREATE POLICY "Allow anonymous read for PIN verification"
ON society_organizer_access
FOR SELECT
TO anon
USING (true);

-- Allow anonymous insert (when organizer sets PIN for first time)
CREATE POLICY "Allow anonymous insert for setting PIN"
ON society_organizer_access
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous update (when organizer changes PIN)
CREATE POLICY "Allow anonymous update for changing PIN"
ON society_organizer_access
FOR UPDATE
TO anon
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_society_organizer_access_organizer ON society_organizer_access(organizer_id);
CREATE INDEX IF NOT EXISTS idx_society_organizer_access_pin ON society_organizer_access(organizer_id, access_pin);

-- Function to verify PIN for specific organizer
CREATE OR REPLACE FUNCTION verify_society_organizer_pin(org_id TEXT, input_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM society_organizer_access
        WHERE organizer_id = org_id AND access_pin = input_pin
    );
END;
$$;

-- Function to check if organizer has PIN set
CREATE OR REPLACE FUNCTION organizer_has_pin(org_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM society_organizer_access
        WHERE organizer_id = org_id
    );
END;
$$;

-- Function to set/update organizer PIN
CREATE OR REPLACE FUNCTION set_organizer_pin(org_id TEXT, new_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO society_organizer_access (organizer_id, access_pin)
    VALUES (org_id, new_pin)
    ON CONFLICT (organizer_id)
    DO UPDATE SET
        access_pin = new_pin,
        updated_at = NOW();

    RETURN true;
END;
$$;
