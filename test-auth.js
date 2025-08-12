require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const { requireEnv } = require('./env.init');

const env = requireEnv('SLACK_BOT_TOKEN', 'CHANNEL_BUFFER_ID', 'CHANNEL_BRIDGE_ID');

(async () => {
  const slack = new WebClient(env.SLACK_BOT_TOKEN);
  const auth = await slack.auth.test();
  console.log('auth.test ok -> {');
  console.log(`  url: '${auth.url}',`);
  console.log(`  team: '${auth.team}',`);
  console.log(`  user: '${auth.user}',`);
  console.log(`  bot_id: '${auth.bot_id}'`);
  console.log('}');
})();
