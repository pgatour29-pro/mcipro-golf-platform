// Database helpers (Supabase JS v2)
import { getSupabaseClient } from './supabaseClient.js';

export async function ensureDirectConversation(otherUserId) {
  const supabase = await getSupabaseClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) throw new Error('Not authenticated');
  const { data, error } = await supabase.rpc('ensure_direct_conversation', { partner: otherUserId });
  if (error) throw error;
  return data; // conversation_id
}

export async function listConversations() {
  const supabase = await getSupabaseClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) throw new Error('Not authenticated');

  // Production schema: simple conversations table
  const { data, error } = await supabase
    .from('conversations')
    .select('id, created_by, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchMessages(conversationId, limit = 50, before) {
  const supabase = await getSupabaseClient();
  let q = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (before) q = q.lt('created_at', before);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(m => normalizeMessage(m));
}

export function normalizeMessage(m) {
  return {
    id: m.id,
    conversation_id: m.conversation_id,
    sender_id: m.sender_id,
    body: m.body,
    created_at: m.created_at,
    type: 'text' // Production schema is text-only
  };
}

export async function sendMessage(conversationId, body, type = 'text', metadata = {}) {
  const supabase = await getSupabaseClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) throw new Error('Not authenticated');

  // Use RPC instead of direct insert (RLS blocks direct inserts)
  const { data: msgId, error } = await supabase.rpc('send_message', {
    p_conversation_id: conversationId,
    p_body: body
  });
  if (error) throw error;

  // Return normalized message structure (fetch the message we just created)
  const { data: msg } = await supabase
    .from('messages')
    .select('*')
    .eq('id', msgId)
    .single();

  return msg ? normalizeMessage(msg) : { id: msgId };
}

export function subscribeToConversation(conversationId, onInsert, onUpdate) {
  let channelRef = null;
  getSupabaseClient().then((supabase) => {
    const channel = supabase.channel(`msg:${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
      onInsert && onInsert(normalizeMessage(payload.new));
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
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
