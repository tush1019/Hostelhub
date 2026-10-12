import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const MAX_BODY_SIZE = 16 * 1024;

export async function initializeDatabase(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      rent_per_month NUMERIC(10, 2) NOT NULL CHECK (rent_per_month >= 0),
      capacity INTEGER NOT NULL CHECK (capacity > 0)
    );

    CREATE TABLE IF NOT EXISTS residents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      room_id TEXT NOT NULL REFERENCES rooms(id),
      rent_per_month NUMERIC(10, 2) NOT NULL CHECK (rent_per_month >= 0),
      checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS residents_room_id_idx ON residents(room_id);
  `);
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_SIZE) {
        reject(Object.assign(new Error('Request body is too large.'), { status: 413 }));
        request.destroy();
      }
    });
    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }));
      }
    });
    request.on('error', reject);
  });
}

function isAuthorized(request, apiKey) {
  const match = (request.headers.authorization ?? '').match(/^Bearer ([^\s]+)$/);
  if (!match) {
    return false;
  }

  const expected = Buffer.from(apiKey);
  const actual = Buffer.from(match[1]);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function validRoomInput(body) {
  return (
    typeof body.id === 'string' &&
    body.id.trim().length > 0 &&
    typeof body.type === 'string' &&
    body.type.trim().length > 0 &&
    Number.isFinite(body.rentPerMonth) &&
    body.rentPerMonth >= 0 &&
    Number.isInteger(body.capacity) &&
    body.capacity > 0
  );
}

export function createApiServer({ pool, apiKey, corsOrigin = '*' }) {
  if (!pool || !apiKey) {
    throw new Error('A database pool and API key are required.');
  }

  return createServer(async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', corsOrigin);
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url, 'http://localhost');
    const route = `${request.method} ${url.pathname}`;

    try {
      if (route === 'GET /health') {
        await pool.query('SELECT 1');
        sendJson(response, 200, { status: 'ok' });
        return;
      }

      if (!isAuthorized(request, apiKey)) {
        sendJson(response, 401, { error: 'A valid bearer API key is required.' });
        return;
      }

      if (route === 'GET /api/rooms') {
        const { rows } = await pool.query(`
          SELECT room.id, room.type,
            room.rent_per_month::DOUBLE PRECISION AS "rentPerMonth",
            room.capacity, COUNT(resident.id)::INTEGER AS occupancy,
            (room.capacity > COUNT(resident.id)) AS available
          FROM rooms room
          LEFT JOIN residents resident ON resident.room_id = room.id
          GROUP BY room.id
          ORDER BY room.id
        `);
        sendJson(response, 200, rows);
        return;
      }

      if (route === 'POST /api/rooms') {
        const body = await readJsonBody(request);
        if (!validRoomInput(body)) {
          sendJson(response, 400, {
            error: 'Room requires a non-empty id and type, non-negative rentPerMonth, and positive integer capacity.',
          });
          return;
        }

        const { rows } = await pool.query(
          `INSERT INTO rooms (id, type, rent_per_month, capacity)
           VALUES ($1, $2, $3, $4)
           RETURNING id, type, rent_per_month::DOUBLE PRECISION AS "rentPerMonth", capacity`,
          [body.id.trim(), body.type.trim(), body.rentPerMonth, body.capacity],
        );
        sendJson(response, 201, rows[0]);
        return;
      }

      if (route === 'GET /api/residents') {
        const { rows } = await pool.query(`
          SELECT id, name, phone, room_id AS "roomId",
            rent_per_month::DOUBLE PRECISION AS "rentPerMonth",
            checked_in_at AS "checkedInAt"
          FROM residents
          ORDER BY id
        `);
        sendJson(response, 200, rows);
        return;
      }

      if (route === 'POST /api/check-ins') {
        const body = await readJsonBody(request);
        if (
          typeof body.id !== 'string' ||
          !body.id.trim() ||
          typeof body.name !== 'string' ||
          !body.name.trim() ||
          (body.phone !== undefined && typeof body.phone !== 'string') ||
          (body.preferredType !== undefined && typeof body.preferredType !== 'string') ||
          (body.rentPerMonth !== undefined &&
            (!Number.isFinite(body.rentPerMonth) || body.rentPerMonth < 0))
        ) {
          sendJson(response, 400, {
            error: 'Check-in requires a non-empty id and name; phone and preferredType must be strings.',
          });
          return;
        }

        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('SELECT pg_advisory_xact_lock(760201)');
          const roomResult = await client.query(
            `SELECT room.id, room.type, room.rent_per_month
             FROM rooms room
             WHERE room.capacity > (
               SELECT COUNT(*) FROM residents resident WHERE resident.room_id = room.id
             )
             ORDER BY CASE WHEN room.type = $1 THEN 0 ELSE 1 END, room.id
             LIMIT 1
             FOR UPDATE OF room`,
            [body.preferredType ?? null],
          );

          if (roomResult.rows.length === 0) {
            await client.query('ROLLBACK');
            sendJson(response, 409, { error: 'No room is available.' });
            return;
          }

          const room = roomResult.rows[0];
          const residentResult = await client.query(
            `INSERT INTO residents (id, name, phone, room_id, rent_per_month)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, phone, room_id AS "roomId",
               rent_per_month::DOUBLE PRECISION AS "rentPerMonth",
               checked_in_at AS "checkedInAt"`,
            [
              body.id.trim(),
              body.name.trim(),
              body.phone?.trim() ?? '',
              room.id,
              body.rentPerMonth ?? room.rent_per_month,
            ],
          );
          await client.query('COMMIT');
          sendJson(response, 201, residentResult.rows[0]);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
        return;
      }

      const residentMatch = request.method === 'DELETE'
        ? url.pathname.match(/^\/api\/residents\/([^/]+)$/)
        : null;
      if (residentMatch) {
        let residentId;
        try {
          residentId = decodeURIComponent(residentMatch[1]);
        } catch {
          sendJson(response, 400, { error: 'Resident ID is not valid URL encoding.' });
          return;
        }
        const { rows } = await pool.query(
          'DELETE FROM residents WHERE id = $1 RETURNING id',
          [residentId],
        );
        if (rows.length === 0) {
          sendJson(response, 404, { error: 'Resident not found.' });
          return;
        }
        sendJson(response, 200, { checkedOut: true, residentId });
        return;
      }

      if (route === 'GET /api/summary') {
        const { rows } = await pool.query(`
          SELECT
            (SELECT COUNT(*)::INTEGER FROM rooms) AS "totalRooms",
            (SELECT COUNT(DISTINCT room_id)::INTEGER FROM residents) AS "occupiedRooms",
            (SELECT COUNT(*)::INTEGER FROM residents) AS "totalOccupants",
            COALESCE((SELECT SUM(rent_per_month) FROM residents), 0) AS "monthlyRevenue"
        `);
        const summary = rows[0];
        summary.availableRooms = summary.totalRooms - summary.occupiedRooms;
        summary.monthlyRevenue = Number(summary.monthlyRevenue);
        sendJson(response, 200, summary);
        return;
      }

      sendJson(response, 404, { error: 'Route not found.' });
    } catch (error) {
      console.error('API request failed:', error);
      const status = error.status ?? (error.code === '23505' ? 409 : 500);
      const message = error.status
        ? error.message
        : error.code === '23505'
          ? 'A record with that ID already exists.'
          : 'Internal server error.';
      sendJson(response, status, { error: message });
    }
  });
}

async function start() {
  const { DATABASE_URL, API_KEY, PORT = 3000, CORS_ORIGIN = '*' } = process.env;
  if (!DATABASE_URL || !API_KEY) {
    throw new Error('DATABASE_URL and API_KEY environment variables are required.');
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: true },
  });
  pool.on('error', (error) => console.error('Unexpected database pool error:', error));

  await initializeDatabase(pool);
  const server = createApiServer({ pool, apiKey: API_KEY, corsOrigin: CORS_ORIGIN });
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Hostelhub API listening on port ${PORT}`);
  });

  const shutdown = () => {
    server.close(async (error) => {
      await pool.end();
      if (error) {
        console.error('Server shutdown failed:', error);
        process.exitCode = 1;
      }
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start().catch((error) => {
    console.error('Unable to start Hostelhub API:', error);
    process.exitCode = 1;
  });
}
