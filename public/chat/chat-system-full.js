// Full chat UI glue (vanilla JS) wired to Supabase helpers
import { openOrCreateDM, listRooms, fetchMessages, sendMessage, subscribeToConversation, markRead, typing, subscribeTyping, getUnreadCount, updateUnreadBadge, deleteRoom, archiveRoom, unarchiveRoom, isRoomArchived } from './chat-database-functions.js?v=279e885e';
import { getSupabaseClient } from './supabaseClient.js?v=279e885e';
import { ensureSupabaseSessionWithLIFF } from './auth-bridge-v2.js?v=279e885e';

const state = {
  currentConversationId: null,
  currentUserId: null, // Store current user ID
  channels: {},
  userRoomMap: {}, // Maps user IDs to room IDs for badge updates
  globalSub: null, // Singleton global subscription
  roomSubs: new Map(), // roomId -> channel (singleton per room)
  lastRealtimeAt: 0, // Timestamp of last realtime message
  backfillInFlight: false, // Prevent concurrent backfills
  lastBackfillAt: 0, // Timestamp of last backfill
  pageHiddenAt: 0, // iOS Safari pagehide timestamp
  users: [], // All loaded users for search
  usersLoaded: false, // Track if contacts have finished loading
  usersLoading: false, // Prevent duplicate contact fetches
  usersLoadPromise: null, // Share pending contact load promise
  cachedRooms: null, // Cached room data (avoids redundant queries)
  privateExpanded: false, // Track if Private folder is expanded
  channelErrorRetries: 0, // Track CHANNEL_ERROR retries for exponential backoff
  maxChannelRetries: 5, // Max retries before falling back to polling
  channelErrorTimer: null, // Timer ID for pending retry (allows cancellation)
  pollingTimer: null, // Polling fallback interval ID
  pollingIntervalMs: 10000, // Poll every 10s in fallback
};

// UI element references (cached for performance)
const ui = {
  contactsSearch: null,
  openGroupBtn: null
};

// Event listener cleanup registry (MEMORY LEAK FIX)
const eventListeners = {
  composer: {
    input: null,
    keypress: null
  },
  search: null,
  groupBtn: null,
  lifecycle: {
    visibilitychange: null,
    focus: null,
    online: null,
    pagehide: null,
    pageshow: null
  }
};

// Initialize UI refs when DOM is ready
function initUIRefs() {
  ui.contactsSearch = document.getElementById('contactsSearch');
  ui.openGroupBtn = document.getElementById('openGroupBuilder');
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.innerText = str ?? '';
  return div.innerHTML;
}

// Cache current user ID to avoid repeated auth calls
let cachedUserId = null;

// Message deduplication using Map with LRU eviction (fixes Set eviction bug)
const seenMessageIds = new Map(); // id -> timestamp
const MAX_SEEN_IDS = 1000; // Cap memory usage

// Helper to remember message ID with proper LRU eviction
function rememberId(id) {
  const now = Date.now();

  // If already exists, update timestamp (LRU refresh)
  if (seenMessageIds.has(id)) {
    seenMessageIds.delete(id); // Remove old entry
  }

  seenMessageIds.set(id, now); // Add with current timestamp

  // Evict oldest entries if over limit (proper LRU)
  if (seenMessageIds.size > MAX_SEEN_IDS) {
    // Map maintains insertion order, so first entry is oldest
    const oldestKey = seenMessageIds.keys().next().value;
    seenMessageIds.delete(oldestKey);
  }
}

// Per-room last seen timestamps (stored in localStorage for persistence)
function getLastSeenTimestamp(roomId, userId) {
  const key = `chat_last_seen_${userId}_${roomId}`;
  return localStorage.getItem(key) || new Date(Date.now() - 3600000).toISOString(); // Default: 1 hour ago
}

function setLastSeenTimestamp(roomId, userId, timestamp) {
  const key = `chat_last_seen_${userId}_${roomId}`;
  localStorage.setItem(key, timestamp);
}

