import { v4 as uuid } from 'uuid';
import { set } from 'idb-keyval';
import { useEffect, useRef, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API || 'http://localhost:4000';
const RT = process.env.NEXT_PUBLIC_RT || 'ws://localhost:4100/v1/realtime';

export default function Home() {
  const [cid, setCid] = useState('00000000-0000-0000-0000-000000000001');
  const [uid, setUid] = useState('00000000-0000-0000-0000-000000000002');
  const [body, setBody] = useState('');
  const [log, setLog] = useState([]);
  const [typing, setTyping] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(RT);
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', conversation_id: cid }));
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'message') setLog((l) => [...l, msg.payload]);
      if (msg.type === 'typing') setTyping(true), setTimeout(()=>setTyping(false), 1200);
    };
    return () => ws.close();
  }, [cid]);

  async function send() {
    const mid = uuid();
    const payload = { conversation_id: cid, message_id: mid, sender_id: uid, body };
    await set(`outbox:${mid}`, payload);
    try {
      await fetch(`${API}/v1/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setBody('');
    } catch (e) { console.warn('queued (offline)'); }
  }

  async function startedTyping() {
    await fetch(`${API}/v1/typing/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation_id: cid, user_id: uid }) });
  }

  return (
    <main style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'Inter, system-ui', padding: 16 }}>
      <h1>Self-hosted Chat</h1>
      <div style={{ marginBottom: 8 }}>
        <label>Conversation ID</label>
        <input value={cid} onChange={e => setCid(e.target.value)} style={{ width: '100%' }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Your User ID</label>
        <input value={uid} onChange={e => setUid(e.target.value)} style={{ width: '100%' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={body} onChange={e => setBody(e.target.value)} onKeyDown={startedTyping} placeholder="Type a message" style={{ flex: 1 }} />
        <button onClick={send}>Send</button>
      </div>
      {typing && <div style={{ opacity: 0.8, fontSize: 12 }}>someone is typing…</div>}
      <hr />
      <ul>
        {log.map((m, i) => (<li key={i}><code>{m.sender_id}</code>: {m.body}</li>))}
      </ul>
    </main>
  );
}
