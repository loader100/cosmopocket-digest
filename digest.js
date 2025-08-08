// digest.js —— 自动刷新 token 后发送 Slack 消息

import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';
import refreshAccessToken from './auth.js';

dotenv.config();

(async () => {
  try {
    // ✅ 1. 获取最新 access_token（xoxe-开头的 User Token）
    const { access_token } = await refreshAccessToken();

    // ✅ 2. 初始化 Slack Web API 客户端
    const slack = new WebClient(access_token);

    // ✅ 3. 读取环境变量中的频道 ID
    const channelBridgeId = process.env.CHANNEL_BRIDGE_ID;
    const channelBufferId = process.env.CHANNEL_BUFFER_ID;

    if (!channelBridgeId || !channelBufferId) {
      throw new Error('CHANNEL_BRIDGE_ID 或 CHANNEL_BUFFER_ID 缺失');
    }

    // ✅ 4. 拉取上游频道消息摘要（你可以自定义摘要逻辑）
    const messages = await slack.conversations.history({
      channel: channelBridgeId,
      limit: 10,
    });

    const summary = messages.messages.map(msg => `• ${msg.text}`).join('\n');

    // ✅ 5. 发送摘要到下游频道
    await slack.chat.postMessage({
      channel: channelBufferId,
      text: `📝 今日摘要：\n${summary}`,
    });

    console.log('✅ 摘要推送成功');

  } catch (err) {
    console.error('❌ digest.js 执行失败:', err.message || err);
  }
})();
