/* eslint-disable no-console */
// digest.js — Strategy-Buffer 自动摘要版
// 功能：从 bridge 拉取 24h 消息 -> LLM 总结 -> 发到 buffer（可选同步发 bridge）
//
// 需要的环境变量：
//   SLACK_ACCESS_TOKEN   (xoxb-...)
//   CHANNEL_BUFFER_ID    (目标频道，如 C0... / G0...)
//   CHANNEL_BRIDGE_ID    (来源频道，如 C0... / G0...)
//   OPENAI_API_KEY       (OpenAI Key)
//   MODEL_NAME           (可选，默认 gpt-4o-mini)
//   OPENAI_BASE_URL      (可选，默认 https://api.openai.com/v1)

require('./env.init'); // 仍然加载你们现有的 .env / CI 变量
const { WebClient } = require('@slack/web-api');
const dayjs = require('dayjs');

// ---------- 配置 ----------
const slack = new WebClient(process.env.SLACK_ACCESS_TOKEN);
const CHANNEL_BUFFER_ID = process.env.CHANNEL_BUFFER_ID;
const CHANNEL_BRIDGE_ID = process.env.CHANNEL_BRIDGE_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const MODEL_NAME = process.env.MODEL_NAME || 'gpt-4o-mini';

// 安全检查
if (!OPENAI_API_KEY) {
  throw new Error('Missing required env: OPENAI_API_KEY');
}
if (!CHANNEL_BUFFER_ID) {
  throw new Error('Missing required env: CHANNEL_BUFFER_ID');
}
if (!CHANNEL_BRIDGE_ID) {
  console.warn('[warn] CHANNEL_BRIDGE_ID not set — 将仅发送心跳/摘要到 buffer。');
}

// ---------- 工具 ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, { retries = 3, base = 500 } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try { return await fn(); } catch (e) {
      lastErr = e;
      const wait = base * Math.pow(2, i);
      console.warn(`[retry] ${i + 1}/${retries} wait ${wait}ms:`, e?.data?.error || e?.message);
      await sleep(wait);
    }
  }
  throw lastErr;
}

async function ensureJoin(channel) {
  if (!channel) return;
  try {
    // 公有频道可以 join；私有会报错，忽略即可
    await slack.conversations.join({ channel });
  } catch (e) {
    const err = e?.data?.error;
    const ignorable = ['already_in_channel', 'not_in_channel', 'method_not_supported_for_channel_type'];
    if (!ignorable.includes(err)) {
      console.warn('join failed:', channel, err);
    }
  }
}

// ---------- 步骤 1：拉取 24h 消息 ----------
async function fetchWindowHistory(channelId, oldestTs, latestTs) {
  if (!channelId) return [];
  let cursor;
  const messages = [];
  do {
    const res = await withRetry(() =>
      slack.conversations.history({
        channel: channelId,
        oldest: String(oldestTs),
        latest: String(latestTs),
        inclusive: true,
        limit: 200,
        cursor,
      })
    );

    for (const m of res.messages || []) {
      // 过滤噪声：仅保留用户/普通消息（无 subtype）
      if (!m.subtype && m.text) {
        messages.push(m);
      }
    }
    cursor = res.response_metadata?.next_cursor;
  } while (cursor);

  // Slack 返回一般是新到旧；我们按时间升序
  messages.sort((a, b) => Number(a.ts) - Number(b.ts));
  return messages;
}

// ---------- 步骤 2：构建 LLM Prompt ----------
function clipMessagesForPrompt(messages, maxChars = 6000) {
  // 近的优先：从后往前拼，直到到达上限
  const arr = [];
  let total = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    const line = `[${dayjs.unix(Number(m.ts)).format('MM-DD HH:mm')}] <@${m.user || 'unknown'}>: ${m.text.trim()}`;
    const len = line.length + 1;
    if (total + len > maxChars) break;
    arr.push(line);
    total += len;
  }
  return arr.reverse();
}

function buildPromptFromMessages(lines) {
  const header = `You are the COLLECTOR for CosmoPocket's Strategy-Buffer.
You will summarize the raw chat messages from #bridge-feed (past 24h).
Return a strict JSON object with keys: "Top_Questions", "Idea_Sparks", "Alerts".
Each value is an array of 3-5 concise items (<= 20 words each). No greetings. No hashtags.

Example format:
{
  "Top_Questions": ["...","..."],
  "Idea_Sparks": ["...","..."],
  "Alerts": ["...","..."]
}

Now here are the messages:`;
  return `${header}\n\n${lines.join('\n')}\n`;
}

