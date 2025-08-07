require('dotenv').config();
import { WebClient } from '@slack/web-api';
import dayjs from 'dayjs';

const token      = process.env.SLACK_ACCESS_TOKEN;   // ✅ 改成 ACCESS token
const BRIDGE_ID  = process.env.CHANNEL_BRIDGE_ID;
const BUFFER_ID  = process.env.CHANNEL_BUFFER_ID;
const client     = new WebClient(token);
const oldestTS   = (Date.now() - 24 * 3_600_000) / 1000;   // 24 小时前

(async () => {
  const { messages } = await client.conversations.history({
    channel: BRIDGE_ID,
    oldest : oldestTS,
    limit  : 800,
  });

  const raw = messages.filter(m => !m.subtype);

  const texts  = raw.map(m => m.text);
  const qs     = texts.filter(t => t.includes('?')).slice(0, 5)
                      .map(t => `• ${t}`);
  const sparks = texts.filter(t => t.length > 60 && !t.includes('?'))
                      .slice(0, 5)
                      .map(t => `• ${t.slice(0, 80)}…`);

  const md = [
    `*Strategy-Digest · ${dayjs().format('YYYY-MM-DD')}*`,
    '',
    '🔍 *Top Questions*',
    qs.length     ? qs.join('\n')     : '—',
    '',
    '✨ *Idea Sparks*',
    sparks.length ? sparks.join('\n') : '—',
  ].join('\n');

  await client.chat.postMessage({
    channel: BUFFER_ID,
    text: md,
    mrkdwn: true,
  });

  console.log('Digest sent ✔');
})();