// Adaptive backfill throttle: 0ms when visible, 8s when background
const BACKFILL_MIN_MS_ACTIVE = 0;     // No throttle when visible (instant updates)
const BACKFILL_MIN_MS_BG = 8000;      // Safe throttle when backgrounded

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
  // Update per-room lastSeen timestamp
  if (message.created_at && message.room_id && cachedUserId) {
    setLastSeenTimestamp(message.room_id, cachedUserId, message.created_at);
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
    } else {
      // Badge not found - this might be a new group we haven't added to sidebar yet
      // Check if this room exists in the DOM at all
      const roomExists = document.querySelector(`#contact-${message.room_id}`);
      if (!roomExists) {
        console.log('[Chat] New room detected:', message.room_id, '- adding to sidebar');
        addRoomToSidebar(message.room_id);
      }
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

  // CRITICAL FIX: Retry if DOM elements not ready yet
  let listEl = document.querySelector('#messages');
  if (!listEl) {
    console.warn('[Chat] ⚠️ #messages element not found, retrying in 500ms...');
    await new Promise(resolve => setTimeout(resolve, 500));
    listEl = document.querySelector('#messages');

    if (!listEl) {
      console.error('[Chat] ❌ #messages element still not found after retry!');
      alert('Chat interface not ready. Please try again in a moment.');
      return;
    }
    console.log('[Chat] ✅ #messages element found on retry');
  }

  listEl.innerHTML = '';
  seenMessageIds.clear(); // Reset dedup set for new conversation

  // Get user ID once (not for every message!)
    if (!cachedUserId || cachedUserId === 'null') {
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

  // Clean up old channel (CRITICAL: properly delete from map to prevent memory leaks)
  if (state.channels[conversationId]) {
    try {
      await supabase.removeChannel(state.channels[conversationId]);
    } catch (err) {
      console.warn('[Chat] Error removing old channel:', err);
    }
    delete state.channels[conversationId]; // MEMORY LEAK FIX: Actually delete the reference
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
      } else {
        // Badge not found - this might be a new room we haven't added to sidebar yet
        const roomExists = document.querySelector(`#contact-${conversationId}`);
        if (!roomExists) {
          console.log('[Chat] New room detected in openConversation:', conversationId);
          addRoomToSidebar(conversationId);
        }
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

  // Clean up old typing channel (MEMORY LEAK FIX)
  if (state.typingChannel) {
    try {
      await supabase.removeChannel(state.typingChannel);
    } catch (err) {
      console.warn('[Chat] Error removing typing channel:', err);
    }
    state.typingChannel = null; // Clear reference
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

// =====================================================
// MOBILE TAB NAVIGATION
// =====================================================

function showContactsTab() {
  const chatContainer = document.querySelector('#professionalChatContainer');
  if (chatContainer) {
    chatContainer.classList.remove('chat-active');
  }
}

function showThreadTab() {
  const chatContainer = document.querySelector('#professionalChatContainer');
  if (chatContainer) {
    chatContainer.classList.add('chat-active');
  }
}

// =====================================================
// CONTACTS SEARCH
// =====================================================

function normalize(s) {
  return (s || '').toString().trim().toLowerCase();
}

function filterContactsLocal(q) {
  const qn = normalize(q);
  const items = state.users || [];
  if (!qn) return items;
  return items.filter(u => {
    const name = normalize(u.display_name || u.username || '');
    const uid = (u.id || '').toString().toLowerCase();
    return name.includes(qn) || uid.startsWith(qn);
  });
}

let searchAbortCtrl = null;
async function queryContactsServer(q) {
  if (!q || q.length < 2) return null;
  try {
    searchAbortCtrl?.abort();
    searchAbortCtrl = new AbortController();
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, username, line_user_id')
      .or(`display_name.ilike.%${q}%,username.ilike.%${q}%,line_user_id.ilike.%${q}%`)
      .limit(25)
      .abortSignal(searchAbortCtrl.signal);
    if (error) throw error;

    // Already in correct format - no transformation needed
    return (data || [])
      .filter(u => !!u.id && !!u.line_user_id)
      .map(u => ({
        id: u.id,
        display_name: u.display_name || u.username || 'User',
        username: u.username || u.line_user_id,
        line_user_id: u.line_user_id
      }));
  } catch {
    return null;
  }
}

/**
 * Create room list item with archive/delete buttons
 */
function createRoomListItem(room, userId) {
  const isArchived = isRoomArchived(room.id, userId);

  const li = document.createElement('li');
  li.id = `contact-${room.id}`;
  li.dataset.roomId = room.id;
  li.style.cssText = 'list-style: none; padding: 1rem; cursor: pointer; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; position: relative;';

  // Green background for groups
  if (room.type === 'group') {
    li.style.background = '#f0fdf4';
  }

  // Room name with icon
  const nameSpan = document.createElement('span');
  if (room.type === 'group') {
    nameSpan.innerHTML = `<span style="margin-right: 0.5rem;">👥</span>${escapeHTML(room.title)}`;
    nameSpan.style.cssText = 'flex: 1; font-weight: 500;';
  } else {
    nameSpan.textContent = room.title || 'Direct Message';
    nameSpan.style.cssText = 'flex: 1;';
  }

  // Container for badges and buttons
  const rightContainer = document.createElement('div');
  rightContainer.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';

  // Unread badge
  const badge = document.createElement('span');
  badge.id = `contact-badge-${room.id}`;
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

  // Archive button
  const archiveBtn = document.createElement('button');
  archiveBtn.textContent = isArchived ? '📂' : '🗂';
  archiveBtn.title = isArchived ? 'Unarchive' : 'Archive';
  archiveBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; padding: 0.25rem; font-size: 16px; opacity: 0.6; transition: opacity 0.2s;';
  archiveBtn.onmouseover = () => archiveBtn.style.opacity = '1';
  archiveBtn.onmouseout = () => archiveBtn.style.opacity = '0.6';
  archiveBtn.onclick = async (e) => {
    e.stopPropagation();
    try {
      if (isArchived) {
        await unarchiveRoom(room.id);
      } else {
        await archiveRoom(room.id);
      }
      // Refresh sidebar
      refreshSidebar();
    } catch (error) {
      console.error('[Chat] Archive/unarchive failed:', error);
      alert('Failed to ' + (isArchived ? 'unarchive' : 'archive') + ' chat');
    }
  };

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑';
  deleteBtn.title = 'Delete/Leave';
  deleteBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; padding: 0.25rem; font-size: 16px; opacity: 0.6; transition: opacity 0.2s;';
  deleteBtn.onmouseover = () => deleteBtn.style.opacity = '1';
  deleteBtn.onmouseout = () => deleteBtn.style.opacity = '0.6';
  deleteBtn.onclick = async (e) => {
    e.stopPropagation();
    const roomName = room.title || 'this chat';
    if (confirm(`Delete/leave ${roomName}?`)) {
      try {
        await deleteRoom(room.id);
        // Remove from DOM
        li.remove();
        // If currently viewing this room, clear it
        if (state.currentConversationId === room.id) {
          state.currentConversationId = null;
          document.querySelector('#messages').innerHTML = '<div style="padding: 2rem; text-align: center; color: #9ca3af;">Select a chat to start messaging</div>';
        }
      } catch (error) {
        console.error('[Chat] Delete failed:', error);
        alert('Failed to delete/leave chat: ' + error.message);
      }
    }
  };

  rightContainer.appendChild(badge);
  rightContainer.appendChild(archiveBtn);
  rightContainer.appendChild(deleteBtn);

  // Normalize labels and button text (fix mojibake / icon issues)
  // This runs AFTER the buttons are created to avoid reference errors.
  try {
    if (room.type === 'group') {
      // If emojis don't render well, fall back to plain text label
      nameSpan.textContent = `Group: ${room.title || 'Untitled'}`;
      nameSpan.style.cssText = 'flex: 1; font-weight: 500;';
    }
    // Optionally normalize button text if emoji fonts are broken
    if (archiveBtn && /�/.test(archiveBtn.textContent)) {
      archiveBtn.textContent = isArchived ? 'Unarchive' : 'Archive';
    }
    if (deleteBtn && /�/.test(deleteBtn.textContent)) {
      deleteBtn.textContent = 'Delete';
    }
  } catch (e) { /* ignore */ }

  li.appendChild(nameSpan);
  li.appendChild(rightContainer);

  li.onclick = () => {
    // Mobile navigation: Show room name
    if (typeof window.chatShowConversation === 'function') {
      window.chatShowConversation(room.title);
    }
    openConversation(room.id);
  };

  return li;
}

/**
 * Refresh sidebar with current rooms (respecting archive filter)
 * OPTIMIZED: Uses cached data if available, only fetches if needed
 */
async function refreshSidebar(forceFetch = false) {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const sidebar = document.querySelector('#conversations');
  if (!sidebar) return;

  let userRooms;

  // OPTIMIZATION: Only fetch rooms if forced or not in state cache
  if (forceFetch || !state.cachedRooms) {
    // Get all rooms where user is a member
    const { data, error: roomsError } = await supabase
      .from('chat_room_members')
      .select('room_id, chat_rooms!inner(id, type, title, created_by)')
      .eq('user_id', user.id)
      .eq('status', 'approved');

    if (roomsError) {
      console.error('[Chat] Error loading rooms:', roomsError);
      return;
    }

    userRooms = data;
    state.cachedRooms = userRooms; // Cache for future refreshes
  } else {
    // Use cached rooms (no query needed)
    userRooms = state.cachedRooms;
    console.log('[Chat] Using cached rooms data (no query)');
  }

  // Clear sidebar
  sidebar.innerHTML = '';

  // Separate archived and non-archived rooms
  const nonArchivedRooms = [];
  const archivedRooms = [];

  userRooms?.forEach(membership => {
    const room = membership.chat_rooms;
    if (!room) return;
    if (isRoomArchived(room.id, user.id)) {
      archivedRooms.push(room);
    } else {
      nonArchivedRooms.push(room);
    }
  });

  // Render non-archived rooms
  nonArchivedRooms.forEach(room => {
    const li = createRoomListItem(room, user.id);
    sidebar.appendChild(li);
  });

  // Add Private folder section if there are archived rooms
  if (archivedRooms.length > 0) {
    const privateFolderHeader = document.createElement('li');
    privateFolderHeader.id = 'private-folder-header';
    privateFolderHeader.style.cssText = 'list-style: none; padding: 1rem; cursor: pointer; border-bottom: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;';

    const arrow = document.createElement('span');
    arrow.textContent = state.privateExpanded ? '▼' : '▶';
    arrow.style.cssText = 'font-size: 10px;';

    const label = document.createElement('span');
    label.textContent = `🔒 Private (${archivedRooms.length})`;

    privateFolderHeader.appendChild(arrow);
    privateFolderHeader.appendChild(label);
    // Normalize arrow and label glyphs
    try {
      arrow.textContent = state.privateExpanded ? '▾' : '▸';
      label.textContent = `Private (${archivedRooms.length})`;
    } catch (e) { /* ignore */ }

    privateFolderHeader.onclick = () => {
      state.privateExpanded = !state.privateExpanded;
      refreshSidebar(); // Re-render to show/hide archived rooms (uses cache)
    };

    sidebar.appendChild(privateFolderHeader);

    // Show archived rooms if expanded
    if (state.privateExpanded) {
      archivedRooms.forEach(room => {
        const li = createRoomListItem(room, user.id);
        li.style.background = '#f9fafb'; // Slightly different background
        sidebar.appendChild(li);
      });
    }
  }

  // Add users below rooms (for DM creation)
  state.users?.forEach(u => {
    const li = document.createElement('li');
    li.id = `contact-${u.id}`;
    li.dataset.userId = u.id;
    li.style.cssText = 'list-style: none; padding: 1rem; cursor: pointer; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; position: relative;';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = u.display_name || u.username || 'User';
    nameSpan.style.cssText = 'flex: 1;';

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
        const roomId = await openOrCreateDM(u.id);
        state.userRoomMap[u.id] = roomId;
        li.id = `contact-${roomId}`;
        badge.id = `contact-badge-${roomId}`;

        const contactName = u.display_name || u.username || 'User';
        if (typeof window.chatShowConversation === 'function') {
          window.chatShowConversation(contactName);
        }

        openConversation(roomId);
      } catch (error) {
        console.error('[Chat] Failed to open conversation:', error);
        alert('❌ Failed to open chat: ' + (error.message || 'Unknown error'));
      }
    };

    sidebar.appendChild(li);
  });
}

/**
 * Add a newly discovered room to the sidebar (when we receive a message for a room we don't have yet)
 */
async function addRoomToSidebar(roomId) {
  try {
    const supabase = await getSupabaseClient();

    // Fetch room details
    const { data: room, error } = await supabase
      .from('chat_rooms')
      .select('id, type, title, created_by')
      .eq('id', roomId)
      .single();

    if (error) {
      console.error('[Chat] Failed to fetch room:', error);
      return;
    }

    if (!room) {
      console.error('[Chat] Room not found:', roomId);
      return;
    }

    const sidebar = document.querySelector('#conversations');
    if (!sidebar) return;

    // Check if already exists (race condition guard)
    if (document.querySelector(`#contact-${roomId}`)) {
      console.log('[Chat] Room already in sidebar:', roomId);
      return;
    }

    console.log('[Chat] Adding room to sidebar:', room.title, room.type);

    const li = document.createElement('li');
    li.id = `contact-${roomId}`;
    li.dataset.roomId = roomId;
    li.style.cssText = 'list-style: none; padding: 1rem; cursor: pointer; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;';

    // Add green background for groups
    if (room.type === 'group') {
      li.style.background = '#f0fdf4';
    }

    // Room name with icon
    const nameSpan = document.createElement('span');
    if (room.type === 'group') {
      nameSpan.innerHTML = `<span style="margin-right: 0.5rem;">👥</span>${escapeHTML(room.title)}`;
      nameSpan.style.cssText = 'flex: 1; font-weight: 500;';
    } else {
      nameSpan.textContent = room.title || 'Direct Message';
      nameSpan.style.cssText = 'flex: 1;';
    }

    // Unread badge (show "1" since we just received a message)
    const badge = document.createElement('span');
    badge.id = `contact-badge-${roomId}`;
    badge.className = 'unread-badge';
    badge.textContent = '1';
    badge.style.cssText = `
      background: #ef4444;
      color: white;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: 600;
      min-width: 20px;
      text-align: center;
      display: inline-block;
    `;

    li.appendChild(nameSpan);
    li.appendChild(badge);

    li.onclick = () => {
      // Mobile navigation: Show room name
      if (typeof window.chatShowConversation === 'function') {
        window.chatShowConversation(room.title);
      }
      openConversation(roomId);
    };

    // Insert at the top of the sidebar (most recent first)
    if (sidebar.firstChild) {
      sidebar.insertBefore(li, sidebar.firstChild);
    } else {
      sidebar.appendChild(li);
    }

    console.log('[Chat] ✅ Room added to sidebar:', room.title);
  } catch (error) {
    console.error('[Chat] Error adding room to sidebar:', error);
  }
}

function renderContactList(list) {
  const sidebar = document.querySelector('#conversations');
  if (!sidebar) return;

  sidebar.innerHTML = '';

  if (list.length === 0) {
    const li = document.createElement('li');
    li.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9ca3af; font-size: 14px;">No contacts found</div>';
    sidebar.appendChild(li);
    return;
  }

  list.forEach(u => {
    const li = document.createElement('li');
    li.id = `contact-${u.id}`;
    li.dataset.userId = u.id;
    li.style.cssText = 'list-style: none; padding: 1rem; cursor: pointer; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = u.display_name || u.username || 'User';
    nameSpan.style.cssText = 'flex: 1;';

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
        const roomId = await openOrCreateDM(u.id);
        state.userRoomMap[u.id] = roomId;
        li.id = `contact-${roomId}`;
        badge.id = `contact-badge-${roomId}`;

        const contactName = u.display_name || u.username || 'User';
        if (typeof window.chatShowConversation === 'function') {
          window.chatShowConversation(contactName);
        }

        openConversation(roomId);
      } catch (error) {
        console.error('[Chat] Failed to open conversation:', error);
        alert('❌ Failed to open chat: ' + (error.message || 'Unknown error'));
      }
    };

    sidebar.appendChild(li);
  });
}

