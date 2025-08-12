require('dotenv').config();

function requireEnv(...names) {
  const missing = names.filter(n => !process.env[n]);
  if (missing.length) {
    throw new Error(`Missing required env: ${missing.join(', ')}`);
  }
  return names.reduce((acc, k) => (acc[k] = process.env[k], acc), {});
}

module.exports = { requireEnv };
