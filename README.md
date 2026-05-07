# TradeFX Clone (MVP)

Professional TradeFXBook-style web app with:

- React + Vite frontend
- Express + Prisma + SQLite backend
- Google login
- Device-aware session tracking + revoke
- Trading journal CRUD + analytics

Project path:

`C:\Users\User\OneDrive\Desktop\TradeFX`

## Stack

- Frontend: React, TypeScript, Vite, TailwindCSS, Framer Motion, Recharts, TanStack Query
- Backend: Express, TypeScript, Prisma, SQLite, Zod, JWT cookies, Google Auth Library, Multer

## Google OAuth setup (required)

Follow detailed steps in `GOOGLE_AUTH_SETUP.md`.

Quick summary:

1. Create OAuth Web Client ID in Google Cloud Console
2. Add JS origin `http://localhost:5173`
3. Set real values in `backend/.env`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
4. Restart backend

## Environment files

Copy:

- `backend/.env.example` -> `backend/.env`
- `frontend/.env.example` -> `frontend/.env`

Important variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `JWT_SECRET`
- `DATABASE_URL`
- `VITE_GOOGLE_CLIENT_ID`

## Install and run

### 1) Backend setup

```powershell
cd "C:\Users\User\OneDrive\Desktop\TradeFX\backend"
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Backend URL: `http://localhost:4000`

### 2) Frontend setup

```powershell
cd "C:\Users\User\OneDrive\Desktop\TradeFX\frontend"
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Key routes

Public:

- `/` marketing page
- `/login` Google login

Authenticated app:

- `/app/dashboard`
- `/app/trades`
- `/app/trades/:id`
- `/app/analytics`
- `/app/backtesting` (stub)
- `/app/ai-reports` (stub)
- `/app/community` (stub)
- `/app/leaderboard` (stub)
- `/app/settings` (session/device management)

## API summary

- `POST /api/auth/google`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/sessions`
- `DELETE /api/sessions/:id`
- `GET/POST/PUT/DELETE /api/trades`
- `POST /api/trades/:id/screenshot`
- `GET/POST /api/tags`
- `GET /api/analytics/summary`
- `GET /api/analytics/equity-curve`
- `GET /api/analytics/calendar?month=YYYY-MM`
- `GET /api/analytics/breakdown?by=symbol|session|tag|side`

## Production notes

- Set cookie `secure: true` behind HTTPS
- Use PostgreSQL for larger scale
- Add background jobs for heavy analytics and AI reports