function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

// Track current search to prevent stale results
let currentSearchId = 0;

const doSearch = debounce(async (q) => {
  const searchId = ++currentSearchId;

  // Show loading indicator
  const sidebar = document.querySelector('#conversations');
  if (sidebar && q.length >= 2) {
    const loadingEl = document.createElement('div');
    loadingEl.id = 'search-loading';
    loadingEl.style.cssText = 'padding: 1rem; text-align: center; color: #9ca3af; font-size: 14px;';
    loadingEl.textContent = 'Searching...';
    sidebar.innerHTML = '';
    sidebar.appendChild(loadingEl);
  }

  const local = filterContactsLocal(q);

  // Only query server if search term is long enough
  if (q.length >= 2) {
    const remote = await queryContactsServer(q);

    // Check if this is still the current search
    if (searchId !== currentSearchId) {
      console.log('[Chat] Search result discarded (stale)');
      return;
    }

    // Merge local and remote results (no double rendering)
    if (remote && remote.length) {
      const map = new Map(local.map(x => [x.id, x]));
      remote.forEach(x => map.set(x.id, x));
      renderContactList([...map.values()]);
    } else {
      renderContactList(local);
    }
  } else {
    renderContactList(local);
  }

  // Remove loading indicator
  const loadingEl = document.querySelector('#search-loading');
  if (loadingEl) {
    loadingEl.remove();
  }
}, 150);

