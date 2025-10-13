import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import Redis from 'ioredis';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/v1/realtime' });
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const typingSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const port = process.env.PORT || 4100;

const subs = new Map<string, Set<any>>();

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'subscribe' && msg.conversation_id) {
        const set = subs.get(msg.conversation_id) || new Set();
        set.add(ws);
        subs.set(msg.conversation_id, set);
        ws.send(JSON.stringify({ type: 'subscribed', conversation_id: msg.conversation_id }));
      }
    } catch {}
  });
  ws.on('close', () => {
    for (const [cid, set] of subs) { if (set.has(ws)) set.delete(ws); }
  });
});

// messages fanout
const sub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
sub.subscribe('chat.messages');
sub.on('message', (_c, payload) => {
  try {
    const m = JSON.parse(payload);
    const set = subs.get(m.conversation_id);
    if (!set) return;
    for (const ws of set) { try { ws.send(JSON.stringify({ type: 'message', payload: m })); } catch {} }
  } catch {}
});

// typing fanout
typingSub.subscribe('chat.typing');
typingSub.on('message', (_c, payload) => {
  try {
    const m = JSON.parse(payload);
    const set = subs.get(m.conversation_id);
    if (!set) return;
    for (const ws of set) { try { ws.send(JSON.stringify({ type: 'typing', payload: m })); } catch {} }
  } catch {}
});

server.listen(port, () => console.log(`chat-realtime on :${port}`));
