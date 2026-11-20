# Vortex Server

Professional Kanban & Project Management API built with Express, MongoDB, and Socket.io.

## Features

- JWT authentication (cookie + Bearer token)
- Email verification & password reset via OTP
- Workspaces with role-based access control (owner / admin / member)
- Boards, lists, cards (Kanban)
- Projects, tasks, comments
- Real-time updates via Socket.io
- Rate limiting, Helmet, compression, structured error handling

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template and fill in real values
cp .env.example .env

# 3. Start in development
npm run dev

# 4. Production
npm start
```

## Environment Variables

See `.env.example` for the full list. Required:

| Variable       | Description                          |
|----------------|--------------------------------------|
| `MONGO_URI`    | MongoDB connection string            |
| `JWT_SECRET`   | Strong secret (≥ 32 characters)      |
| `FRONTEND_URL` | Frontend origin for CORS & cookies   |

## API Overview

| Prefix                    | Description                |
|---------------------------|----------------------------|
| `GET /health`             | Health check               |
| `/api/v1/auth`            | Register, login, OTP, etc. |
| `/api/v1/workspaces`      | Workspaces & members       |
| `/api/v1/projects`        | Projects, tasks, comments  |
| `/api/v1/workspaces/...`  | Boards, lists, cards       |

## Security Notes

- Never commit `.env` (already in `.gitignore`)
- Use a strong unique `JWT_SECRET` in production
- Set `NODE_ENV=production` and use HTTPS
- Auth routes are rate-limited more strictly than general API routes

## Scripts

- `npm run dev` — development with nodemon
- `npm start` — production
