-- Society Organizer PIN Authentication
-- This table stores the access PIN for society organizer features

CREATE TABLE IF NOT EXISTS society_organizer_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    access_pin TEXT NOT NULL,
    description TEXT DEFAULT 'Society Organizer Access PIN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default PIN (change this in production!)
INSERT INTO society_organizer_access (access_pin, description)
VALUES ('1234', 'Default Society Organizer PIN - Please change this!')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE society_organizer_access ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (PIN verification)
CREATE POLICY "Allow anonymous read for PIN verification"
ON society_organizer_access
FOR SELECT
TO anon
USING (true);

-- Allow authenticated users to update PIN (for admin features later)
CREATE POLICY "Allow authenticated users to update PIN"
ON society_organizer_access
FOR UPDATE
TO authenticated
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_society_organizer_access_pin ON society_organizer_access(access_pin);

-- Function to verify PIN
CREATE OR REPLACE FUNCTION verify_society_organizer_pin(input_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM society_organizer_access
        WHERE access_pin = input_pin
    );
END;
$$;
