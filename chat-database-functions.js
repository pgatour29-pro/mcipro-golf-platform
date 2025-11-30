// Database helpers (Supabase JS v2)
import { getSupabaseClient } from './supabaseClient.js';

// Helper for exponential backoff retry
async function withRetry(fn, retries = 3, delay = 100) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error; // Last retry, rethrow error
      console.warn(`[Chat] Retry attempt ${i + 1}/${retries} failed. Retrying in ${delay}ms...`, error);
      await new Promise(res => setTimeout(res, delay));
      delay *= 2; // Exponential backoff
    }
  }
}

export async function ensureDirectConversation(otherUserId) {
  return await window.measureAndLog('ensureDirectConversation', async () => {
    const supabase = await getSupabaseClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) throw new Error('Not authenticated');
    
    const { data, error } = await withRetry(async () => {
      return await supabase.rpc('ensure_direct_conversation', { a: user.user.id, b: otherUserId });
    });

    if (error) throw error;
    return data; // conversation_id
  }, 'Chat', 'ChatWindow');
}

export async function listConversations() {
  return await window.measureAndLog('listConversations', async () => {
    const supabase = await getSupabaseClient();
    
    const { data, error } = await withRetry(async () => {
      return await supabase
        .from('conversations')
        .select('id, is_group, title, avatar_url, last_message_at, updated_at')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false });
    });

    if (error) throw error;
    return data || [];
  }, 'Chat', 'ChatWindow');
}

export async function fetchMessages(conversationId, limit = 50, before) {
  return await window.measureAndLog('fetchMessages', async () => {
    const supabase = await getSupabaseClient();
    let q = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (before) q = q.lt('created_at', before);
    
    const { data, error } = await withRetry(async () => {
      return await q;
    });

    if (error) throw error;
    return (data || []).map(m => normalizeMessage(m));
  }, 'Chat', 'ChatWindow', { conversationId });
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
  return await window.measureAndLog('sendMessage', async () => {
    const supabase = await getSupabaseClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) throw new Error('Not authenticated');
    const profileId = user.user.id;
    
    const { data: profile, error: profileError } = await withRetry(async () => {
      return await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', profileId).single();
    });
    if (profileError) throw profileError;

    const sender_name = profile?.display_name || null;
    
    const { data, error } = await withRetry(async () => {
      return await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: profileId, sender_name, type, body, metadata })
        .select('*').single();
    });

    if (error) throw error;
    return normalizeMessage(data);
  }, 'Chat', 'ChatWindow', { conversationId, type, hasMetadata: Object.keys(metadata).length > 0 });
}

export async function subscribeToConversation(conversationId, onInsert, onUpdate) {
  // Always wait for Supabase client to be ready
  const supabase = await getSupabaseClient();

  console.log('[Chat] Setting up subscription for conversation:', conversationId);

  const channel = supabase.channel(`msg:${conversationId}`, {
    config: {
      broadcast: { self: false },
      presence: { key: '' }
    }
  })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    }, (payload) => {
      console.log('[Chat] Real-time INSERT received:', payload.new.id);
      onInsert && onInsert(normalizeMessage(payload.new));
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    }, (payload) => {
      console.log('[Chat] Real-time UPDATE received:', payload.new.id);
      onUpdate && onUpdate(normalizeMessage(payload.new));
    });

  // Subscribe and wait for ready state with callback
  channel.subscribe((status, err) => {
    if (status === 'SUBSCRIBED') {
      console.log('[Chat] ✅ Successfully subscribed to conversation:', conversationId);
    }
    if (status === 'CHANNEL_ERROR') {
      console.error('[Chat] ❌ Subscription error:', err);
    }
    if (status === 'TIMED_OUT') {
      console.error('[Chat] ❌ Subscription timed out for conversation:', conversationId);
    }
    if (status === 'CLOSED') {
      console.log('[Chat] Subscription closed for conversation:', conversationId);
    }
  });

  return channel;
}

