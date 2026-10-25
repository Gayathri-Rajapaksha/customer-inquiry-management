# Technical Decisions & Architectural Rationale

This document details the architectural decisions, assumptions, trade-offs, future enhancements, and AI pair-programming assistance utilized during the development of the **Coffee Ninja Customer Inquiry Management System**.

---

## 1. Core Assumptions & Support Workflow

1. **Shared Team Inbox Design vs. Per-Staff Ownership**:
   - **Collaborative Queue**: The application implements a shared team inbox model. Coffee Ninja support agents, roasters, and account managers collaborate on a single unified inquiry queue so that customer requests (such as urgent bean orders or machine maintenance) can be triaged and resolved by any available on-duty staff member without blocking on an individual.
   - **Audit Attribution**: The `created_by` foreign key records which staff member originally logged the inquiry (or is null for future external submissions); it serves as an audit trail and does not restrict inquiry visibility or editing rights.
   - **Authentication Perimeter**: While inquiry data is shared among authorized personnel, unauthenticated access is strictly rejected by backend authentication middleware (`requireAuth`) with HTTP 401.
   - **Current Scope**: The current application deliberately does not implement per-staff ownership or role-based access control (RBAC); all authenticated staff members share identical permissions across the inquiry lifecycle.

2. **Status Lifecycle**:
   - Per the database check constraint (`CHECK (status IN ('New', 'In Progress', 'Resolved'))`), inquiries progress through three explicit states:
     - **New**: Freshly logged inquiry awaiting staff triage.
     - **In Progress**: Actively handled or being investigated by staff.
     - **Resolved**: Inquiry addressed, answered, or completed.

3. **Separation of Database vs. Staff Credentials**:
   - The PostgreSQL database password (`PGPASSWORD`) strictly governs database server access, while `SEED_STAFF_PASSWORD` initializes application credentials for `admin@coffeeninja.com`. Keeping these independent adheres to least privilege and ensures database security is decoupled from application accounts.

---

## 2. Key Architectural Decisions

### A. Authentication: PostgreSQL-Backed Server-Side Sessions vs. JWTs
- **Decision**: Implemented server-side session management using `express-session` backed by PostgreSQL (`connect-pg-simple`).
- **Rationale**:
  - **Immediate Invalidation**: Unlike stateless JWTs, server-side sessions can be instantly destroyed upon `/api/auth/logout`.
  - **XSS & Storage Security**: Avoids `localStorage` vulnerabilities by utilizing `httpOnly`, `sameSite: 'lax'` session cookies.
  - **Session Fixation Prevention**: Invokes `req.session.regenerate()` upon successful credential verification.

### B. UI/UX Design System: Navy, White, and Cyan Accent Theme
- **Decision**: Developed a tailored, custom CSS design system rather than relying on heavy utility frameworks.
- **Rationale**:
  - **Branded Aesthetic**: Deep navy surfaces (`#0a192f` / `#0f172a`), crisp card containers, and cyan accents (`#06b6d4`) reflect Coffee Ninja's roastery identity.
  - **Triage Efficiency**: Status badges use color-coded indicators (cyan for New, warm amber for In Progress, soft emerald for Resolved) for quick visual scanning.
  - **Zero Overhead**: Minimal CSS runtime footprint and instant stylesheet parsing.

### C. Backend API Architecture & Parameterized Queries
- **Decision**: Structured the Express backend into modular route controllers (`auth.routes.js`, `inquiry.routes.js`), centralized pooling (`db.js`), and route middleware (`requireAuth`).
- **Rationale**:
  - **SQL Injection Prevention**: All queries strictly utilize parameterized placeholders (`$1`, `$2`), eliminating SQL injection risks.
  - **Dual-Layer Input Validation**: Validations on types, required fields, and lengths occur on both client and server before database interaction.
  - **Standardized Responses**: Predictable JSON envelopes (`{ status: 'ok', data... }` and `{ status: 'error', message: '...' }`).

### D. Single-Step Setup & Migration Workflow (`npm run db:setup`)
- **Decision**: Provided a unified `npm run db:setup` script combining DDL execution and idempotent seeding.
- **Rationale**:
  - Simplifies setup by running migrations and seeds in order.
  - `seed.js` utilizes `ON CONFLICT (email) DO UPDATE` to ensure repeated runs do not duplicate or corrupt staff records.

### E. Multi-Layer Endpoint Protection (Defense in Depth)
- **Decision**: Applied `requireAuth` middleware consistently across three enforcement boundaries:
  1. **App-Level Router Mount**: `app.use('/api/inquiries', requireAuth, inquiryRoutes)` in `app.js`
  2. **Router-Level Scope**: `router.use(requireAuth)` in `inquiry.routes.js`
  3. **Endpoint-Level Handlers**: Explicit `requireAuth` attached to each individual route handler.
- **Rationale**: Eliminates route bypass risks and guarantees unauthenticated requests terminate with HTTP 401 without querying PostgreSQL.

