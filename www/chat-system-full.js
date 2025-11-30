// Full chat UI glue (vanilla JS) wired to Supabase helpers
import { ensureDirectConversation, listConversations, fetchMessages, sendMessage, subscribeToConversation, markRead, typing, subscribeTyping, uploadMediaAndSend, getSignedMediaUrl } from './chat-database-functions.js';
import { getSupabaseClient } from './supabaseClient.js';
import { ensureSupabaseSessionWithLIFF } from './auth-bridge.js';

const state = {
  currentConversationId: null,
  channels: {},
};

// Helper for re-subscribing with exponential backoff
async function reconnectWithBackoff(subscribeFn, retries = 5, initialDelay = 1000) {
  let delay = initialDelay;
  for (let i = 0; i < retries; i++) {
    try {
      const channel = await subscribeFn(); // Attempt to subscribe
      // Check if the channel is actually subscribed (e.g., status is 'SUBSCRIBED')
      // Supabase Realtime doesn't expose a direct 'isSubscribed' state immediately,
      // but if subscribeFn completes without error, we assume success.
      return channel; 
    } catch (error) {
      console.error(`[Chat] Subscription failed (attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`, error);
      if (i === retries - 1) throw error; // Re-throw if all retries failed
      await new Promise(res => setTimeout(res, delay));
      delay = Math.min(delay * 2, 30000); // Max delay 30 seconds
  // Safety: If loop completes without returning or throwing, all retries failed
  throw new Error('[Chat] All reconnection attempts failed');
    }
  }
}

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
  return await window.measureAndLog('openConversation', async () => {
    const supabase = await getSupabaseClient();
    state.currentConversationId = conversationId;
    const listEl = document.querySelector('#messages');
    if (!listEl) {
      console.error('[Chat] DOM Error: #messages element not found for conversation:', conversationId);
      return; // Exit if element is missing
    }
    listEl.innerHTML = '';

    console.log('[Chat] Opening conversation:', conversationId);

    const initial = await fetchMessages(conversationId, 100);
    for (const m of initial) listEl.appendChild(await renderMessage(m));
    listEl.scrollTop = listEl.scrollHeight;

    // Clean up old channel if it exists
    if (state.channels[conversationId]) {
      console.log('[Chat] Removing old channel for:', conversationId);
      supabase.removeChannel(state.channels[conversationId]);
    }

    // Subscribe to new messages with retry - AWAIT to ensure subscription is ready before continuing
    console.log('[Chat] Setting up real-time subscription with retry...');
    state.channels[conversationId] = await reconnectWithBackoff(() => 
      subscribeToConversation(conversationId, async (m) => {
        console.log('[Chat] New message callback triggered:', m.id);
        if (state.currentConversationId === conversationId) {
          listEl.appendChild(await renderMessage(m));
          listEl.scrollTop = listEl.scrollHeight;
        }
      }, (m) => {
        // handle edits/deletes
        console.log('[Chat] Message updated:', m.id);
      })
    );

    markRead(conversationId);

    // Clean up old typing channel
    if (state.typingChannel) {
      console.log('[Chat] Removing old typing channel');
      supabase.removeChannel(state.typingChannel);
    }

    // Subscribe to typing events with retry - AWAIT to ensure subscription is ready
    state.typingChannel = await reconnectWithBackoff(() =>
      subscribeTyping(conversationId, (rows)=>{
        const el = document.querySelector('#typing');
        // Ensure #typing element exists before updating
        if (el) {
          el.textContent = rows.length ? 'typing…' : '';
        } else {
          console.warn('[Chat] DOM Warning: #typing element not found for typing indicator.');
        }
      })
    );

    console.log('[Chat] ✅ Conversation opened and subscribed:', conversationId);
  }, 'Chat', 'ChatWindow', { conversationId });
}

async function sendCurrent() {
  return await window.measureAndLog('sendCurrent', async () => {
    const input = document.querySelector('#composer');
    if (!input) {
      console.error('[Chat] DOM Error: #composer element not found for sending message.');
      return;
    }
    const body = input.value.trim();
    if (!body || !state.currentConversationId) return;
    await sendMessage(state.currentConversationId, body, 'text');
    input.value = '';
  }, 'Chat', 'ChatWindow', { hasBody: !!document.querySelector('#composer')?.value.trim(), conversationId: state.currentConversationId });
}

async function sendMedia(files) {
  return await window.measureAndLog('sendMedia', async () => {
    if (!files || !files.length || !state.currentConversationId) return;
    for (const f of files) {
      await uploadMediaAndSend(state.currentConversationId, f);
    }
  }, 'Chat', 'ChatWindow', { fileCount: files ? files.length : 0, conversationId: state.currentConversationId });
}

export async function initChat() {
  return await window.measureAndLog('initChat', async () => {
    const supabase = await getSupabaseClient();
    const sidebar = document.querySelector('#conversations');
    if (!sidebar) {
      console.error('[Chat] DOM Error: #conversations sidebar element not found.');
      return;
    }
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

    const sendBtn = document.querySelector('#sendBtn');
    if (sendBtn) {
      sendBtn.onclick = sendCurrent;
    } else {
      console.warn('[Chat] DOM Warning: #sendBtn element not found.');
    }
    
    const composer = document.querySelector('#composer');
    if (composer) {
      composer.addEventListener('input', ()=>{
        if (state.currentConversationId) typing(state.currentConversationId);
      });
    } else {
      console.warn('[Chat] DOM Warning: #composer element not found.');
    }

    const fileInput = document.querySelector('#fileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e)=> sendMedia(e.target.files));
    } else {
      console.warn('[Chat] DOM Warning: #fileInput element not found.');
    }
  }, 'Chat', 'ChatWindow');
}

// Expose for manual testing
window.__chat = { openConversation, sendCurrent, initChat, ensureDirectConversation };
