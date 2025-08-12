// test-auth.js
<<<<<<< HEAD
const { requireEnv } = require('./env.init');
const { WebClient } = require('@slack/web-api');

requireEnv('SLACK_BOT_TOKEN');

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

(async () => {
  const r = await client.auth.test();
  console.log('auth.test ok ->', {
    url: r.url,
    team: r.team,
    user: r.user,
    bot_id: r.bot_id,
  });
})().catch(err => {
  console.error('Auth test failed:', err.data || err);
  process.exit(1);
});
=======
'use strict';
const { WebClient } = require('@slack/web-api');
const env = require('./env.init');

(async () => {
  const slack = new WebClient(env.SLACK_BOT_TOKEN);
  const r = await slack.auth.test();
  console.log('auth.test ok -> {');
  console.log(`  url: '${r.url}',`);
  console.log(`  team: '${r.team}',`);
  console.log(`  user: '${r.user}',`);
  console.log(`  bot_id: '${r.bot_id}'`);
  console.log('}');
  console.log('CHANNEL_BUFFER_ID ->', env.CHANNEL_BUFFER_ID);
  console.log('CHANNEL_BRIDGE_ID ->', env.CHANNEL_BRIDGE_ID);
})().catch(e => { console.error(e); process.exit(1); });
>>>>>>> 23c1a01 (feat: first working digest)
