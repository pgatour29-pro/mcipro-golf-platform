// Full chat UI glue (vanilla JS) wired to Supabase helpers
import { ensureDirectConversation, listConversations, fetchMessages, sendMessage, subscribeToConversation, markRead, typing, subscribeTyping, uploadMediaAndSend, getSignedMediaUrl } from './chat-database-functions.js';
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

  if (m.type === 'text' || (m.type === 'system' && m.body)) {
    bubble.innerHTML = escapeHTML(m.body || '');
  } else if (m.metadata?.bucket && m.metadata?.object_path) {
    // request signed URL for private media
    try {
      const url = await getSignedMediaUrl(m.conversationId, m.metadata.bucket, m.metadata.object_path);
      if (m.type === 'image') {
        const img = document.createElement('img');
        img.src = url;
        img.alt = m.metadata?.name || 'image';
        img.style.cssText = 'max-width: 250px; border-radius: 0.5rem; display: block;';
        bubble.appendChild(img);
      } else if (m.type === 'video') {
        const vid = document.createElement('video');
        vid.src = url; vid.controls = true; vid.style.cssText = 'max-width: 300px; border-radius: 0.5rem;';
        bubble.appendChild(vid);
      } else if (m.type === 'audio') {
        const aud = document.createElement('audio');
        aud.src = url; aud.controls = true;
        bubble.appendChild(aud);
      } else {
        const a = document.createElement('a');
        a.href = url; a.textContent = m.metadata?.name || 'download'; a.download = '';
        a.style.color = isSelf ? 'white' : '#10b981';
        bubble.appendChild(a);
      }
    } catch (e) {
      bubble.textContent = '[media unavailable]';
    }
  } else {
    bubble.textContent = `[${m.type}]`;
  }

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
  await sendMessage(state.currentConversationId, body, 'text');
  input.value = '';
}

async function sendMedia(files) {
  if (!files || !files.length || !state.currentConversationId) return;
  for (const f of files) {
    await uploadMediaAndSend(state.currentConversationId, f);
  }
}

export async function initChat() {
  const supabase = await getSupabaseClient();
  const sidebar = document.querySelector('#conversations');
  sidebar.innerHTML = '';

  // Ensure Supabase session exists for LINE user (creates anonymous session if needed)
  const authResult = await ensureSupabaseSessionWithLIFF();

  if (!authResult) {
    console.error('[Chat] Failed to create Supabase session. Please log in via LINE.');
    alert('Please log in via LINE to use chat.');
    return;
  }

  // Get current authenticated Supabase user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('[Chat] No authenticated user after auth bridge');
    alert('Authentication failed. Please try again.');
    return;
  }

  console.log('[Chat] ✅ Authenticated:', user.id, '(LINE:', authResult.lineUserId, ')');

  // Load existing conversations
  const convos = await listConversations();

  // Also load all users to show as potential conversations
  const { data: allUsers } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url')
    .neq('id', user.id);

  // Create a map of user IDs that already have conversations
  const existingUserIds = new Set();
  convos.forEach(c => {
    if (c.is_group) return;
    // For direct chats, we need to get the other user's ID
    // For now, just add the conversation
    const li = document.createElement('li');
    li.textContent = c.title || 'Direct chat';
    li.onclick = () => openConversation(c.id);
    sidebar.appendChild(li);
  });

  // Add all users as potential conversations (like old ChatSystem)
  if (allUsers && allUsers.length > 0) {
    allUsers.forEach(u => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; cursor: pointer; transition: background 0.15s;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; flex-shrink: 0;">
            ${(u.display_name || u.username || 'U')[0].toUpperCase()}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 500; color: #111827; font-size: 14px;">${escapeHTML(u.display_name || u.username || 'User')}</div>
            <div style="font-size: 12px; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Click to chat</div>
          </div>
        </div>
      `;
      li.style.cssText = 'list-style: none; margin: 0; border-radius: 8px; margin: 2px 8px;';
      li.onmouseover = () => li.style.background = '#f3f4f6';
      li.onmouseout = () => li.style.background = 'transparent';
      li.onclick = async () => {
        // Ensure conversation exists, then open it
        console.log('[Chat] Creating/opening conversation with', u.id);
        const convId = await ensureDirectConversation(u.id);
        openConversation(convId);
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

  const fileInput = document.querySelector('#fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', (e)=> sendMedia(e.target.files));
  }
}

// Expose for manual testing
window.__chat = { openConversation, sendCurrent, initChat, ensureDirectConversation };
