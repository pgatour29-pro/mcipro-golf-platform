// chat-system-full.patch.js
// Drop-in helpers to replace broken RPC calls.
// Assumes: const supabase = window.SupabaseDB.client;

async function openOrCreateDM(targetUserId) {
  const meRes = await supabase.auth.getUser();
  if (meRes.error || !meRes.data?.user) throw meRes.error || new Error('Not authenticated');
  const me = meRes.data.user;

  const ids = [me.id, targetUserId].sort();
  const slug = `dm:${ids[0]}:${ids[1]}`;

  // 1) find/create the room
  let { data: room, error: roomErr } = await supabase
    .from('rooms')
    .select('id, kind, slug')
    .eq('slug', slug)
    .single();

  if (roomErr && roomErr.code === 'PGRST116') {
    const insertRes = await supabase
      .from('rooms')
      .insert({ kind: 'dm', slug })
      .select('id, kind, slug')
      .single();
    if (insertRes.error) throw insertRes.error;
    room = insertRes.data;
  } else if (roomErr) {
    throw roomErr;
  }

  // 2) ensure participants
  await supabase
    .from('conversation_participants')
    .insert({ room_id: room.id, participant_id: me.id })
    .onConflict('room_id,participant_id')
    .ignore();

  await supabase
    .from('conversation_participants')
    .insert({ room_id: room.id, participant_id: targetUserId })
    .onConflict('room_id,participant_id')
    .ignore();

  return room.id;
}

async function sendMessage(roomId, text) {
  const meRes = await supabase.auth.getUser();
  if (meRes.error || !meRes.data?.user) throw meRes.error || new Error('Not authenticated');
  const me = meRes.data.user;

  const content = (text || '').trim();
  if (!content) return false;

  const { error } = await supabase
    .from('chat_messages')
    .insert({ room_id: roomId, sender_id: me.id, content });

  if (error) {
    console.error('[Chat] send failed:', error);
    if (window.showToast) window.showToast('Could not send message', 'error');
    return false;
  }
  return true;
}
