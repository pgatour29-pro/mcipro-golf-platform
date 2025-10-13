// Full chat UI glue (vanilla JS) wired to Supabase helpers
import { openOrCreateDM, listRooms, fetchMessages, sendMessage, subscribeToConversation, markRead, typing, subscribeTyping, getUnreadCount, updateUnreadBadge } from './chat-database-functions.js';
import { getSupabaseClient } from './supabaseClient.js';
import { ensureSupabaseSessionWithLIFF } from './auth-bridge.js';

const state = {
  currentConversationId: null,
  channels: {},
  userRoomMap: {}, // Maps user IDs to room IDs for badge updates
};

function escapeHTML(str) {
  const div = document.createElement('div');
  div.innerText = str ?? '';
  return div.innerHTML;
}

// Cache current user ID to avoid repeated auth calls
let cachedUserId = null;

// Message deduplication using Set (faster than DOM queries)
const seenMessageIds = new Set();

// Track last seen message timestamp for backfill on reconnect
let lastSeenTimestamp = new Date().toISOString();

// Helper to process incoming messages (used by both realtime and backfill)
function processIncomingMessage(message) {
  // Update lastSeen timestamp
  if (message.created_at) {
    lastSeenTimestamp = message.created_at;
  }

  // Set-based deduplication
  if (seenMessageIds.has(message.id)) {
    return false; // Already seen
  }

  seenMessageIds.add(message.id);

  // If this message is for the currently open conversation, display it
  if (state.currentConversationId === message.room_id) {
    const listEl = document.querySelector('#messages');
    if (listEl && cachedUserId) {
      const wrapper = renderMessage(message, cachedUserId);
      listEl.appendChild(wrapper);
      listEl.scrollTop = listEl.scrollHeight;

      // Mark as read since we're viewing it
      if (message.sender_id !== cachedUserId) {
        markRead(message.room_id);
      }
    }
  } else {
    // Message for a different room - update badge
    const contactBadge = document.querySelector(`#contact-badge-${message.room_id}`);
    if (contactBadge) {
      const currentCount = parseInt(contactBadge.textContent) || 0;
      const newCount = currentCount + 1;
      contactBadge.textContent = newCount > 99 ? '99+' : newCount.toString();
      contactBadge.style.display = 'inline-block';
    }
    updateUnreadBadge();
  }

  return true; // Message processed
}

// Simple concurrency limiter to avoid overwhelming Supabase
async function limit(concurrency, tasks) {
  const q = [...tasks];
  const running = new Set();
  const run = async (t) => {
    const p = t().finally(() => running.delete(p));
    running.add(p);
    await p;
  };
  const starters = Array(Math.min(concurrency, q.length)).fill(0).map(async function loop() {
    while (q.length) await run(q.shift());
  });
  await Promise.all(starters);
}

function renderMessage(m, currentUserId) {
  // Use provided userId instead of fetching for every message (HUGE mobile performance win!)
  const isSelf = m.sender_id === currentUserId;

  const wrapper = document.createElement('div');
  wrapper.className = 'msg';
  wrapper.dataset.mid = m.id;
  wrapper.style.cssText = `display: flex; justify-content: ${isSelf ? 'flex-end' : 'flex-start'}; margin: 0.5rem 0;`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.style.cssText = `
    max-width: 70%;
    padding: 0.5rem 0.875rem;
    border-radius: 1rem;
    background: ${isSelf ? '#10b981' : '#f3f4f6'};
    color: ${isSelf ? 'white' : '#111827'};
    font-size: 14px;
    line-height: 1.4;
    word-wrap: break-word;
  `;

  // Production schema: text-only messages
  bubble.innerHTML = escapeHTML(m.content || '');

  wrapper.appendChild(bubble);
  return wrapper;
}

