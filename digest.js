// digest.js
import dotenv from 'dotenv';
import { WebClient } from '@slack/web-api';
import dayjs from 'dayjs';
import fetch from 'node-fetch';
import refreshAccessToken from './auth.js';  // 关键步骤：引入 auth.js

dotenv.config();

const run = async () => {
  try {
    // 1. 获取最新 access token
    const token = await refreshAccessToken();
    console.log('✅ Using Slack Access Token:', token);

    // 2. 创建 Slack 客户端
    const web = new WebClient(token);

    // 3. 定义频道
    const CHANNEL_BRIDGE_ID = process.env.CHANNEL_BRIDGE_ID;
    const CHANNEL_BUFFER_ID = process.env.CHANNEL_BUFFER_ID;

    // 4. 获取最近一天消息
    const result = await web.conversations.history({
      channel: CHANNEL_BRIDGE_ID,
      oldest: dayjs().subtract(1, 'day').unix(),
    });

    const messages = result.messages || [];

    // 5. 简化摘要逻辑（这里只保留文本消息）
    const digest = messages
      .filter((msg) => msg.type === 'message' && msg.text)
      .map((msg) => `• ${msg.text}`)
      .join('\n');

    const finalDigest = `📣 昨日摘要（${dayjs().format('YYYY-MM-DD')}）\n${digest}`;

    // 6. 发送到 buffer 频道
    await web.chat.postMessage({
      channel: CHANNEL_BUFFER_ID,
      text: finalDigest,
    });

    console.log('✅ 摘要推送成功！');
  } catch (error) {
    console.error('❌ 错误:', error);
  }
};

run();
