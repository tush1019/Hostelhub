import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import HostelManager, { Room } from './hostel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

const manager = new HostelManager();
manager.addRoom(new Room({ id: 'A-101', type: 'single', rentPerMonth: 3500, capacity: 1 }));
manager.addRoom(new Room({ id: 'A-102', type: 'double', rentPerMonth: 6000, capacity: 2 }));

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
};

const parseBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const getRoomsPayload = () =>
  manager.rooms.map((room) => ({
    id: room.id,
    type: room.type,
    rentPerMonth: room.rentPerMonth,
    capacity: room.capacity,
    occupancy: room.getOccupancy(),
    available: room.isAvailable(),
    residents: room.residents,
  }));

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/summary') {
    if (method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    sendJson(res, 200, manager.getSummary());
    return;
  }

  if (pathname === '/api/rooms') {
    if (method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    sendJson(res, 200, { rooms: getRoomsPayload() });
    return;
  }

  if (pathname === '/api/checkin') {
    if (method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    try {
      const body = await parseBody(req);
      const resident = manager.checkIn(
        {
          id: body.id,
          name: body.name,
          phone: body.phone ?? '',
          rentPerMonth: body.rentPerMonth,
          type: body.type,
        },
        body.preferredType ?? null,
      );
      sendJson(res, 200, { resident, summary: manager.getSummary() });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (pathname === '/api/checkout') {
    if (method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    try {
      const body = await parseBody(req);
      const removed = manager.checkOut(body.residentId);
      sendJson(res, 200, { removed, summary: manager.getSummary() });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (pathname === '/' || pathname === '/index.html') {
    const filePath = path.join(publicDir, 'index.html');
    try {
      const html = await readFile(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Hostelhub backend running at http://localhost:${port}`);
});
