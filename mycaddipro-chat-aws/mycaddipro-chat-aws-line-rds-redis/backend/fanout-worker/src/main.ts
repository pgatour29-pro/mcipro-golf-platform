import { SQS } from 'aws-sdk';
import Redis from 'ioredis';

const sqs = new SQS({ region: 'ap-southeast-1', endpoint: process.env.LOCALSTACK_URL || 'http://localhost:4566' });
const queueUrl = process.env.SQS_URL || 'http://localhost:4566/000000000000/chat-messages';
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function poll() {
  const r = await sqs.receiveMessage({ QueueUrl: queueUrl, WaitTimeSeconds: 10, MaxNumberOfMessages: 10 }).promise();
  if (r.Messages) {
    for (const m of r.Messages) {
      if (m.Body) await redis.publish('chat.messages', m.Body);
      if (m.ReceiptHandle) await sqs.deleteMessage({ QueueUrl: queueUrl, ReceiptHandle: m.ReceiptHandle }).promise();
    }
  }
  setImmediate(poll);
}
poll().catch(err => { console.error(err); process.exit(1); });