// =====================================================
// GROUP CHAT BUILDER
// =====================================================

const groupState = { selected: new Set(), title: '' };

function openGroupBuilderModal() {
  const m = document.createElement('div');
  m.id = 'groupBuilderModal';
  m.className = 'fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center';
  m.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 20000; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;';
  m.innerHTML = `
    <div style="background: white; width: 100%; max-width: 500px; border-radius: 1rem; padding: 1.5rem; margin: 1rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
        <h3 style="font-size: 1.125rem; font-weight: 600; margin: 0;">Create Group</h3>
        <button data-close style="padding: 0.25rem 0.5rem; border-radius: 0.5rem; border: none; background: #f3f4f6; cursor: pointer; font-size: 1.25rem;">✕</button>
      </div>
      <label style="display: block; margin-bottom: 1rem;">
        <span style="font-size: 0.875rem; color: #6b7280; display: block; margin-bottom: 0.25rem;">Group name</span>
        <input id="groupTitle" style="width: 100%; border-radius: 0.75rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem;" placeholder="e.g. Sunday Foursome"/>
      </label>
      <div style="max-height: 16rem; overflow: auto; border: 1px solid #e5e7eb; border-radius: 0.75rem; margin-bottom: 1rem;">
        <ul id="groupPickList" style="list-style: none; padding: 0; margin: 0;"></ul>
      </div>
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
        <button data-close style="border-radius: 0.75rem; border: 1px solid #d1d5db; padding: 0.5rem 1rem; background: white; cursor: pointer;">Cancel</button>
        <button id="createGroupBtn" style="border-radius: 0.75rem; padding: 0.5rem 1rem; background: #000; color: white; border: none; cursor: pointer;" disabled>Create</button>
      </div>
    </div>`;
  document.body.appendChild(m);

  // Ensure close button renders correctly
  const closeBtn = m.querySelector('[data-close]');
  if (closeBtn) closeBtn.textContent = '×';

  m.addEventListener('click', (e) => {
    if (e.target.dataset.close !== undefined || e.target === m) m.remove();
  });

  m.querySelector('#groupTitle')?.addEventListener('input', (e) => {
    groupState.title = e.target.value.trim();
    updateCreateButton();
  });

  const ul = m.querySelector('#groupPickList');
  (state.users || []).forEach(u => {
    const li = document.createElement('li');
    li.style.cssText = 'display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;';
    li.innerHTML = `
      <input type="checkbox" data-user="${u.id}" style="width: 1.25rem; height: 1.25rem; cursor: pointer;">
      <div style="flex: 1;">
        <div style="font-weight: 500;">${u.display_name || u.username || '(no name)'}</div>
      </div>`;
    ul.appendChild(li);
  });

  ul.addEventListener('change', (e) => {
    if (e.target?.dataset?.user) {
      const uid = e.target.dataset.user;
      e.target.checked ? groupState.selected.add(uid) : groupState.selected.delete(uid);
      updateCreateButton();
    }
  });

  m.querySelector('#createGroupBtn')?.addEventListener('click', createGroup);
}

function updateCreateButton() {
  const btn = document.getElementById('createGroupBtn');
  if (!btn) return;
  const ok = groupState.title.length >= 2 && groupState.selected.size >= 1;
  btn.disabled = !ok;
  btn.style.opacity = ok ? '1' : '0.4';
}

