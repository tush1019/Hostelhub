# Hostelhub

A PostgreSQL-backed REST API for managing hostel rooms and residents.

## Run locally

Requires Node.js 20+ and a PostgreSQL database. Set the connection string and a private API key before starting:

```powershell
$env:DATABASE_URL = "postgres://user:password@localhost:5432/hostelhub"
$env:API_KEY = "replace-with-a-long-random-secret"
$env:PGSSLMODE = "disable"
npm start
```

The server creates its tables on startup and listens on `http://localhost:3000` (or the port in `PORT`). `GET /health` is public; all `/api` routes require `Authorization: Bearer <API_KEY>`.

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Database health check |
| GET | `/api/rooms` | List rooms with occupancy |
| POST | `/api/rooms` | Add a room (`id`, `type`, `rentPerMonth`, `capacity`) |
| GET | `/api/residents` | List residents |
| POST | `/api/check-ins` | Check in a resident (`id`, `name`, optional `phone`, `preferredType`, `rentPerMonth`) |
| DELETE | `/api/residents/:id` | Check out a resident |
| GET | `/api/summary` | Occupancy and monthly revenue summary |

Example request:

```bash
curl -H "Authorization: Bearer $API_KEY" http://localhost:3000/api/rooms
```

## Deploy on Render

The included `render.yaml` configures a free web service. In Render, create a Blueprint from this repository and provide `DATABASE_URL` for a PostgreSQL database and `API_KEY` as a long random secret when prompted. Render then provides the public service URL; use it as the base URL for the API. Keep the API key private and send it only from a trusted server. No live Render service or database is created by this repository configuration alone.

## Tests

```bash
npm test
```
