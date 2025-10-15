// Full chat UI glue (vanilla JS) wired to Supabase helpers
import { openOrCreateDM, listRooms, fetchMessages, sendMessage, subscribeToConversation, markRead, typing, subscribeTyping, getUnreadCount, updateUnreadBadge, deleteRoom, archiveRoom, unarchiveRoom, isRoomArchived } from './chat-database-functions.js';
import { getSupabaseClient } from './supabaseClient.js';
import { ensureSupabaseSessionWithLIFF } from './auth-bridge.js';

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
  privateExpanded: false, // Track if Private folder is expanded
};

// UI element references (cached for performance)
const ui = {
  contactsSearch: null,
  openGroupBtn: null
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

// Message deduplication using Set (faster than DOM queries)
const seenMessageIds = new Set();
const MAX_SEEN_IDS = 2000; // Increased cap to reduce false negatives (2KB memory)

// Helper to remember message ID with memory cap (FIFO eviction)
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

// Adaptive backfill throttle: Optimized to reduce excessive queries
const BACKFILL_MIN_MS_ACTIVE = 1000;  // 1s throttle when visible (was 0ms - too aggressive)
const BACKFILL_MIN_MS_BG = 15000;     // 15s throttle when backgrounded (was 8s)

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
  // If no query, return empty array (search should restore sidebar, not show all users)
  if (!qn) return [];

  // DEBUG: If query is just 1-2 chars, show ALL users (easier to find people)
  if (qn.length <= 2) {
    console.warn('[Chat] 🔍 Short query - showing all users');
    return items;
  }

  return items.filter(u => {
    const name = normalize(u.display_name || u.username || '');
    const uid = (u.id || '').toString().toLowerCase();
    return name.includes(qn) || uid.startsWith(qn);
  });
}

let searchAbortCtrl = null;
async function queryContactsServer(q) {
  if (!q || q.length < 3) return null; // Only query server for 3+ chars (local handles 1-2)
  try {
    searchAbortCtrl?.abort();
    searchAbortCtrl = new AbortController();
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, username')
      .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
      .limit(25)
      .abortSignal(searchAbortCtrl.signal);
    if (error) throw error;
    return data || [];
  } catch {
    return null;
  }
}

/**
 * Get the display name for a DM room (the other person's name)
 */
