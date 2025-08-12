// digest.js
const { requireEnv } = require('./env.init');
const { WebClient } = require('@slack/web-api');

requireEnv('SLACK_BOT_TOKEN', 'CHANNEL_BUFFER_ID');

const client = new WebClient(process.env.SLACK_BOT_TOKEN);
const channel = process.env.CHANNEL_BUFFER_ID;

(async () => {
  const text = `CosmoPocket Digest heartbeat ✅\nTime: ${new Date().toLocaleString('zh-CN', { hour12:false })}`;
  const res = await client.chat.postMessage({ channel, text });
  console.log('chat.postMessage ok -> ts:', res.ts);
})().catch(err => {
  console.error('chat.postMessage failed:', err.data || err);
  process.exit(1);
});
