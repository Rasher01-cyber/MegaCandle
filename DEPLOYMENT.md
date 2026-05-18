# Deployment Guide (Single-host)

This guide deploys the whole MegaCandle app with a single Node service:
- Backend (Express + Prisma)
- Frontend (React build) served by the backend

This avoids CORS/cookie issues by keeping everything under the same origin.

---

## 1) What I already changed (important)

`backend/src/server.ts` now automatically serves `frontend/dist` (if it exists) and falls back to `index.html` for all non-`/api` routes.

So in production you must:
1. Build the frontend (`frontend/dist`)
2. Start the backend (`backend/start`)

---

## 2) Production environment variables

Set these in your deployment platform for the backend:

`backend/.env`

- `PORT` (default 4000)
- `DATABASE_URL` (SQLite or Postgres)
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET` (if using Google sign-in)
- `FRONTEND_ORIGIN` (must match your production frontend domain exactly)
- `UPLOAD_DIR`

Frontend:
- No need to set `VITE_API_BASE_URL` if the backend is serving the frontend on the same origin.

---

## 3) Database migration (Prisma)

After dependencies install, run Prisma migrations:

```bash
cd backend
npx prisma migrate deploy
```

Notes:
- If you deploy with SQLite on a platform that doesn’t persist files, your DB will reset on redeploy.
- Prefer a persistent volume or a real DB (Postgres) for production.

---

## 4) Build + start (manual)

From repo root:

```powershell
# Build frontend
cd frontend
npm ci
npm run build
cd ..

# Install + build backend
cd backend
npm ci
npx prisma migrate deploy
npm run build

# Start server
npm start
```

Your server will run on `http://<your-host>:PORT`.

---

## 5) If you use Render/Railway/Fly (example commands)

In most platforms you can set:

Build command:

```bash
cd frontend && npm ci && npm run build && cd ../backend && npm ci && npx prisma migrate deploy && npm run build
```

Start command:

```bash
npm start
```

---

## 6) Verification checklist

1. Visit `/` (landing page loads)
2. Visit `/login`
3. Sign up/login with email
4. Go to `/app/dashboard`
5. Confirm `/api/auth/public-config` returns a non-empty `googleClientId` (if Google enabled)

---

