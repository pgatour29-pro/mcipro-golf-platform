// auth-bridge.patch.js
// Replace your profile upsert block with this safe linkage.
// Assumes you already have: const supabase = window.SupabaseDB.client;

async function linkProfileToLine(lineUser) {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) throw userErr || new Error('Not authenticated');
  const supaUser = userData.user;

  const safeUserName =
    (lineUser?.displayName || 'golfer')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `golfer-${(lineUser?.userId || '').slice(-6)}`;

  const payload = {
    id: supaUser.id,
    line_user_id: lineUser.userId,
    display_name: lineUser.displayName || safeUserName,
    username: safeUserName,
    avatar_url: lineUser.pictureUrl || null
  };

  // Try update by line_user_id first (stable key)
  const { data: byLine, error: byLineErr } = await supabase
    .from('profiles')
    .update(payload)
    .eq('line_user_id', lineUser.userId)
    .select('id')
    .maybeSingle();

  if (!byLine && byLineErr) console.warn('[Auth Bridge] update-by-line failed', byLineErr);

  if (!byLine) {
    // Insert or merge on conflict(line_user_id)
    const { error: insertErr } = await supabase
      .from('profiles')
      .insert(payload)
      .onConflict('line_user_id')
      .merge();

    if (insertErr) {
      if (insertErr.code === '23505') {
        const rescue = { ...payload, username: `${safeUserName}-${Math.random().toString(36).slice(2,7)}` };
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

  console.log('[Auth Bridge] ✅ Profile linked:', supaUser.id, '→ LINE', lineUser.userId);
}
