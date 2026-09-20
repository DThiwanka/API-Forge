# APIForge Production Deployment & Operations Guide

This guide describes how to configure, deploy, secure, and operate APIForge in staging and production environments.

---

## 1. System Architecture & Deployment Topology

```text
                                [ User Browser ]
                                       │
                                       ▼ (HTTPS :443 / WSS)
                      ┌─────────────────────────────────┐
                      │    Reverse Proxy / Edge TLS     │
                      │        (Nginx / Caddy)          │
                      └───────┬─────────────────┬───────┘
                              │                 │
              / (SPA routes)  │                 │  /api & /ws
                              ▼                 ▼
             ┌─────────────────────┐   ┌────────────────────────────────┐
             │   Static Frontend   │   │        APIForge Backend        │
             │   (Vite SPA dist)   │   │        (Node.js / Express)     │
             └─────────────────────┘   └───────┬──────────────┬─────────┘
                                               │              │
                                               ▼              ▼
                                      ┌──────────────┐ ┌──────────────┐
                                      │ MySQL 8.0+   │ │ Headless     │
                                      │ Database     │ │ Chromium /   │
                                      │ (Prisma ORM) │ │ Playwright   │
                                      └──────────────┘ └──────────────┘
```

### Infrastructure Requirements
- **Node.js**: v20.x or v22.x LTS (ESM native support required)
- **Database**: MySQL 8.0 or compatible managed database (AWS RDS, GCP Cloud SQL, PlanetScale)
- **Memory**: Minimum 2 GB RAM (4 GB+ recommended if utilizing Browser Space / Playwright)
- **Storage**: Sufficient disk space for MySQL data and temporary browser profiles
- **Network**: Outbound HTTPS connectivity for API request execution engine; inbound port 443 for web traffic

---

## 2. Environment Configuration Reference

### Backend (`apiforge_backend/.env`)

| Variable | Type | Default | Required in Prod | Description |
|---|---|---|---|---|
| `NODE_ENV` | string | `development` | **Yes** | Set to `production` to activate strict security rules |
| `PORT` | number | `5000` | No | HTTP listening port for Express server |
| `DATABASE_URL` | string | - | **Yes** | MySQL connection URL: `mysql://USER:PASS@HOST:3306/DB` |
| `CLIENT_URL` | string | - | **Yes** | Allowed frontend origin for CORS/cookies (e.g. `https://app.example.com`) |
| `CORS_ORIGIN` | string | - | No | Comma-separated allowed origins if different from `CLIENT_URL` |
| `JWT_ACCESS_SECRET` | string | - | **Yes** | High-entropy random secret (min 32 chars) for access tokens |
| `JWT_REFRESH_SECRET` | string | - | **Yes** | Distinct high-entropy random secret (min 32 chars) for refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | string | `15m` | No | Lifespan of access tokens |
| `JWT_REFRESH_EXPIRES_IN` | string | `7d` | No | Lifespan of refresh tokens |
| `COOKIE_SECURE` | boolean | `true` (in prod) | No | Ensures cookies are only transmitted over HTTPS |
| `COOKIE_SAME_SITE` | string | `lax` | No | Cookie SameSite policy (`lax` for same-site, `none` for cross-site HTTPS) |
| `COOKIE_DOMAIN` | string | - | No | Root domain for cookies (e.g. `.example.com` for cross-subdomain) |
| `TRUST_PROXY` | string/boolean | `false` | When proxied | Set to `true` or hop count when behind reverse proxy / load balancer |
| `ALLOW_LOCAL_TARGETS` | boolean | `false` | **Must be false** | Blocks SSRF attempts against loopback/metadata IPs |
| `REQUEST_TIMEOUT_MS` | number | `30000` | No | Default API execution timeout (30 seconds) |
| `MAX_RESPONSE_SIZE_BYTES`| number | `10485760` | No | Max response buffer size (10 MB) |
| `RATE_LIMIT_WINDOW_MS` | number | `900000` | No | Auth rate-limit window (15 minutes) |
| `RATE_LIMIT_AUTH_MAX` | number | `30` | No | Max login/register attempts per window per IP |
| `LOG_LEVEL` | string | `info` (in prod) | No | Logger verbosity: `debug`, `info`, `warn`, `error` |
| `SHUTDOWN_TIMEOUT_MS` | number | `10000` | No | Max time allocated for graceful shutdown before force exit |

