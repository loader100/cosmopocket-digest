require('dotenv').config();
const { WebClient } = require('@slack/web-api');

const token = (process.env.SLACK_BOT_TOKEN || '').trim();
if (!token) {
  console.error('MISSING SLACK_BOT_TOKEN');
  process.exit(1);
}

const slack = new WebClient(token);

(async () => {
  try {
    const r = await slack.auth.test();
    console.log('auth.test OK ->', {
      url: r.url, team: r.team, user: r.user, bot_id: r.bot_id
    });
  } catch (e) {
    console.error('auth.test ERR ->', e.data || e);
  }
})();
