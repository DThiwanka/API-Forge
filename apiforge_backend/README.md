# API Forge Backend

Backend foundation service for API Forge.

## Technology Stack
- Node.js (ES Modules)
- Express
- Prisma (MySQL)
- REST API

## Environment Configuration
Configure environment variables in `.env` (refer to `.env.example`):
- `PORT`: Server port (default `5000`)
- `NODE_ENV`: Runtime environment (`development` / `production`)
- `DATABASE_URL`: MySQL connection URI (`mysql://USER:PASSWORD@localhost:3306/apiforge`)
- `CLIENT_URL`: Allowed frontend origin (`http://localhost:5173`)

## Getting Started
```bash
npm install
npm run dev
```

## Health Endpoint
`GET /api/health` returns status and server uptime.
