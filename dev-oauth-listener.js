// dev-oauth-listener.js
import http from 'http';

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost:5317');
  if (u.pathname === '/slack/oauth') {
    const code = u.searchParams.get('code');
    console.log('Got code:', code);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK! You can close this tab and go back to the terminal.');
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(5317, () => {
  console.log('Listening on http://localhost:5317/slack/oauth');
});
