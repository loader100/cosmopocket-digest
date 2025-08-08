// auth.js —— 获取 xoxe- 用户 access_token（Modern App）
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const refreshAccessToken = async () => {
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

  if (!response.data.ok) {
    throw new Error(`Failed to refresh token: ${JSON.stringify(response.data)}`);
  }

  const token = response.data.access_token;

  // ✅ 控制台打印 token 以供测试
  console.log('✅ New Access Token:', token);

  return { access_token: token };
};

// ✅ 仅在直接运行 auth.js 时打印 token
if (process.argv[1].includes('auth.js')) {
  refreshAccessToken().catch(console.error);
}

export default refreshAccessToken;
