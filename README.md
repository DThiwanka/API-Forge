# APIForge

APIForge is a developer-first platform engineered for modern API design, debugging, testing, and orchestration.

## Architecture & Technology Stack

APIForge is structured as a **modular monolith** divided into:

### Frontend (`apiforge_frontend`)
- **Core**: React 19, JavaScript, Vite
- **Routing**: React Router
- **Styling**: Tailwind CSS, Design Tokens (graphite / neutral developer aesthetic)
- **State & Data**: Zustand, TanStack Query, Axios
- **Icons**: Lucide React

### Backend (`apiforge_backend`)
- **Core**: Node.js (ES Modules), Express
- **Architecture**: REST API with centralized error and configuration management
- **Database Layer**: Prisma ORM
- **Database**: MySQL

---

## Local Development Prerequisites

- **Node.js**: v18+ (tested on v24)
- **npm**: v9+
- **MySQL**: Running instance (e.g. `localhost:3306`)

---

## Environment Configuration

### Backend (`apiforge_backend/.env`)
Configure environment variables in `.env` (refer to `.env.example`):
```env
NODE_ENV=development
PORT=5000
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/apiforge"
CLIENT_URL=http://localhost:5173
```

### Frontend (`apiforge_frontend/.env`)
Configure environment variables in `.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Getting Started

### 1. Start the Backend
```bash
cd apiforge_backend
npm install
npm run dev
```
The backend server will start on `http://localhost:5000`.

#### Health Endpoint
Verify backend is operational:
```bash
curl http://localhost:5000/api/health
```
Expected response:
```json
{
  "status": "ok",
  "uptime": 1.23,
  "timestamp": "2026-09-10T17:15:00.000Z"
}
```

### 2. Start the Frontend
```bash
cd apiforge_frontend
npm install
npm run dev
```
The client will start on `http://localhost:5173`.

#### Initial Foundation Routes
- `/` : APIForge Welcome & Overview
- `/login` : Sign In
- `/register` : Registration
- `/workspace` : Application Shell
