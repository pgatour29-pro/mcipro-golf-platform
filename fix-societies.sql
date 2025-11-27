-- Check what societies exist and their organizer_ids
SELECT id, organizer_id, society_name, society_logo, created_at 
FROM society_profiles 
ORDER BY society_name;
