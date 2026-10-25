# Coffee Ninja — Customer Inquiry Management System

A full-stack, enterprise-grade Customer Inquiry Management System built for Coffee Ninja's wholesale and retail operations. The system allows authorized staff members to authenticate securely, monitor support and wholesale inquiries in real-time, triage incoming tickets, create new customer requests, update statuses, and view system diagnostics.

---

## 🚀 Key Features

### 1. Staff Authentication & Session Management
- **Secure Authentication**: Express session-backed authentication stored directly in PostgreSQL (`connect-pg-simple`).
- **Cryptographic Security**: Passwords hashed and verified using `bcryptjs` (10 salt rounds).
- **Session Protection**: HTTP-only, anti-CSRF cookies (`customer_inquiry_sid`) with session regeneration on login to prevent session fixation.
- **Route Guards**: Protected frontend routes and backend middleware (`requireAuth`) preventing unauthenticated access to private inquiries.

### 2. Inquiry Dashboard & Statistics
- **Real-Time Metric Cards**: Total Inquiries, New, In Progress, and Resolved counts with click-to-filter capability.
- **Multi-Field Search**: Real-time filtering across customer names, contact info (email/phone), subjects, and descriptions.
- **Status Filter Tabs**: Instant filtering by inquiry lifecycle status (`All`, `New`, `In Progress`, `Resolved`).
- **State Handling**: Comprehensive states for loading, empty results, and network/server errors with retry actions.

### 3. Customer Inquiry Creation
- **Validated Form**: Strict client-side and server-side validation for required fields, lengths, and valid status enums.
- **Audit Association**: Automatically tags inquiries with the ID and email of the authenticated staff creator.
- **Idempotent Storage**: Parameterized SQL queries preventing injection vulnerabilities.

### 4. Detail View & Lifecycle Management
- **Full Ticket Viewer**: Modal viewing full inquiry details, customer contact links (`mailto` / `tel`), timestamps, and staff assignments.
- **Status Triage**: One-click status transitions between `New`, `In Progress`, and `Resolved`.
- **Stale Data Protection**: Remote refresh capabilities and friendly conflict handling when working across multiple browser tabs.

### 5. Diagnostics & Health Check
- Dedicated system diagnostics tab preserving Stage 1 foundation checks (`GET /api/health`), environment verification, and database checks.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 5, Vanilla Modern CSS (Navy/Cyan Design System) |
| **Backend** | Node.js (v20+), Express 4 |
| **Database** | PostgreSQL 18.6 (Pool connection with `pg`) |
| **Session Store** | PostgreSQL-backed sessions (`connect-pg-simple`) |
| **Password Hashing** | `bcryptjs` |
| **Testing** | Node.js Test Runner (`node:test`, `node:assert`), `supertest` |

---

## 📂 Project Structure

