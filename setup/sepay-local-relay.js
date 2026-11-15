// Chỉ dùng khi phát triển. Tunnel cổng 3001, không tunnel toàn bộ Backend 3000.
const http = require('node:http');
const route = '/api/webhooks/sepay';
http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== route) {
        res.writeHead(404).end(); return;
    }
    const headers = {};
    for (const key of ['content-type', 'content-length', 'x-sepay-signature', 'x-sepay-timestamp']) {
        if (req.headers[key] !== undefined) headers[key] = req.headers[key];
    }
    if (Number(headers['content-length'] || 0) > 65536) {
        res.writeHead(413).end(); return;
    }
    const chunks = []; let size = 0; let rejected = false;
    req.on('data', chunk => {
        if (rejected) return;
        size += chunk.length;
        if (size > 65536) { rejected = true; res.writeHead(413).end(); return; }
        chunks.push(chunk);
    });
    req.on('end', () => {
        if (rejected) return;
        const bytes = Buffer.concat(chunks);
        headers['content-length'] = bytes.length;
        const upstream = http.request({ hostname: '127.0.0.1', port: 3000, path: route, method: 'POST', headers, timeout: 20000 }, response => {
            res.writeHead(response.statusCode || 502, { 'content-type': response.headers['content-type'] || 'application/json' });
            response.pipe(res);
        });
        upstream.on('timeout', () => upstream.destroy());
        upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
        upstream.end(bytes);
    });
}).listen(3001, '127.0.0.1', () => console.log('SePay local relay: http://127.0.0.1:3001' + route));
