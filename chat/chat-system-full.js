// Full chat UI glue (vanilla JS) wired to Supabase helpers
import { openOrCreateDM, listRooms, fetchMessages, sendMessage, subscribeToConversation, markRead, typing, subscribeTyping, getUnreadCount, updateUnreadBadge } from './chat-database-functions.js';
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

const doSearch = debounce(async (q) => {
  const local = filterContactsLocal(q);
  renderContactList(local);
  const remote = await queryContactsServer(q);
  if (remote && remote.length) {
    const map = new Map(local.map(x => [x.id, x]));
    remote.forEach(x => map.set(x.id, x));
    renderContactList([...map.values()]);
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

    // Skip system message - just add group to UI and open it

    // Add the new group to the sidebar contacts list
    const sidebar = document.querySelector('#conversations');
    if (sidebar) {
      const li = document.createElement('li');
      li.id = `contact-${roomId}`;
      li.dataset.roomId = roomId;
      li.style.cssText = 'list-style: none; padding: 1rem; cursor: pointer; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #f0fdf4;';

      // Group icon and name
      const nameSpan = document.createElement('span');
      nameSpan.innerHTML = `<span style="margin-right: 0.5rem;">👥</span>${escapeHTML(groupState.title)}`;
      nameSpan.style.cssText = 'flex: 1; font-weight: 500;';

      // Unread badge
      const badge = document.createElement('span');
      badge.id = `contact-badge-${roomId}`;
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

      li.onclick = () => {
        // Mobile navigation: Show group name
        if (typeof window.chatShowConversation === 'function') {
          window.chatShowConversation(groupState.title);
        }
        openConversation(roomId);
      };

      // Insert at the top of the sidebar (most recent first)
      if (sidebar.firstChild) {
        sidebar.insertBefore(li, sidebar.firstChild);
      } else {
        sidebar.appendChild(li);
      }

      console.log('[Chat] ✅ Group added to sidebar:', groupState.title);
    }

    // Close modal and open conversation
    document.getElementById('groupBuilderModal')?.remove();
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
  console.log('[Chat] ⚡ VERSION: 2025-10-13-MOBILE-PERFORMANCE-OPTIMIZED');

  // Initialize UI element references
  initUIRefs();

  const supabase = await getSupabaseClient();
  const sidebar = document.querySelector('#conversations');
  sidebar.innerHTML = '<div style="padding: 2rem; text-align: center; color: #9ca3af;">Loading...<br><small style="color: #6b7280; font-size: 10px;">⚡ v2025-10-13-PERF</small></div>';

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
    alert('⚠️ Failed to load contacts: ' + usersError.message);
    return;
  }

  sidebar.innerHTML = '';
  console.log('[Chat] Loaded', allUsers?.length || 0, 'users');

  // Store users in state for search functionality
  state.users = allUsers || [];

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

          // Mobile navigation: Switch to chat view and show contact name
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

    // ⚡ MOBILE PERFORMANCE FIX: Don't load unread counts on init
    // The global realtime subscription will update badges as messages arrive
    // This eliminates 100+ API calls on mobile, making chat load instantly
    console.log('[Chat] ⚡ Contact list loaded instantly (unread counts will update via realtime)');
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
        backfillIfAllowed('subscribed');
      }
      if (status === 'CHANNEL_ERROR') {
        console.warn('[Chat] ⚠️ Channel error - scheduling resubscribe');
        setTimeout(() => state.globalSub?.subscribe(), 1000);
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
    // Resubscribe and backfill
    await subscribeGlobalMessages();
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

      // Tiny REST query (keeps API connection alive)
      fetch(`${supabaseUrl}/rest/v1/chat_messages?select=id&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Prefer': 'count=none'
        },
        cache: 'no-store'
      }).catch(() => {});

      // HEAD to REST endpoint (Realtime HEAD causes CORS issues)
      fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        cache: 'no-store',
        keepalive: true
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
  openGroupBuilderModal // Open group creation modal
};
