// Full chat UI glue (vanilla JS) wired to Supabase helpers
import { openOrCreateDM, listRooms, fetchMessages, sendMessage, subscribeToConversation, markRead, typing, subscribeTyping } from './chat-database-functions.js';
import { getSupabaseClient } from './supabaseClient.js';
import { ensureSupabaseSessionWithLIFF } from './auth-bridge.js';

const state = {
  currentConversationId: null,
  channels: {},
};

function escapeHTML(str) {
  const div = document.createElement('div');
  div.innerText = str ?? '';
  return div.innerHTML;
}

async function renderMessage(m) {
  console.log('[Chat] 🎨 Rendering message:', {
    id: m.id,
    sender_id: m.sender_id,
    content: m.content?.substring(0, 50)
  });

  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  console.log('[Chat] 🎨 Current user:', user?.id);
  console.log('[Chat] 🎨 Message sender:', m.sender_id);
  console.log('[Chat] 🎨 Is self message?', m.sender_id === user?.id);

  const isSelf = m.sender_id === user.id;

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

  console.log('[Chat] 🎨 Message wrapper created:', wrapper);
  return wrapper;
}

async function openConversation(conversationId) {
  console.log('[Chat] 📂 Opening conversation:', conversationId);

  const supabase = await getSupabaseClient();
  state.currentConversationId = conversationId;

  const listEl = document.querySelector('#messages');
  console.log('[Chat] 📂 Messages container element:', listEl);
  console.log('[Chat] 📂 Messages container exists?', !!listEl);

  if (!listEl) {
    console.error('[Chat] ❌ #messages element not found in DOM!');
    alert('Error: Messages container not found. Check your HTML.');
    return;
  }

  listEl.innerHTML = '';
  console.log('[Chat] 📂 Cleared messages container');

  const initial = await fetchMessages(conversationId, 100);
  console.log('[Chat] 📂 Fetched messages count:', initial.length);
  console.log('[Chat] 📂 Fetched messages:', initial);

  if (initial.length === 0) {
    console.log('[Chat] 📂 No messages to render');
  } else {
    for (let i = 0; i < initial.length; i++) {
      const m = initial[i];
      console.log(`[Chat] 📂 Rendering message ${i + 1}/${initial.length}:`, m);
      const wrapper = await renderMessage(m);
      console.log(`[Chat] 📂 Appending wrapper to DOM:`, wrapper);
      listEl.appendChild(wrapper);
      console.log(`[Chat] 📂 Appended successfully. Container child count:`, listEl.children.length);
    }
  }

  listEl.scrollTop = listEl.scrollHeight;
  console.log('[Chat] 📂 Scrolled to bottom. Height:', listEl.scrollHeight);

  if (state.channels[conversationId]?.channel) {
    supabase.removeChannel(state.channels[conversationId].channel);
  }
  state.channels[conversationId] = subscribeToConversation(conversationId, async (m) => {
    console.log('[Chat] 📂 Real-time message received:', m);
    if (state.currentConversationId === conversationId) {
      const wrapper = await renderMessage(m);
      listEl.appendChild(wrapper);
      listEl.scrollTop = listEl.scrollHeight;
      console.log('[Chat] 📂 Real-time message appended. Container child count:', listEl.children.length);
    }
  }, (m) => {
    // handle edits/deletes
  });

  markRead(conversationId);
  if (state.typingChannel?.channel) supabase.removeChannel(state.typingChannel.channel);
  state.typingChannel = subscribeTyping(conversationId, (rows)=>{
    const el = document.querySelector('#typing');
    el.textContent = rows.length ? 'typing…' : '';
  });

  console.log('[Chat] 📂 Conversation fully opened and subscribed');
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
  console.log('[Chat] 🚀 VERSION: 2025-10-13-DEBUG-RENDER');

  const supabase = await getSupabaseClient();
  const sidebar = document.querySelector('#conversations');
  sidebar.innerHTML = '<div style="padding: 2rem; text-align: center; color: #9ca3af;">Loading...<br><small style="color: #6b7280; font-size: 10px;">v2025-10-13-DEBUG</small></div>';

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

  // Render user list immediately (simplified for speed)
  if (allUsers && allUsers.length > 0) {
    allUsers.forEach(u => {
      const li = document.createElement('li');
      li.textContent = u.display_name || u.username || 'User';
      li.style.cssText = 'list-style: none; padding: 1rem; cursor: pointer; border-bottom: 1px solid #e5e7eb;';
      li.onclick = async () => {
        try {
          console.log('[Chat] Creating/opening conversation with', u.id);
          const convId = await openOrCreateDM(u.id);
          console.log('[Chat] Conversation ID:', convId);
          openConversation(convId);
        } catch (error) {
          console.error('[Chat] Failed to create conversation:', error);
          alert('❌ Failed to open chat: ' + (error.message || 'Unknown error'));
        }
      };
      sidebar.appendChild(li);
    });
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

// Expose for manual testing
window.__chat = { openConversation, sendCurrent, initChat, openOrCreateDM };
