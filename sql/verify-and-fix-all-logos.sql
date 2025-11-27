-- Verify current state
SELECT id, organizer_id, society_name, society_logo FROM society_profiles ORDER BY society_name;

-- Fix all 3 society logos
UPDATE society_profiles SET society_logo = './societylogos/trgg.jpg' WHERE organizer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873' AND society_name = 'Travellers Rest Golf Group';
UPDATE society_profiles SET society_logo = './societylogos/JOAgolf.jpeg' WHERE organizer_id = 'JOAGOLFPAT' AND society_name = 'JOA Golf Pattaya';
UPDATE society_profiles SET society_logo = './societylogos/oraora.png' WHERE organizer_id = 'ora-ora-golf' AND society_name = 'Ora Ora Golf';

-- Verify the fix
SELECT id, organizer_id, society_name, society_logo FROM society_profiles ORDER BY society_name;
