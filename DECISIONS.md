# Architectural Decisions & Rationale

**Project:** Coffee Ninja — Customer Inquiry Management System  
**Author:** Technical Assessment Submission

---

## 1. Core Assumptions
- **Collaborative Support Model:** Coffee Ninja operations (roasters, support staff, technicians) work as a team. Inquiries are pooled in a shared queue so that urgent issues (such as machine maintenance or bulk wholesale orders) are resolved quickly by any on-duty staff member rather than blocked on an individual assignee.
- **Explicit Lifecycle:** Inquiries strictly follow a three-stage lifecycle: `New` → `In Progress` → `Resolved` (enforced at both application and database check-constraint levels).
- **Protected Staff Perimeter:** The system is an internal portal for authorized personnel. While all authenticated staff members share visibility of inquiries, unauthenticated requests are strictly rejected with HTTP 401.

---

## 2. Key Architectural Decisions & Trade-offs

### A. Shared Team Inbox vs. Individual Inquiry Ownership
- **Decision:** Implemented a unified collaborative queue where any authenticated staff member can triage, view, and update tickets. The database records `created_by` for audit tracking.
- **Rationale:** Prevents support bottlenecks in a fast-paced roastery environment. Team members collaborate without waiting for reassignment.
- **Trade-offs & Mitigations:** Without personal assignment or role-based permissions (RBAC), any staff member can change ticket statuses. This simplified model was chosen to meet core assessment goals, with audit timestamps and creator attribution mitigating ambiguity.

### B. PostgreSQL-Backed Sessions vs. Stateless JWTs
- **Decision:** Implemented server-side session management using `express-session` backed by PostgreSQL (`connect-pg-simple`) via the `customer_inquiry_sid` cookie.
- **Cookie Security Configuration:**
  - `HttpOnly` is always enabled (`true`) to prevent client-side JavaScript access (mitigating XSS token theft).
  - `Secure` is conditionally enabled only in production (`NODE_ENV === 'production'`), allowing development testing over local HTTP.
  - `SameSite` is set to `'lax'` in development for local CSRF protection, and `'none'` in production when cross-site transport is required.
- **Rationale & Logout Mechanics:** Provides immediate session revocation: the `POST /api/auth/logout` endpoint destroys the server-side session record in PostgreSQL (`req.session.destroy()`) and simultaneously clears the client cookie (`res.clearCookie()`). Login regenerates session IDs to prevent session fixation.
- **Trade-offs & Mitigations:** Sessions persist in PostgreSQL across server restarts. To make fresh-state testing easy for developers, an `npm run db:clear-sessions` script was added to truncate the session table on demand.

### C. Parameterized SQL Queries & Dual-Layer Validation
- **Decision:** Executed raw SQL using parameterized placeholders (`$1`, `$2`) via `pg` connection pooling, paired with strict validation rules on both frontend and backend.
- **Rationale:** Helps prevent SQL injection by separating SQL commands from user-supplied values, avoiding the performance overhead or hidden complexity of an ORM. Backend validation ensures database integrity even if API requests bypass the client UI.
- **Trade-offs & Mitigations:** Writing explicit SQL and duplicating validation rules requires more initial boilerplate, but yields complete query visibility, predictable execution, and robust security.

---

## 3. Key Trade-offs & Future Improvements
1. **Public Intake Form:** The current system assumes inquiries are entered by staff. A natural next step is an unauthenticated public portal where customers submit requests directly into the queue.
2. **Role-Based Access Control (RBAC):** Add user roles (`Admin`, `Triage Agent`, `Technician`) with granular permissions and explicit ticket ownership.
3. **Automated Notifications:** Integrate email alerts (e.g., via Nodemailer or SendGrid) to notify customers when an inquiry status changes.

---

## 4. AI-Assisted Development & Verification (Antigravity)
- **AI Pair-Programming:** Used the Antigravity IDE agent to help scaffold SQL migrations, draft Express routes and validation schemas, structure React modal components, and generate comprehensive test suites.
- **Automated Verification:**
  - **70 Automated Tests Passed:** Ran the full test suite (`npm test`) covering 48 backend tests (`auth.test.js`, `inquiries.test.js`) and 22 frontend tests (`validation.test.js`, `deepLink.test.js`) with zero failures.
  - **Production Build:** Verified that the frontend builds cleanly into production assets (`npm run build:frontend`) without bundling errors.
- **Manual Verification:**
  - Verified route protection by running `curl -i http://localhost:5000/api/inquiries` and confirming HTTP 401 Unauthorized.
  - Verified unauthenticated rejection in browser Incognito windows to ensure protected endpoints cannot be reached without an active session.
  - Verified deep-linking (`?inquiry=<id>`) behavior for valid, missing, and invalid inquiry IDs.
