// Database helpers (Supabase JS v2)
import { supabase } from './supabaseClient.js';

export async function ensureDirectConversation(otherUserId) {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) throw new Error('Not authenticated');
  const { data, error } = await supabase.rpc('ensure_direct_conversation', { a: user.user.id, b: otherUserId });
  if (error) throw error;
  return data; // conversation_id
}

export async function listConversations() {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, is_group, title, avatar_url, last_message_at, updated_at')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchMessages(conversationId, limit = 50, before) {
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
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    senderName: m.sender_name,
    type: m.type,
    body: m.body,
    metadata: m.metadata || {},
    replyTo: m.reply_to,
    createdAt: m.created_at,
    editedAt: m.edited_at,
    deletedAt: m.deleted_at,
    serverState: m.server_state || 'sent',
  };
}

export async function sendMessage(conversationId, body, type = 'text', metadata = {}) {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) throw new Error('Not authenticated');
  const profileId = user.user.id;
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', profileId).single();
  const sender_name = profile?.display_name || null;
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: profileId, sender_name, type, body, metadata })
    .select('*').single();
  if (error) throw error;
  return normalizeMessage(data);
}

export function subscribeToConversation(conversationId, onInsert, onUpdate) {
  const channel = supabase.channel(`msg:${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
      onInsert && onInsert(normalizeMessage(payload.new));
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
      onUpdate && onUpdate(normalizeMessage(payload.new));
    })
    .subscribe();
  return channel;
}

export async function markRead(conversationId) {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) return;
  const now = new Date().toISOString();
  await supabase.from('read_cursors').upsert({ conversation_id: conversationId, user_id: user.user.id, last_read_at: now }, { onConflict: 'conversation_id,user_id' });
  // bulk update their receipts to read
  const { data: ids } = await supabase.from('messages').select('id').eq('conversation_id', conversationId);
  if (ids && ids.length) {
    await supabase.from('message_receipts').update({ read_at: now }).is('read_at', null).eq('user_id', user.user.id).in('message_id', ids.map(x => x.id));
  }
}

export async function typing(conversationId) {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) return;
  await supabase.from('typing_events').insert({ conversation_id: conversationId, user_id: user.user.id, expires_at: new Date(Date.now()+8000).toISOString() });
}

export function subscribeTyping(conversationId, cb) {
  const channel = supabase.channel(`typing:${conversationId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'typing_events', filter: `conversation_id=eq.${conversationId}` }, async () => {
      const { data } = await supabase.from('typing_events').select('user_id, started_at').eq('conversation_id', conversationId).gt('expires_at', new Date().toISOString());
      cb && cb(data || []);
    })
    .subscribe();
  return channel;
}
