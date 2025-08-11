// dev-oauth-listener.js
// 作用：监听 http://localhost:5317/slack/oauth ，收到 code 后自动换 token 并写入 .env

const http = require("http");
const { URL } = require("url");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const LISTEN_PORT = parseInt(process.env.LISTEN_PORT || "5317", 10);
const REDIRECT_URI = process.env.SLACK_REDIRECT_URI || "https://localhost:5318/slack/oauth";
const CLIENT_ID = process.env.SLACK_CLIENT_ID || "";
const CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || "";
const SCOPES = process.env.SLACK_SCOPES || "chat:write,channels:history,channels:read,users:read";

// 简单更新 .env：有则改，无则加
function upsertEnv(k, v) {
  const envPath = path.join(process.cwd(), ".env");
  let text = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const line = `${k}=${v}`;
  const regex = new RegExp(`^\\s*${k}\\s*=.*$`, "m");
  if (regex.test(text)) {
    text = text.replace(regex, line);
  } else {
    if (text && !text.endsWith("\n")) text += "\n";
    text += line + "\n";
  }
  fs.writeFileSync(envPath, text, "utf8");
}

function okPage(htmlBody) {
  return `<!doctype html><meta charset="utf-8"><title>Slack OAuth OK</title>
  <style>body{font:16px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;padding:32px;}</style>
  <h2>✅ 授权成功</h2>${htmlBody}<p>可关闭此页，回到终端查看日志。</p>`;
}
function errPage(msg) {
  return `<!doctype html><meta charset="utf-8"><title>Slack OAuth Error</title>
  <style>body{font:16px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;padding:32px;color:#b00020}</style>
  <h2>❌ 授权失败</h2><pre>${msg}</pre>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${LISTEN_PORT}`);
  if (url.pathname !== "/slack/oauth") {
    res.writeHead(404); return res.end("Not found");
  }

  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");

  console.log("Incoming OAuth callback:", url.searchParams.toString() || "(no params)");
  if (err) {
    console.error("Slack returned error:", err);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(errPage(`Slack 错误：${err}`));
  }
  if (!code) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(errPage("缺少 code 参数。请从授权链接进入。"));
  }
  if (!CLIENT_ID || !CLIENT_SECRET) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(errPage("缺少 SLACK_CLIENT_ID 或 SLACK_CLIENT_SECRET。请在 .env 配置后重试。"));
  }

  try {
    // 用 code 换 token
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI
    });

    const resp = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });
    const data = await resp.json();
    console.log("OAuth result:", data);

    if (!data.ok) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(errPage(`Slack 返回失败：${JSON.stringify(data, null, 2)}`));
    }

    // 落盘关键字段
    if (data.access_token) upsertEnv("SLACK_ACCESS_TOKEN", data.access_token);
    if (data.refresh_token) upsertEnv("SLACK_REFRESH_TOKEN", data.refresh_token);
    if (data.bot_user_id) upsertEnv("SLACK_BOT_USER_ID", data.bot_user_id);
    if (data.team && data.team.id) upsertEnv("SLACK_TEAM_ID", data.team.id);
    upsertEnv("SLACK_SCOPES", SCOPES);
    upsertEnv("SLACK_REDIRECT_URI", REDIRECT_URI);

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(okPage(`<pre>${[
      `access_token: ${data.access_token?.slice(0,12)}...`,
      `refresh_token: ${data.refresh_token?.slice(0,12)}...`,
      `bot_user_id: ${data.bot_user_id || ""}`,
      `team_id: ${data.team?.id || ""}`,
      `scopes: ${SCOPES}`,
      `redirect_uri: ${REDIRECT_URI}`
    ].join("\n")}</pre>`));
  } catch (e) {
    console.error(e);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(errPage(String(e)));
  }
});

server.listen(LISTEN_PORT, () => {
  console.log(`Listening at http://localhost:${LISTEN_PORT}/slack/oauth`);
});