// ---------- 步骤 3：调用 LLM ----------
async function summarizeWithLLM(prompt) {
  const body = {
    model: MODEL_NAME,
    response_format: { type: 'json_object' }, // 让模型返回 JSON
    temperature: 0.3,
    messages: [
      { role: 'system', content: 'You analyze chat logs and produce structured insights as strict JSON.' },
      { role: 'user', content: prompt },
    ],
  };

  const res = await withRetry(async () => {
    const r = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error(`OpenAI ${r.status}: ${t}`);
    }
    return r.json();
  }, { retries: 3, base: 800 });

  const text = res?.choices?.[0]?.message?.content?.trim();
  let json;
  try { json = JSON.parse(text); }
  catch (_) {
    // 非 JSON 时做一次兜底提取
    json = { Top_Questions: [], Idea_Sparks: [], Alerts: [] };
    (text || '').split('\n').forEach((line) => {
      const s = line.replace(/^[-•*\s]+/, '').trim();
      if (!s) return;
      if (json.Top_Questions.length < 5) json.Top_Questions.push(s);
      else if (json.Idea_Sparks.length < 5) json.Idea_Sparks.push(s);
      else if (json.Alerts.length < 5) json.Alerts.push(s);
    });
  }
  // 防御：确保三个字段存在且为数组
  for (const k of ['Top_Questions', 'Idea_Sparks', 'Alerts']) {
    if (!Array.isArray(json[k])) json[k] = [];
  }
  return json;
}

// ---------- 步骤 4：渲染 Digest ----------
function renderDigest(data) {
  const d = dayjs().format('YYYY-MM-DD');
  const sec = (title, arr) =>
    arr.length ? `\n${title}\n${arr.map((x) => `• ${x}`).join('\n')}\n` : `\n${title}\n• (No items today)\n`;

  return [
    `Strategy-Digest · ${d}`,
    sec('🌀 Top Questions', data.Top_Questions || []),
    sec('✨ Idea Sparks', data.Idea_Sparks || []),
    sec('⚠️ Alerts', data.Alerts || []),
  ].join('\n');
}

// ---------- 步骤 5：发送 ----------
async function postToChannels(text) {
  const targets = [CHANNEL_BUFFER_ID, CHANNEL_BRIDGE_ID].filter(Boolean);
  // 先尝试加入（公有频道可用）
  await Promise.all(targets.map((id) => ensureJoin(id)));
  for (const ch of targets) {
    const res = await withRetry(() => slack.chat.postMessage({ channel: ch, text }));
    console.log('chat.postMessage ok -> channel:', ch, 'ts:', res.ts);
  }
}

// ---------- 主流程 ----------
async function main() {
  const auth = await slack.auth.test();
  console.log('auth.test ok ->', { team: auth.team, user: auth.user, bot_id: auth.bot_id });

  const now = Math.floor(Date.now() / 1000);
  const oldest = now - 24 * 60 * 60;

  let digestText;
  if (!CHANNEL_BRIDGE_ID) {
    // 没配置 bridge：发心跳
    digestText = `CosmoPocket Digest heartbeat ✅\nTime: ${dayjs().format('YYYY/MM/DD HH:mm:ss')}`;
  } else {
    console.log('fetching 24h history from bridge:', CHANNEL_BRIDGE_ID);
    const msgs = await fetchWindowHistory(CHANNEL_BRIDGE_ID, oldest, now);
    console.log('history size:', msgs.length);

    const lines = clipMessagesForPrompt(msgs, 6000);
    const prompt = buildPromptFromMessages(lines);

    let summary;
    try {
      summary = await summarizeWithLLM(prompt);
    } catch (e) {
      console.error('[LLM] failed, fallback to links:', e.message);
      // 降级：列出最近 N 条消息时间与前 80 字
      const fallback = lines.slice(-8).map((l) => l.slice(0, 120));
      summary = {
        Top_Questions: [],
        Idea_Sparks: [],
        Alerts: ['LLM failed: fallback to last lines', ...fallback],
      };
    }
    digestText = renderDigest(summary);
  }

  await postToChannels(digestText);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
