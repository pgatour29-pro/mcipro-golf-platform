const { getStore } = require('@netlify/blobs');
const Pusher = require('pusher');

// Initialize Pusher
const pusher = new Pusher({
  appId: '2059653',
  key: 'a96add099231918f1f23',
  secret: 'e5e423804e6ef120c0d2',
  cluster: 'ap1',
  useTLS: true
});

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Use context from Netlify deployment
    const store = getStore({
      name: 'chat',
      siteID: context.clientContext?.custom?.netlify?.site_id || '27e7a460-3f3a-4be4-ba66-2ed82ccc5c8f',
      deployID: context.clientContext?.custom?.netlify?.deploy_id,
      token: context.clientContext?.custom?.netlify?.token || process.env.NETLIFY_ACCESS_TOKEN
    });
    const method = event.httpMethod;
    const path = event.path;

    // GET /chat - Get all messages for all rooms
    if (method === 'GET' && !event.queryStringParameters?.roomId) {
      const messages = await store.get('messages', { type: 'json' }) || {};
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, messages })
      };
    }

    // GET /chat?roomId=xxx - Get messages for specific room
    if (method === 'GET' && event.queryStringParameters?.roomId) {
      const roomId = event.queryStringParameters.roomId;
      const messages = await store.get('messages', { type: 'json' }) || {};
      const roomMessages = messages[roomId] || [];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, messages: roomMessages })
      };
    }

    // POST /chat - Send a new message
    if (method === 'POST') {
      const { roomId, message } = JSON.parse(event.body);

      if (!roomId || !message) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Missing roomId or message' })
        };
      }

      // Get existing messages
      const messages = await store.get('messages', { type: 'json' }) || {};

      // Initialize room if it doesn't exist
      if (!messages[roomId]) {
        messages[roomId] = [];
      }

      // Add message with timestamp and ID
      const newMessage = {
        ...message,
        id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: message.timestamp || new Date().toISOString()
      };

      messages[roomId].push(newMessage);

      // Keep only last 1000 messages per room
      if (messages[roomId].length > 1000) {
        messages[roomId] = messages[roomId].slice(-1000);
      }

      // Save to blob storage
      await store.setJSON('messages', messages);

      // Trigger Pusher event for real-time updates
      try {
        await pusher.trigger(`chat-room-${roomId}`, 'new-message', {
          message: newMessage,
          roomId: roomId
        });
        console.log('✅ Pusher event triggered for room:', roomId);
      } catch (pusherError) {
        console.error('⚠️ Pusher trigger failed:', pusherError);
        // Don't fail the request if Pusher fails
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: newMessage })
      };
    }

    // DELETE /chat?roomId=xxx - Clear messages for a room
    if (method === 'DELETE' && event.queryStringParameters?.roomId) {
      const roomId = event.queryStringParameters.roomId;
      const messages = await store.get('messages', { type: 'json' }) || {};

      messages[roomId] = [];
      await store.setJSON('messages', messages);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, error: 'Not found' })
    };

  } catch (error) {
    console.error('Chat function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      })
    };
  }
};