### F. Direct Inquiry Deep-Linking (`?inquiry=<id>`)
- **Decision**: Implemented direct ticket navigation via the URL query parameter `?inquiry=<id>`.
- **Rationale**:
  - **Interface Reuse**: When an authenticated user opens a direct link, the application fetches `/api/inquiries/:id` and opens the existing `InquiryDetailModal`, eliminating duplicate detail views.
  - **Graceful Error Handling**: Nonexistent inquiries (404) or malformed IDs (non-numeric, negative) display a friendly error notification without breaking the dashboard, and cleanly remove the invalid parameter from the address bar using `history.replaceState`.
  - **Access Protection**: Deep links do not bypass route protection. Unauthenticated visits are intercepted by the authentication guard, preventing any inquiry data from loading.

---

## 3. Trade-offs & Security Architecture Notes

| Decision / Property | Pros | Cons / Trade-offs | Mitigation & Best Practices |
|---|---|---|---|
| **PostgreSQL Session Store (`connect-pg-simple`)** | Immediate logout revocation; native DB persistence; survives backend process restarts without needing Redis. | Sessions persist in PostgreSQL across server restarts, which can surprise developers expecting in-memory resets. | Provided `npm run db:clear-sessions` to easily truncate the `session` table when fresh test states are desired. |
| **Localhost Cookie Scoping (RFC 6265 §8.5)** | Browsers share cookies across ports on `localhost`. Logging into frontend automatically authorizes API calls. | Direct navigation to `http://localhost:5000/api/inquiries` in the same browser session sends the staff cookie. | To test unauthenticated rejection in a browser, use an Incognito/Private window or click "Sign Out". All curl/test requests without cookies return 401. |
| **Combined Search & Status Queries** | Single roundtrip query to fetch filtered inquiries directly from PostgreSQL. | Complex dynamic SQL query construction. | Safely constructed parameterized where-clauses with dynamic parameter indexing (`$1`, `$2`). |
| **Modal Dialogs over Multi-Page Navigation** | Seamless, fast triage workflow for staff without full page reloads or loss of filter state. | Requires managing modal open/closed and deep-link states. | Clean state isolation in `App.jsx` with Escape-key listeners and background scroll locking. |

---

## 4. Stale Data Handling in Multi-Tab Scenarios

In operational environments, multiple staff members or browser tabs may view and modify the same inquiry concurrently.
- **Mitigation Implemented**:
  1. The inquiry detail modal includes a **"Check for Updates"** button that issues a `GET /api/inquiries/:id` to reload the fresh record from PostgreSQL.
  2. If an inquiry was modified or deleted in another session, `PATCH /api/inquiries/:id/status` gracefully handles 404/400 errors and notifies the user with clear corrective actions.
  3. The main dashboard includes a dedicated manual **"Refresh"** button with a spinning indicator to sync the latest database state at any time.

---

## 5. Potential Future Improvements

1. **Public Inquiry Portal**: Expose a public-facing intake endpoint and React landing form allowing customers to submit inquiries without authentication, which staff can then triage in the protected dashboard.
2. **Automated Customer Email Notifications**: Integrate Nodemailer or SendGrid to send automatic email updates (e.g., "Your inquiry has been received and is In Progress") to customer contact addresses.
3. **Role-Based Access Control (RBAC)**: Expand the `staff_users` table to support `role VARCHAR(50)` (e.g., `Admin`, `Triage Agent`, `Technician`) with granular permissions.
4. **PostgreSQL Full-Text Search**: For high-volume archives (>100,000 records), introduce PostgreSQL `tsvector` and `GIN` indexes to optimize full-text keyword matching across long descriptions.

---

## 6. AI-Assisted Development & Output Verification

- **Tool Utilized**: Antigravity IDE agent (DeepMind Advanced Agentic Coding).
- **Assistance Areas**:
  - Diagnostic inspection of PostgreSQL connection and database migration scripts.
  - Drafting parameterized SQL queries, Express route handlers, and input validation schemas.
  - Structuring accessible React modal dialogs, status filters, and the CSS design system.
  - Authoring unit and integration test suites across backend and frontend modules.
- **Verification Methodology**:
  - **Automated Verification**:
    - **70 Automated Tests**: All 48 backend tests (`auth.test.js`, `inquiries.test.js`) and 22 frontend tests (`validation.test.js`, `deepLink.test.js`) pass with 0 failures, validating input validation, parameter parsing, SQL injection safety, and session state.
    - **Production Build**: Verified that the frontend compiles cleanly into a production bundle (`npm run build:frontend`) with zero syntax or bundling errors.
  - **Manual Verification**:
    - **Route Guarding Probing**: Manually verified via `curl` that unauthenticated requests to `/api/inquiries` return HTTP 401.
    - **Browser & Session Testing**: Verified session persistence across port boundaries (`localhost:5173` to `localhost:5000`) and confirmed that unauthenticated Incognito sessions and logged-out browser tabs are strictly blocked from accessing inquiry endpoints.
    - **UI & Deep-Link Testing**: Manually verified URL parameter transitions (`?inquiry=<id>`), detail modal opening, and error toast presentation for missing records.
