# Incident Tracker API

A RESTful API for tracking and managing incidents, built with Node.js, Express, and PostgreSQL. Containerized with Docker and designed for CI/CD deployment on AWS EC2.

## Tech Stack

- **Runtime:** Node.js 18
- **Framework:** Express
- **Database:** PostgreSQL 16
- **Containerization:** Docker + Docker Compose
- **Cloud:** AWS EC2

## Features

- Create, list, and update incidents
- PostgreSQL with automatic schema initialization on startup
- Docker healthcheck ensures the app never starts before the database is ready
- Graceful error handling on all routes
- `/health` endpoint for uptime monitoring

## Getting Started

### Prerequisites

- Docker
- Docker Compose

### 1. Clone the repo

```bash
git clone https://github.com/yennhio/cicd-app.git
cd cicd-app
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values.

### 3. Start the app

```bash
docker-compose up --build
```

The API will be available at `http://localhost:3000`.

## API Reference

### Health Check

```
GET /health
```

```bash
curl http://localhost:3000/health
```

```json
{ "status": "ok" }
```

---

### Create an Incident

```
POST /incidents
```

| Field      | Type   | Required | Description                        |
|------------|--------|----------|------------------------------------|
| `title`    | string | yes      | Short description of the incident  |
| `severity` | string | yes      | e.g. `low`, `medium`, `high`       |

```bash
curl -X POST http://localhost:3000/incidents \
  -H "Content-Type: application/json" \
  -d '{"title": "Server down", "severity": "high"}'
```

```json
{
  "id": 1,
  "title": "Server down",
  "severity": "high",
  "status": "open",
  "created_at": "2026-05-31T19:00:00.000Z"
}
```

---

### List All Incidents

```
GET /incidents
```

```bash
curl http://localhost:3000/incidents
```

```json
[
  {
    "id": 1,
    "title": "Server down",
    "severity": "high",
    "status": "open",
    "created_at": "2026-05-31T19:00:00.000Z"
  }
]
```

---

### Update Incident Status

```
PATCH /incidents/:id
```

| Field    | Type   | Required | Description                          |
|----------|--------|----------|--------------------------------------|
| `status` | string | yes      | e.g. `open`, `in-progress`, `resolved` |

```bash
curl -X PATCH http://localhost:3000/incidents/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "resolved"}'
```

```json
{
  "id": 1,
  "title": "Server down",
  "severity": "high",
  "status": "resolved",
  "created_at": "2026-05-31T19:00:00.000Z"
}
```

## Database Schema

```sql
CREATE TABLE incidents (
  id         SERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  severity   TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW()
);
```

The schema is automatically created on startup via `src/db/init.js`.

## Project Structure

```
cicd-app/
├── app.js                  # Express app setup
├── server.js               # Entry point — waits for DB, runs init, starts server
├── docker-compose.yml
├── Dockerfile
└── src/
    ├── db/
    │   ├── db.js           # PostgreSQL connection pool
    │   └── init.js         # DB retry logic + schema init
    └── routes/
        └── incidents.js    # Incident route handlers
```

## Deployment

This app is designed to run on an AWS EC2 instance. Once SSH'd in:

```bash
git pull
docker-compose up --build -d
```

Make sure port `3000` is open in your EC2 security group for inbound TCP traffic.

## Environment Variables

See `.env.example` for all required variables.
