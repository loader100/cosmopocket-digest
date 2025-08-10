// digest.js
require('./env.init');
const { requireEnv } = require('./env.init');
requireEnv(['SLACK_ACCESS_TOKEN', 'CHANNEL_BUFFER_ID']);

const { WebClient } = require('@slack/web-api');
const slack = new WebClient(process.env.SLACK_ACCESS_TOKEN);

async function buildDigest() {
  const now = new Date().toLocaleString();
  return `CosmoPocket Digest heartbeat ✅\nTime: ${now}`;
}

async function main() {
  const auth = await slack.auth.test();
  console.log('auth.test ok ->', { team: auth.team, user: auth.user, bot_id: auth.bot_id });

  const text = await buildDigest();
  const res = await slack.chat.postMessage({
    channel: process.env.CHANNEL_BUFFER_ID,
    text
  });
  console.log('chat.postMessage ok -> ts:', res.ts);
}
main().catch(err => { console.error(err); process.exit(1); });
