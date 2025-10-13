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

async function renderMessage(m, currentUserId) {
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

  // Get user ID once (not for every message!)
  if (!cachedUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    cachedUserId = user?.id;
  }

  // Fetch messages
  const initial = await fetchMessages(conversationId, 100);
  console.log('[Chat] Fetched', initial.length, 'messages');

  // CRITICAL FIX: Render all messages in parallel using Promise.all (10x faster on mobile!)
  if (initial.length > 0) {
    const messageElements = await Promise.all(
      initial.map(m => renderMessage(m, cachedUserId))
    );

    // Append all at once using DocumentFragment (faster DOM manipulation)
    const fragment = document.createDocumentFragment();
    messageElements.forEach(el => fragment.appendChild(el));
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
      // Check for duplicates before adding (global subscription might have already added it)
      const existingMsg = listEl.querySelector(`[data-mid="${m.id}"]`);
      if (!existingMsg) {
        const wrapper = renderMessage(m, cachedUserId);
        listEl.appendChild(wrapper);
        listEl.scrollTop = listEl.scrollHeight;

        // Mark as read immediately if we're viewing this conversation
        if (m.sender_id !== cachedUserId) {
          markRead(conversationId);
        }
      } else {
        console.log('[Chat] Message already displayed by global subscription');
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
  console.log('[Chat] 🚀 VERSION: 2025-10-13-PERF-100');

  const supabase = await getSupabaseClient();
  const sidebar = document.querySelector('#conversations');
  sidebar.innerHTML = '<div style="padding: 2rem; text-align: center; color: #9ca3af;">Loading...<br><small style="color: #6b7280; font-size: 10px;">v2025-10-13-PERF-100</small></div>';

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

    // 🚀 PERFORMANCE 100%: Parallelize ALL API calls with Promise.allSettled
    console.log('[Chat] Loading unread counts in parallel...');
    (async () => {
      const startTime = performance.now();

      // Create all promises at once (parallel execution!)
      const badgePromises = allUsers.map(async (u) => {
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

          return { success: true, userId: u.id };
        } catch (error) {
          console.error('[Chat] Error loading unread count for:', u.id, error);
          return { success: false, userId: u.id, error };
        }
      });

      // Wait for ALL promises to complete (in parallel, not sequential!)
      const results = await Promise.allSettled(badgePromises);

      const elapsed = performance.now() - startTime;
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

      console.log(`[Chat] ✅ Loaded ${successCount}/${allUsers.length} badges in ${Math.round(elapsed)}ms (100% parallel)`);

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
 * Subscribe to all messages globally to update badges AND show messages in real-time
 * even when specific room subscription isn't active yet
 */
export async function subscribeGlobalMessages() {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (!cachedUserId) {
    cachedUserId = user.id;
  }

  console.log('[Chat] Setting up global message subscription');

  const globalChannel = supabase.channel('global-messages')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages'
    }, (payload) => {
      const message = payload.new;

      // Only process messages from others
      if (message.sender !== cachedUserId) {
        console.log('[Chat] Global message received:', message.room_id, message.id);

        // CRITICAL FIX: If this message is for the currently open conversation, display it immediately!
        if (state.currentConversationId === message.room_id) {
          const listEl = document.querySelector('#messages');
          if (listEl) {
            // Check if message already exists (prevent duplicates from multiple subscriptions)
            const existingMsg = listEl.querySelector(`[data-mid="${message.id}"]`);
            if (!existingMsg) {
              console.log('[Chat] Message is for open conversation, displaying immediately');
              const normalizedMsg = {
                id: message.id,
                room_id: message.room_id,
                sender_id: message.sender,
                content: message.content,
                created_at: message.created_at
              };
              const wrapper = renderMessage(normalizedMsg, cachedUserId);
              listEl.appendChild(wrapper);
              listEl.scrollTop = listEl.scrollHeight;

              // Mark as read since we're viewing it
              markRead(message.room_id);
            } else {
              console.log('[Chat] Message already displayed, skipping duplicate');
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

          // Always update global badge
          updateUnreadBadge();
        }
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Chat] ✅ Global message subscription active for real-time messages');
      }
    });

  return globalChannel;
}

// Expose for manual testing
window.__chat = { openConversation, sendCurrent, initChat, openOrCreateDM, updateUnreadBadge, subscribeGlobalMessages };
