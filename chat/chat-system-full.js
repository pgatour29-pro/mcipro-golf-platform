// Full chat UI glue (vanilla JS) wired to Supabase helpers
import { ensureDirectConversation, listConversations, fetchMessages, sendMessage, subscribeToConversation, markRead, typing, subscribeTyping } from './chat-database-functions.js';
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
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
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
  bubble.innerHTML = escapeHTML(m.body || '');

  wrapper.appendChild(bubble);
  return wrapper;
}

async function openConversation(conversationId) {
  const supabase = await getSupabaseClient();
  state.currentConversationId = conversationId;
  const listEl = document.querySelector('#messages');
  listEl.innerHTML = '';
  const initial = await fetchMessages(conversationId, 100);
  for (const m of initial) listEl.appendChild(await renderMessage(m));
  listEl.scrollTop = listEl.scrollHeight;

  if (state.channels[conversationId]?.channel) {
    supabase.removeChannel(state.channels[conversationId].channel);
  }
  state.channels[conversationId] = subscribeToConversation(conversationId, async (m) => {
    if (state.currentConversationId === conversationId) {
      listEl.appendChild(await renderMessage(m));
      listEl.scrollTop = listEl.scrollHeight;
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
}

async function sendCurrent() {
  const input = document.querySelector('#composer');
  const body = input.value.trim();
  if (!body || !state.currentConversationId) return;

  try {
    await sendMessage(state.currentConversationId, body, 'text');
    input.value = '';
  } catch (error) {
    console.error('[Chat] Send failed:', error);
    alert('❌ Message failed to send: ' + (error.message || 'Unknown error'));
  }
}

export async function initChat() {
  const supabase = await getSupabaseClient();
  const sidebar = document.querySelector('#conversations');
  sidebar.innerHTML = '<div style="padding: 2rem; text-align: center; color: #9ca3af;">Loading...</div>';

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
          const convId = await ensureDirectConversation(u.id);
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
window.__chat = { openConversation, sendCurrent, initChat, ensureDirectConversation };
