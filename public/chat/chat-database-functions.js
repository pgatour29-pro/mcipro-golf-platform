// MciPro Chat Database Functions - FIXED VERSION
import { getSupabaseClient } from './supabaseClient.js?v=c00b0504';

export async function openOrCreateDM(targetUserId) {
  const supabase = await getSupabaseClient();

  // Get current user ID
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    console.error('[Chat] Not authenticated:', userErr);
    throw userErr || new Error('Not authenticated');
  }

  console.log('[Chat] Opening DM:', user.id, '→', targetUserId);

  // CRITICAL FIX: Retry logic for RPC with exponential backoff
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data, error } = await supabase.rpc('ensure_direct_conversation', {
        me: user.id,
        partner: targetUserId
      });

      if (error) throw error;
      if (!data) throw new Error("RPC returned no data");

      console.log('[Chat] RPC success:', data);

      // V5 returns either array or object with output_room_id and output_room_slug
      const row = Array.isArray(data) ? data[0] : data;
      return row.output_room_id || row.room_id; // Handle both old and new parameter names
    } catch (err) {
      lastError = err;
      console.error(`[Chat] ❌ RPC attempt ${attempt}/3 failed:`, err);

      if (attempt < 3) {
        const delay = 500 * attempt; // 500ms, 1000ms
        console.log(`[Chat] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All attempts failed
  console.error('[Chat] ❌ All RPC attempts failed:', lastError);
  throw new Error(`Failed to open chat after 3 attempts: ${lastError.message || 'Unknown error'}`);
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

// Rate limiting for sendMessage (prevents spam/duplicates)
const sendRateLimiter = {
  lastSend: 0,
  minInterval: 300, // 300ms minimum between messages
  pending: false
};

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

  // CRITICAL FIX: Rate limiting to prevent duplicate sends
  if (sendRateLimiter.pending) {
    console.warn('[Chat] ⚠️ Message send already in progress, ignoring duplicate');
    return false;
  }

  const now = Date.now();
  const timeSinceLastSend = now - sendRateLimiter.lastSend;
  if (timeSinceLastSend < sendRateLimiter.minInterval) {
    console.warn(`[Chat] ⚠️ Rate limited - wait ${sendRateLimiter.minInterval - timeSinceLastSend}ms`);
    throw new Error('Please wait before sending another message');
  }

  sendRateLimiter.pending = true;
  sendRateLimiter.lastSend = now;

  try {
    // Use .insert() not .upsert() to avoid 409 conflicts
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender: user.id,
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
  } finally {
    sendRateLimiter.pending = false;
  }
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
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Update all messages in this room as read by storing the timestamp
  const now = new Date().toISOString();

  // Update last_read_at in database (for unread count queries)
  try {
    const { error } = await supabase
      .from('chat_room_members')
      .update({ last_read_at: now })
      .eq('room_id', conversationId)
      .eq('user_id', user.id);

    if (error) {
      console.warn('[Chat] Failed to update last_read_at:', error);
    }
  } catch (err) {
    console.warn('[Chat] Error updating last_read_at:', err);
  }

  // Store last read time in localStorage for this user/room combination (backup)
  const readKey = `chat_read_${user.id}_${conversationId}`;
  localStorage.setItem(readKey, now);

  console.log('[Chat] Marked room as read:', conversationId);

  // Invalidate cache so next call fetches fresh data
  invalidateUnreadCache();

  // Update global unread counter
  updateUnreadBadge();
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

/**
 * Get unread message count for a specific room
 */
export async function getUnreadCount(roomId) {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const readKey = `chat_read_${user.id}_${roomId}`;
  const lastRead = localStorage.getItem(readKey);

  // If never read, get all messages
  let query = supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .neq('sender', user.id); // Don't count own messages

  // If we have a last read timestamp, only count messages after that
  if (lastRead) {
    query = query.gt('created_at', lastRead);
  }

  const { count, error } = await query;

  if (error) {
    console.error('[Chat] Error getting unread count:', error);
    return 0;
  }

  return count || 0;
}

// Cache for unread counts with TTL
const unreadCountCache = {
  data: null,
  timestamp: 0,
  TTL: 30000 // 30 seconds
};

// Circuit breaker for batch unread RPC errors
const unreadRPCCircuit = {
  disabledUntil: 0,
  failCount: 0,
  baseBackoffMs: 300000 // 5 minutes
};

/**
 * Get total unread message count across all rooms - OPTIMIZED
 * Uses single RPC call + 30-second caching to eliminate N+1 queries
 */
export async function getTotalUnreadCount() {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  // Check cache first
  const now = Date.now();
  if (unreadCountCache.data !== null && (now - unreadCountCache.timestamp) < unreadCountCache.TTL) {
    console.log('[Chat] Using cached unread count:', unreadCountCache.data);
    return unreadCountCache.data;
  }

  // Get all last_read timestamps from localStorage for this user
  const lastReadMap = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`chat_read_${user.id}_`)) {
      const roomId = key.replace(`chat_read_${user.id}_`, '');
      lastReadMap[roomId] = localStorage.getItem(key);
    }
  }

  // If RPC recently failed, use fallback without hitting server (circuit open)
  if (Date.now() < unreadRPCCircuit.disabledUntil) {
    return getTotalUnreadCountFallback();
  }

  // Use RPC function to get batch unread counts
  let data, error;
  try {
    ({ data, error } = await supabase.rpc('get_batch_unread_counts', {
      p_user_id: user.id,
      p_last_read_map: lastReadMap
    }));
  } catch (e) {
    error = e;
  }

  if (error) {
    // Throttle noisy console logs; only log first failure per window
    if (unreadRPCCircuit.failCount === 0 || Date.now() > unreadRPCCircuit.disabledUntil) {
      console.warn('[Chat] get_batch_unread_counts RPC failed — using fallback');
      console.warn('[Chat] Error details:', error);
    }
    // Exponential backoff window before next RPC attempt
    unreadRPCCircuit.failCount = Math.min(unreadRPCCircuit.failCount + 1, 5);
    const backoff = unreadRPCCircuit.baseBackoffMs * Math.pow(2, unreadRPCCircuit.failCount - 1);
    unreadRPCCircuit.disabledUntil = Date.now() + Math.min(backoff, 60 * 60 * 1000); // cap at 1 hour
    return getTotalUnreadCountFallback();
  }

  const totalUnread = data?.total_unread || 0;

  // Update cache
  unreadCountCache.data = totalUnread;
  unreadCountCache.timestamp = now;

  console.log('[Chat] Batch unread count:', totalUnread, '(cached for 30s)');
  // Reset circuit on success
  unreadRPCCircuit.failCount = 0;
  unreadRPCCircuit.disabledUntil = 0;
  return totalUnread;
}

/**
 * Fallback method for getTotalUnreadCount (if RPC not available)
 * FIXED: Only count rooms where user is actually a member
 */
async function getTotalUnreadCountFallback() {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  // ✅ FIX: Get only rooms where user is a member (not all rooms with messages)
  const { data: memberRooms, error: roomsError } = await supabase
    .from('chat_room_members')
    .select('room_id')
    .eq('user_id', user.id)
    .eq('status', 'approved'); // Only count approved memberships

  if (roomsError) {
    console.error('[Chat] Error getting user rooms:', roomsError);
    return 0;
  }

  // Get unique room IDs where user is a member
  const uniqueRooms = memberRooms?.map(r => r.room_id) || [];
  console.log('[Chat] Counting unread for', uniqueRooms.length, 'rooms (fallback)');

  // Count unread for each room
  let totalUnread = 0;
  for (const roomId of uniqueRooms) {
    const count = await getUnreadCount(roomId);
    if (count > 0) {
      console.log('[Chat] Room', roomId, 'has', count, 'unread');
    }
    totalUnread += count;
  }

  return totalUnread;
}

/**
 * Invalidate unread count cache (call after markRead)
 */
export function invalidateUnreadCache() {
  unreadCountCache.data = null;
  unreadCountCache.timestamp = 0;
}

/**
 * Update the global chat badge in the navigation
 */
export async function updateUnreadBadge() {
  const totalUnread = await getTotalUnreadCount();
  const badge = document.querySelector('#chatBadge');

  if (badge) {
    if (totalUnread > 0) {
      badge.textContent = totalUnread > 99 ? '99+' : totalUnread.toString();
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  console.log('[Chat] Updated badge: total unread =', totalUnread);
  return totalUnread;
}

/**
 * Delete/leave a chat room
 * - For DMs: Removes user from room (soft delete)
 * - For groups: If admin, deletes entire room. Otherwise, just leaves.
 */
export async function deleteRoom(roomId) {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if user is admin/creator
  const { data: room } = await supabase
    .from('chat_rooms')
    .select('type, created_by')
    .eq('id', roomId)
    .single();

  const isCreator = room?.created_by === user.id;

  if (isCreator) {
    // Creator can delete entire room (CASCADE will remove members and messages)
    const { error } = await supabase
      .from('chat_rooms')
      .delete()
      .eq('id', roomId);

    if (error) throw error;
    console.log('[Chat] Room deleted:', roomId);
  } else {
    // Non-creator just leaves the room
    const { error } = await supabase
      .from('chat_room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    if (error) throw error;
    console.log('[Chat] Left room:', roomId);
  }

  return true;
}

/**
 * Archive/hide a chat room (stored in localStorage)
 */
export async function archiveRoom(roomId) {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const archiveKey = `chat_archived_${user.id}`;
  const archived = JSON.parse(localStorage.getItem(archiveKey) || '[]');

  if (!archived.includes(roomId)) {
    archived.push(roomId);
    localStorage.setItem(archiveKey, JSON.stringify(archived));
  }

  console.log('[Chat] Room archived:', roomId);
}

/**
 * Unarchive a chat room
 */
export async function unarchiveRoom(roomId) {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const archiveKey = `chat_archived_${user.id}`;
  const archived = JSON.parse(localStorage.getItem(archiveKey) || '[]');

  const filtered = archived.filter(id => id !== roomId);
  localStorage.setItem(archiveKey, JSON.stringify(filtered));

  console.log('[Chat] Room unarchived:', roomId);
}

/**
 * Check if a room is archived
 */
export function isRoomArchived(roomId, userId) {
  const archiveKey = `chat_archived_${userId}`;
  const archived = JSON.parse(localStorage.getItem(archiveKey) || '[]');
  return archived.includes(roomId);
}

/**
 * Get read count for a group message
 * @param {string} roomId - The room ID
 * @param {string} messageCreatedAt - The message created_at timestamp
 * @param {string} senderId - The message sender ID (to exclude from count)
 * @returns {Promise<{read: number, total: number}>} - Read count and total members (excluding sender)
 */
export async function getGroupReadCount(roomId, messageCreatedAt, senderId) {
  const supabase = await getSupabaseClient();

  // Get all members in the room (excluding the sender)
  const { data: members, error } = await supabase
    .from('chat_room_members')
    .select('user_id, last_read_at')
    .eq('room_id', roomId)
    .eq('status', 'approved')
    .neq('user_id', senderId);

  if (error) {
    console.error('[Chat] Error getting group read count:', error);
    return { read: 0, total: 0 };
  }

  const total = members?.length || 0;
  const messageTime = new Date(messageCreatedAt).getTime();

  // Count members who have read (last_read_at >= message created_at)
  const read = (members || []).filter(m => {
    if (!m.last_read_at) return false;
    return new Date(m.last_read_at).getTime() >= messageTime;
  }).length;

  return { read, total };
}

/**
 * Get read count for the latest message in a group room (for sidebar display)
 * @param {string} roomId - The room ID
 * @param {string} currentUserId - Current user ID
 * @returns {Promise<{read: number, total: number, hasUnread: boolean} | null>} - Read info or null if not a group/no messages
 */
export async function getGroupLatestReadCount(roomId, currentUserId) {
  const supabase = await getSupabaseClient();

  // Get the latest message sent by current user in this room
  const { data: latestMessage, error: msgError } = await supabase
    .from('chat_messages')
    .select('id, created_at, sender')
    .eq('room_id', roomId)
    .eq('sender', currentUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (msgError || !latestMessage) {
    // No messages sent by current user in this room
    return null;
  }

  // Get read count for this message
  const { read, total } = await getGroupReadCount(roomId, latestMessage.created_at, currentUserId);

  return {
    read,
    total,
    hasUnread: read < total
  };
}

/**
 * Subscribe to read receipt updates for a room
 * @param {string} roomId - The room ID
 * @param {function} onUpdate - Callback when read counts change
 * @returns {Promise<object>} - Supabase channel
 */
export async function subscribeToReadReceipts(roomId, onUpdate) {
  const supabase = await getSupabaseClient();

  const channel = supabase.channel(`read-receipts:${roomId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'chat_room_members',
      filter: `room_id=eq.${roomId}`
    }, (payload) => {
      console.log('[Chat] Read receipt update:', payload);
      onUpdate && onUpdate(payload.new);
    });

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('[Chat] Subscribed to read receipts for room:', roomId);
    }
  });

  return channel;
}
