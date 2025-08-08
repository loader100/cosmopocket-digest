// digest.js —— 自动调用 auth.js 刷新 token 并发送摘要
import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';
import refreshAccessToken from './auth.js';

dotenv.config();

(async () => {
  try {
    const { access_token } = await refreshAccessToken();

    const slack = new WebClient(access_token);
    const channelBridgeId = process.env.CHANNEL_BRIDGE_ID;
    const channelBufferId = process.env.CHANNEL_BUFFER_ID;

    const result = await slack.conversations.history({
      channel: channelBridgeId,
      limit: 10,
    });

    const summary = result.messages.map(msg => `• ${msg.text}`).join('\n');

    await slack.chat.postMessage({
      channel: channelBufferId,
      text: `📡 今日摘要：\n${summary}`,
    });

    console.log('✅ 成功推送摘要');
  } catch (error) {
    console.error('❌ digest.js 报错：', error.message || error);
  }
})();
