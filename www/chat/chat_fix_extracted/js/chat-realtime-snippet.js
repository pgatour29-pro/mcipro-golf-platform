// chat-realtime-snippet.js
// Minimal realtime subscription per room
function subscribeRoom(roomId, onMsg) {
  const channel = supabase.channel(`room:${roomId}`, {
    config: { broadcast: { ack: true }, presence: { key: roomId } }
  });

  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
    (payload) => onMsg?.(payload.new)
  );

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('[Chat] realtime subscribed for room', roomId);
    }
  });

  return () => supabase.removeChannel(channel);
}
