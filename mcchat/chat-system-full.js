// Full chat UI glue (vanilla JS) wired to Supabase helpers
import { ensureDirectConversation, listConversations, fetchMessages, sendMessage, subscribeToConversation, markRead, typing, subscribeTyping } from './chat-database-functions.js';
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

function renderMessage(m) {
  const selfId = supabase.auth.getUser().then(({ data }) => data.user?.id);
  const wrapper = document.createElement('div');
  wrapper.className = 'msg';
  wrapper.dataset.mid = m.id;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = escapeHTML(m.body || `[${m.type}]`);
  wrapper.appendChild(bubble);
  return wrapper;
}

async function openConversation(conversationId) {
  state.currentConversationId = conversationId;
  const listEl = document.querySelector('#messages');
  listEl.innerHTML = '';
  const initial = await fetchMessages(conversationId, 100);
  initial.forEach(m => listEl.appendChild(renderMessage(m)));
  listEl.scrollTop = listEl.scrollHeight;

  if (state.channels[conversationId]) {
    supabase.removeChannel(state.channels[conversationId]);
  }
  state.channels[conversationId] = subscribeToConversation(conversationId, (m) => {
    if (state.currentConversationId === conversationId) {
      listEl.appendChild(renderMessage(m));
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

export async function initChat() {
  // conversations list
  const sidebar = document.querySelector('#conversations');
  const convos = await listConversations();
  sidebar.innerHTML = '';
  convos.forEach(c => {
    const li = document.createElement('li');
    li.textContent = c.title || 'Direct chat';
    li.onclick = ()=> openConversation(c.id);
    sidebar.appendChild(li);
  });

  document.querySelector('#sendBtn').onclick = sendCurrent;
  const composer = document.querySelector('#composer');
  composer.addEventListener('input', ()=>{
    if (state.currentConversationId) typing(state.currentConversationId);
  });
}

// Expose for manual testing
window.__chat = { openConversation, sendCurrent, initChat, ensureDirectConversation };