async function openConversation(conversationId) {
  console.log('[Chat] Opening conversation:', conversationId);

  const supabase = await getSupabaseClient();
  state.currentConversationId = conversationId;

  const listEl = document.querySelector('#messages');
  if (!listEl) {
    console.error('[Chat] ❌ #messages element not found!');
    alert('Error: Messages container not found.');
    return;
  }

  listEl.innerHTML = '';
  seenMessageIds.clear(); // Reset dedup set for new conversation

  // Get user ID once (not for every message!)
  if (!cachedUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    cachedUserId = user?.id;
  }

  // Fetch messages
  const initial = await fetchMessages(conversationId, 100);
  console.log('[Chat] Fetched', initial.length, 'messages');

  // CRITICAL FIX: Render all messages at once using DocumentFragment (10x faster on mobile!)
  if (initial.length > 0) {
    const fragment = document.createDocumentFragment();
    initial.forEach(m => {
      seenMessageIds.add(m.id); // Track in Set
      fragment.appendChild(renderMessage(m, cachedUserId));
    });
    listEl.appendChild(fragment);
  }

  listEl.scrollTop = listEl.scrollHeight;

  // Clean up old channel
  if (state.channels[conversationId]) {
    supabase.removeChannel(state.channels[conversationId]);
  }

  // CRITICAL FIX: AWAIT subscription to ensure it's ready before messages arrive
  state.channels[conversationId] = await subscribeToConversation(conversationId, async (m) => {
    console.log('[Chat] Real-time message received:', m.id);
    if (state.currentConversationId === conversationId) {
      // Set-based deduplication (faster than DOM queries)
      if (seenMessageIds.has(m.id)) {
        console.log('[Chat] Message already displayed (Set dedup)');
        return;
      }

      seenMessageIds.add(m.id);
      const wrapper = renderMessage(m, cachedUserId);
      listEl.appendChild(wrapper);
      listEl.scrollTop = listEl.scrollHeight;

      // Mark as read immediately if we're viewing this conversation
      if (m.sender_id !== cachedUserId) {
        markRead(conversationId);
      }
    } else {
      // Message arrived in a different room - update that room's badge
      const contactBadge = document.querySelector(`#contact-badge-${conversationId}`);
      if (contactBadge) {
        const currentCount = parseInt(contactBadge.textContent) || 0;
        const newCount = currentCount + 1;
        contactBadge.textContent = newCount > 99 ? '99+' : newCount.toString();
        contactBadge.style.display = 'inline-block';
      }

      // Update global badge
      updateUnreadBadge();
    }
  }, (m) => {
    // handle edits/deletes
  });

  // Mark as read and update badge
  await markRead(conversationId);

  // Update the badge on the contact in the sidebar
  const contactBadge = document.querySelector(`#contact-badge-${conversationId}`);
  if (contactBadge) {
    contactBadge.style.display = 'none';
  }

  // Clean up old typing channel
  if (state.typingChannel) {
    supabase.removeChannel(state.typingChannel);
  }

  // CRITICAL FIX: AWAIT typing subscription
  state.typingChannel = await subscribeTyping(conversationId, (rows)=>{
    const el = document.querySelector('#typing');
    if (el) el.textContent = rows.length ? 'typing…' : '';
  });

  console.log('[Chat] ✅ Conversation opened and subscribed');
}

async function sendCurrent() {
  const input = document.querySelector('#composer');
  const body = input.value.trim();
  if (!body || !state.currentConversationId) return;

  try {
    await sendMessage(state.currentConversationId, body);
    input.value = '';
  } catch (error) {
    console.error('[Chat] Send failed:', error);
    alert('❌ Message failed to send: ' + (error.message || 'Unknown error'));
  }
}