async function getDMRoomDisplayName(roomId, currentUserId) {
  try {
    const supabase = await getSupabaseClient();

    console.warn('[Chat] 🔍 Looking up DM partner for room:', roomId, 'excluding user:', currentUserId?.substring(0, 8));

    // Get the other member (not current user)
    const { data: members, error } = await supabase
      .from('chat_room_members')  // FIXED: Was 'room_members' - should be 'chat_room_members'
      .select('user_id, profiles!chat_room_members_user_id_fkey(display_name, username)')
      .eq('room_id', roomId)
      .neq('user_id', currentUserId)
      .limit(1);

    console.warn('[Chat] 🔍 Query result:', { error, memberCount: members?.length });

    if (error) {
      console.error('[Chat] Error querying chat_room_members:', error);
      return 'Direct Message';
    }

    if (!members || members.length === 0) {
      console.warn('[Chat] No partner found for room:', roomId);
      return 'Direct Message';
    }

    const partner = members[0].profiles;
    const displayName = partner?.display_name || partner?.username || 'User';
    console.warn('[Chat] 🔍 Found partner:', displayName);

    return displayName;
  } catch (error) {
    console.error('[Chat] Error getting DM display name:', error);
    return 'Direct Message';
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
    // For DMs: Show loading, then fetch partner's name
    nameSpan.textContent = 'Loading...';
    nameSpan.style.cssText = 'flex: 1;';

    // Fetch partner's name asynchronously
    getDMRoomDisplayName(room.id, userId).then(displayName => {
      nameSpan.textContent = displayName;
    });
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
 */
async function refreshSidebar() {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const sidebar = document.querySelector('#conversations');
  if (!sidebar) return;

  // Get all rooms where user is a member, including other members for DM name lookup
  const { data: userRooms, error: roomsError } = await supabase
    .from('chat_room_members')
    .select(`
      room_id,
      chat_rooms!inner(id, type, title, created_by)
    `)
    .eq('user_id', user.id)
    .eq('status', 'approved');

  if (roomsError) {
    console.error('[Chat] Error loading rooms:', roomsError);
    return;
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

  // REMOVED: Don't show all users by default
  // Users should only appear in search results or as active conversations
  // If no conversations exist, show helpful message
  if (nonArchivedRooms.length === 0 && archivedRooms.length === 0) {
    const emptyMessage = document.createElement('li');
    emptyMessage.style.cssText = 'list-style: none; padding: 2rem; text-align: center; color: #9ca3af;';
    emptyMessage.innerHTML = `
      <div style="font-size: 14px;">
        <p style="margin-bottom: 0.5rem;">No conversations yet</p>
        <p style="font-size: 12px; color: #6b7280;">Use the search box above to find people</p>
        <p style="font-size: 12px; color: #6b7280;">or create a group to start chatting</p>
      </div>
    `;
    sidebar.appendChild(emptyMessage);
  }
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
      // For DMs: Fetch partner's name
      nameSpan.textContent = 'Loading...';
      nameSpan.style.cssText = 'flex: 1;';

      // Get current user ID to exclude from search
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          getDMRoomDisplayName(roomId, data.user.id).then(displayName => {
            nameSpan.textContent = displayName;
          });
        }
      });
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

  // CRITICAL FIX: Filter out current user from search results
  const currentUserId = state.currentUserId || cachedUserId;
  const filteredList = list.filter(u => u.id !== currentUserId);

  if (filteredList.length === 0) {
    const li = document.createElement('li');
    li.innerHTML = `<div style="text-align: center; padding: 2rem; color: #9ca3af; font-size: 14px;">
      <p style="margin: 0 0 0.5rem 0;">No contacts found</p>
      <p style="margin: 0; font-size: 12px; color: #6b7280;">${state.users?.length || 0} users available - try a different search</p>
    </div>`;
    sidebar.appendChild(li);
    return;
  }

  filteredList.forEach(u => {
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

        const contactName = u.display_name || u.username || 'User';
        if (typeof window.chatShowConversation === 'function') {
          window.chatShowConversation(contactName);
        }

        openConversation(roomId);

        // CRITICAL FIX: Refresh sidebar to show the new/existing conversation
        // This restores the normal view after searching
        if (ui.contactsSearch) {
          ui.contactsSearch.value = ''; // Clear search box
        }
        await refreshSidebar();
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

const doSearch = debounce(async (q) => {
  // CRITICAL FIX: If search is empty, restore sidebar to show rooms instead of users
  if (!q || q.trim().length === 0) {
    await refreshSidebar();
    return;
  }

  // DEBUG: Log search activity (always show, even in production)
  console.warn('[Chat] 🔍 Searching for:', q, '| Local users available:', state.users?.length || 0);

  // DEBUG: Show ALL available users with their names
  if (state.users && state.users.length > 0) {
    console.warn('[Chat] 🔍 Available users:', state.users.map(u => ({
      id: u.id.substring(0, 8) + '...',
      display_name: u.display_name,
      username: u.username
    })));
  }

  const local = filterContactsLocal(q);
  console.warn('[Chat] 🔍 Local results:', local.length);

  if (local.length > 0) {
    console.warn('[Chat] 🔍 Matched users:', local.map(u => u.display_name || u.username));
  }

  renderContactList(local);

  const remote = await queryContactsServer(q);
  console.warn('[Chat] 🔍 Remote results:', remote?.length || 0);

  if (remote && remote.length) {
    const map = new Map(local.map(x => [x.id, x]));
    remote.forEach(x => map.set(x.id, x));
    const combined = [...map.values()];
    console.warn('[Chat] 🔍 Combined total:', combined.length);
    renderContactList(combined);
  }
}, 220);

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
    await refreshSidebar();

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
  console.log('[Chat] ⚡ VERSION: 2025-10-14-PERFORMANCE-OPTIMIZED');
  console.log('[Chat] Optimizations: Batch unread queries, better reconnect logic, reduced stale detection');

  // Initialize UI element references
  initUIRefs();

  const supabase = await getSupabaseClient();
  const sidebar = document.querySelector('#conversations');
  sidebar.innerHTML = '<div style="padding: 2rem; text-align: center; color: #9ca3af;">Loading...<br><small style="color: #6b7280; font-size: 10px;">⚡ v2025-10-14-PERF</small></div>';

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
  state.currentUserId = user.id; // Store in state for group operations

  // Load users only (skip conversations for now - they're empty anyway)
  const { data: allUsers, error: usersError } = await supabase
    .from('profiles')
    .select('id, display_name, username')
    .neq('id', user.id)
    .limit(50); // Limit results for speed

  if (usersError) {
    console.error('[Chat] ❌ Failed to load contacts:', usersError);
    sidebar.innerHTML = '<div style="padding: 2rem; text-align: center; color: #ef4444;">❌ Failed to load contacts</div>';
    return;
  }

  sidebar.innerHTML = '';
  console.warn('[Chat] 📋 Loaded', allUsers?.length || 0, 'users from profiles table');

  // DEBUG: Show all loaded user IDs and names
  if (allUsers && allUsers.length > 0) {
    console.warn('[Chat] 📋 Available profiles:', allUsers.map(u => ({
      id: u.id,
      display_name: u.display_name,
      username: u.username
    })));
  } else {
    console.warn('[Chat] ⚠️ WARNING: No profiles found! This means only 1 user exists in profiles table (you)');
  }

  // Store users in state for search functionality
  state.users = allUsers || [];

  // Use refreshSidebar to render all rooms and contacts with archive/delete buttons
  await refreshSidebar();

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

  // Wire up contacts search
  ui.contactsSearch?.addEventListener('input', (e) => doSearch(e.target.value));

  // Wire up group builder button
  ui.openGroupBtn?.addEventListener('click', openGroupBuilderModal);

  console.log('[Chat] ✅ All event listeners initialized');
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
 */
async function backfillMissedMessages(reason = 'auto') {
  console.log('[Chat] Backfilling messages, reason:', reason);

  const startTime = Date.now();
  const now = Date.now();

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
      console.log(`[Chat] ⚡ Backfill: ${data.length} msgs in ${Date.now() - startTime}ms (reason: ${reason})`);
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
    } else {
      console.log(`[Chat] ⚡ Backfill: 0 msgs in ${Date.now() - startTime}ms (reason: ${reason})`);
    }
  } catch (error) {
    console.error('[Chat] Backfill failed:', error);
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

  if (!cachedUserId) {
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

  // Reconnection backoff state
  let reconnectAttempts = 0;
  const MAX_RECONNECT_DELAY = 30000; // Cap at 30 seconds

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
        reconnectAttempts = 0; // Reset on success
        backfillIfAllowed('subscribed');
      }
      if (status === 'CHANNEL_ERROR') {
        // Exponential backoff with jitter: 2s, 4s, 8s, 16s, 30s (max)
        reconnectAttempts++;
        const baseDelay = Math.min(MAX_RECONNECT_DELAY, 1000 * (2 ** reconnectAttempts));
        const jitter = Math.random() * 1000; // Add 0-1s jitter
        const delay = baseDelay + jitter;
        console.warn(`[Chat] ⚠️ Channel error - retrying in ${Math.round(delay)}ms (attempt ${reconnectAttempts})`);
        setTimeout(() => state.globalSub?.subscribe(), delay);
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
      console.log('[Chat] Page became visible - backfilling (adaptive, instant)');
      backfillIfAllowed('visibility');
    }
  });

  // Focus event (fallback for older browsers)
  window.addEventListener('focus', () => {
    console.log('[Chat] Window focused - backfilling (adaptive)');
    backfillIfAllowed('focus');
  });

  // Network reconnection - resubscribe and backfill
  window.addEventListener('online', async () => {
    console.log('[Chat] Network reconnected - resubscribing');
    await subscribeGlobalMessages();
    if (state.currentConversationId && state.channels[state.currentConversationId]) {
      // Room subscription is already managed by openConversation
      console.log('[Chat] Room subscription already active');
    }
    backfillIfAllowed('online');
  });

  // iOS Safari edge case: pagehide/pageshow (Safari kills timers on background)
  window.addEventListener('pagehide', () => {
    // Don't tear down channels, just mark timestamp
    state.pageHiddenAt = Date.now();
    console.log('[Chat] Page hidden (iOS Safari)');
  });

  window.addEventListener('pageshow', async (event) => {
    console.log('[Chat] Page shown (iOS Safari) - persisted:', event.persisted);

    // If page was hidden for >5s, WebSocket is likely dead - force reconnect
    const hiddenDuration = Date.now() - state.pageHiddenAt;
    if (hiddenDuration > 5000) {
      console.log('[Chat] Page was hidden for', Math.round(hiddenDuration/1000) + 's - reconnecting');
      await restartRealtime();
    } else {
      // Short background - just check subscription status
      await subscribeGlobalMessages();
    }

    if (state.currentConversationId && state.channels[state.currentConversationId]) {
      console.log('[Chat] Room subscription check');
    }
    backfillIfAllowed('pageshow');
  });
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

  // Stale-link detector with more lenient timeout (prevents false positives on slow networks)
  let staleFailures = 0;
  let staleRestartPending = false;
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (staleRestartPending) return; // Prevent overlapping restarts

    const staleMs = Date.now() - (state.lastRealtimeAt || 0);
    // Increased threshold: 30s idle before considering stale (was 5s - too aggressive!)
    if (staleMs > 30000 && state.lastRealtimeAt > 0) {
      // Exponential backoff with jitter: 2s, 4s, 8s, 16s, max 30s
      const backoff = Math.min(30000, 2000 * (2 ** staleFailures)) + Math.random() * 1000;
      console.warn('[Chat] ⚠️ Realtime stale (30s idle), restarting in', Math.round(backoff) + 'ms');
      staleFailures++;
      staleRestartPending = true;
      setTimeout(async () => {
        await restartRealtime();
        await backfillIfAllowed('stale-restart');
        staleFailures = 0; // Reset on success
        staleRestartPending = false;
      }, backoff);
    }
  }, 10000); // Check every 10s (was 3s - reduced polling frequency)
}

