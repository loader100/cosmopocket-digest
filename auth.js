// auth.js —— 自动刷新 Slack Access Token（用于 Modern Slack App）

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const refreshAccessToken = async () => {
  try {
    const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        grant_type: 'refresh_token',
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        refresh_token: process.env.SLACK_REFRESH_TOKEN,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // ✅ 输出完整响应，便于调试
    console.log('Slack refresh response:', response.data);

    if (!response.data.ok) {
      throw new Error(`❌ Failed to refresh token: ${JSON.stringify(response.data)}`);
    }

    // ✅ 输出新的 access_token
    console.log('✅ New Access Token:', response.data.access_token);

    return response.data.access_token;
  } catch (error) {
    console.error('❌ Error refreshing access token:', error.message);
    throw error;
  }
};

export default refreshAccessToken;
