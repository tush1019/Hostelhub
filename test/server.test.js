import test from 'node:test';
import assert from 'node:assert/strict';

import { createApiServer } from '../src/server.js';

async function startServer(t, pool, apiKey = 'test-secret') {
  const server = createApiServer({ pool, apiKey });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('health endpoint is public and verifies database connectivity', async (t) => {
  let queried = false;
  const baseUrl = await startServer(t, {
    async query(sql) {
      queried = sql === 'SELECT 1';
      return { rows: [{ '?column?': 1 }] };
    },
  });

  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal(queried, true);
});

test('API routes reject requests without a valid bearer API key', async (t) => {
  const baseUrl = await startServer(t, {
    async query() {
      throw new Error('Database should not be queried for unauthorized requests.');
    },
  });

  const response = await fetch(`${baseUrl}/api/rooms`);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'A valid bearer API key is required.' });
});

test('authenticated room requests are served from the database', async (t) => {
  const roomRows = [{
    id: 'A-101',
    type: 'single',
    rentPerMonth: 3500,
    capacity: 1,
    occupancy: 0,
    available: true,
  }];
  const baseUrl = await startServer(t, {
    async query(sql) {
      assert.match(sql, /FROM rooms room/);
      return { rows: roomRows };
    },
  });

  const response = await fetch(`${baseUrl}/api/rooms`, {
    headers: { Authorization: 'Bearer test-secret' },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), roomRows);
});

test('check-in reserves an available room in a transaction', async (t) => {
  const statements = [];
  const pool = {
    async connect() {
      return {
        async query(sql) {
          statements.push(sql.trim());
          if (sql.includes('FROM rooms room')) {
            return { rows: [{ id: 'A-101', type: 'single', rent_per_month: 3500 }] };
          }
          if (sql.includes('INSERT INTO residents')) {
            return {
              rows: [{
                id: 'R-001',
                name: 'Aisha',
                phone: '',
                roomId: 'A-101',
                rentPerMonth: 3500,
              }],
            };
          }
          return { rows: [] };
        },
        release() {},
      };
    },
  };
  const baseUrl = await startServer(t, pool);

  const response = await fetch(`${baseUrl}/api/check-ins`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-secret',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: 'R-001', name: 'Aisha', preferredType: 'single' }),
  });

  assert.equal(response.status, 201);
  assert.equal((await response.json()).roomId, 'A-101');
  assert.deepEqual(statements.filter((sql) => ['BEGIN', 'COMMIT'].includes(sql)), ['BEGIN', 'COMMIT']);
});
