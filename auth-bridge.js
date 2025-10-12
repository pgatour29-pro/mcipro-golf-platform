// LINE → Supabase Auth Bridge
// Automatically creates anonymous Supabase session and links it to LINE user ID

import { getSupabaseClient } from './supabaseClient.js';

/**
 * Ensures a Supabase session exists for the current LINE user
 * Creates an anonymous session if needed and links it to the LINE user ID
 *
 * @returns {Promise<{supaUser: Object, lineUserId: string, lineProfile: Object} | null>}
 */
export async function ensureSupabaseSessionWithLIFF() {
  const supabase = await getSupabaseClient();

  // 1) Check if LIFF is initialized and user is logged in
  if (!window.liff || !window.liff.isLoggedIn()) {
    console.warn('[Auth Bridge] LIFF not logged in yet');
    return null;
  }

  // 2) Get LINE profile
  const lineProfile = await window.liff.getProfile();
  const lineUserId = lineProfile.userId; // e.g., "U9e64d5456b0..."

  console.log('[Auth Bridge] LINE user:', lineUserId);

  // 3) Check if there's already a Supabase session
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

  // 4) Upsert profile linking Supabase UUID → LINE user ID
  const profilePayload = {
    id: supaUser.id,
    line_user_id: lineUserId,
    display_name: lineProfile.displayName ?? 'Golfer',
    username: lineProfile.displayName ?? lineUserId.slice(0, 8),
    avatar_url: lineProfile.pictureUrl ?? null
  };

  console.log('[Auth Bridge] Upserting profile:', profilePayload);

  const { error: upsertErr } = await supabase
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' });

  if (upsertErr) {
    console.error('[Auth Bridge] Profile upsert failed:', upsertErr);
    // Not fatal - chat can still work for reading
  } else {
    console.log('[Auth Bridge] ✅ Profile linked: Supabase UUID', supaUser.id, '→ LINE', lineUserId);
  }

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
