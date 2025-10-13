
// mcipro chat client helpers (v3)
// Usage:
//   const { room_id } = await openOrCreateDM(supabase, partnerUuid);
//   await sendMessage(supabase, room_id, "hello");

// Ensure your supabase client is authenticated (session present).

export async function openOrCreateDM(supabase, partnerUuid) {
  if (!partnerUuid) throw new Error("partnerUuid is required");
  const { data, error } = await supabase.rpc('ensure_direct_conversation', { partner: partnerUuid });
  if (error) throw error;
  // data is [{ room_id, slug }]
  if (!data || !data[0]) throw new Error("RPC returned no data");
  return data[0]; // { room_id, slug }
}

export async function sendMessage(supabase, roomId, text) {
  if (!roomId) throw new Error("roomId required");
  if (!text || !text.trim()) throw new Error("empty message");
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) throw new Error("not authenticated");

  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{ room_id: roomId, author_id: uid, content: text.trim() }])
    .select('id, created_at')
    .single();

  if (error) throw error;
  return data;
}

export function subscribeToRoomMessages(supabase, roomId, cb) {
  // Realtime channel on table chat_messages, filtered by room_id
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      (payload) => cb?.(payload.new)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