/**
 * Performance monitoring utility for debugging
 */
function getPerformanceStats() {
  return {
    version: '2025-10-14-PERFORMANCE-OPTIMIZED',
    seenMessagesCount: seenMessageIds.size,
    seenMessagesCapacity: MAX_SEEN_IDS,
    lastRealtimeMessage: state.lastRealtimeAt ? new Date(state.lastRealtimeAt).toISOString() : 'never',
    timeSinceLastRealtime: state.lastRealtimeAt ? Math.round((Date.now() - state.lastRealtimeAt) / 1000) + 's' : 'N/A',
    lastBackfill: state.lastBackfillAt ? new Date(state.lastBackfillAt).toISOString() : 'never',
    backfillInFlight: state.backfillInFlight,
    globalSubStatus: state.globalSub?.state || 'none',
    currentRoom: state.currentConversationId || 'none',
    activeSubscriptions: Object.keys(state.channels).length,
    pageVisibility: document.visibilityState,
    backfillThrottle: {
      active: BACKFILL_MIN_MS_ACTIVE + 'ms',
      background: BACKFILL_MIN_MS_BG + 'ms'
    },
    recommendations: [
      seenMessageIds.size > MAX_SEEN_IDS * 0.9 ? '⚠️ Message dedup cache near capacity' : '✅ Message dedup cache healthy',
      state.lastRealtimeAt && (Date.now() - state.lastRealtimeAt) > 60000 ? '⚠️ No realtime messages for 60s+' : '✅ Realtime connection active',
      state.globalSub?.state !== 'joined' ? '⚠️ Global subscription not joined' : '✅ Global subscription healthy'
    ]
  };
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
  deleteRoom, // Delete/leave a chat
  getPerformanceStats, // Performance monitoring
  restartRealtime, // Manual reconnect trigger
  backfillIfAllowed // Manual backfill trigger
};
