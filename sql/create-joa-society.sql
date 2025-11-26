-- Create JOA Golf Pattaya Society Profile
-- Run this SQL in Supabase SQL Editor

-- Insert JOA Golf Pattaya society profile
INSERT INTO society_profiles (organizer_id, society_name, society_logo, description)
VALUES (
    'JOAGOLFPAT',
    'JOA Golf Pattaya',
    './societylogos/JOAgolf.jpeg',
    'JOA Golf Pattaya Society - Weekly tournaments and events in the Pattaya area'
)
ON CONFLICT (organizer_id) DO UPDATE SET
    society_name = EXCLUDED.society_name,
    society_logo = EXCLUDED.society_logo,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Verify the insert
SELECT * FROM society_profiles WHERE organizer_id = 'JOAGOLFPAT';
