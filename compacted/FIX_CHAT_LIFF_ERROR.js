// =====================================================================
// FIX CHAT LIFF INITIALIZATION ERROR
// =====================================================================
// Replace the ensureSupabaseSessionWithLIFF function in auth-bridge.js
// File: www/chat/auth-bridge.js (around line 12)

export async function ensureSupabaseSessionWithLIFF() {
  const supabase = await getSupabaseClient();

  // 1) Check if LIFF exists and is initialized (FIXED)
  try {
    // Check if LIFF SDK is loaded
    if (!window.liff) {
      console.warn('[Auth Bridge] LIFF SDK not loaded');
      return null;
    }

    // Try to check if logged in (may throw if not initialized)
    if (!window.liff.isLoggedIn()) {
      console.warn('[Auth Bridge] LIFF not logged in yet');
      return null;
    }
  } catch (error) {
    // LIFF not initialized or other error
    console.warn('[Auth Bridge] LIFF check failed:', error.message);
    return null;
  }

  // 2) Get LINE profile
  let lineProfile, lineUserId;
  try {
    lineProfile = await window.liff.getProfile();
    lineUserId = lineProfile.userId;
    console.log('[Auth Bridge] LINE user:', lineUserId);
  } catch (error) {
    console.error('[Auth Bridge] Failed to get LINE profile:', error);
    return null;
  }

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

  // Rest of the function continues as before...
  return {
    supaUser,
    lineUserId,
    lineProfile
  };
}

// =====================================================================
// ALTERNATIVE: Simpler fix - just wrap in try-catch
// =====================================================================
// If you don't want to replace the whole function, just change line 16 from:
//   if (!window.liff || !window.liff.isLoggedIn()) {
//
// TO:
//   if (!window.liff) {
//     console.warn('[Auth Bridge] LIFF SDK not loaded');
//     return null;
//   }
//
//   try {
//     if (!window.liff.isLoggedIn()) {
//       console.warn('[Auth Bridge] LIFF not logged in yet');
//       return null;
//     }
//   } catch (error) {
//     console.warn('[Auth Bridge] LIFF not initialized:', error.message);
//     return null;
//   }
