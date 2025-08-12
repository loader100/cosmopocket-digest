// env.init.js
'use strict';
require('dotenv').config();

function get(name, optional = false) {
  const v = process.env[name];
  if (!v && !optional) {
    throw new Error(`Missing required env: ${name}`);
  }
  return v || '';
}

module.exports = {
  SLACK_BOT_TOKEN:   get('SLACK_BOT_TOKEN'),
  CHANNEL_BUFFER_ID: get('CHANNEL_BUFFER_ID'),
  CHANNEL_BRIDGE_ID: get('CHANNEL_BRIDGE_ID'),
  OPENAI_API_KEY:    get('OPENAI_API_KEY'), // 如想在无LLM时跳过，可改为 optional = true
};
