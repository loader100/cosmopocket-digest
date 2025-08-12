// test-auth.js
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