async function createGroup() {
  const creatorId = state.currentUserId || cachedUserId;
  const memberIds = [...groupState.selected];

  try {
    const supabase = await getSupabaseClient();

    // Use RPC function to create group (atomic transaction, bypasses RLS)
    const { data: roomId, error } = await supabase.rpc('create_group_room', {
      p_creator: creatorId,
      p_name: groupState.title,
      p_member_ids: memberIds,
      p_is_private: false
    });

    if (error) throw error;
    if (!roomId) throw new Error('No room ID returned from RPC');

    console.log('[Chat] ✅ Group created via RPC:', roomId);

    // Close modal and refresh sidebar to show new group
    document.getElementById('groupBuilderModal')?.remove();
    await refreshSidebar(true); // Force fetch to get newly created group

    // Open the new conversation
    openConversation(roomId);
    showThreadTab();
  } catch (err) {
    console.error('[Chat] Group creation failed:', err);
    alert('❌ Failed to create group: ' + (err.message || 'Unknown error'));
  }
}

// =====================================================
// JOIN REQUEST + APPROVAL
// =====================================================

async function requestJoin(roomId) {
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from('chat_room_members')
      .upsert(
        { room_id: roomId, user_id: state.currentUserId, status: 'pending', role: 'member' },
        { onConflict: 'room_id,user_id' }
      );
    if (error) throw error;
    console.log('[Chat] ✅ Join request sent');
  } catch (err) {
    console.error('[Chat] Join request failed:', err);
    alert('❌ Failed to request join: ' + (err.message || 'Unknown error'));
  }
}

async function approveMember(roomId, userId) {
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from('chat_room_members')
      .update({ status: 'approved' })
      .eq('room_id', roomId)
      .eq('user_id', userId);
    if (error) throw error;

    await supabase.from('chat_messages').insert({
      room_id: roomId, sender: state.currentUserId, content: `approved a new member.`
    });

    console.log('[Chat] ✅ Member approved');
  } catch (err) {
    console.error('[Chat] Approval failed:', err);
    alert('❌ Failed to approve member: ' + (err.message || 'Unknown error'));
  }
}

export async function initChat() {
  // Show version indicator (visible on mobile)
  console.log('[Chat] ⚡ VERSION: 2025-10-15-INSTANT-LOAD-FIX');
  const startTime = performance.now();

  // Initialize UI element references
  initUIRefs();

  const supabase = await getSupabaseClient();
  const sidebar = document.querySelector('#conversations');

  if (!sidebar) {
    console.error('[Chat] ❌ Chat sidebar element #conversations not found. Abort init.');
    return;
  }

  // OPTIMIZATION 1: Show skeleton UI immediately (perceived performance)
  sidebar.innerHTML = `
    <div style="padding: 1rem;">
      <div style="height: 60px; background: #f3f4f6; border-radius: 8px; margin-bottom: 0.5rem; animation: pulse 1.5s ease-in-out infinite;"></div>
      <div style="height: 60px; background: #f3f4f6; border-radius: 8px; margin-bottom: 0.5rem; animation: pulse 1.5s ease-in-out infinite; animation-delay: 0.1s;"></div>
      <div style="height: 60px; background: #f3f4f6; border-radius: 8px; margin-bottom: 0.5rem; animation: pulse 1.5s ease-in-out infinite; animation-delay: 0.2s;"></div>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    </style>
  `;

  // OPTIMIZATION 2: Fast path - Get user ID without auth bridge (only if needed)
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
  state.currentUserId = user.id; // Store in state for group operations
  cachedUserId = user.id; // Cache for performance

  // OPTIMIZATION 3: Parallel data loading (rooms + users at same time)
  const [roomsResult, usersResult] = await Promise.all([
    // Load user's rooms (most important - shows recent conversations)
    supabase
      .from('chat_room_members')
      .select('room_id, chat_rooms!inner(id, type, title, created_by)')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .limit(20), // Limit to 20 most recent rooms for speed

    // Load ALL REAL users from profiles table
    supabase
      .from('profiles')
      .select('id, display_name, username, line_user_id')
      .neq('id', user.id)
      .order('display_name')
  ]);

  const { data: userRooms, error: roomsError} = roomsResult;
  const { data: allUsers, error: usersError } = usersResult;

  if (roomsError) {
    console.error('[Chat] ❌ Failed to load rooms:', roomsError);
  }

  if (usersError) {
    console.error('[Chat] ❌ Failed to load contacts:', usersError);
    sidebar.innerHTML = '<div style="padding: 2rem; text-align: center; color: #ef4444;">❌ Failed to load contacts</div>';
    return;
  }

  // Users are already in correct format from profiles table (no transformation needed)
  const transformedUsers = (allUsers || [])
    .filter(u => !!u.id && !!u.line_user_id)  // Only include valid profiles
    .map(u => ({
      id: u.id,
      display_name: u.display_name || u.username || 'User',
      username: u.username || u.line_user_id,
      line_user_id: u.line_user_id
    }));
  console.log('[Chat] Loaded', transformedUsers.length, 'contacts from profiles table');

  // Store in state for search functionality and caching
  state.users = transformedUsers;
  state.cachedRooms = userRooms; // Cache rooms for refreshSidebar

  // OPTIMIZATION 4: Render UI immediately (don't wait for unread counts)
  sidebar.innerHTML = '';

  // Separate archived and non-archived rooms
  const nonArchivedRooms = [];
  const archivedRooms = [];

  userRooms?.forEach(membership => {
    const room = membership.chat_rooms;
    if (!room) return;
    if (isRoomArchived(room.id, user.id)) {
      archivedRooms.push(room);
    } else {
      nonArchivedRooms.push(room);
    }
  });

  // Render non-archived rooms
  nonArchivedRooms.forEach(room => {
    const li = createRoomListItem(room, user.id);
    sidebar.appendChild(li);
  });

  // Add Private folder section if there are archived rooms
  if (archivedRooms.length > 0) {
    const privateFolderHeader = document.createElement('li');
    privateFolderHeader.id = 'private-folder-header';
    privateFolderHeader.style.cssText = 'list-style: none; padding: 1rem; cursor: pointer; border-bottom: 1px solid #e5e7eb; background: #f9fafb; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;';

    const arrow = document.createElement('span');
    arrow.textContent = state.privateExpanded ? '▼' : '▶';
    arrow.style.cssText = 'font-size: 10px;';

    const label = document.createElement('span');
    label.textContent = `🔒 Private (${archivedRooms.length})`;

    privateFolderHeader.appendChild(arrow);
    privateFolderHeader.appendChild(label);

    privateFolderHeader.onclick = () => {
      state.privateExpanded = !state.privateExpanded;
      refreshSidebar(); // Re-render to show/hide archived rooms
    };

    sidebar.appendChild(privateFolderHeader);

    // Show archived rooms if expanded
    if (state.privateExpanded) {
      archivedRooms.forEach(room => {
        const li = createRoomListItem(room, user.id);
        li.style.background = '#f9fafb'; // Slightly different background
        sidebar.appendChild(li);
      });
    }
  }

  // Add users below rooms (for DM creation)
  state.users?.forEach(u => {
    const li = document.createElement('li');
    li.id = `contact-${u.id}`;
    li.dataset.userId = u.id;
    li.style.cssText = 'list-style: none; padding: 1rem; cursor: pointer; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; position: relative;';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = u.display_name || u.username || 'User';
    nameSpan.style.cssText = 'flex: 1;';

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
        const roomId = await openOrCreateDM(u.id);
        state.userRoomMap[u.id] = roomId;
        li.id = `contact-${roomId}`;
        badge.id = `contact-badge-${roomId}`;

        const contactName = u.display_name || u.username || 'User';
        if (typeof window.chatShowConversation === 'function') {
          window.chatShowConversation(contactName);
        }

        openConversation(roomId);
      } catch (error) {
        console.error('[Chat] Failed to open conversation:', error);
        alert('❌ Failed to open chat: ' + (error.message || 'Unknown error'));
      }
    };

    sidebar.appendChild(li);
  });

  // OPTIMIZATION 5: Wire up event listeners immediately (don't block on data)
  const sendBtn = document.querySelector('#sendBtn');
  if (sendBtn) {
    sendBtn.onclick = sendCurrent;
  } else {
    console.warn('[Chat] ⚠️ #sendBtn not found');
  }
  const composer = document.querySelector('#composer');
  if (!composer) {
    console.warn('[Chat] ⚠️ #composer not found');
  }

  // Store event listener references for cleanup (MEMORY LEAK FIX)
  eventListeners.composer.input = () => {
    if (state.currentConversationId) typing(state.currentConversationId);
  };
  if (composer) composer.addEventListener('input', eventListeners.composer.input);

  // Enter key to send
  eventListeners.composer.keypress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendCurrent();
    }
  };
  if (composer) composer.addEventListener('keypress', eventListeners.composer.keypress);

  // Wire up contacts search
  eventListeners.search = (e) => doSearch(e.target.value);
  ui.contactsSearch?.addEventListener('input', eventListeners.search);

  // Wire up group builder button
  eventListeners.groupBtn = openGroupBuilderModal;
  ui.openGroupBtn?.addEventListener('click', eventListeners.groupBtn);

  const loadTime = performance.now() - startTime;
  console.log(`[Chat] ✅ Chat initialized in ${loadTime.toFixed(0)}ms`);

  // OPTIMIZATION 6: Load unread badges in background (non-blocking)
  // This happens AFTER UI is rendered, so user sees instant load
  setTimeout(async () => {
    try {
      await updateUnreadBadge();
      console.log('[Chat] ✅ Unread badges updated (background)');
    } catch (error) {
      console.error('[Chat] Failed to load unread badges:', error);
    }
  }, 0);
}

