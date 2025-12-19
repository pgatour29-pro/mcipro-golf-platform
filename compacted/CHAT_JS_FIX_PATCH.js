// =====================================================================
// CHAT JAVASCRIPT FIX - Manual patch for chat-system-full.js
// =====================================================================
// Apply this fix to C:/Users/pete/Documents/MciPro/www/chat/chat-system-full.js
//
// LOCATION: Lines 1128-1173
// =====================================================================

// BEFORE (BROKEN - queries non-existent user_profiles table):
/*
    // Load ALL REAL users from user_profiles table
    supabase
      .from('user_profiles')
      .select('line_user_id, name, caddy_number')
      .neq('line_user_id', user.id)
      .order('name')
  ]);

  const { data: userRooms, error: roomsError} = roomsResult;
  const { data: allUsers, error: usersError } = usersResult;

  if (roomsError) {
    console.error('[Chat] ❌ Failed to load rooms:', roomsError);
  }

  if (usersError) {
    console.error('[Chat] ❌ Failed to load contacts:', usersError);
    sidebar.innerHTML = '<div style="padding: 2rem; text-align: center; color: #ef4444;">❌ Failed to load contacts</div>';
    return;
  }

  // Transform user_profiles format to expected format with Supabase auth UUIDs
  let transformedUsers = [];
  try {
    const lineIds = (allUsers || []).map(u => u.line_user_id).filter(Boolean);
    let idMap = new Map();
    if (lineIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, line_user_id')
        .in('line_user_id', lineIds);
      if (Array.isArray(profs)) {
        idMap = new Map(profs.map(p => [p.line_user_id, p.id]));
      }
    }
    transformedUsers = (allUsers || [])
      .map(u => ({
        id: idMap.get(u.line_user_id),
        display_name: u.name || `Caddy ${u.caddy_number || 'User'}`,
        username: u.caddy_number ? `${u.caddy_number}` : u.line_user_id
      }))
      .filter(u => !!u.id);
  } catch (e) {
    console.warn('[Chat] Failed to map profiles to Supabase IDs:', e);
    transformedUsers = [];
  }

  // Store in state for search functionality and caching
  state.users = transformedUsers;
*/

// AFTER (FIXED - queries profiles table directly):

    // Load ALL REAL users from profiles table (FIXED: was user_profiles)
    supabase
      .from('profiles')
      .select('id, display_name, username, line_user_id')
      .neq('id', user.id)
      .order('display_name')
  ]);

  const { data: userRooms, error: roomsError} = roomsResult;
  const { data: allUsers, error: usersError } = usersResult;

  if (roomsError) {
    console.error('[Chat] ❌ Failed to load rooms:', roomsError);
  }

  if (usersError) {
    console.error('[Chat] ❌ Failed to load contacts:', usersError);
    console.error('[Chat] Error details:', usersError);
    sidebar.innerHTML = '<div style="padding: 2rem; text-align: center; color: #ef4444;">❌ Failed to load contacts<br><small>Error: ' + (usersError.message || 'Unknown') + '</small></div>';
    return;
  }

  // Users are already in correct format from profiles table (no transformation needed)
  const transformedUsers = (allUsers || [])
    .filter(u => !!u.id && !!u.line_user_id)  // Only include valid profiles
    .map(u => ({
      id: u.id,
      display_name: u.display_name || u.username || 'User',
      username: u.username || u.line_user_id,
      line_user_id: u.line_user_id
    }));

  console.log('[Chat] Loaded', transformedUsers.length, 'contacts from profiles table');

  // Store in state for search functionality and caching
  state.users = transformedUsers;

// =====================================================================
// WHY THIS FIX IS NEEDED:
// =====================================================================
//
// 1. Original code queries 'user_profiles' table which doesn't exist
// 2. Then does a second query to 'profiles' to map LINE IDs to Supabase UUIDs
// 3. This causes "relation does not exist" error and chat fails to load
//
// SOLUTION:
// - Query 'profiles' table directly (it has both Supabase UUID and LINE ID)
// - No need for transformation/mapping - data is already in correct format
// - Faster (1 query instead of 2) and more reliable
//
// =====================================================================
// DEPLOYMENT:
// =====================================================================
//
// 1. Run FIX_CHAT_LOADING_ISSUES.sql in Supabase first
// 2. Apply this code change to www/chat/chat-system-full.js
// 3. Deploy updated JS file to production
// 4. Clear browser cache or bump version parameter
//
// =====================================================================
