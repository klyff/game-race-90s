#!/usr/bin/env node
/**
 * Debug-IA log collector. Writes one file per driver under /tmp/reportIA/drivers.
 */
import { createServer } from 'node:http';
import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/tmp/reportIA';
const DRIVERS = join(ROOT, 'drivers');
mkdirSync(DRIVERS, { recursive: true });
mkdirSync(join(ROOT, 'screenshots'), { recursive: true });
mkdirSync(join(ROOT, 'logs'), { recursive: true });

const seen = new Set();
const sessionLog = join(ROOT, 'logs', 'collector.log');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

const server = createServer((req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }
  if (req.method !== 'POST' || req.url !== '/log') {
    res.writeHead(404);
    res.end();
    return;
  }
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const entries = Array.isArray(body.entries) ? body.entries : [];
      for (const entry of entries) {
        if (typeof entry?.file !== 'string' || typeof entry?.line !== 'string') {
          continue;
        }
        const safe = entry.file.replace(/[^A-Za-z0-9._-]+/g, '_');
        const path = join(DRIVERS, safe);
        if (!seen.has(safe)) {
          seen.add(safe);
          writeFileSync(path, `# debug-ia ${safe}\n`, 'utf8');
        }
        appendFileSync(path, `${entry.line}\n`, 'utf8');
      }
      appendFileSync(sessionLog, `${new Date().toISOString()} wrote ${entries.length} lines\n`, 'utf8');
      res.writeHead(204);
      res.end();
    } catch (error) {
      appendFileSync(sessionLog, `${new Date().toISOString()} error ${error}\n`, 'utf8');
      res.writeHead(400);
      res.end('bad json');
    }
  });
});

server.listen(8765, '127.0.0.1', () => {
  console.log('debug-ia log collector on http://127.0.0.1:8765');
});
