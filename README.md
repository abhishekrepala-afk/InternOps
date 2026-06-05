# InternOps – Workforce Management & Intern Operations Platform

**InternOps** is an enterprise‑grade workforce management system purpose‑built for the **Uptoskills** ecosystem.  
It delivers hierarchical role management, attendance tracking, performance ratings, social task assignments,  
and a complete, tamper‑proof audit trail. Every operation is guarded by strict role‑based access control and  
per‑request ownership validation.

---

## Table of Contents

- [1. System Overview](#1-system-overview)
- [2. Architecture](#2-architecture)
- [3. Technology Stack](#3-technology-stack)
- [4. Project Structure](#4-project-structure)
- [5. Quick Start](#5-quick-start)
- [6. Environment Variables](#6-environment-variables)
- [7. API Documentation](#7-api-documentation)
- [8. Database Schema](#8-database-schema)
- [9. Security](#9-security)
- [10. Uptoskills Integration](#10-uptoskills-integration)
- [11. Testing](#11-testing)
- [12. Deployment](#12-deployment)
- [13. License](#13-license)

---

## 1. System Overview

InternOps manages the complete lifecycle of an intern workforce, from onboarding to daily attendance,  
performance reviews, and task assignments. The platform enforces a strict five‑level role hierarchy  
(Admin → Senior TL → TL → Captain → Intern) and ensures that no user can access data outside their  
chain of command.

### Core Capabilities

| Module            | Description                                                                 |
|-------------------|-----------------------------------------------------------------------------|
| Authentication    | JWT access & refresh tokens, Argon2 hashing, brute‑force protection        |
| User Management   | Role‑based registration, suspension, activation, soft‑delete                |
| Hierarchy         | Recursive team views, direct reports, upward chain queries                 |
| Attendance        | Single and bulk marking, monthly stats, immutable audit logs               |
| Ratings           | Permanent rating history, role‑gated scoring (Captain→Intern, TL→Captain…) |
| Social Tasks      | Task creation with deadlines, screenshot proof uploads, verification       |
| Notifications     | In‑app alerts for attendance, ratings, and task events                     |
| Meetings          | Schedule team meetings with hierarchical attendee management               |
| Reports & Exports | Attendance / rating summaries, CSV export for offline analysis             |
| Audit Logs        | Complete, immutable log of every sensitive action (actor, target, before/after) |
| Sessions          | View and revoke active sessions; admins can revoke any user's sessions     |
| Uptoskills Ready  | Placeholder services for future synchronisation with the Uptoskills API     |

---

## 2. Architecture

InternOps follows a clean **layered architecture**, separating concerns into distinct, replaceable layers.

### 2.1 Block Diagram

\\\
┌──────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                         │
│  ┌─────────────────────┐   ┌──────────────────────────┐  │
│  │   React SPA         │   │  External API Consumers  │  │
│  │  (Vite + Tailwind)  │   │  (Uptoskills, Mobile…)   │  │
│  └─────────┬───────────┘   └────────────┬─────────────┘  │
└────────────┼────────────────────────────┼────────────────┘
             │                            │
             ▼                            ▼
┌──────────────────────────────────────────────────────────┐
│                     API GATEWAY LAYER                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Fastify HTTP Server                    │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │          Security Middleware Pipeline         │  │  │
│  │  │  Helmet → CORS → Rate Limiter → CSRF →        │  │  │
│  │  │  Auth → RBAC → Ownership → Sanitisation       │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                        │
│  ┌───────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │ Auth      │  │ Hierarchy │  │ Notification Engine  │  │
│  │ (JWT,     │  │ Service   │  │ (in‑app alerts)     │  │
│  │  refresh) │  │           │  │                     │  │
│  └───────────┘  └───────────┘  └──────────────────────┘  │
│  ┌───────────┐  ┌───────────┐  ┌──────────────────────┐  │
│  │ Attendance│  │ Ratings   │  │ Uptoskills           │  │
│  │ Service   │  │ Service   │  │ Integration Layer    │  │
│  └───────────┘  └───────────┘  └──────────────────────┘  │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │       Repository Modules (raw SQL, no ORM)         │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                       │
│  ┌─────────────────────┐  ┌────────────────────────────┐ │
│  │   PostgreSQL        │  │   Redis (Upstash)          │ │
│  │  (Neon Serverless)  │  │  (optional, for sessions)  │ │
│  └─────────────────────┘  └────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
\\\

### 2.2 Request Lifecycle

1. **Client** sends an HTTP request (REST API or browser SPA).
2. **Fastify** receives the request and passes it through the **middleware pipeline**.
3. **Auth middleware** verifies the JWT and attaches the user object to the request.
4. **RBAC & Ownership middleware** validate that the user’s role and hierarchical position permit the action.
5. **Sanitisation middleware** strips potentially dangerous characters from the request body/query/params.
6. The appropriate **route handler** is invoked.
7. The handler calls the **service layer**, which orchestrates business logic.
8. The service layer uses **repository functions** to execute raw SQL against PostgreSQL.
9. The response flows back through the same pipeline and is sent to the client.
10. For sensitive actions, an **audit log** entry is written asynchronously.

---

## 3. Technology Stack

| Layer       | Technology                                       |
|-------------|--------------------------------------------------|
| **Backend** | Node.js, Fastify v4, JavaScript (CommonJS)       |
| **Frontend**| React 18, Vite, TailwindCSS, Axios, TanStack Query, Zustand |
| **Database**| PostgreSQL (Neon serverless), raw SQL via \pg\ driver |
| **Cache**   | Redis (Upstash) – optional, used for refresh token storage |
| **Auth**    | JWT with access/refresh token rotation, Argon2 hashing |
| **Docs**    | Swagger UI (OpenAPI 3.0) via \@fastify/swagger\ |
| **Security**| Helmet, CORS, Rate Limiting, CSRF tokens, input sanitisation, brute‑force lockout |
| **DevOps**  | Git, GitHub, PowerShell scripting                |

---

## 4. Project Structure

\\\
InternOps/
├── backend/
│   ├── src/
│   │   ├── config/              # DB pool, Redis client, environment configuration
│   │   ├── middleware/           # auth, rbac, ownership, csrf, bruteForce, sanitize, directManager
│   │   ├── modules/              # Feature modules (see list below)
│   │   ├── utils/                # Token helpers, hierarchy queries, audit logger, cron jobs
│   │   ├── services/             # Email service placeholder
│   │   └── app.js                # Fastify entry point (server startup)
│   ├── migrations/               # Ordered SQL migration files
│   ├── seeds/                    # Database seed scripts (default admin)
│   └── package.json
├── frontend/                     # React SPA (can be started independently)
│   ├── src/
│   │   ├── components/           # Reusable UI components (forms, tables, charts)
│   │   ├── pages/                # Page components (Dashboard, Attendance, etc.)
│   │   ├── store/                # Zustand stores (auth, notifications)
│   │   ├── lib/                  # Axios instance, utility functions
│   │   └── main.jsx              # Vite entry point
│   ├── public/
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── docs/                         # Additional documentation assets
├── scripts/                      # PowerShell automation scripts
└── README.md
\\\

### Backend Modules

| Directory                    | Purpose                                               |
|------------------------------|-------------------------------------------------------|
| modules/auth                 | Login, register, refresh, logout, password reset      |
| modules/users                | User CRUD, profile update, password change            |
| modules/departments          | Department creation and listing                       |
| modules/hierarchy            | Direct reports, team tree, upward chain               |
| modules/attendance           | Mark attendance (single & bulk), view records, stats  |
| modules/ratings              | Submit and view ratings (historical)                  |
| modules/social-tasks         | Task creation, listing, filtering                     |
| modules/proof-submissions    | Upload proof, verify submission, view proofs          |
| modules/notifications        | List, mark read, delete notifications                 |
| modules/audit                | View audit logs (admin only)                          |
| modules/uploads              | Avatar upload with file type validation               |
| modules/analytics            | Overview stats, top performers, attendance trends     |
| modules/meetings             | CRUD meetings, manage attendees                       |
| modules/sessions             | List and revoke user sessions; admin revoke any user  |
| modules/reports              | Attendance summary, ratings summary, task completion  |
| modules/reports/export       | CSV export endpoints for reports                      |
| modules/uptoskills           | Placeholder services for Uptoskills API sync          |

---

## 5. Quick Start

### Prerequisites

- **Node.js** 18+ and **npm**
- **PostgreSQL** 15+ (or a Neon connection string)
- **Git**

### 5.1 Clone & Install

\\\ash
git clone https://github.com/rajat-wyrm/InternOps.git
cd InternOps

# Backend
cd backend
npm install
cd ..

# Frontend (optional)
cd frontend
npm install
cd ..
\\\

### 5.2 Configure Environment

Copy the example environment file and edit it:

\\\ash
cp backend/.env.example backend/.env
\\\

Set the required variables (see [Environment Variables](#6-environment-variables)).

### 5.3 Database Migrations & Seed

\\\ash
cd backend
npm run migrate
npm run seed
\\\

Default admin account:
- **Email:** admin@internops.com
- **Password:** Admin@123

### 5.4 Start the Server

\\\ash
# Backend
cd backend
npm run dev        # or: node src/app.js
\\\

The API is available at **http://localhost:5000**.  
Swagger UI is at **http://localhost:5000/docs**.

### 5.5 Start the Frontend (Optional)

\\\ash
cd frontend
npm run dev
\\\

Frontend runs at **http://localhost:5173** and proxies API requests to the backend.

---

## 6. Environment Variables

All variables are defined in \ackend/.env\. The table below lists every variable, its purpose, and whether it is required.

| Variable                   | Description                                                   | Required | Default                |
|----------------------------|---------------------------------------------------------------|----------|------------------------|
| PORT                       | HTTP port for the Fastify server                              | No       | 5000                   |
| HOST                       | Bind address (0.0.0.0 for all interfaces)                     | No       | 0.0.0.0                |
| NODE_ENV                   | Environment (\development\, \production\)                     | No       | development            |
| DATABASE_URL               | PostgreSQL connection string (Neon)                           | **Yes**  | –                      |
| JWT_SECRET                 | Secret key for signing JWT tokens                             | **Yes**  | –                      |
| JWT_EXPIRES_IN             | Token expiry duration (\7d\)                                  | No       | 7d                     |
| API_KEY                    | Internal service‑to‑service authentication key                | No       | –                      |
| CORS_ORIGIN                | Allowed origin for CORS (production frontend URL)             | No       | http://localhost:5173  |
| UPSTASH_REDIS_REST_URL     | Upstash Redis REST URL (for refresh token storage)            | No       | –                      |
| UPSTASH_REDIS_REST_TOKEN   | Upstash Redis authentication token                            | No       | –                      |
| GOOGLE_CLIENT_ID           | Google OAuth client ID (future use)                           | No       | –                      |
| GOOGLE_CLIENT_SECRET       | Google OAuth client secret (future use)                       | No       | –                      |
| FAST2SMS_API_KEY           | Fast2SMS API key (future use)                                 | No       | –                      |
| GROQ_API_KEY               | Groq AI API key (future use)                                  | No       | –                      |
| OPENAI_API_KEY             | OpenAI API key (future use)                                   | No       | –                      |
| GEMINI_API_KEY             | Google Gemini API key (future use)                            | No       | –                      |
| DEEPSEEK_API_KEY           | DeepSeek API key (future use)                                 | No       | –                      |
| DEEPSEEK_BASE_URL          | DeepSeek base URL (future use)                                | No       | https://api.deepseek.com |
| HUGGINGFACE_TOKEN          | Hugging Face API token (future use)                           | No       | –                      |
| EMAIL_API_KEY              | Email service API key (future use)                            | No       | –                      |
| EMAIL_FROM                 | Sender address for emails (future use)                        | No       | noreply@internops.com  |
| UPTOSKILLS_BASE_URL        | Base URL for Uptoskills API (future use)                      | No       | –                      |
| UPTOSKILLS_API_KEY         | API key for Uptoskills integration (future use)               | No       | –                      |

---

## 7. API Documentation

Interactive Swagger UI is available at **/docs** when the server is running.  
The following table lists every API endpoint, its HTTP method, required roles, and a brief description.

### 7.1 Authentication

| Method | Endpoint                       | Roles          | Description                           |
|--------|--------------------------------|----------------|---------------------------------------|
| POST   | /api/auth/register             | Admin          | Create a new user                     |
| POST   | /api/auth/login                | Public         | Login with email & password           |
| POST   | /api/auth/refresh              | Public         | Refresh access token                  |
| POST   | /api/auth/logout               | Authenticated  | Revoke refresh token                  |
| GET    | /api/auth/csrf-token           | Public         | Get a CSRF token for state‑changing requests |
| POST   | /api/auth/forgot-password      | Public         | Request a password reset link         |
| POST   | /api/auth/reset-password       | Public         | Reset password with token             |

### 7.2 Users

| Method | Endpoint                       | Roles          | Description                           |
|--------|--------------------------------|----------------|---------------------------------------|
| GET    | /api/users                     | Admin          | List all users (paginated)            |
| GET    | /api/users/me                  | Authenticated  | Get current user profile              |
| PATCH  | /api/users/me                  | Authenticated  | Update own profile (full_name)        |
| PATCH  | /api/users/me/password         | Authenticated  | Change own password                   |
| GET    | /api/users/:id                 | Hierarchy-based| Get user by ID (ownership check)      |
| PATCH  | /api/users/:id/suspend         | Admin          | Suspend a user account                |
| PATCH  | /api/users/:id/activate        | Admin          | Re‑activate a suspended account       |
| DELETE | /api/users/:id                 | Admin          | Soft‑delete a user                    |

### 7.3 Departments

| Method | Endpoint                       | Roles          | Description                           |
|--------|--------------------------------|----------------|---------------------------------------|
| POST   | /api/departments               | Admin          | Create a new department               |
| GET    | /api/departments               | Admin, Senior TL | List all departments                |

### 7.4 Hierarchy

| Method | Endpoint                       | Roles          | Description                           |
|--------|--------------------------------|----------------|---------------------------------------|
| GET    | /api/hierarchy/my/direct-reports| Authenticated  | List direct reports                   |
| GET    | /api/hierarchy/my/team         | Authenticated  | Recursive team tree                   |
| GET    | /api/hierarchy/my/chain        | Authenticated  | Upward management chain               |

### 7.5 Attendance

| Method | Endpoint                       | Roles          | Description                           |
|--------|--------------------------------|----------------|---------------------------------------|
| POST   | /api/attendance/mark           | Manager of target | Mark single attendance              |
| POST   | /api/attendance/bulk           | Manager of targets | Bulk mark attendance               |
| GET    | /api/attendance/:userId        | Hierarchy-based | View attendance records for a user   |
| GET    | /api/attendance/:userId/stats  | Hierarchy-based | Monthly attendance statistics        |

### 7.6 Ratings

| Method | Endpoint                       | Roles          | Description                           |
|--------|--------------------------------|----------------|---------------------------------------|
| POST   | /api/ratings                   | Manager of target | Submit a rating (1‑5) with remarks  |
| GET    | /api/ratings/:userId           | Hierarchy-based | View rating history for a user       |

### 7.7 Social Tasks & Proofs

| Method | Endpoint                       | Roles          | Description                           |
|--------|--------------------------------|----------------|---------------------------------------|
| POST   | /api/tasks                     | Admin, Senior TL | Create a social task                |
| GET    | /api/tasks                     | Authenticated  | List all tasks                        |
| POST   | /api/proofs/submit             | Intern         | Upload a screenshot as proof          |
| PATCH  | /api/proofs/:id/verify         | Captain, TL, Senior TL | Verify a proof submission     |
| GET    | /api/proofs/task/:taskId       | Captain, TL, Senior TL, Admin | View proofs for a task |
| GET    | /api/proofs/my                 | Authenticated  | View own submitted proofs             |

### 7.8 Notifications

| Method | Endpoint                       | Roles          | Description                           |
|--------|--------------------------------|----------------|---------------------------------------|
| GET    | /api/notifications             | Authenticated  | List notifications (paginated)        |
| GET    | /api/notifications/unread-count| Authenticated  | Get unread notification count         |
| POST   | /api/notifications/read-all    | Authenticated  | Mark all as read                      |
| PATCH  | /api/notifications/:id/read    | Authenticated  | Mark a single notification as read    |
| DELETE | /api/notifications/:id         | Authenticated  | Delete a notification                 |

### 7.9 Analytics & Reports

| Method | Endpoint                                      | Roles                | Description                        |
|--------|-----------------------------------------------|----------------------|------------------------------------|
| GET    | /api/analytics/overview                       | Admin, Senior TL     | User count by role                 |
| GET    | /api/analytics/department-attendance          | Admin, Senior TL     | Department attendance breakdown    |
| GET    | /api/analytics/top-performers                 | Admin, Senior TL, TL | Top‑rated users by role            |
| GET    | /api/analytics/attendance-trends              | Admin, Senior TL     | Attendance trends over months      |
| GET    | /api/reports/attendance-summary               | Admin, Senior TL     | Attendance summary by role/status  |
| GET    | /api/reports/ratings-summary                  | Admin, Senior TL     | Rating averages by role            |
| GET    | /api/reports/task-completion                  | Admin, Senior TL     | Task verification stats            |
| GET    | /api/reports/export/attendance-csv            | Admin, Senior TL     | Download attendance CSV            |
| GET    | /api/reports/export/ratings-csv               | Admin, Senior TL     | Download ratings CSV               |
| GET    | /api/reports/export/tasks-csv                 | Admin, Senior TL     | Download task completion CSV       |

### 7.10 Meetings

| Method | Endpoint                                    | Roles                   | Description                      |
|--------|---------------------------------------------|-------------------------|----------------------------------|
| POST   | /api/meetings                               | Admin, Senior TL, TL    | Schedule a meeting               |
| GET    | /api/meetings                               | Hierarchy‑based         | List meetings                    |
| GET    | /api/meetings/:id                           | Hierarchy‑based         | Get meeting details              |
| PATCH  | /api/meetings/:id                           | Creator or Admin        | Update meeting                   |
| DELETE | /api/meetings/:id                           | Creator or Admin        | Soft‑delete meeting              |
| POST   | /api/meetings/:id/attendees                 | Creator or Admin        | Add attendee                     |
| DELETE | /api/meetings/:id/attendees/:userId         | Creator or Admin        | Remove attendee                  |

### 7.11 Sessions

| Method | Endpoint                                    | Roles          | Description                      |
|--------|---------------------------------------------|----------------|----------------------------------|
| GET    | /api/sessions/me                            | Authenticated  | List own active sessions         |
| DELETE | /api/sessions/me/:sessionId                 | Authenticated  | Revoke a specific session        |
| POST   | /api/sessions/me/revoke-all                 | Authenticated  | Revoke all other sessions        |
| POST   | /api/sessions/admin/revoke-user/:userId     | Admin          | Revoke all sessions of a user    |

### 7.12 Uptoskills

| Method | Endpoint                        | Roles | Description                      |
|--------|---------------------------------|-------|----------------------------------|
| GET    | /api/uptoskills/sync-status     | Admin | Placeholder sync status endpoint |

### 7.13 Health Checks

| Method | Endpoint        | Roles  | Description                      |
|--------|-----------------|--------|----------------------------------|
| GET    | /health          | Public | Basic health (server alive)      |
| GET    | /health/db       | Public | Database connectivity check      |
| GET    | /health/full     | Public | DB + Redis full health check     |

---

## 8. Database Schema

All tables use **UUID** primary keys and include **created_at**, **updated_at**, and **deleted_at** columns  
for soft‑delete support. Foreign keys and indexes are applied throughout.

| Table              | Key Columns / Description                                                 |
|--------------------|---------------------------------------------------------------------------|
| users              | id, email, password_hash (Argon2), role (enum), manager_id (self‑ref FK), department_id, suspended |
| departments        | id, name, created_by                                                      |
| attendance         | id, user_id (FK), marked_by (FK), date, status (enum), remarks           |
| ratings            | id, rated_user_id (FK), rated_by (FK), score (1‑5), remarks               |
| social_tasks       | id, title, description, target_platform, task_link, deadline, created_by  |
| proof_submissions  | id, task_id (FK), intern_id (FK), image_path, verified_by, status         |
| notifications      | id, user_id (FK), message, read (bool)                                   |
| audit_logs         | id, user_id, action, resource_type, resource_id, details (JSONB), old_value, new_value, ip_address, user_agent |
| meetings           | id, title, description, meeting_date, start_time, end_time, created_by, department_id |
| meeting_attendees  | meeting_id (FK), user_id (FK) – composite PK                              |
| refresh_tokens     | id, user_id (FK), token_hash, expires_at, revoked                         |
| login_attempts     | id, email, ip_address, success, attempted_at                              |
| password_reset_tokens | id, user_id (FK), token_hash, expires_at, used                          |
| _migrations        | name, applied_at – tracks applied migration files                        |

---

## 9. Security

The platform implements a defence‑in‑depth security model:

- **Authentication** – JWT access tokens (15 min) with refresh token rotation (7 days). Argon2id password hashing with salt.
- **Authorization** – RBAC middleware checks the user’s role. Ownership middleware recursively verifies hierarchical access.
- **Brute‑Force Protection** – Failed login attempts are tracked per email and IP. After 5 failures in 15 minutes, the account is temporarily locked.
- **CSRF Protection** – All state‑changing requests require an \X-CSRF-Token\ header, validated on the server.
- **Rate Limiting** – 100 requests/min globally, 5 requests/min on \/api/auth\ routes.
- **Helmet** – Sets secure HTTP headers (Content‑Security‑Policy, HSTS, X‑Frame‑Options, etc.).
- **Input Sanitisation** – Strips HTML tags and quotes from request bodies, query parameters, and URL params.
- **File Upload Validation** – Only JPEG/PNG/GIF images are accepted. Filenames are UUIDs. Files larger than 5 MB are rejected.
- **Audit Logging** – Every sensitive action is recorded with the actor, target, old/new values, IP, and user agent. Logs are immutable.
- **Soft Deletes** – Users and other resources are marked as deleted rather than physically removed.
- **SQL Injection Prevention** – All queries use parameterised statements (\\\, \\\, etc.) via the \pg\ driver.

---

## 10. Uptoskills Integration

A dedicated module (\ackend/src/modules/uptoskills\) provides service stubs and a status endpoint.  
To complete the integration, implement the following placeholder functions:

- \getInternsFromUptoskills()\
- \getDepartmentsFromUptoskills()\
- \syncUsers()\
- \syncAttendance()\
- \syncProjects()\

All connection details (base URL, API key) are configured via environment variables  
(\UPTOSKILLS_BASE_URL\, \UPTOSKILLS_API_KEY\). The existing API endpoint \/api/uptoskills/sync-status\  
returns a \
ot_implemented\ status and can be replaced with the actual synchronisation logic.

---

## 11. Testing

A comprehensive PowerShell diagnostic script is available in the project root (\scripts/\).  
It verifies:

- Server health and HTTP connectivity
- Authentication flow (CSRF token, login, token refresh)
- All protected endpoints with a valid admin token
- Database connectivity and schema integrity
- Middleware behaviour (RBAC, ownership enforcement)

To run the test suite:

\\\powershell
# From the project root
Set-Location C:\Users\rajat\InternOps
.\scripts\full-test.ps1
\\\

A successful run produces a pass/fail summary for every module.

---

## 12. Deployment

### 12.1 Production Checklist

- Set \NODE_ENV=production\ in \ackend/.env\.
- Use a strong, unique \JWT_SECRET\ and rotate it regularly.
- Restrict \CORS_ORIGIN\ to the exact production frontend URL.
- Run the backend behind a reverse proxy (Nginx, Traefik) that terminates SSL.
- Use a process manager (e.g., PM2) to keep the Node.js process alive.
- Run database migrations as part of the CI/CD pipeline.
- Schedule regular PostgreSQL backups.

### 12.2 Example PM2 Configuration

\\\ash
npm install -g pm2
pm2 start backend/src/app.js --name internops --env production
pm2 save
pm2 startup
\\\

---

## 13. License

This software is proprietary and developed for the **Uptoskills** ecosystem.  
All rights reserved. Unauthorised use, distribution, or modification is prohibited.

---

**Maintainers:** Rajat Wyrm  
**Repository:** [https://github.com/rajat-wyrm/InternOps](https://github.com/rajat-wyrm/InternOps)  
**Issues:** [GitHub Issues](https://github.com/rajat-wyrm/InternOps/issues)