```
customer-inquiry-management/
├── backend/
│   ├── .env                       # Local environment configuration
│   ├── .env.example               # Template environment configuration
│   ├── package.json               # Backend dependencies and scripts
│   ├── src/
│   │   ├── app.js                 # Express application configuration & middleware
│   │   ├── server.js              # Server HTTP listener
│   │   ├── config/
│   │   │   ├── index.js           # Centralized environment loader (path-safe)
│   │   │   └── db.js              # PostgreSQL Pool & query helper
│   │   ├── db/
│   │   │   ├── schema.sql         # DDL: staff_users, inquiries, session
│   │   │   ├── migrate.js         # Transactional schema migration
│   │   │   ├── seed.js            # Staff user & sample inquiry seeding
│   │   │   └── test-db.js         # Database connectivity verification
│   │   ├── middleware/
│   │   │   └── auth.js            # requireAuth route protection middleware
│   │   └── routes/
│   │       ├── auth.routes.js     # /api/auth (login, logout, me)
│   │       └── inquiry.routes.js  # /api/inquiries (CRUD, stats, status)
│   └── tests/
│       ├── auth.test.js           # Authentication & security test suite
│       └── inquiries.test.js      # Inquiry CRUD & permissions test suite
├── frontend/
│   ├── index.html                 # HTML template with Coffee Ninja icon
│   ├── vite.config.js             # Vite configuration with /api reverse proxy
│   ├── package.json               # Frontend dependencies & scripts
│   ├── src/
│   │   ├── main.jsx               # React DOM entrypoint
│   │   ├── App.jsx                # Main application controller & modal orchestration
│   │   ├── index.css              # Custom Navy & Cyan design system
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Authentication & session provider
│   │   ├── utils/
│   │   │   ├── deepLink.js        # Direct inquiry URL parameter parsing & syncing
│   │   │   └── validation.js      # Client-side validation & filter utilities
│   │   └── components/
│   │       ├── Navbar.jsx         # Header navigation, branding, user info
│   │       ├── LoginPage.jsx      # Staff authentication portal
│   │       ├── InquiryDashboard.jsx # Metrics, filters, and inquiry table
│   │       ├── CreateInquiryModal.jsx # New inquiry modal form
│   │       ├── InquiryDetailModal.jsx # Detail viewer & status updater
│   │       └── SystemDiagnostics.jsx  # Health check & architecture checks
│   └── tests/
│       ├── deepLink.test.js       # Deep-link parameter parsing & state tests
│       └── validation.test.js     # Frontend validation & interaction tests
├── package.json                   # Root workspace scripts
├── DECISIONS.md                   # Architectural decisions and trade-offs
└── README.md                      # Documentation & instructions
```

---

## ⚙️ Installation & Environment Setup

### 1. Prerequisites
- **Node.js**: v20.x or higher
- **PostgreSQL**: v14.x or higher running locally on port 5432
- **npm**: v10.x or higher

### 2. Install Dependencies
Run the install command from the root directory to install both backend and frontend dependencies:
```powershell
npm run install:all
```

### 3. Configure Backend Environment
The backend configuration template is located in `backend/.env.example`. Create your local `backend/.env` file from this template:

- **Windows PowerShell**:
  ```powershell
  Copy-Item backend/.env.example backend/.env
  ```
- **macOS / Linux**:
  ```bash
  cp backend/.env.example backend/.env
  ```

Open `backend/.env` in your editor and configure your environment:
- Set `PGPASSWORD` to your local PostgreSQL password.
- Set `SESSION_SECRET` to a strong, random secret string.
- Adjust `PGHOST`, `PGPORT`, `PGUSER`, or `PGDATABASE` if your local PostgreSQL instance differs from the standard defaults (`localhost`, `5432`, `postgres`, `customer_inquiry_db`).
- (Optional) Customize `SEED_STAFF_EMAIL` or `SEED_STAFF_PASSWORD` if you wish to override the initial development login credentials.

> [!IMPORTANT]
> Do not commit `backend/.env` or any real credentials or secrets to version control. The repository's `.gitignore` excludes `.env` files to prevent secret leakage.

---

## 🗄️ PostgreSQL Database Setup & Migration

### Step 1: Create the Database
The migration script connects to the target database directly. Ensure your PostgreSQL service is running and create the empty `customer_inquiry_db` database using your own PostgreSQL credentials before running migrations:

- **Using `psql` (interactive or command-line)**:
  ```bash
  psql -U postgres -c "CREATE DATABASE customer_inquiry_db;"
  ```
- **Using PostgreSQL's `createdb` utility**:
  ```bash
  createdb -U postgres customer_inquiry_db
  ```
*(Note: Replace `postgres` with your PostgreSQL username if different, and enter your local password when prompted).*

### Step 2: Run Schema Migration & Initial Seeding
Once the database exists and `backend/.env` is configured, run the setup script from the project root:

```powershell
npm run db:setup
```

This single command executes:
1. `backend/src/db/migrate.js`: Executes `schema.sql` inside a database transaction to create the `staff_users`, `inquiries`, and `session` tables and their indexes.
2. `backend/src/db/seed.js`: Securely hashes the initial staff password using `bcryptjs` (default: `admin@coffeeninja.com`), upserts the staff user, and populates initial sample inquiries.

