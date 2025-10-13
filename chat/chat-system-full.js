// Full chat UI glue (vanilla JS) wired to Supabase helpers
import { openOrCreateDM, listRooms, fetchMessages, sendMessage, subscribeToConversation, markRead, typing, subscribeTyping, getUnreadCount, updateUnreadBadge } from './chat-database-functions.js';
import { getSupabaseClient } from './supabaseClient.js';
import { ensureSupabaseSessionWithLIFF } from './auth-bridge.js';

const state = {
  currentConversationId: null,
  channels: {},
  userRoomMap: {}, // Maps user IDs to room IDs for badge updates
  globalSub: null, // Singleton global subscription
  roomSubs: new Map(), // roomId -> channel (singleton per room)
  lastRealtimeAt: 0, // Timestamp of last realtime message
  backfillInFlight: false, // Prevent concurrent backfills
  lastBackfillAt: 0, // Timestamp of last backfill
  pageHiddenAt: 0, // iOS Safari pagehide timestamp
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
const MAX_SEEN_IDS = 1000; // Cap memory usage

// Helper to remember message ID with memory cap
function rememberId(id) {
  seenMessageIds.add(id);
  if (seenMessageIds.size > MAX_SEEN_IDS) {
    // Delete oldest: convert to iterator
    const first = seenMessageIds.values().next().value;
    seenMessageIds.delete(first);
  }
}

// Track last seen message timestamp for backfill on reconnect
let lastSeenTimestamp = new Date().toISOString();

// Throttle backfill to prevent mobile focus spam
let lastBackfillTime = 0;
const BACKFILL_THROTTLE_MS = 10000; // Only backfill once per 10 seconds

// Smart scroll helpers (only scroll if user is near bottom)
function isNearBottom(el, px = 80) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < px;
}

function smartScrollToBottom(container) {
  if (isNearBottom(container)) {
    container.scrollTop = container.scrollHeight;
  }
}

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

  rememberId(message.id); // Add with memory cap

  // If this message is for the currently open conversation, display it
  if (state.currentConversationId === message.room_id) {
    const listEl = document.querySelector('#messages');
    if (listEl && cachedUserId) {
      const wrapper = renderMessage(message, cachedUserId);
      listEl.appendChild(wrapper);
      smartScrollToBottom(listEl); // Only scroll if user is near bottom

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
      rememberId(m.id); // Track with memory cap
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

      rememberId(m.id); // Track with memory cap
      const wrapper = renderMessage(m, cachedUserId);
      listEl.appendChild(wrapper);
      smartScrollToBottom(listEl); // Only scroll if user is near bottom

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
  // Guard: Prevent concurrent backfills
  if (state.backfillInFlight) {
    console.log('[Chat] Backfill skipped — already running');
    return;
  }

  // Throttle: Only backfill once per 8 seconds to prevent mobile focus spam
  const now = Date.now();
  if (now - state.lastBackfillAt < 8000) {
    console.log('[Chat] Backfill throttled (too soon since last backfill)');
    return;
  }

  state.backfillInFlight = true;

  try {
    // Backfill from last realtime message OR last 60 seconds (whichever is more recent)
    const since = new Date(Math.max(state.lastRealtimeAt || 0, now - 60000)).toISOString();
    console.log('[Chat] Backfilling messages since', since);

    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .gt('created_at', since)
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
        processIncomingMessage(normalizedMsg); // Incremental append only if not present
      });
    }
  } catch (error) {
    console.error('[Chat] Backfill failed:', error);
  } finally {
    state.lastBackfillAt = Date.now();
    state.backfillInFlight = false;
  }
}

/**
 * Subscribe to all messages globally with reconnect + backfill hardening (SINGLETON)
 */
export async function subscribeGlobalMessages() {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (!cachedUserId) {
    cachedUserId = user.id;
  }

  // SINGLETON GUARD: If already joined, keep existing subscription
  if (state.globalSub && state.globalSub.state === 'joined') {
    console.log('[Chat] Global subscription already active — skip');
    return state.globalSub;
  }

  // If exists but not joined, tear down cleanly
  if (state.globalSub) {
    try {
      await state.globalSub.unsubscribe();
    } catch (err) {
      console.warn('[Chat] Error unsubscribing old global channel:', err);
    }
  }

  console.log('[Chat] Setting up global message subscription with backfill');

  const onRealtimeInsert = (payload) => {
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
      const added = processIncomingMessage(normalizedMsg);
      if (added) state.lastRealtimeAt = Date.now(); // Track freshness
    }
  };

  state.globalSub = supabase.channel('realtime:chat_messages')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages'
    }, onRealtimeInsert)
    .subscribe((status, err) => {
      console.log('[Chat] Global status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('[Chat] ✅ Global subscription active - backfilling missed messages');
        backfillMissedMessages();
      }
      if (status === 'CHANNEL_ERROR') {
        console.warn('[Chat] ⚠️ Channel error - scheduling resubscribe');
        setTimeout(() => state.globalSub?.subscribe(), 1000);
      }
    });

  return state.globalSub;
}

