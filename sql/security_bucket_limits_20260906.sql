-- SECURITY (2026-09-06), checklist #13: four public buckets had NO size limit and NO MIME allow-list, so any
-- signed-in user could park a file of any type/size in them. Limits chosen from what each bucket actually holds:
--   caddy_photos            28 objects, image/jpeg, max 3.4 MB
--   hole-layouts            55 objects, png/webp (+ octet-stream from older uploads), max 11.6 MB
--   course_conditions_photos / scorecards_photos: empty today
-- Generous ceilings — this stops "anything goes", it does not change any working upload.
-- Run: npx supabase db query --linked -f sql/security_bucket_limits_20260906.sql

update storage.buckets set file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic']
 where id in ('caddy_photos','course_conditions_photos','scorecards_photos');

update storage.buckets set file_size_limit = 20971520,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/svg+xml','application/octet-stream']
 where id = 'hole-layouts';

select id, public, file_size_limit, coalesce(array_length(allowed_mime_types,1),0) as mime_rules
  from storage.buckets order by id;
