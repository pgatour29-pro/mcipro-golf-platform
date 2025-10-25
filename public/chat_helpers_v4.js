/**
 * mcipro chat helpers v4
 * Minimal client helpers that call the SECURITY DEFINER RPC and wire realtime.
 */

export async function openOrCreateDM(supabase, partnerUuid) {
  const { data, error } = await supabase.rpc('ensure_direct_conversation', { partner: partnerUuid });
  if (error) throw error;
  // RPC returns { room_id, room_slug }
  const row = Array.isArray(data) ? data[0] : data;
  return { room_id: row.room_id, slug: row.room_slug };
}

export async function sendMessage(supabase, roomId, text) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{ room_id: roomId, content: text, author_id: (await supabase.auth.getUser()).data.user.id }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToRoomMessages(supabase, roomId, onMessage) {
  const chan = supabase.channel('room-' + roomId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, (payload) => {
      onMessage(payload.new);
    })
    .subscribe();
  return () => supabase.removeChannel(chan);
}
