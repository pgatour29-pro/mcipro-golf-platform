// Full chat UI glue (vanilla JS) wired to Supabase helpers
import { ensureDirectConversation, listConversations, fetchMessages, sendMessage, subscribeToConversation, markRead, typing, subscribeTyping, uploadMediaAndSend, getSignedMediaUrl } from './chat-database-functions.js';
import { supabase } from './supabaseClient.js';

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
  const wrapper = document.createElement('div');
  wrapper.className = 'msg';
  wrapper.dataset.mid = m.id;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';

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
        img.style.maxWidth = '320px';
        bubble.appendChild(img);
      } else if (m.type === 'video') {
        const vid = document.createElement('video');
        vid.src = url; vid.controls = true; vid.style.maxWidth = '360px';
        bubble.appendChild(vid);
      } else if (m.type === 'audio') {
        const aud = document.createElement('audio');
        aud.src = url; aud.controls = true;
        bubble.appendChild(aud);
      } else {
        const a = document.createElement('a');
        a.href = url; a.textContent = m.metadata?.name || 'download'; a.download = '';
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
  state.currentConversationId = conversationId;
  const listEl = document.querySelector('#messages');
  listEl.innerHTML = '';
  const initial = await fetchMessages(conversationId, 100);
  for (const m of initial) listEl.appendChild(await renderMessage(m));
  listEl.scrollTop = listEl.scrollHeight;

  if (state.channels[conversationId]) {
    supabase.removeChannel(state.channels[conversationId]);
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
  if (state.typingChannel) supabase.removeChannel(state.typingChannel);
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
  const sidebar = document.querySelector('#conversations');
  sidebar.innerHTML = '';

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('[Chat] No authenticated user');
    return;
  }

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
      li.textContent = u.display_name || u.username || 'User';
      li.style.cursor = 'pointer';
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
    li.textContent = 'No users available';
    li.style.fontStyle = 'italic';
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
