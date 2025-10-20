// LINE → Supabase Auth Bridge
// Automatically creates anonymous Supabase session and links it to LINE user ID
// FORCE DEPLOY: 2025-10-20T16:30:00Z

import { getSupabaseClient } from './supabaseClient.js';

/**
 * Ensures a Supabase session exists for the current LINE user
 * Creates an anonymous session if needed and links it to the LINE user ID
 * Supports both OAuth and LIFF authentication methods
 *
 * @returns {Promise<{supaUser: Object, lineUserId: string, lineProfile: Object} | null>}
 */
export async function ensureSupabaseSessionWithLIFF() {
  console.warn('🚨🚨🚨 [AUTH-BRIDGE-V2] FUNCTION STARTED 🚨🚨🚨');

  const supabase = await getSupabaseClient();
  console.warn('🔧 [AUTH-BRIDGE-V2] Got Supabase client');

  let lineProfile = null;
  let lineUserId = null;

  // 1) Check if there's already a Supabase session (from OAuth or previous login)
  console.warn('🔍 [AUTH-BRIDGE-V2] Checking Supabase session...');
  const { data: sessionData } = await supabase.auth.getSession();
  console.warn('🔍 [AUTH-BRIDGE-V2] Session data:', sessionData);
  console.warn('🔍 [AUTH-BRIDGE-V2] Session user ID:', sessionData?.session?.user?.id);

  if (sessionData?.session?.user) {
    // User has a Supabase session - get their profile from database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sessionData.session.user.id)
      .single();

    if (profile && profile.line_user_id) {
      console.log('[Auth Bridge] Found profile with LINE ID from Supabase session');
      lineUserId = profile.line_user_id;
      lineProfile = {
        userId: profile.line_user_id,
        displayName: profile.display_name || profile.username || 'Golfer',
        pictureUrl: profile.avatar_url || null
      };
    }
  }

  // 2) Try AppState if Supabase session check didn't work
  if (!lineUserId) {
    const oauthUser = window.AppState?.currentUser;
    console.log('[Auth Bridge] AppState.currentUser:', oauthUser);

    if (oauthUser) {
      // Try different possible field names for LINE user ID
      lineUserId = oauthUser.lineUserId || oauthUser.userId || oauthUser.lineId;
      console.log('[Auth Bridge] Extracted LINE user ID:', lineUserId);

      if (lineUserId) {
        console.log('[Auth Bridge] Found OAuth LINE user:', lineUserId);
        lineProfile = {
          userId: lineUserId,
          displayName: oauthUser.name || oauthUser.username || 'Golfer',
          pictureUrl: oauthUser.avatar || null
        };
      }
    }
  }
  // 3) Try LIFF if still no authentication found
  if (!lineUserId && window.liff) {
    try {
      if (window.liff.isLoggedIn()) {
        console.log('[Auth Bridge] Using LIFF authentication');
        lineProfile = await window.liff.getProfile();
        lineUserId = lineProfile.userId;
      } else {
        console.warn('[Auth Bridge] LIFF not logged in');
      }
    } catch (error) {
      console.warn('[Auth Bridge] LIFF error:', error.message);
    }
  }

  // 4) If no authentication method available, return null
  if (!lineUserId || !lineProfile) {
    console.warn('[Auth Bridge] No LINE authentication found (tried Supabase session, AppState, and LIFF)');
    return null;
  }

  console.log('[Auth Bridge] ✅ LINE user authenticated:', lineUserId);

  // 5) Check if we need to create/link a Supabase session
  let { data: userResp } = await supabase.auth.getUser();

  if (!userResp?.user) {
    // No session exists - create anonymous session
    console.log('[Auth Bridge] No Supabase session found, creating anonymous session...');

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error('[Auth Bridge] Anonymous sign-in failed:', error);
      alert('Unable to start secure session. Please retry.');
      return null;
    }

    // Get the user object from the new session
    ({ data: userResp } = await supabase.auth.getUser());
    console.log('[Auth Bridge] ✅ Anonymous session created:', userResp.user.id);
  } else {
    console.log('[Auth Bridge] ✅ Existing Supabase session found:', userResp.user.id);
  }

  const supaUser = userResp.user;

  // 4) Upsert profile linking Supabase UUID → LINE user ID (improved error handling)
  const safeUserName = (lineProfile.displayName || 'golfer')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `golfer-${lineUserId.slice(-6)}`;

  const profilePayload = {
    id: supaUser.id,
    line_user_id: lineUserId,
    display_name: lineProfile.displayName || safeUserName,
    username: safeUserName,
    avatar_url: lineProfile.pictureUrl || null
  };

  console.log('[Auth Bridge] Upserting profile:', profilePayload);

  // Try update by line_user_id first (stable key)
  const { data: byLine, error: byLineErr } = await supabase
    .from('profiles')
    .update(profilePayload)
    .eq('line_user_id', lineUserId)
    .select('id')
    .maybeSingle();

  if (!byLine && byLineErr) console.warn('[Auth Bridge] update-by-line failed', byLineErr);

  if (!byLine) {
    // Insert or merge on conflict(line_user_id)
    const { error: insertErr } = await supabase
      .from('profiles')
      .insert(profilePayload)
      .onConflict('line_user_id')
      .merge();

    if (insertErr) {
      if (insertErr.code === '23505') {
        // Duplicate key error - retry with random suffix on username
        const rescue = { ...profilePayload, username: `${safeUserName}-${Math.random().toString(36).slice(2,7)}` };
        const { error: second } = await supabase
          .from('profiles')
          .insert(rescue)
          .onConflict('line_user_id')
          .merge();
        if (second) console.error('[Auth Bridge] profile upsert failed twice:', second);
      } else {
        console.error('[Auth Bridge] profile upsert failed:', insertErr);
      }
    }
  }

  console.log('[Auth Bridge] ✅ Profile linked: Supabase UUID', supaUser.id, '→ LINE', lineUserId);

  return { supaUser, lineUserId, lineProfile };
}

/**
 * Get the LINE user ID for a given Supabase user ID
 * Useful for displaying LINE profile info in chat
 *
 * @param {string} supabaseUserId - The Supabase Auth UUID
 * @returns {Promise<string | null>} - The LINE user ID or null if not found
 */
export async function getLineUserIdFromSupabase(supabaseUserId) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('line_user_id')
    .eq('id', supabaseUserId)
    .single();

  if (error || !data) {
    console.warn('[Auth Bridge] Could not find LINE user ID for', supabaseUserId);
    return null;
  }

  return data.line_user_id;
}

/**
 * Get the Supabase user ID for a given LINE user ID
 * Useful for initiating conversations with LINE users
 *
 * @param {string} lineUserId - The LINE user ID
 * @returns {Promise<string | null>} - The Supabase Auth UUID or null if not found
 */
export async function getSupabaseUserIdFromLine(lineUserId) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('line_user_id', lineUserId)
    .single();

  if (error || !data) {
    console.warn('[Auth Bridge] Could not find Supabase user for LINE ID', lineUserId);
    return null;
  }

  return data.id;
}
