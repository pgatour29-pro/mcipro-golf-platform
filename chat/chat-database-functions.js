// Database helpers (Chat Fix Kit - Direct inserts, no RPCs)
import { getSupabaseClient } from './supabaseClient.js';

export async function openOrCreateDM(targetUserId) {
  const supabase = await getSupabaseClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw userErr || new Error('Not authenticated');

  const ids = [user.id, targetUserId].sort();
  const slug = `dm:${ids[0]}:${ids[1]}`;

  // Find or create room
  let { data: room, error: roomErr } = await supabase
    .from('rooms')
    .select('id, kind, slug')
    .eq('slug', slug)
    .single();

  if (roomErr && roomErr.code === 'PGRST116') {
    // Room doesn't exist, create it
    const { data: newRoom, error: insertErr } = await supabase
      .from('rooms')
      .insert({ kind: 'dm', slug })
      .select('id, kind, slug')
      .single();
    if (insertErr) throw insertErr;
    room = newRoom;
  } else if (roomErr) {
    throw roomErr;
  }

  // Ensure both participants
  await supabase
    .from('conversation_participants')
    .insert({ room_id: room.id, participant_id: user.id })
    .onConflict('room_id,participant_id')
    .ignore();

  await supabase
    .from('conversation_participants')
    .insert({ room_id: room.id, participant_id: targetUserId })
    .onConflict('room_id,participant_id')
    .ignore();

  return room.id;
}

export async function listRooms() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('rooms')
    .select('id, kind, slug, title, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchMessages(roomId, limit = 50) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(m => normalizeMessage(m));
}

export function normalizeMessage(m) {
  return {
    id: m.id,
    room_id: m.room_id,
    sender_id: m.sender_id,
    content: m.content,
    created_at: m.created_at
  };
}

export async function sendMessage(roomId, text) {
  const supabase = await getSupabaseClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw userErr || new Error('Not authenticated');

  const content = (text || '').trim();
  if (!content) return false;

  const { error } = await supabase
    .from('chat_messages')
    .insert({ room_id: roomId, sender_id: user.id, content });

  if (error) {
    console.error('[Chat] send failed:', error);
    throw error;
  }
  return true;
}

export function subscribeToConversation(conversationId, onInsert, onUpdate) {
  let channelRef = null;
  getSupabaseClient().then((supabase) => {
    const channel = supabase.channel(`msg:${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${conversationId}` }, (payload) => {
      onInsert && onInsert(normalizeMessage(payload.new));
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${conversationId}` }, (payload) => {
      onUpdate && onUpdate(normalizeMessage(payload.new));
    })
    .subscribe();
    channelRef = channel;
  });
  return { get channel() { return channelRef; } };
}

export async function markRead(conversationId) {
  // Production schema doesn't have read_cursors/receipts - stub for now
  return Promise.resolve();
}

export async function typing(conversationId) {
  // Production schema doesn't have typing_events - stub for now
  return Promise.resolve();
}

export function subscribeTyping(conversationId, cb) {
  // Production schema doesn't have typing_events - stub for now
  return { get channel() { return null; } };
}

/** ================== MEDIA (not supported in production schema) ==================
 * Production schema is text-only. Media support can be added later.
 */
export async function uploadMediaAndSend(conversationId, file) {
  throw new Error('Media uploads not supported in production schema');
}

export function inferTypeFromMime(mime) {
  return 'file';
}

export async function getSignedMediaUrl(conversationId, bucket, object_path) {
  throw new Error('Media not supported in production schema');
}