/**
 * Adaptive backfill wrapper: 0ms throttle when visible, 8s when background
 */
async function backfillIfAllowed(reason = 'auto') {
  // Guard: Prevent concurrent backfills
  if (state.backfillInFlight) {
    console.log('[Chat] Backfill skipped — already running');
    return;
  }

  // Adaptive throttle based on visibility
  const now = Date.now();
  const minGap = (document.visibilityState === 'visible')
    ? BACKFILL_MIN_MS_ACTIVE
    : BACKFILL_MIN_MS_BG;

  if (now - state.lastBackfillAt < minGap) {
    console.log('[Chat] Backfill throttled (too soon since last backfill)');
    return;
  }

  state.backfillInFlight = true;

  try {
    await backfillMissedMessages(reason);
  } finally {
    state.lastBackfillAt = Date.now();
    state.backfillInFlight = false;
  }
}

/**
 * Backfill missed messages (covers tab sleep, CHANNEL_ERROR, etc.)
 * OPTIMIZED: Uses per-room last_seen_timestamp, pagination, and real-time locking
 */
async function backfillMissedMessages(reason = 'auto') {
  console.log('[Chat] Backfilling messages, reason:', reason);

  const startTime = Date.now();

  try {
    if (!cachedUserId || cachedUserId === 'null') {
      console.log('[Chat] No user ID cached, skipping backfill');
      return;
    }

    const supabase = await getSupabaseClient();

    // Get all rooms user is member of
    const { data: memberRooms, error: roomsError } = await supabase
      .from('chat_room_members')
      .select('room_id')
      .eq('user_id', cachedUserId)
      .eq('status', 'approved');

    if (roomsError) {
      console.error('[Chat] Backfill error getting rooms:', roomsError);
      return;
    }

    const roomIds = memberRooms?.map(r => r.room_id) || [];
    if (roomIds.length === 0) {
      console.log('[Chat] No rooms to backfill');
      return;
    }

    // Note: backfillInFlight lock is managed by backfillIfAllowed wrapper
    let totalMessages = 0;
    const PAGE_SIZE = 50;

    // Backfill each room using its own last_seen_timestamp
    for (const roomId of roomIds) {
      const lastSeen = getLastSeenTimestamp(roomId, cachedUserId);

      let hasMore = true;
      let offset = 0;

      while (hasMore) {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('room_id', roomId)
          .gt('created_at', lastSeen)
          .neq('sender', cachedUserId)
          .order('created_at', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
          console.error('[Chat] Backfill error for room', roomId, ':', error);
          break;
        }

        if (data && data.length > 0) {
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
          totalMessages += data.length;
        }

        // Check if there are more pages
        hasMore = data && data.length === PAGE_SIZE;
        offset += PAGE_SIZE;

        // Safety: Don't fetch more than 5 pages per room
        if (offset >= PAGE_SIZE * 5) {
          console.warn('[Chat] Backfill limit reached for room', roomId);
          break;
        }
      }
    }

    console.log(`[Chat] ⚡ Backfill: ${totalMessages} msgs in ${Date.now() - startTime}ms (reason: ${reason})`);
  } catch (error) {
    console.error('[Chat] Backfill failed:', error);
    throw error; // Re-throw so backfillIfAllowed can handle cleanup
  }
}

