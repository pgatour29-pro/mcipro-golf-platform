// MciPro Chat Database Functions - Fix Pack Version (uses RPC)
import { getSupabaseClient } from './supabaseClient.js';

export async function openOrCreateDM(targetUserId) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase.rpc('ensure_direct_conversation', {
    other_user: targetUserId
  });

  if (error) throw error;
  return data; // room_id (uuid)
}

export async function listRooms() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('rooms')
    .select('id, kind, slug, created_at')
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
    content: m.body, // Map body to content for compatibility
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
    .insert({ room_id: roomId, sender_id: user.id, body: content });

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
  return Promise.resolve();
}

export async function typing(conversationId) {
  return Promise.resolve();
}

export function subscribeTyping(conversationId, cb) {
  return { get channel() { return null; } };
}

export async function uploadMediaAndSend(conversationId, file) {
  throw new Error('Media uploads not supported');
}

export function inferTypeFromMime(mime) {
  return 'file';
}

export async function getSignedMediaUrl(conversationId, bucket, object_path) {
  throw new Error('Media not supported');
}
