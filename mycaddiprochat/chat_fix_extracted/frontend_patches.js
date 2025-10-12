// Frontend patches: show errors and use RPC correctly

export async function sendMessage(supabase, conversationId, text, userId) {
  const { data, error } = await supabase
    .from('messages')
    .insert([{ conversation_id: conversationId, user_id: userId, body: text }])
    .select()
    .single();

  if (error) {
    console.error('[Chat] Send failed:', error);
    alert(`Send failed: ${error.message || 'Unknown error'}`);
    return null;
  }
  return data;
}

export async function openDirectChat(supabase, otherUserId) {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    console.error('[Chat] No Supabase user:', userErr);
    alert('Not authenticated to chat.');
    return null;
  }
  const me = userData.user;

  const { data, error } = await supabase
    .rpc('ensure_direct_conversation', {
      p_user_id: me.id,
      p_other_user_id: otherUserId
    });

  if (error) {
    console.error('[Chat] ensure_direct_conversation error:', error);
    alert(`Chat open failed: ${error.message}`);
    return null;
  }
  return data; // conversation_id
}
