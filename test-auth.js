// test-auth.js
require('./env.init');
const { requireEnv } = require('./env.init');
requireEnv(['SLACK_ACCESS_TOKEN']);

(async () => {
  const r = await fetch('https://slack.com/api/auth.test', {
    headers: { Authorization: `Bearer ${process.env.SLACK_ACCESS_TOKEN}` }
  });
  const j = await r.json();
  console.log(j);
  if (!j.ok) process.exit(1);
})();
