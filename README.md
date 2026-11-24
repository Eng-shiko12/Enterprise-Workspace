# Vortex — Project & Sprint Management

Sprint boards, backlog planning, kanban boards, team insights and realtime collaboration.
**MERN** (MongoDB · Express 5 · React 19 · Node 22) + Socket.IO + Tailwind CSS 4.

| Screen | What it does |
|---|---|
| **Active Sprint** | Realtime kanban (drag between To Do → Done), scope / completion / pacing stats, filters, list view |
| **Backlog & Planning** | Sprints grouped with progress, inline “add issue”, start/complete sprint |
| **Issue Detail** | Inline editing, properties sidebar, comments (live), labels, due dates |
| **Insights & Velocity** | Burndown, velocity history, cycle time, workload, status/priority mix, overdue items |
| **Boards** | Free-form lists & cards with drag-and-drop across lists |
| **Team & Access** | Roles (owner/admin/member), invitations, activity log, workspace settings |
| **Profile** | My assigned work across workspaces, security, password change |
| Everywhere | ⌘K global search · `C` new issue · notifications (live) · light/dark theme |

## Quick start (local development)

```bash
# 1. API
cd server
npm install
npm run dev                   # http://localhost:5000

# 2. Web (second terminal)
cd client
npm install
npm run dev                   # http://localhost:5173  (proxies /api and /socket.io to :5000)
```

Without SMTP credentials the verification / reset codes are printed in the **server console** (development only).

## Deploy

### Option A — Docker Compose (recommended, one origin, no CORS/cookie headaches)

```bash
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")" > .env
docker compose up --build -d      # http://localhost:8080
docker compose exec server node scripts/seed.js   # optional demo data
```
nginx serves the SPA and proxies `/api` + `/socket.io` to the API. Put it behind HTTPS
(Caddy / Traefik / your cloud load balancer) and **remove** `COOKIE_SAMESITE: lax` from
`docker-compose.yml` only if you serve it from a different site than the API, and set
`COOKIE_SECURE=true` in your `.env` once you terminate HTTPS.

### Option B — Split hosting (e.g. Render + Vercel)

1. **API on Render** (`render.yaml` included) with a MongoDB Atlas `MONGO_URI`.
   - `FRONTEND_URL=https://<your-frontend-domain>` (comma-separate multiple origins)
   - `COOKIE_SAMESITE=none` (cookies are Secure + cross-site)
2. **Frontend on Vercel / Netlify** with root `client/`, build `npm run build`, output `dist`.
   - `VITE_API_URL=https://<api-domain>/api/v1`
   - SPA rewrites are already configured (`vercel.json`, `public/_redirects`).

### Environment variables

| Server | Purpose |
|---|---|
| `MONGO_URI`, `JWT_SECRET` | **Required.** In production the secret must be ≥ 32 chars (the server refuses to start otherwise) |
| `FRONTEND_URL` | Allowed browser origin(s), comma separated |
| `COOKIE_SAMESITE` | `lax` (same site, default) or `none` (cross-site) |
| `TRUST_PROXY` | Reverse proxies in front of the API (default `1` in production) |
| `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX` | Per-IP limits per 15 min (600 / 30) |
| `EMAIL_*` | SMTP for OTP codes and invitations |

| Client (build time) | Purpose |
|---|---|
| `VITE_API_URL` | Empty = same origin `/api/v1`; otherwise full API URL |
| `VITE_SOCKET_URL` | Optional Socket.IO origin override |

Health endpoints: `GET /health` (liveness) · `GET /ready` (database connected).

## Quality gates

```bash
cd server && npm test          # 36 tests: auth, lockout, RBAC, validation, models, burndown math
cd client && npm run lint && npm test && npm run build
```
CI runs the same on every push (`.github/workflows/ci.yml`).

## Security notes
httpOnly JWT cookie · Helmet · strict CORS allow-list · Joi validation with unknown-key rejection ·
Mongo-operator stripping · regex escaping in search · login lockout (5 attempts / 15 min) ·
per-IP rate limits · OTPs hashed and never returned by the API · pending invitees are denied
access until they accept · workspace ids return 404 to outsiders · secrets are validated at boot.

## Project layout
```
server/   Express API  (config · controllers · routes · models · middlewares · sockets · validators · test · scripts)
client/   React SPA    (api · components · context · hooks · lib · pages · test)
```
