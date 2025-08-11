// env.init.js
<<<<<<< HEAD
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

=======
try { if (!process.env.CI) { require('dotenv').config(); } } catch (_) {}
function requireEnv(keys = []) {
  const missing = keys.filter(k => !process.env[k] || String(process.env[k]).trim() === '');
  if (missing.length) throw new Error(`Missing required env: ${missing.join(', ')}`);
}
>>>>>>> 2399cc0 (chore: normalize lockfile)
module.exports = { requireEnv };
