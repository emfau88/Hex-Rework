// Minimal static server for the prototype. No dependencies.
//   node serve.mjs            only this computer:  http://localhost:4180
//   node serve.mjs --lan      also phones in the same Wi-Fi (prints the address)
//   node serve.mjs --open     opens the browser as well

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const port = Number(process.env.PORT || args.find((a) => /^\d+$/.test(a)) || 4180);
const lan = args.includes('--lan');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.md': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
});

let current = port;
server.on('error', (err) => {
  // Port taken (for example by a second window): try the next few ports.
  if (err.code === 'EADDRINUSE' && current < port + 10) {
    current++;
    server.listen(current, lan ? '0.0.0.0' : '127.0.0.1');
  } else {
    console.error(err.message);
    process.exit(1);
  }
});
server.on('listening', () => {
  const local = `http://localhost:${current}/`;
  console.log(`Spiel:  ${local}`);
  if (lan) {
    for (const list of Object.values(os.networkInterfaces())) {
      for (const n of list || []) if (n.family === 'IPv4' && !n.internal) console.log(`Handy:  http://${n.address}:${current}/   (gleiches WLAN)`);
    }
  }
  console.log('Beenden mit Strg+C oder Fenster schliessen.');
  if (args.includes('--open')) exec(`start "" "${local}"`);
});
server.listen(current, lan ? '0.0.0.0' : '127.0.0.1');
