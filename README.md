# HostelHub — Hostel Management System

React (Vite + TypeScript) frontend + Express backend.

```
/backend   → Express API (server.js)
/frontend  → Vite + React app (src/)
render.yaml → Render Blueprint (deploys both services correctly)
```

## Run locally

Backend (port 5000):

```
cd backend
npm install
npm start
```

Frontend (port 5173):

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

> No MySQL? No problem — the backend automatically falls back to a built-in
> SQLite store and seeds sample data. For persistent data, set `DB_HOST`,
> `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (see `backend/.env.example`).

## Deploy on Render

1. Push this repo to GitHub.
2. Render dashboard → **New + → Blueprint** → connect the repo.
   `render.yaml` creates both services with the correct Root Directory
   (`backend` for the API, `frontend` for the site) — no manual root-dir
   guessing needed.
3. After the first deploy, copy the two URLs:
   - Backend URL: `https://hostelhub-backend-xxxx.onrender.com`
   - Frontend URL: `https://hostelhub-frontend-xxxx.onrender.com`
4. Set environment variables, then **Manual Deploy → Clear build cache & deploy**:
   - Backend service → Env: `FRONTEND_URL` = frontend URL (CORS)
   - Frontend service → Env: `VITE_API_URL` = backend URL + `/api`
     (e.g. `https://hostelhub-backend-xxxx.onrender.com/api`)
5. Verify:
   - `https://<backend-url>/` → `HostelHub Backend is running 🚀`
   - `https://<backend-url>/api/dashboard` → 200 JSON
   - `https://<frontend-url>/` → the app UI
