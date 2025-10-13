
// MciPro Chat: JS Patch for stable DM creation + message sending
// Requires supabase client as `supabase` and your existing subscribe/load functions.

async function getProfileByUsernameOrLine({ username, lineUserId }) {
  if (username) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data.id;
  }
  if (lineUserId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('line_user_id', lineUserId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data.id;
  }
  return null;
}

async function openOrCreateDM({ otherUsername, otherLineUserId }) {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess || !sess.session || !sess.session.user) {
    throw new Error('Not authenticated');
  }

  const otherId = await getProfileByUsernameOrLine({
    username: otherUsername,
    lineUserId: otherLineUserId
  });

  if (!otherId) {
    throw new Error('Target user not found (profiles)');
  }

  const { data, error } = await supabase.rpc('ensure_direct_conversation', {
    other_user: otherId
  });

  if (error) throw error;
  return data; // room_id (uuid)
}

async function sendMessage(roomId, text) {
  const { data: sess } = await supabase.auth.getSession();
  const sender = sess?.session?.user?.id;
  if (!sender) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('chat_messages')
    .insert([{ room_id: roomId, sender_id: sender, body: text }]);
  if (error) throw error;
}

// Example handler hookup (replace your placeholder id usage)
function wireUserListItem(li) {
  li.onclick = async () => {
    try {
      const roomId = await openOrCreateDM({
        otherUsername: li.dataset.username || null,
        otherLineUserId: li.dataset.lineUserId || null
      });
      await subscribeRoom(roomId);
      await loadMessages(roomId);
    } catch (e) {
      console.error('[Chat] Failed to create/open DM:', e);
      alert(`Chat error: ${e.message || e}`);
    }
  };
}
