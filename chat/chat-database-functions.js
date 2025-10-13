// MciPro Chat Database Functions - FIXED VERSION
import { getSupabaseClient } from './supabaseClient.js';

export async function openOrCreateDM(targetUserId) {
  const supabase = await getSupabaseClient();

  // Get current user ID
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    console.error('[Chat] Not authenticated:', userErr);
    throw userErr || new Error('Not authenticated');
  }

  console.log('[Chat] Opening DM:', user.id, '→', targetUserId);

  // Call RPC with explicit user IDs
  const { data, error } = await supabase.rpc('ensure_direct_conversation', {
    me: user.id,
    partner: targetUserId
  });

  if (error) {
    console.error('[Chat] RPC error:', error);
    console.error('[Chat] Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
  if (!data) throw new Error("RPC returned no data");

  console.log('[Chat] RPC success:', data);

  // V5 returns either array or object with output_room_id and output_room_slug
  const row = Array.isArray(data) ? data[0] : data;
  return row.output_room_id || row.room_id; // Handle both old and new parameter names
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

export async function subscribeToConversation(conversationId, onInsert, onUpdate) {
  // CRITICAL FIX: Always wait for Supabase client to be ready
  const supabase = await getSupabaseClient();

  console.log('[Chat] Setting up subscription for room:', conversationId);

  const channel = supabase.channel(`room:${conversationId}`, {
    config: {
      broadcast: { self: false },
      presence: { key: '' }
    }
  })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `room_id=eq.${conversationId}`
    }, (payload) => {
      console.log('[Chat] Real-time INSERT:', payload.new.id);
      onInsert && onInsert(normalizeMessage(payload.new));
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'chat_messages',
      filter: `room_id=eq.${conversationId}`
    }, (payload) => {
      console.log('[Chat] Real-time UPDATE:', payload.new.id);
      onUpdate && onUpdate(normalizeMessage(payload.new));
    });

  // CRITICAL FIX: Subscribe and wait for ready state with callback
  channel.subscribe((status, err) => {
    if (status === 'SUBSCRIBED') {
      console.log('[Chat] ✅ Subscribed to room:', conversationId);
    }
    if (status === 'CHANNEL_ERROR') {
      console.error('[Chat] ❌ Subscription error:', err);
    }
    if (status === 'TIMED_OUT') {
      console.error('[Chat] ❌ Subscription timed out');
    }
  });

  return channel;
}

export async function markRead(conversationId) {
  return Promise.resolve();
}

export async function typing(conversationId) {
  return Promise.resolve();
}

export async function subscribeTyping(conversationId, cb) {
  // Typing events not implemented yet, return empty channel
  const supabase = await getSupabaseClient();
  const channel = supabase.channel(`typing:${conversationId}`);
  channel.subscribe();
  return channel;
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