export async function initChat() {
  // Show version indicator (visible on mobile)
  console.log('[Chat] 🚀 VERSION: 2025-10-13-PRODUCTION-HARDENED');

  const supabase = await getSupabaseClient();
  const sidebar = document.querySelector('#conversations');
  sidebar.innerHTML = '<div style="padding: 2rem; text-align: center; color: #9ca3af;">Loading...<br><small style="color: #6b7280; font-size: 10px;">v2025-10-13-HARDENED</small></div>';

  // Fast path: Just get the user ID, skip heavy auth bridge
  let { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Only run auth bridge if no session
    const authResult = await ensureSupabaseSessionWithLIFF();
    if (!authResult) {
      alert('Please log in via LINE to use chat.');
      return;
    }
    // Re-fetch user after auth bridge
    ({ data: { user } } = await supabase.auth.getUser());
  }

  if (!user) {
    alert('Authentication failed');
    return;
  }

  console.log('[Chat] ✅ Authenticated:', user.id);

  // Load users only (skip conversations for now - they're empty anyway)
  const { data: allUsers, error: usersError } = await supabase
    .from('profiles')
    .select('id, display_name, username')
    .neq('id', user.id)
    .limit(50); // Limit results for speed

  if (usersError) {
    alert('⚠️ Failed to load contacts: ' + usersError.message);
    return;
  }

  sidebar.innerHTML = '';
  console.log('[Chat] Loaded', allUsers?.length || 0, 'users');

  // PERFORMANCE FIX: Render contact list immediately without waiting for room IDs or unread counts
  // Room IDs and badges will load in the background
  if (allUsers && allUsers.length > 0) {
    allUsers.forEach(u => {
      const li = document.createElement('li');
      li.id = `contact-${u.id}`;
      li.dataset.userId = u.id;
      li.style.cssText = 'list-style: none; padding: 1rem; cursor: pointer; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; position: relative;';

      // Contact name
      const nameSpan = document.createElement('span');
      nameSpan.textContent = u.display_name || u.username || 'User';
      nameSpan.style.cssText = 'flex: 1;';

      // Unread badge placeholder (will be updated asynchronously)
      const badge = document.createElement('span');
      badge.id = `contact-badge-user-${u.id}`;
      badge.className = 'unread-badge';
      badge.style.cssText = `
        background: #ef4444;
        color: white;
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: 600;
        min-width: 20px;
        text-align: center;
        display: none;
      `;

      li.appendChild(nameSpan);
      li.appendChild(badge);

      li.onclick = async () => {
        try {
          console.log('[Chat] Opening conversation with', u.id);
          // Get or create room on-demand (much faster!)
          const roomId = await openOrCreateDM(u.id);
          state.userRoomMap[u.id] = roomId;
          console.log('[Chat] Room ID:', roomId);

          // Update the li and badge IDs now that we have the room ID
          li.id = `contact-${roomId}`;
          badge.id = `contact-badge-${roomId}`;

          openConversation(roomId);
        } catch (error) {
          console.error('[Chat] Failed to open conversation:', error);
          alert('❌ Failed to open chat: ' + (error.message || 'Unknown error'));
        }
      };

      sidebar.appendChild(li);
    });

    // 🚀 PRODUCTION HARDENED: Parallel with concurrency limit (6 at a time)
    console.log('[Chat] Loading unread counts with controlled concurrency...');
    (async () => {
      const startTime = performance.now();
      let successCount = 0;

      // Create task functions (not promises yet!)
      const badgeTasks = allUsers.map(u => async () => {
        try {
          const roomId = await openOrCreateDM(u.id);
          state.userRoomMap[u.id] = roomId;
          const unreadCount = await getUnreadCount(roomId);

          // Update badge now that we have the count
          const badge = document.querySelector(`#contact-badge-user-${u.id}`);
          if (badge && unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
            badge.style.display = 'inline-block';
            badge.id = `contact-badge-${roomId}`;
          }

          // Also update contact li ID
          const li = document.querySelector(`#contact-${u.id}`);
          if (li) {
            li.id = `contact-${roomId}`;
          }

          successCount++;
        } catch (error) {
          console.error('[Chat] Error loading unread count for:', u.id, error);
        }
      });

      // Run with max 6 concurrent API calls (prevents overwhelming Supabase/network)
      await limit(6, badgeTasks);

      const elapsed = performance.now() - startTime;
      console.log(`[Chat] ✅ Loaded ${successCount}/${allUsers.length} badges in ${Math.round(elapsed)}ms (6 concurrent)`);

      // Update global badge after all counts loaded
      updateUnreadBadge();
    })();
  } else {
    const li = document.createElement('li');
    li.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af; font-size: 14px;">No users available</div>';
    sidebar.appendChild(li);
  }

  document.querySelector('#sendBtn').onclick = sendCurrent;
  const composer = document.querySelector('#composer');
  composer.addEventListener('input', ()=>{
    if (state.currentConversationId) typing(state.currentConversationId);
  });

  // Enter key to send
  composer.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendCurrent();
    }
  });
}

/**
 * Backfill missed messages (covers tab sleep, CHANNEL_ERROR, etc.)
 */
async function backfillMissedMessages() {
  const supabase = await getSupabaseClient();
  try {
    console.log('[Chat] Backfilling messages since', lastSeenTimestamp);

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .gt('created_at', lastSeenTimestamp)
      .neq('sender', cachedUserId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      console.error('[Chat] Backfill error:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log(`[Chat] Backfilled ${data.length} missed messages`);
      data.forEach(msg => {
        const normalizedMsg = {
          id: msg.id,
          room_id: msg.room_id,
          sender_id: msg.sender,
          content: msg.content,
          created_at: msg.created_at
        };
        processIncomingMessage(normalizedMsg);
      });
    }
  } catch (error) {
    console.error('[Chat] Backfill failed:', error);
  }
}

/**
 * Subscribe to all messages globally with reconnect + backfill hardening
 */
export async function subscribeGlobalMessages() {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (!cachedUserId) {
    cachedUserId = user.id;
  }

  console.log('[Chat] Setting up global message subscription with backfill');

  const globalChannel = supabase.channel('global-messages')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages'
    }, (payload) => {
      const message = payload.new;

      // Only process messages from others
      if (message.sender !== cachedUserId) {
        const normalizedMsg = {
          id: message.id,
          room_id: message.room_id,
          sender_id: message.sender,
          content: message.content,
          created_at: message.created_at
        };
        processIncomingMessage(normalizedMsg);
      }
    })
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Chat] ✅ Global subscription active - backfilling missed messages');
        backfillMissedMessages();
      }
      if (status === 'CHANNEL_ERROR') {
        console.warn('[Chat] ⚠️ Channel error - scheduling resubscribe');
        setTimeout(() => globalChannel.subscribe(), 1000);
      }
    });

  // Backfill on window focus (handles mobile tab wake-up)
  window.addEventListener('focus', () => {
    if (globalChannel.state === 'joined') {
      console.log('[Chat] Window focused - backfilling');
      backfillMissedMessages();
    }
  });

  return globalChannel;
}

// Expose for manual testing
window.__chat = { openConversation, sendCurrent, initChat, openOrCreateDM, updateUnreadBadge, subscribeGlobalMessages };
