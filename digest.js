require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const OpenAI = require('openai');
const dayjs = require('dayjs');
const { requireEnv } = require('./env.init');

const env = requireEnv(
  'SLACK_BOT_TOKEN',
  'CHANNEL_BUFFER_ID',
  'CHANNEL_BRIDGE_ID',
  'OPENAI_API_KEY'
);

const slack = new WebClient(env.SLACK_BOT_TOKEN);
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

async function readBridgeText(hours = 24, take = 300) {
  const oldest = (Date.now() / 1000) - hours * 3600;
  let cursor;
  const texts = [];

  do {
    const res = await slack.conversations.history({
      channel: env.CHANNEL_BRIDGE_ID,
      oldest,
      limit: 200,
      cursor,
    });
    (res.messages || []).forEach(m => {
      if (!m.subtype && m.text) texts.push(m.text.replace(/\s+/g, ' ').trim());
    });
    cursor = res.response_metadata?.next_cursor;
    if (texts.length >= take) break;
  } while (cursor);

  return texts.slice(0, take);
}

async function summarize(texts) {
  const content = texts.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const sys = `You are the COLLECTOR for CosmoPocket's Strategy-Buffer.
Return ONLY three sections in Chinese markdown:
1) Top_Questions: 3–5 bullets, ≤ 20 words each
2) Idea_Sparks: 3–5 bullets, ≤ 20 words each
3) Alerts: 1–3 bullets, ≤ 20 words each
No greetings, no hashtags, no explanations.`;

  const rsp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: content.slice(0, 15000) },
    ],
  });

  return rsp.choices?.[0]?.message?.content?.trim() || '_（模型无返回）_';
}

async function postDigest(md) {
  const date = dayjs().format('YYYY-MM-DD');
  const text = `*Strategy-Digest · ${date}*\n${md}`;
  await slack.chat.postMessage({ channel: env.CHANNEL_BUFFER_ID, text, mrkdwn: true });
}

(async () => {
  const texts = await readBridgeText(24, 300);
  const md = texts.length ? await summarize(texts) : '_过去24小时没有可摘要的消息_';
  await postDigest(md);
  console.log('digest ok');
})().catch(e => { console.error(e); process.exit(1); });
