// DEBUG HELPER - Paste this into browser console to test event creation directly
// Run: __debugCreateGolferEvent()

async function __debugCreateGolferEvent() {
  try {
    console.log('[DEBUG] Running __debugCreateGolferEvent');

    // Check if Supabase client exists
    if (!window.SupabaseDB || !window.SupabaseDB.client) {
      console.error('[DEBUG] Supabase client not found! Check if SupabaseDB is initialized.');
      return;
    }

    const supabase = window.SupabaseDB.client;

    // Get current user from AppState
    const user = AppState.currentUser;
    if (!user || !user.lineUserId) {
      console.error('[DEBUG] No current user - check AppState.currentUser');
      console.log('[DEBUG] AppState:', AppState);
      return;
    }

    console.log('[DEBUG] Current user:', user);

    // Hard-coded test event
    const payload = {
      title: 'Debug Test Event ' + new Date().toISOString(),
      course_name: 'Pattavia',
      event_date: '2025-11-28',
      start_time: '09:50',
      format: 'stableford',
      entry_fee: 1200,
      max_participants: 4,
      is_private: false,
      creator_type: 'golfer',
      creator_id: user.lineUserId,
      // IMPORTANT: NO status, NO base_fee
    };

    console.log('[DEBUG] About to insert payload:', payload);

    const { data, error } = await supabase
      .from('society_events')
      .insert([payload])
      .select('*');

    console.log('[DEBUG] Supabase insert result:', { data, error });

    if (error) {
      console.error('[DEBUG] Insert failed:', error);
      console.error('[DEBUG] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    } else {
      console.log('[DEBUG] ✅ Insert succeeded, created row:', data);
    }
  } catch (err) {
    console.error('[DEBUG] __debugCreateGolferEvent crashed:', err);
  }
}

console.log('[DEBUG] Helper loaded. Run: __debugCreateGolferEvent()');