*(Alternatively, you can run the individual scripts: `npm run db:migrate` and `npm run db:seed`).*

### Step 3: Verify Database Connectivity
To verify that the backend can connect to PostgreSQL successfully:
```powershell
npm run db:test
```

---

## 🏃 Running the Application

Open two terminal windows:

### Terminal 1: Backend API Server
```powershell
# From project root:
npm run dev:backend
```
*The Express API will start on `http://localhost:5000` with nodemon.*

### Terminal 2: Frontend Client
```powershell
# From project root:
npm run dev:frontend
```
*The Vite development server will start on `http://localhost:5173`.*

Open your browser and navigate to: **[http://localhost:5173](http://localhost:5173)**.

---

## 🔑 Development Staff Login

- **URL**: `http://localhost:5173`
- **Default Staff Email**: `admin@coffeeninja.com`
- **Default Staff Password**: `CoffeeNinja2026!` *(configured in `backend/.env`)*
- *Tip*: On the login screen, click **"Autofill Staff Email"** to quickly populate the email field.

---

## 🧪 Automated Testing

The project has comprehensive automated test coverage with **70 passing tests** (48 backend security/validation/CRUD tests + 22 frontend deep-link and interaction tests):

```powershell
# Run all test suites (backend + frontend):
npm test

# Run backend test suite only:
npm run test:backend

# Run frontend deep-link & interaction test suite only:
npm run test:frontend
```

### Direct Inquiry URLs (Deep-Linking)
Staff can navigate directly to specific inquiry records using `?inquiry=<id>`, e.g.:
`http://localhost:5173/?inquiry=1`
- **Unauthenticated**: The login guard immediately intercepts the request and prevents any inquiry data from being requested or displayed.
- **Authenticated**: Automatically fetches `/api/inquiries/:id` and opens the detail modal.
- **Nonexistent / Invalid IDs**: Displays a user-friendly error toast without crashing the dashboard, and cleanly clears the invalid parameter from the browser address bar.

### Clearing Sessions & Fresh State Testing
Sessions are stored in PostgreSQL (`session` table) and persist across backend restarts. To immediately invalidate all active sessions:
```powershell
npm run db:clear-sessions
```

### Manual Verification of Protected Endpoints
To verify unauthenticated rejection manually:
1. **Using curl**: Run `curl -i http://localhost:5000/api/inquiries`. It returns `HTTP 401 Unauthorized` with `{"status":"error","message":"Unauthorized: Authentication required"}`.
2. **In Browser**: Open an **Incognito / InPrivate** window (ensuring no existing `localhost` cookies are sent) and navigate to `http://localhost:5000/api/inquiries`. It returns `HTTP 401 Unauthorized`.
3. **In Frontend**: Log in via `http://localhost:5173`, click **"Sign Out"**, and then navigate to `http://localhost:5000/api/inquiries`—access is immediately rejected with 401.

### Building for Production
To verify the production build of the frontend:
```powershell
npm run build:frontend
```

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Protection | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Foundation health check |
| `POST` | `/api/auth/login` | Public | Authenticates staff and starts session |
| `POST` | `/api/auth/logout` | Session | Destroys active session |
| `GET` | `/api/auth/me` | Protected | Returns current authenticated user |
| `GET` | `/api/inquiries` | Protected | List inquiries (supports `?search=` and `?status=`) |
| `GET` | `/api/inquiries/stats` | Protected | Aggregate inquiry counts by status |
| `GET` | `/api/inquiries/:id` | Protected | Retrieve full inquiry details |
| `POST` | `/api/inquiries` | Protected | Create new customer inquiry |
| `PATCH` | `/api/inquiries/:id/status` | Protected | Update status (`New`, `In Progress`, `Resolved`) |
| `PUT` | `/api/inquiries/:id` | Protected | Update full inquiry record |
