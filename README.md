# APIForge

> **A Spatial API Development & Testing Workspace**
>
> An engineering-grade developer tool combining a tabbed HTTP client, an infinite 2D Spatial API Canvas, automated collection execution with runtime variable chaining, built-in headless browser network capture, and real-time team collaboration.

---

## 🚀 Overview

APIForge is built for developers who need more than flat lists and static folders. It reimagines API development as an integrated workspace where endpoints can be designed, inspected, visually connected, and executed across interconnected services.

### Core Highlights
- **Spatial API Canvas**: Visual 2D graph of requests, collections, and folders with automatic dependency relationship inference.
- **Full HTTP Client**: Tabbed workspace supporting query parameters, custom headers, multiple auth schemes, raw/JSON/form bodies, and real-time response inspection.
- **Collection Runner**: Automated, sequential execution of API requests with runtime variable extraction and dynamic request chaining.
- **Browser Space**: Integrated headless Chromium browser for testing web applications, inspecting live network traffic, and importing captured requests into API collections with one click.
- **Assertion & Testing Engine**: Zero-dependency assertion framework evaluating status codes, JSONPath expressions, response times, and header values.
- **Realtime Collaboration**: Multi-user workspaces featuring role-based access control (Owner, Admin, Member, Viewer), cryptographically signed invitations, and live synchronization over WebSockets.
- **Production-Grade Security**: Strict SSRF protections blocking loopback/cloud metadata IPs, automatic credential redaction, sliding-window rate limiting, and sanitized error responses.

---

## 🏛️ System Architecture

```text
                                [ User Browser ]
                                       │
                                       ▼ (HTTPS / WSS)
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

### Technology Stack

#### Frontend (`apiforge_frontend`)
- **Framework**: React 19, Vite
- **State Management**: Zustand (isolated request tabs, response caches, spatial canvas, command center)
- **Data Fetching**: TanStack Query (React Query v5)
- **Styling**: Tailwind CSS v4 with custom dark graphite developer design tokens
- **Graph & Canvas**: React Flow (@xyflow/react) for the Spatial API Canvas
- **Realtime**: Native WebSocket Client with automatic reconnection and heartbeat monitoring
- **Icons**: Lucide React

#### Backend (`apiforge_backend`)
- **Runtime**: Node.js (native ES Modules)
- **Framework**: Express 4.21
- **Database & ORM**: MySQL 8.0+ with Prisma ORM 6.4
- **Authentication**: JWT (short-lived access tokens + long-lived refresh tokens) with Argon2id password hashing
- **Security**: Strict SSRF guard, sliding-window rate limiting, security headers, cookie hardening (SameSite/HttpOnly/Secure)
- **Browser Automation**: Playwright headless Chromium with safe isolated fallback engine
- **Realtime**: `ws` WebSocket server mounted at `/ws`
- **Testing**: Native Node.js test runner (`node:test` + `node:assert`)

---

## 📦 Feature Inventory

| Domain | Implemented Capabilities |
|---|---|
| **Authentication** | Registration, login, token refresh, logout, session restoration, Argon2id password hashing |
| **Workspaces** | Multi-workspace creation, switching, isolation, overview metrics, member role management |
| **Collections & Folders** | Hierarchical organization, drag/reorder positioning, collection-level runner execution |
| **Request Workspace** | Multi-tab editing, dirty state tracking, query params, headers, bearer/basic/API-key auth, JSON/form bodies |
| **Execution Engine** | Timeout enforcement, response size limits, SSRF protection against private IP ranges and cloud metadata |
| **Response Inspector** | Status code categorizer, duration/size metrics, JSON tree view, search highlighting, copy utilities |
| **Environments & Variables** | Workspace environments, `{{variable}}` resolution, secret masking, active environment switcher |
| **History** | Audit log of past executions, response statuses, execution times, filterable by workspace |
| **Testing & Assertions** | Status code, JSONPath, response time, header equality, body contains, one-click assertion generator |
| **Collection Runner** | Automated collection execution, stop-on-error, selection filters, summary pass/fail statistics |
| **Variable Extraction** | JSONPath value extraction into runtime variables chained into subsequent requests |
| **Import / Export** | cURL import preview & export; OpenAPI v3 specification import with automated collection generation |
| **Spatial API Canvas** | Infinite 2D workspace, RequestNodes, CollectionNodes, automatic relationship inference, custom edges |
| **Browser Space** | Headless Chromium tabs, address navigation, real-time network request capture, 1-click API import |
| **Command Center** | Global `Cmd+K` / `Ctrl+K` palette with fuzzy ranking, quick navigation, keyboard shortcuts |
| **Collaboration** | Workspace invitations, token validation, member management, WebSocket live events |
| **Accessibility & UX** | WAI-ARIA tablist patterns, focus trapping in dialogs, prefers-reduced-motion, keyboard navigation |
| **Production Readiness** | Liveness `/api/health`, Readiness `/api/ready`, graceful shutdown, sanitized 500 error responses |

---

## 🛠️ Getting Started (Local Development)

### Prerequisites
- **Node.js**: v20.x or v22.x LTS
- **npm**: v9+
- **MySQL**: 8.0+ running on `localhost:3306`

### 1. Database Setup
```sql
CREATE DATABASE apiforge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend Setup
```bash
cd apiforge_backend

# Copy environment configuration
cp .env.example .env

# Install dependencies
npm install

# Generate Prisma client and apply database migrations
npm run prisma:generate
npm run prisma:migrate

# Start backend in development mode (watches for changes)
npm run dev
```
The backend will start on `http://localhost:5000`.

Verify health and readiness:
```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/ready
```

### 3. Frontend Setup
```bash
cd ../apiforge_frontend

# Copy environment configuration
cp .env.example .env

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Testing Runbook

Both frontend and backend utilize Node.js's native test runner (`node:test` + `node:assert/strict`) — providing fast, zero-dependency testing.

### Backend Tests
```bash
cd apiforge_backend

# Run the complete test suite (430+ tests across auth, execution, canvas, runner, security)
npm test

# Run critical production readiness tests
node --test --test-concurrency=1 tests/production-readiness.test.js

# Run smoke test suite (13 happy path steps)
node --test --test-concurrency=1 tests/smoke.test.js

# Run cross-domain regression suite
node --test --test-concurrency=1 tests/regression-integration.test.js
```

### Frontend Tests
```bash
cd apiforge_frontend

# Run the complete frontend unit & integration test suite (540 tests)
node --test tests/*.test.js

# Run frontend regression smoke suite
node --test tests/regression-smoke.test.js

# Verify production Vite build
npm run build
```

---

## 🚀 Production Deployment

For detailed production deployment topologies, reverse proxy configurations (Nginx/Caddy), Playwright/Chromium setup, database backup runbooks, and the production checklist, please refer to:

👉 **[DEPLOYMENT.md](./DEPLOYMENT.md)**

---

## 📄 License
APIForge is open-source software licensed under the MIT License.