### Frontend (`apiforge_frontend/.env`)

| Variable | Default | Required in Prod | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000/api` | **Yes** | Full public URL to API root, e.g. `https://api.example.com/api` |
| `VITE_WS_URL` | Derived from API URL | No | WebSocket URL, e.g. `wss://api.example.com/ws` |

> [!WARNING]
> Frontend variables prefixed with `VITE_` are embedded into the client bundle and are publicly inspectable. Never place database credentials, JWT secrets, or server API keys in frontend environment files.

---

## 3. Step-by-Step Production Deployment Runbook

### Step 1: Database Provisioning
1. Provision a dedicated MySQL 8.0+ instance.
2. Create an isolated database schema:
   ```sql
   CREATE DATABASE apiforge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'apiforge_app'@'%' IDENTIFIED BY 'STRONG_GENERATED_PASSWORD';
   GRANT ALL PRIVILEGES ON apiforge.* TO 'apiforge_app'@'%';
   FLUSH PRIVILEGES;
   ```

### Step 2: Configure Environment Variables
1. On the backend server, create `/etc/apiforge/backend.env` (or project root `.env` with restrictive `chmod 600` permissions).
2. Generate cryptographic keys for JWT tokens:
   ```bash
   openssl rand -base64 32 # For JWT_ACCESS_SECRET
   openssl rand -base64 32 # For JWT_REFRESH_SECRET
   ```
3. Populate all required backend variables. Set `NODE_ENV=production`.

### Step 3: Install Backend Dependencies & Apply Migrations
```bash
cd apiforge_backend

# Clean install of production dependencies
npm ci --omit=dev

# Generate Prisma Client code
npm run prisma:generate

# Apply production database migrations safely (never runs interactive dev commands)
npm run prisma:migrate:deploy
```

### Step 4: Build & Deploy Frontend Assets
```bash
cd apiforge_frontend

# Install dependencies and build static distribution
npm ci
npm run build

# Output will be generated in apiforge_frontend/dist/
```
Deploy the contents of `dist/` to your static web server (Nginx, AWS S3 + CloudFront, Cloudflare Pages, etc.).

### Step 5: Start the Backend Service
Use a production process supervisor such as `systemd` or PM2:

#### Example PM2 ecosystem configuration (`ecosystem.config.cjs`):
```javascript
module.exports = {
  apps: [
    {
      name: 'apiforge-backend',
      script: 'src/server.js',
      cwd: '/var/www/apiforge/apiforge_backend',
      instances: 'max',
      exec_mode: 'cluster',
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
      },
      kill_timeout: 10000,
    },
  ],
};
```

---

## 4. Reverse Proxy Configuration

### Nginx Production Configuration Example