/**
 * Teardown chat subscriptions (cleanup on logout/account switch)
 */
export async function teardownChat() {
  console.log('[Chat] Tearing down all subscriptions');

  // Unsubscribe global
  if (state.globalSub) {
    try {
      await state.globalSub.unsubscribe();
    } catch (err) {
      console.warn('[Chat] Error unsubscribing global:', err);
    }
    state.globalSub = null;
  }

  // Unsubscribe all room channels
  for (const [roomId, chan] of state.roomSubs) {
    try {
      await chan.unsubscribe();
    } catch (err) {
      console.warn('[Chat] Error unsubscribing room:', roomId, err);
    }
  }
  state.roomSubs.clear();

  // Clear old channels map
  const supabase = await getSupabaseClient();
  for (const [conversationId, channel] of Object.entries(state.channels)) {
    try {
      supabase.removeChannel(channel);
    } catch (err) {
      console.warn('[Chat] Error removing channel:', conversationId, err);
    }
  }
  state.channels = {};

  console.log('[Chat] ✅ All subscriptions torn down');
}

/**
 * Mobile lifecycle event handlers (visibility, focus, online, iOS pagehide/pageshow)
 * These trigger gentle backfill without re-rendering the UI
 */
function initMobileLifecycleHandlers() {
  // Use Page Visibility API (more reliable on mobile than focus)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('[Chat] Page became visible - backfilling (throttled)');
      backfillMissedMessages();
    }
  });

  // Focus event (fallback for older browsers)
  window.addEventListener('focus', () => {
    console.log('[Chat] Window focused - backfilling (throttled)');
    backfillMissedMessages();
  });

  // Network reconnection - resubscribe and backfill
  window.addEventListener('online', async () => {
    console.log('[Chat] Network reconnected - resubscribing');
    await subscribeGlobalMessages();
    if (state.currentConversationId && state.channels[state.currentConversationId]) {
      // Room subscription is already managed by openConversation
      console.log('[Chat] Room subscription already active');
    }
    backfillMissedMessages();
  });

  // iOS Safari edge case: pagehide/pageshow (Safari kills timers on background)
  window.addEventListener('pagehide', () => {
    // Don't tear down channels, just mark timestamp
    state.pageHiddenAt = Date.now();
    console.log('[Chat] Page hidden (iOS Safari)');
  });

  window.addEventListener('pageshow', async (event) => {
    console.log('[Chat] Page shown (iOS Safari) - persisted:', event.persisted);
    // Resubscribe and backfill
    await subscribeGlobalMessages();
    if (state.currentConversationId && state.channels[state.currentConversationId]) {
      console.log('[Chat] Room subscription check');
    }
    backfillMissedMessages();
  });
}

/**
 * WebSocket keepalive for mobile (prevents socket sleep)
 * Uses harmless SELECT query with Prefer: count=none for tiniest payload
 */
function initWebSocketKeepalive() {
  setInterval(async () => {
    if (document.visibilityState !== 'visible') return;

    try {
      const supabase = await getSupabaseClient();
      const supabaseUrl = supabase.supabaseUrl;
      const anonKey = supabase.supabaseKey;

      // Tiny SELECT query with count=none (tiniest payload, proxy-friendly)
      fetch(`${supabaseUrl}/rest/v1/chat_messages?select=id&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Prefer': 'count=none'
        },
        cache: 'no-store'
      }).catch(() => {
        // Ignore errors - this is just a keepalive ping
      });
    } catch (err) {
      // Ignore errors
    }
  }, 25000); // Every 25 seconds
}

// Production log stripping (silence noisy debug logs)
const DEBUG = typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
if (!DEBUG && typeof console !== 'undefined') {
  ['log', 'debug'].forEach(fn => {
    const original = console[fn];
    console[fn] = (...args) => {
      // Only log errors and warnings in production
      if (fn === 'error' || fn === 'warn') {
        original.apply(console, args);
      }
    };
  });
  console.log('[Chat] Production mode - debug logs suppressed');
}

// Initialize mobile lifecycle handlers and keepalive once
if (typeof window !== 'undefined') {
  initMobileLifecycleHandlers();
  initWebSocketKeepalive();
}

// Expose for manual testing
window.__chat = {
  openConversation,
  sendCurrent,
  initChat,
  openOrCreateDM,
  updateUnreadBadge,
  subscribeGlobalMessages,
  teardownChat // Expose teardown for logout cleanup
};
