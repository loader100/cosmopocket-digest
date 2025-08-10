// env.init.js
// 统一环境变量加载：本地加载 .env，CI/Actions 用外部注入
try {
  if (!process.env.CI) {
    require('dotenv').config();
  }
} catch (_) {}

function requireEnv(keys = []) {
  const missing = keys.filter(k => !process.env[k] || String(process.env[k]).trim() === '');
  if (missing.length) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }
}

module.exports = { requireEnv };
