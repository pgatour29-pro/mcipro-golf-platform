// MciPro Chat Database Functions - FIXED VERSION
import { getSupabaseClient } from './supabaseClient.js';

export async function openOrCreateDM(targetUserId) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase.rpc('ensure_direct_conversation', {
    partner: targetUserId
  });

  if (error) {
    console.error('[Chat] RPC error:', error);
    throw error;
  }
  if (!data) throw new Error("RPC returned no data");

  // V5 returns either array or object with room_id and room_slug
  const row = Array.isArray(data) ? data[0] : data;
  return row.room_id; // Return just the room_id for compatibility
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

  if (error) {
    console.error('[Chat] Fetch messages error:', error);
    throw error;
  }

  console.log('[Chat] Raw messages from DB:', data);
  return (data || []).map(m => normalizeMessage(m));
}

export function normalizeMessage(m) {
  // ✅ FIXED: Handle both "sender" and "author_id" for compatibility
  const sender_id = m.sender || m.author_id || m.sender_id;

  return {
    id: m.id,
    room_id: m.room_id,
    sender_id: sender_id,
    content: m.content,
    created_at: m.created_at
  };
}

export async function sendMessage(roomId, text) {
  const supabase = await getSupabaseClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();

  if (userErr || !user) {
    console.error('[Chat] Auth error:', userErr);
    throw userErr || new Error('Not authenticated');
  }

  console.log('[Chat] Sending message as user:', user.id);

  const content = (text || '').trim();
  if (!content) return false;

  // ✅ FIXED: Use "sender" to match V5 SQL schema
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      sender: user.id,    // ✅ Changed from author_id to sender
      content: content
    })
    .select()
    .single();

  if (error) {
    console.error('[Chat] Send failed:', error);
    console.error('[Chat] Error details:', JSON.stringify(error, null, 2));
    throw error;
  }

  console.log('[Chat] Message sent successfully:', data);
  return true;
}

export function subscribeToConversation(conversationId, onInsert, onUpdate) {
  let channelRef = null;
  getSupabaseClient().then((supabase) => {
    const channel = supabase.channel(`room:${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `room_id=eq.${conversationId}`
    }, (payload) => {
      console.log('[Chat] New message received:', payload.new);
      onInsert && onInsert(normalizeMessage(payload.new));
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'chat_messages',
      filter: `room_id=eq.${conversationId}`
    }, (payload) => {
      console.log('[Chat] Message updated:', payload.new);
      onUpdate && onUpdate(normalizeMessage(payload.new));
    })
    .subscribe((status) => {
      console.log('[Chat] Subscription status:', status);
    });
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
