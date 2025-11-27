-- This script corrects the society name for the TRGG organizer ID.
UPDATE society_profiles
SET society_name = 'Travellers Rest Golf Group'
WHERE organizer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873' AND society_name = 'JOA Golf Pattaya';
