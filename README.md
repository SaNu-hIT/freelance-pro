# FreelancePro — MVP Platform

A full-stack SaaS platform for managing freelancers, client projects, worklogs, timelines, and remuneration.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | NestJS, TypeORM |
| Database | PostgreSQL |
| Auth | JWT (7-day tokens) |
| State | Zustand (persisted) |
| Charts | Recharts |

## Quick Start

### With Docker (Recommended)

```bash
docker-compose up -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Database: localhost:5432

### Manual Setup

**1. Start PostgreSQL**
```bash
docker run -d \
  --name freelance_pro_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=freelance_pro \
  -p 5432:5432 \
  postgres:16-alpine
```

**2. Backend**
```bash
cd backend
cp .env.example .env   # edit if needed
npm install
npm run start:dev
```

**3. Frontend**
```bash
cd frontend
npm install
npm run dev
```

## User Roles

| Role | Access |
|------|--------|
| `admin` | Full platform control |
| `freelancer` | Own projects, worklogs, earnings |
| `client` | Submit projects, track progress |

## Default Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@freelancepro.com | Admin@123 |
| Freelancer | freelancer@test.com | Test@123 |
| Client | client@test.com | Test@123 |

## API Endpoints

```
POST   /auth/register
POST   /auth/login
GET    /auth/me

GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id

GET    /worklogs
POST   /worklogs
GET    /worklogs/:id
PATCH  /worklogs/:id

GET    /freelancers
GET    /freelancers/:id
PATCH  /freelancers/:id
PATCH  /freelancers/:id/approve

GET    /payments
POST   /payments
PATCH  /payments/:id

GET    /dashboard/stats
```

## Project Structure

```
freelance_pro/
├── frontend/          # Next.js app
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/     # login, register
│   │   │   ├── admin/      # admin dashboard
│   │   │   ├── freelancer/ # freelancer dashboard
│   │   │   └── client/     # client dashboard
│   │   ├── components/
│   │   │   ├── layout/     # Sidebar, DashboardLayout
│   │   │   └── ui/         # StatusBadge, CrimsonCube, etc.
│   │   └── lib/            # api, store, types, utils
├── backend/           # NestJS API
│   └── src/
│       ├── auth/
│       ├── users/
│       ├── projects/
│       ├── worklogs/
│       ├── freelancers/
│       ├── payments/
│       └── entities/
└── docker-compose.yml
```
