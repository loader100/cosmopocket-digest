// env.init.js  (CommonJS)
require('dotenv').config();

function requireEnv(...keys) {
  const missing = keys.filter(k => !process.env[k] || String(process.env[k]).trim() === '');
  if (missing.length) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }
}

module.exports = { requireEnv };
