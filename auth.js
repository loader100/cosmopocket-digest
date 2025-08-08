// auth.js —— 自动获取新 access token（Slack Modern App）
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const refreshAccessToken = async () => {
  const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
    params: {
      grant_type: 'refresh_token',
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      refresh_token: process.env.SLACK_REFRESH_TOKEN
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  if (!response.data.ok) {
    throw new Error(`Failed to refresh token: ${JSON.stringify(response.data)}`);
  }

  return response.data.access_token;
};

export default refreshAccessToken;
