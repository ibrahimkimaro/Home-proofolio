const http = require('http');

const PORT = 7777;
const REMOTE_HOST = process.env.OLLAMA_REMOTE_HOST || '192.168.2.222';
const LOCAL_HOST = '127.0.0.1';
const TARGET_PORT = parseInt(process.env.OLLAMA_TARGET_PORT || '11434', 10);

let activeHost = LOCAL_HOST;
let lastCheck = 0;

function checkRemoteHost(callback) {
  const now = Date.now();
  if (now - lastCheck < 20000) {
    return callback(activeHost);
  }
  lastCheck = now;
  const testReq = http.request({
    hostname: REMOTE_HOST,
    port: TARGET_PORT,
    path: '/api/tags',
    method: 'GET',
    timeout: 1000
  }, (res) => {
    if (res.statusCode === 200) {
      if (activeHost !== REMOTE_HOST) {
        console.log(`[Ollama Bridge] Remote server online: ${REMOTE_HOST}:${TARGET_PORT}`);
      }
      activeHost = REMOTE_HOST;
    } else {
      activeHost = LOCAL_HOST;
    }
    callback(activeHost);
  });

  testReq.on('timeout', () => {
    testReq.destroy();
    activeHost = LOCAL_HOST;
    callback(LOCAL_HOST);
  });

  testReq.on('error', () => {
    activeHost = LOCAL_HOST;
    callback(LOCAL_HOST);
  });

  testReq.end();
}

const server = http.createServer((req, res) => {
  checkRemoteHost((targetHost) => {
    const options = {
      hostname: targetHost,
      port: TARGET_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `${targetHost}:${TARGET_PORT}` }
    };

    const proxyReq = http.request(options, (proxyRes) => {
      if (!res.headersSent) {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
      }
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`Proxy request error (${targetHost}):`, err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message, host: targetHost }));
      }
    });

    req.pipe(proxyReq);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Ollama Bridge running on 0.0.0.0:${PORT} (Remote: ${REMOTE_HOST}, Local Fallback: ${LOCAL_HOST})`);
});