/**
 * Subscribe to all messages globally with reconnect + backfill hardening (SINGLETON)
 */
export async function subscribeGlobalMessages() {
  console.time('[Chat] ⚡ Realtime join');

  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

    if (!cachedUserId || cachedUserId === 'null') {
    cachedUserId = user.id;
  }

  // SINGLETON GUARD: If already joined, keep existing subscription
  if (state.globalSub && state.globalSub.state === 'joined') {
    console.log('[Chat] Global subscription already active — skip');
    console.timeEnd('[Chat] ⚡ Realtime join');
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
        console.timeEnd('[Chat] ⚡ Realtime join');
        state.channelErrorRetries = 0; // Reset retry counter on success
        if (state.channelErrorTimer) {
          clearTimeout(state.channelErrorTimer);
          state.channelErrorTimer = null;
        }
        backfillIfAllowed('subscribed');
      }
      if (status === 'CHANNEL_ERROR') {
        console.error('[Chat] ❌ Channel error:', err);

        // Exponential backoff: 2s, 4s, 8s, 16s, 30s (max)
        if (state.channelErrorRetries < state.maxChannelRetries) {
          const delay = Math.min(30000, 2000 * (2 ** state.channelErrorRetries));
          state.channelErrorRetries++;

          console.warn(`[Chat] ⚠️ Retrying in ${delay}ms (attempt ${state.channelErrorRetries}/${state.maxChannelRetries})`);

          // Clear any pending retry
          if (state.channelErrorTimer) {
            clearTimeout(state.channelErrorTimer);
          }

          state.channelErrorTimer = setTimeout(async () => {
            console.log('[Chat] Retry attempt:', state.channelErrorRetries);
            // Tear down and restart completely
            try {
              await state.globalSub?.unsubscribe();
              state.globalSub = null;
              await subscribeGlobalMessages();
            } catch (retryErr) {
              console.error('[Chat] ❌ Retry failed:', retryErr);
            }
          }, delay);
        } else {
          console.error('[Chat] ❌ Max retries reached - falling back to polling mode');
          try { startPollingFallback(); } catch (e) { /* ignore */ }
        }
      }
    });

  return state.globalSub;
}

/**
 * Restart realtime connection (for stale socket detection)
 */
async function restartRealtime() {
  console.log('[Chat] Restarting realtime connection...');
  try {
    await state.globalSub?.unsubscribe?.();
  } catch (err) {
    console.warn('[Chat] Error unsubscribing during restart:', err);
  }
  state.globalSub = null;
  await subscribeGlobalMessages(); // Singleton guard prevents duplicates
  console.log('[Chat] ✅ Realtime connection restarted');
}

/**
 * Teardown chat subscriptions (cleanup on logout/account switch)
 * MEMORY LEAK FIX: Also removes all event listeners
 */
export async function teardownChat() {
  console.log('[Chat] Tearing down all subscriptions and event listeners');

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

  // MEMORY LEAK FIX: Remove all event listeners
  const composer = document.querySelector('#composer');
  if (composer && eventListeners.composer.input) {
    composer.removeEventListener('input', eventListeners.composer.input);
  }
  if (composer && eventListeners.composer.keypress) {
    composer.removeEventListener('keypress', eventListeners.composer.keypress);
  }

  if (ui.contactsSearch && eventListeners.search) {
    ui.contactsSearch.removeEventListener('input', eventListeners.search);
  }

  if (ui.openGroupBtn && eventListeners.groupBtn) {
    ui.openGroupBtn.removeEventListener('click', eventListeners.groupBtn);
  }

  // Remove lifecycle event listeners
  if (eventListeners.lifecycle.visibilitychange) {
    document.removeEventListener('visibilitychange', eventListeners.lifecycle.visibilitychange);
  }
  if (eventListeners.lifecycle.focus) {
    window.removeEventListener('focus', eventListeners.lifecycle.focus);
  }
  if (eventListeners.lifecycle.online) {
    window.removeEventListener('online', eventListeners.lifecycle.online);
  }
  if (eventListeners.lifecycle.pagehide) {
    window.removeEventListener('pagehide', eventListeners.lifecycle.pagehide);
  }
  if (eventListeners.lifecycle.pageshow) {
    window.removeEventListener('pageshow', eventListeners.lifecycle.pageshow);
  }

  // Clear event listener references
  eventListeners.composer.input = null;
  eventListeners.composer.keypress = null;
  eventListeners.search = null;
  eventListeners.groupBtn = null;
  eventListeners.lifecycle = {
    visibilitychange: null,
    focus: null,
    online: null,
    pagehide: null,
    pageshow: null
  };

  console.log('[Chat] ✅ All subscriptions and event listeners torn down');
}

/**
 * Mobile lifecycle event handlers (visibility, focus, online, iOS pagehide/pageshow)
 * These trigger gentle backfill without re-rendering the UI
 * MEMORY LEAK FIX: Store references for cleanup
 */