export async function markRead(conversationId) {
  return await window.measureAndLog('markRead', async () => {
    const supabase = await getSupabaseClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;
    const now = new Date().toISOString();
    await supabase.from('read_cursors').upsert({ conversation_id: conversationId, user_id: user.user.id, last_read_at: now }, { onConflict: 'conversation_id,user_id' });
    // bulk update their receipts to read
    const { data: ids } = await supabase.from('messages').select('id').eq('conversation_id', conversationId);
    if (ids && ids.length) {
      await withRetry(async () => {
        await supabase.from('message_receipts').update({ read_at: now }).is('read_at', null).eq('user_id', user.user.id).in('message_id', ids.map(x => x.id));
      });
    }
  }, 'Chat', 'ChatWindow', { conversationId });
}

export async function typing(conversationId) {
  return await window.measureAndLog('typing', async () => {
    const supabase = await getSupabaseClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;
    await withRetry(async () => {
      await supabase.from('typing_events').insert({ conversation_id: conversationId, user_id: user.user.id, expires_at: new Date(Date.now()+8000).toISOString() });
    });
  }, 'Chat', 'ChatWindow', { conversationId });
}

export async function subscribeTyping(conversationId, cb) {
  // Always wait for Supabase client to be ready
  const supabase = await getSupabaseClient();

  const channel = supabase.channel(`typing:${conversationId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'typing_events',
      filter: `conversation_id=eq.${conversationId}`
    }, async () => {
      const { data } = await withRetry(async () => {
        return await supabase.from('typing_events')
          .select('user_id, started_at')
          .eq('conversation_id', conversationId)
          .gt('expires_at', new Date().toISOString());
      });
      cb && cb(data || []);
    });

  // Subscribe and wait for ready state
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('[Chat] ✅ Subscribed to typing events:', conversationId);
    }
  });

  return channel;
}

/** ================== MEDIA (private) ==================
 * Uploads media to a private bucket and sends a media message.
 * Access is via short-lived signed URLs from the edge function.
 */
export async function uploadMediaAndSend(conversationId, file) {
  return await window.measureAndLog('uploadMediaAndSend', async () => {
    const supabase = await getSupabaseClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) throw new Error('Not authenticated');
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const object_path = `${conversationId}/${user.user.id}/${crypto.randomUUID()}.${ext}`;
    const bucket = 'chat-media';

    // Upload (bucket must be private)
    const { error: upErr } = await withRetry(async () => {
      return await supabase.storage.from(bucket).upload(object_path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      });
    }, 5, 200); // More retries and longer delay for file uploads
    
    if (upErr) throw upErr;

    // Send media message with metadata
    const meta = { bucket, object_path, mime: file.type || null, name: file.name, size: file.size };
    return await sendMessage(conversationId, null, inferTypeFromMime(file.type), meta);
  }, 'Chat', 'ChatWindow', { conversationId, fileName: file.name, fileSize: file.size });
}

export function inferTypeFromMime(mime) {
  if (!mime) return 'file';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
}

/**
 * Request a signed URL for a media object (valid ~60s)
 * Uses the edge function to validate conversation membership.
 */
export async function getSignedMediaUrl(conversationId, bucket, object_path) {
  return await window.measureAndLog('getSignedMediaUrl', async () => {
    const supabase = await getSupabaseClient();
    const session = (await supabase.auth.getSession()).data.session;
    const token = session?.access_token;
    // Get Supabase URL from the client
    const supabaseUrl = supabase.supabaseUrl || 'https://pyeeplwsnupmhgbguwqs.supabase.co';
    
    const { res, error } = await withRetry(async () => {
      const response = await fetch(`${supabaseUrl}/functions/v1/chat-media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ conversation_id: conversationId, bucket, object_path })
      });
      if (!response.ok) {
        throw new Error(`Failed to sign media URL: ${response.status} ${response.statusText}`);
      }
      return { res: response };
    });

    if (error) throw error; // Re-throw if all retries failed
    
    const { url } = await res.json();
    return url;
  }, 'Chat', 'ChatWindow', { conversationId, bucket, object_path });
}
