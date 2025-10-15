-- =====================================================================
-- STEP 1: Get Pete and Donald's actual UUIDs from auth.users
-- =====================================================================

-- See all current auth users
SELECT
  id,
  email,
  created_at,
  COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'displayName', email) AS display_name
FROM auth.users
ORDER BY created_at DESC;

-- If using LINE login, pull display names from identities
SELECT
  u.id,
  i.provider,
  COALESCE(i.identity_data->>'name', i.identity_data->>'displayName') AS line_name,
  i.identity_data->>'picture' AS line_picture,
  u.created_at
FROM auth.users u
JOIN auth.identities i ON i.user_id = u.id
WHERE i.provider = 'line'
ORDER BY u.created_at DESC;

-- =====================================================================
-- COPY THE UUIDs FROM ABOVE
-- Then go to STEP_2_CREATE_PROFILES.sql and paste them there
-- =====================================================================
