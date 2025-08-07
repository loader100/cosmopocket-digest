import 'dotenv/config';
import axios from 'axios';
import dayjs from 'dayjs';

const accessToken  = process.env.SLACK_ACCESS_TOKEN;
const bridgeId     = process.env.CHANNEL_BRIDGE_ID;
const bufferId     = process.env.CHANNEL_BUFFER_ID;

const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
};

// 获取 24 小时前的时间戳
const oldestTS = (Date.now() - 24 * 3600 * 1000) / 1000;

(async () => {
  try {
    // Step 1: 拉取频道消息
    const res = await axios.get('https://slack.com/api/conversations.history', {
      headers,
      params: {
        channel: bridgeId,
        oldest : oldestTS,
        limit  : 800,
      }
    });

    const messages = res.data.messages || [];
    const raw = messages.filter(m => !m.subtype);
    const texts = raw.map(m => m.text);

    // Step 2: 处理内容
    const qs = texts.filter(t => t.includes('?')).slice(0, 5)
                    .map(t => `• ${t}`);
    const sparks = texts.filter(t => t.length > 60 && !t.includes('?'))
                        .slice(0, 5)
                        .map(t => `• ${t.slice(0, 80)}…`);

    const digestText = [
      `*Strategy-Digest · ${dayjs().format('YYYY-MM-DD')}*`,
      '',
      '🔍 *Top Questions*',
      qs.length     ? qs.join('\n')     : '—',
      '',
      '✨ *Idea Sparks*',
      sparks.length ? sparks.join('\n') : '—',
    ].join('\n');

    // Step 3: 发送摘要到目标频道
    await axios.post('https://slack.com/api/chat.postMessage', {
      channel: bufferId,
      text   : digestText,
      mrkdwn : true,
    }, { headers });

    console.log('✅ Digest sent to #strategy-buffer');
  } catch (err) {
    console.error('❌ Error sending digest:', err.response?.data || err.message);
  }
})();
