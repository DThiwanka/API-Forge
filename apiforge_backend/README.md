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
- `JWT_ACCESS_SECRET`: Secret key for signing short-lived access tokens
- `JWT_REFRESH_SECRET`: Secret key for signing long-lived refresh tokens
- `JWT_ACCESS_EXPIRES_IN`: Access token expiration (default `15m`)
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiration (default `7d`)

## Database Setup (MySQL)
APIForge requires a running MySQL database instance (version 8.0+ recommended).

1. Ensure MySQL is running on your host machine (default port `3306`).
2. Create the database:
```sql
CREATE DATABASE IF NOT EXISTS apiforge;
```
3. Set your connection string in `apiforge_backend/.env`:
```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/apiforge"
```

## Database Scripts
## Database & Test Scripts
- **Run Tests**: `npm test` - Executes unit and integration test suites using Node's native test runner.
- **Generate Client**: `npm run prisma:generate` - Generates Prisma Client based on `prisma/schema.prisma`.
- **Database Seed**: `npm run prisma:seed` - Verifies database connectivity.
- **Run Migrations**: `npm run prisma:migrate` - Applies migrations to the database.
- **Prisma Studio**: `npm run prisma:studio` - Starts Prisma visual database browser.

## Getting Started
```bash
npm install
npm run prisma:generate
npm run prisma:seed
npm run prisma:migrate
npm test
npm run dev
```

## Health Endpoint
`GET /api/health` returns status and server uptime.
## API Endpoints

### Health
- `GET /api/health` - Server health and uptime.

### Authentication
- `POST /api/auth/register` - Register a new user (`email`, `password`, `name`). Sets access and refresh cookies, returns user data and tokens.
- `POST /api/auth/login` - Authenticate user credentials (`email`, `password`). Sets access and refresh cookies.
- `GET /api/auth/me` - Authenticated user profile. Requires HTTP-only access token cookie or `Authorization: Bearer <token>`.
- `POST /api/auth/refresh` - Issue new tokens using HTTP-only refresh cookie or `refreshToken` body.
- `POST /api/auth/logout` - Invalidate session and clear authentication cookies.
