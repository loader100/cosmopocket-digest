// digest.js
require('./env.init');
const { requireEnv } = require('./env.init');

requireEnv([
  'SLACK_ACCESS_TOKEN',
  'CHANNEL_BUFFER_ID' // 目标投递频道；如需从桥接频道读内容，可再加 CHANNEL_BRIDGE_ID
]);

const token = process.env.SLACK_ACCESS_TOKEN;
const channelBuffer = process.env.CHANNEL_BUFFER_ID;

// 你以后把摘要拼装逻辑写在这里
async function buildDigest() {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  return `CosmoPocket Digest heartbeat ✅\nTime: ${now}`;
}

async function slack(method, body) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!json.ok) {
    throw new Error(`${method} failed: ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  // 1) 自检
  const auth = await fetch('https://slack.com/api/auth.test', {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  if (!auth.ok) throw new Error(`auth.test failed: ${JSON.stringify(auth)}`);
  console.log('auth.test ok ->', { team: auth.team, user: auth.user, bot_id: auth.bot_id });

  // 2) 生成摘要
  const text = await buildDigest();

  // 3) 发送到 Buffer 频道
  const sent = await slack('chat.postMessage', { channel: channelBuffer, text });
  console.log('chat.postMessage ok -> ts:', sent.ts);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
