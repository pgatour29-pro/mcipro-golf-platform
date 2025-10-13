// chat_helpers_v5.js
// Minimal client binder for the new RPC and message helpers.

export async function openOrCreateDM(supabase, partnerUuid) {
  const { data, error } = await supabase.rpc('ensure_direct_conversation', { partner: partnerUuid });
  if (error) throw error;
  // returns [{ room_id, room_slug }]
  const row = Array.isArray(data) ? data[0] : data;
  return row;
}

export async function sendMessage(supabase, roomId, content) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ room_id: roomId, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToRoomMessages(supabase, roomId, onMessage) {
  // Realtime on chat_messages for this room
  const channel = supabase
    .channel(`room:${roomId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, payload => {
      onMessage?.(payload.new);
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}