function initMobileLifecycleHandlers() {
  // Use Page Visibility API (more reliable on mobile than focus)
  eventListeners.lifecycle.visibilitychange = () => {
    if (document.visibilityState === 'visible') {
      console.log('[Chat] Page became visible - backfilling (adaptive, instant)');
      backfillIfAllowed('visibility');
    }
  };
  document.addEventListener('visibilitychange', eventListeners.lifecycle.visibilitychange);

  // Focus event (fallback for older browsers)
  eventListeners.lifecycle.focus = () => {
    console.log('[Chat] Window focused - backfilling (adaptive)');
    backfillIfAllowed('focus');
  };
  window.addEventListener('focus', eventListeners.lifecycle.focus);

  // Network reconnection - resubscribe and backfill
  eventListeners.lifecycle.online = async () => {
    console.log('[Chat] Network reconnected - resubscribing');
    await subscribeGlobalMessages();
    if (state.currentConversationId && state.channels[state.currentConversationId]) {
      // Room subscription is already managed by openConversation
      console.log('[Chat] Room subscription already active');
    }
    backfillIfAllowed('online');
  };
  window.addEventListener('online', eventListeners.lifecycle.online);

  // iOS Safari edge case: pagehide/pageshow (Safari kills timers on background)
  // CRITICAL: Must tear down WebSocket connections to prevent stale sockets from bfcache
  eventListeners.lifecycle.pagehide = async () => {
    state.pageHiddenAt = Date.now();
    console.log('[Chat] Page hidden (iOS Safari) - tearing down WebSocket connections');

    // Tear down all WebSocket subscriptions to prevent stale connections
    try {
      if (state.globalSub) {
        await state.globalSub.unsubscribe();
        state.globalSub = null;
      }

      // Tear down room subscriptions
      const supabase = await getSupabaseClient();
      for (const [conversationId, channel] of Object.entries(state.channels)) {
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.warn('[Chat] Error removing channel on pagehide:', conversationId, err);
        }
      }
      state.channels = {};

      console.log('[Chat] ✅ All WebSocket connections torn down');
    } catch (err) {
      console.error('[Chat] Error during pagehide cleanup:', err);
    }
  };
  window.addEventListener('pagehide', eventListeners.lifecycle.pagehide);

  eventListeners.lifecycle.pageshow = async (event) => {
    console.log('[Chat] Page shown (iOS Safari) - persisted:', event.persisted, '- forcing fresh subscriptions');

    // Always force fresh subscriptions on pageshow (even if not from bfcache)
    // This ensures WebSocket connections are re-established properly
    state.globalSub = null; // Clear any stale references
    state.channels = {}; // Clear any stale channel references

    // Re-establish global subscription
    await subscribeGlobalMessages();

    // Re-establish room subscription if we were viewing a conversation
    if (state.currentConversationId) {
      console.log('[Chat] Re-opening conversation after pageshow:', state.currentConversationId);
      // Re-open the conversation to re-establish subscription
      const conversationId = state.currentConversationId;
      state.currentConversationId = null; // Clear to force re-subscription
      await openConversation(conversationId);
    }

    // Backfill any missed messages
    backfillIfAllowed('pageshow');
  };
  window.addEventListener('pageshow', eventListeners.lifecycle.pageshow);
}

/**
 * WebSocket keepalive for mobile (prevents socket sleep)
 * Uses harmless SELECT + HEAD to Realtime path to keep socket hot
 */
function initWebSocketKeepalive() {
  setInterval(async () => {
    if (document.visibilityState !== 'visible') return;

    try {
      const supabase = await getSupabaseClient();
      const supabaseUrl = supabase.supabaseUrl;
      const anonKey = supabase.supabaseKey;

      // Keepalive ping to REST (prevents connection timeout)
      fetch(`${supabaseUrl}/rest/v1/?select=1`, {
        method: 'GET',
        cache: 'no-store',
        keepalive: true,
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Prefer': 'count=none'
        }
      }).catch(() => {});
    } catch (err) {
      // Ignore errors - this is just a keepalive ping
    }
  }, 25000); // Every 25 seconds
}

// Production log control with debug flag
const DEBUG = typeof location !== 'undefined' &&
  (location.hostname === 'localhost' ||
   location.hostname === '127.0.0.1' ||
   window.__chatDebug === true); // Allow enabling debug logs in production

if (!DEBUG && typeof console !== 'undefined') {
  const originalLog = console.log;
  const originalDebug = console.debug;

  console.log = (...args) => {
    // In production, only log chat messages that are errors or critical
    if (args[0]?.includes('[Chat] ❌') || args[0]?.includes('[Chat] ⚠️')) {
      originalLog.apply(console, args);
    }
  };

  console.debug = () => {}; // Silence debug completely

  originalLog('[Chat] Production mode - use window.__chatDebug = true to enable logs');
}

// Initialize mobile lifecycle handlers and keepalive once
if (typeof window !== 'undefined') {
  initMobileLifecycleHandlers();
  initWebSocketKeepalive();

  // Stale-link detector with jittered backoff (prevents rapid restarts on flappy networks)
  let staleFailures = 0;
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    const staleMs = Date.now() - (state.lastRealtimeAt || 0);
    if (staleMs > 5000 && state.lastRealtimeAt > 0) {
      // Exponential backoff with jitter: 1s, 2s, 4s, 8s, max 15s
      const backoff = Math.min(15000, 1000 * (2 ** staleFailures)) + Math.random() * 400;
      console.warn('[Chat] ⚠️ Realtime stale, restarting in', Math.round(backoff) + 'ms');
      staleFailures++;
      setTimeout(async () => {
        await restartRealtime();
        await backfillIfAllowed('stale-restart');
        staleFailures = 0; // Reset on success
      }, backoff);
    }
  }, 3000);
}

// Polling fallback when realtime is unavailable
function startPollingFallback() {
  if (state.pollingTimer) return; // already active
  console.warn('[Chat] Polling fallback enabled (realtime unavailable)');
  state.pollingTimer = setInterval(async () => {
    try {
      await backfillIfAllowed('polling');
      await updateUnreadBadge();
      // Occasionally try to restore realtime
      if (!state.globalSub || state.globalSub.state !== 'joined') {
        await subscribeGlobalMessages();
      } else {
        stopPollingFallback();
      }
    } catch (e) { /* ignore */ }
  }, state.pollingIntervalMs || 10000);
}

function stopPollingFallback() {
  if (state.pollingTimer) {
    clearInterval(state.pollingTimer);
    state.pollingTimer = null;
    console.log('[Chat] Polling fallback stopped');
  }
}

// Expose for manual testing
window.__chat = {
  openConversation,
  sendCurrent,
  initChat,
  openOrCreateDM,
  updateUnreadBadge,
  subscribeGlobalMessages,
  teardownChat, // Expose teardown for logout cleanup
  requestJoin, // Group join request
  approveMember, // Approve pending member
  openGroupBuilderModal, // Open group creation modal
  refreshSidebar, // Refresh sidebar with archive/delete controls
  archiveRoom, // Archive a chat
  deleteRoom // Delete/leave a chat
};
