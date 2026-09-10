# API Forge Backend

Backend service for API Forge, built with Node.js, Express, Prisma ORM, and PostgreSQL.

## Architecture

- `prisma/`: Prisma schema, migrations, and database seed scripts.
- `src/config/`: App configuration (environment, database, CORS, security).
- `src/routes/`: Express route definitions.
- `src/controllers/`: Route handlers and HTTP response management.
- `src/services/`: Core business logic across domain modules.
- `src/repositories/`: Data access layer powered by Prisma.
- `src/middleware/`: Authentication, authorization, error handling, rate limiting.
- `src/validators/`: Input validation and request payload sanitization.
- `src/utils/`: Common utilities (async handler, logger, pagination, crypto).
- `src/constants/`: System-wide enums and error codes.
- `src/jobs/`: Background tasks and scheduled maintenance jobs.
- `tests/`: Unit and integration test suites.

## Getting Started

1. Copy `.env.example` to `.env` and configure your database connection.
2. Install dependencies: `npm install`
3. Run migrations: `npm run prisma:migrate`
4. Start development server: `npm run dev`