```nginx
# Rate limiting zone for auth
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;

server {
    listen 80;
    server_name app.example.com api.example.com;
    return 301 https://$host$request_uri;
}

# Frontend SPA Hosting
server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    root /var/www/apiforge/frontend/dist;
    index index.html;

    # SPA Client-Side Routing Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static hashed assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Backend API & WebSocket Reverse Proxy
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Realtime WebSocket Proxy
    location /ws {
        proxy_pass http://127.0.0.1:5000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

---

## 5. Browser Space (Headless Chromium / Playwright)

APIForge includes an in-browser sandbox service for capturing live web traffic and debugging APIs.

### Runtime Requirements
1. **Playwright Package**: Install Playwright browser dependencies on Linux environments:
   ```bash
   npx playwright install-deps chromium
   npx playwright install chromium
   ```
2. **Container / Sandbox Considerations**:
   - In containerized environments (Docker, Alpine, Debian slim), ensure standard Chromium shared library dependencies are installed (`libnss3`, `libatk1.0-0`, `libxss1`, `libasound2`).
   - If running inside an unprivileged container without user namespaces, `--no-sandbox` and `--disable-dev-shm-usage` are automatically supplied by APIForge's browser engine.
3. **Session Lifecycle & Cleanup**:
   - Inactive browser sessions automatically expire after 30 minutes (`BROWSER_SESSION_INACTIVITY_TIMEOUT_MS`).
   - A background pruner executes every 5 minutes (`BROWSER_CLEANUP_INTERVAL_MS`).
   - Upon `SIGTERM`/`SIGINT`, all open browser sessions are forcefully closed to prevent zombie processes.
4. **Fallback Engine**: If Chromium is not installed on the host, APIForge automatically falls back to its built-in isolated engine driver without crashing.

---

## 6. Health & Readiness Verification

APIForge exposes two dedicated operational probes:

### 1. Liveness Probe: `GET /api/health`
Used by Kubernetes or load balancers to determine if the server process is responsive.
- **HTTP 200**: Process is running.
  ```json
  { "status": "ok", "uptime": 124.5, "timestamp": "2026-09-20T10:00:00.000Z" }
  ```

### 2. Readiness Probe: `GET /api/ready`
Used to ensure the database connection is healthy before routing user traffic.
- **HTTP 200 (Ready)**:
  ```json
  { "status": "ready", "database": "connected", "timestamp": "2026-09-20T10:00:00.000Z" }
  ```
- **HTTP 503 (Unavailable)**: Database query failed.

---

## 7. Database Backups, Migrations & Disaster Recovery

### Pre-Deployment Backup
Always execute a consistent snapshot before applying migrations:
```bash
mysqldump -u apiforge_user -p --single-transaction --routines --triggers apiforge > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Migration Safety Rules
1. Never run `prisma migrate dev` or `prisma db push` in production.
2. Always execute `npm run prisma:migrate:deploy`. This applies only verified, committed migrations in `prisma/migrations/`.
3. If a migration fails, inspect the error, restore the pre-deployment database backup if necessary, and re-deploy.

### Database Recovery
To restore a snapshot in case of failure:
```bash
mysql -u apiforge_user -p apiforge < backup_20260920_100000.sql
```

---

## 8. Production Readiness Checklist

Before going live, verify every item below:

```text
[ ] Production environment variables configured in .env (NODE_ENV=production)
[ ] Secrets (DATABASE_URL, JWT secrets) stored outside source control
[ ] JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are >32 chars and distinct
[ ] ALLOW_LOCAL_TARGETS is set to false
[ ] Database provisioned with utf8mb4 encoding and user privileges restricted
[ ] Database backup strategy established (automated daily dumps)
[ ] Prisma migrations applied via `npm run prisma:migrate:deploy`
[ ] Backend production start verified (`npm start`)
[ ] Frontend production build verified (`npm run build`)
[ ] Static hosting configured with SPA routing fallback to index.html
[ ] HTTPS / TLS certificates configured and active
[ ] CORS configured for exact frontend origin (no wildcards with credentials)
[ ] Secure cookies verified (HttpOnly, Secure, SameSite=Lax/None)
[ ] WebSocket reverse proxy verified with upgrade headers
[ ] Liveness probe verified (`GET /api/health` -> 200)
[ ] Readiness probe verified (`GET /api/ready` -> 200)
[ ] Rate limits active on authentication endpoints
[ ] Security headers present (nosniff, DENY frame options, HSTS)
[ ] Error responses sanitized (no stack traces or filesystem paths returned)
[ ] Playwright/Chromium dependencies installed or fallback verified
[ ] Browser cleanup job verified on graceful shutdown
[ ] SSRF protections verified against loopback and cloud metadata IPs
[ ] Regression test suite passed (backend: 370+ tests, frontend: 540 tests)
```

