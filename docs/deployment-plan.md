# Discord Storage — Jenkins CI/CD Deployment Plan

## Context

Setup deployment pipeline untuk fullstack app (Go + Echo + PostgreSQL + Next.js 15) dengan Jenkins. Saat ini belum ada Dockerfile, docker-compose, atau Jenkinsfile sama sekali.

Asumsi: target deploy adalah **VPS Linux (Ubuntu)**, Jenkins sudah berjalan punya akses SSH ke server, Docker + Docker Compose tersedia di target.

## Architecture

```
                  :80
                   |
             nginx (reverse proxy)
            /                    \
      /api/*                  /* (default)
           |                       |
      backend:8000            frontend:3000
           |
      postgres:5432
```

## Files to Create

Semua file deployment ditaruh di `deploy/` di project root:

| File | Purpose |
|------|---------|
| `deploy/Dockerfile.backend` | Multi-stage Go build → Alpine runtime, non-root user |
| `deploy/Dockerfile.frontend` | Multi-stage Node build → Next.js standalone output |
| `deploy/.dockerignore.backend` | Exclude `.env`, `uploads`, `.exe`, `.git` |
| `deploy/.dockerignore.frontend` | Exclude `.next`, `node_modules`, `.env` |
| `deploy/docker-compose.yml` | 4 services: postgres, backend, frontend, nginx |
| `deploy/nginx/nginx.conf` | Reverse proxy: `/api/*` → backend, `/*` → frontend |
| `deploy/.env.production.example` | Template env production |
| `deploy/scripts/deploy.sh` | Manual deploy script (tanpa Jenkins) |
| `deploy/Jenkinsfile` | Pipeline CI/CD |
| `frontend/app/api/health/route.ts` | Health check endpoint untuk Next.js |

## Key Details

### Dockerfile.backend
- Stage 1: `golang:1.24-alpine`, `CGO_ENABLED=0 go build -ldflags="-s -w"`, binary stripped
- Stage 2: `alpine:3.21`, install `ca-certificates` + `tzdata`, user `appuser:1000`
- HEALTHCHECK: `wget -qO- http://localhost:8000/api/v1/health`
- Module path `balStorage/backend` — Go resolves relative to go.mod

### Dockerfile.frontend
- Next.js sudah set `output: "standalone"` di `next.config.ts`
- Build stage: `npm ci` (semua deps) → `npx next build`
- Runtime: copy `.next/standalone/` + `.next/static/` + `public/`, user `nextjs:1001`
- **Penting**: `NEXT_PUBLIC_*` variabel di-build-time. Pass lewat Docker `ARG` lalu set ke `/api/` (same-origin karena nginx proxy)
- HEALTHCHECK: `wget -qO- http://localhost:3000/api/health`

### docker-compose.yml
- 4 services: `postgres`, `backend`, `frontend`, `nginx`
- Volume: `pgdata` (DB), `uploads` (file temp)
- Network: `app-network` (bridge)
- Backend depends_on postgres (healthy), frontend depends_on backend
- Env file: `deploy/.env.production`

### nginx.conf
- `client_max_body_size 20m`
- `location /api/` → `proxy_pass http://backend:8000`
- `location /` → `proxy_pass http://frontend:3000`
- WebSocket support (Upgrade headers)

### Jenkinsfile Pipeline
1. **Checkout** — `checkout scm`
2. **Test** (parallel) — `go vet + go test` backend, `next lint` frontend
3. **Deploy** — `rsync` project ke target, inject Jenkins credentials ke `.env.production` via `sed`, `docker compose up -d --build`
4. **Verify** — curl health check backend, frontend, nginx

Jenkins credentials yang perlu dibuat:

| ID | Type | Isi |
|----|------|-----|
| `target-host` | SSH Username + key | `ubuntu@<ip-server>` |
| `jwt-secret` | Secret text | Random 64-char |
| `postgres-password` | Secret text | Strong password |
| `discord-bot-token` | Secret text | Bot token |
| `discord-guild-id` | Secret text | Guild ID |
| `discord-category-id` | Secret text | Category ID |

## Verification

1. Test Dockerfiles lokal: `docker build -f deploy/Dockerfile.backend .` dan `docker build -f deploy/Dockerfile.frontend .`
2. Test docker-compose lokal: `cd deploy && docker compose up -d postgres backend frontend`
3. Test nginx: `curl http://localhost/api/health` dan `curl http://localhost/api/v1/health`
4. Test Jenkinsfile: replay pipeline di Jenkins UI
