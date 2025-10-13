import express from 'express';
import { Pool } from 'pg';
import { SQS } from 'aws-sdk';
import { z } from 'zod';
import Redis from 'ioredis';
import AWS from 'aws-sdk';
import { rateLimit } from './rate_limit.js';
import { oidc } from './oidc.js';

const app = express();
app.use(express.json({ limit: '256kb' }));

const PORT = process.env.PORT || 4000;
const PG_URL = process.env.PG_URL || 'postgres://chatuser:chatpass@localhost:5432/chatdb';
const SQS_URL = process.env.SQS_URL || 'http://localhost:4566/000000000000/chat-messages';
const pool = new Pool({ connectionString: PG_URL });
const sqs = new SQS({ region: 'ap-southeast-1', endpoint: process.env.LOCALSTACK_URL || 'http://localhost:4566' });
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
AWS.config.update({ region: process.env.AWS_REGION || 'ap-southeast-1' });
const s3 = new AWS.S3({ s3ForcePathStyle: true, endpoint: process.env.LOCALSTACK_URL || undefined });

app.get('/healthz', (_req, res) => res.json({ ok: true }));

const SendSchema = z.object({
  conversation_id: z.string().uuid(),
  message_id: z.string().uuid(),
  sender_id: z.string().uuid(),
  body: z.string().min(1).max(4000),
  attachments: z.array(z.any()).optional()
});

app.post('/v1/messages', oidc(), rateLimit(), async (req, res) => {
  const p = SendSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const { conversation_id, message_id, sender_id, body, attachments } = p.data;
  try {
    await pool.query('insert into messages (conversation_id, message_id, sender_id, body, attachments) values ($1,$2,$3,$4,$5) on conflict (conversation_id, message_id) do nothing',[conversation_id, message_id, sender_id, body, JSON.stringify(attachments||[])]);
    await sqs.sendMessage({ QueueUrl: SQS_URL, MessageBody: JSON.stringify(p.data), MessageGroupId: conversation_id }).promise().catch(()=>{});
    return res.status(202).json({ status: 'accepted' });
  } catch (e:any) { return res.status(500).json({ error: e.message }); }
});

app.get('/v1/messages', oidc(), rateLimit(), async (req, res) => {
  const { conversation_id, after_cursor } = req.query as any;
  if (!conversation_id) return res.status(400).json({ error: 'conversation_id required' });
  const r = await pool.query('select conversation_id, message_id, sender_id, body, attachments, created_at from messages where conversation_id=$1 and created_at > coalesce($2::timestamptz, to_timestamp(0)) order by created_at asc limit 200',[conversation_id, after_cursor || null]);
  const next = r.rows.length ? r.rows[r.rows.length - 1].created_at : after_cursor;
  res.json({ messages: r.rows, next_cursor: next });
});

// receipts
app.post('/v1/receipts', oidc(), async (req, res) => {
  const { message_id, delivered_at, read_at } = req.body || {};
  if (!message_id) return res.status(400).json({ error: 'message_id required' });
  await pool.query('insert into receipts (message_id, delivered_at, read_at) values ($1, $2, $3) on conflict (message_id) do update set delivered_at=excluded.delivered_at, read_at=excluded.read_at',[message_id, delivered_at||new Date(), read_at||null]);
  res.json({ ok: true });
});

// typing
app.post('/v1/typing/start', oidc(), rateLimit(), async (req, res) => {
  const { conversation_id, user_id } = req.body || {};
  if (!conversation_id || !user_id) return res.status(400).json({ error: 'conversation_id and user_id required' });
  await pool.query('insert into typing (conversation_id, user_id) values ($1,$2) on conflict (conversation_id, user_id) do update set started_at=now()', [conversation_id, user_id]);
  await redis.publish('chat.typing', JSON.stringify({ conversation_id, user_id, action: 'start' }));
  res.json({ ok: true });
});
app.post('/v1/typing/stop', oidc(), rateLimit(), async (req, res) => {
  const { conversation_id, user_id } = req.body || {};
  await pool.query('delete from typing where conversation_id=$1 and user_id=$2', [conversation_id, user_id]);
  await redis.publish('chat.typing', JSON.stringify({ conversation_id, user_id, action: 'stop' }));
  res.json({ ok: true });
});

// channels
app.post('/v1/channels', oidc(), rateLimit(), async (req, res) => {
  const { channel_id, name } = req.body || {};
  if (!channel_id || !name) return res.status(400).json({ error: 'channel_id and name required' });
  await pool.query('insert into conversations (id) values ($1) on conflict do nothing', [channel_id]);
  await pool.query('insert into channel_meta (id, name) values ($1,$2) on conflict (id) do update set name=excluded.name', [channel_id, name]);
  res.json({ ok: true });
});
app.get('/v1/channels/:id', oidc(), rateLimit(), async (req, res) => {
  const r = await pool.query('select id, name from channel_meta where id=$1', [req.params.id]);
  res.json(r.rows[0] || {});
});

// presence
app.post('/v1/presence/set', oidc(), async (req, res) => {
  const { user_id, status } = req.body || {};
  if (!user_id || !status) return res.status(400).json({ error: 'user_id and status required' });
  await redis.hset('presence', user_id, status);
  res.json({ ok: true });
});
app.get('/v1/presence/get/:user_id', oidc(), async (req, res) => {
  const s = await redis.hget('presence', req.params.user_id);
  res.json({ user_id: req.params.user_id, status: s || 'offline' });
});

// attachments presign (stub)
app.post('/v1/attachments/presign', oidc(), rateLimit(), async (req, res) => {
  const bucket = process.env.S3_BUCKET || 'mycaddipro-chat-uploads-dev';
  const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const params = { Bucket: bucket, Key: key, Expires: 300, ContentType: 'application/octet-stream' } as any;
  const upload_url = s3.getSignedUrl('putObject', params);
  res.json({ upload_url, key });
});

// webhooks
app.post('/v1/webhooks/replay', oidc(), async (_req, res) => {
  const rows = await pool.query('select conversation_id, message_id, sender_id, body, created_at from messages order by created_at desc limit 100');
  res.json({ count: rows.rowCount, sample: rows.rows });
});

app.listen(PORT, () => console.log(`chat-api listening on :${PORT}`));
