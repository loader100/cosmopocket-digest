// auth.js —— 自动获取新 access token（Slack Modern App） CJS 版本
const axios = require('axios');
require('dotenv').config();

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

    if (!response.data.ok) {
      throw new Error(`❌ Failed to refresh token: ${JSON.stringify(response.data)}`);
    }

    const token = response.data.access_token;
    console.log('✅ New Access Token:', token);
    return token;
  } catch (err) {
    console.error('❌ Error refreshing token:', err.message);
  }
};

// 如果直接运行该文件，就刷新 token
if (require.main === module) {
  refreshAccessToken();
}

module.exports = refreshAccessToken;
