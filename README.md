# New Era University Online Examination System

A Human–Computer Interaction (HCI) prototype for university learning, examination, and academic-management workflows. The interface supports five user roles through one credential-based login page:

- Administrator
- College Dean
- Faculty Coordinator
- Professor
- Student

## Current status

The prototype currently includes:

- unified login and automatic role routing;
- separate Admin, Dean, Faculty Coordinator, Professor, and Student dashboards;
- password visibility controls and prototype account-recovery verification;
- shared permission enforcement, approval lifecycle, notifications, and structured audit services;
- SQLite-backed server login with opaque expiring sessions, logout revocation, active-account checks, and sign-in rate limiting;
- subject, section, enrollment, examination, submission, grading, reporting, and audit data;
- light and dark interface themes;
- Supabase as the database (SQLite only as a fallback when no Supabase credentials are set); and
- CSV as an import/export format rather than the application database.

Dean and Faculty Coordinator workspaces now use the shared role-dashboard design system while preserving their distinct academic responsibilities. Remaining role-specific work and ownership are tracked in [`.plans/new`](.plans/new).

## Requirements

- Node.js 22.5 or newer (Node 24 LTS is recommended)
- A current desktop browser

No production dependencies need to be installed. The server uses Node's built-in SQLite support.

## Deploy with Supabase and Render

The repository includes a `render.yaml` Blueprint. When `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are set, Supabase is the only database: the server
loads every collection from Supabase into memory at start (and refuses to start
if that fails), never opens SQLite, and answers a request that changes data only
after Supabase has stored it. If Supabase rejects a change, the affected
collections are reloaded from Supabase and the request returns HTTP 503.

Run `node scripts/verify-supabase.js` to check that every table exists, that no
collection is missing from Supabase, and that writes and the `sync_versions`
triggers work.

1. Create a Supabase project and run both files in `supabase/migrations/`
   (`202611170001_app_collections.sql`, then
   `202611190001_relational_tables.sql`) in its SQL Editor.
2. In Supabase Project Settings, copy the project URL and the server-only
   service-role key. Never place the service-role key in browser code or Git.
3. In Render, create a Blueprint from this repository and select `render.yaml`.
4. Supply `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and every credential
   marked `sync: false`. Replace all demonstration passwords.
5. Deploy. Render checks `/api/health`; a configured but unhealthy Supabase
   replica returns HTTP 503 so a broken deployment does not receive traffic.

### Supabase tables

Each collection the app keeps as a list has its own Supabase table (users,
students, faculty, coordinators, subjects, sections, curricula,
section_offerings, subject_assignments, academic_periods, exams, questions,
student_submissions, student_enrollments, audit_log, approval_requests,
question_reports, lesson_content, lesson_views, announcements, student_emails,
student_notifications). Every row has typed columns for browsing and reports,
the full record in `data`, and `position` to keep list order. Only changed
records are sent, and removed records are deleted. Single settings objects and
UI state stay in `app_collections`. The table list lives in
`server/supabase-tables.js`; after changing it, run
`node scripts/generate-supabase-tables-sql.js` and apply the new SQL. Set
`SUPABASE_RELATIONAL=false` to fall back to the single JSON table.

Tests that start their own server always disable Supabase, so they can never
write to the real project.

### Running more than one instance

Several instances can serve the app at once:

- **Sign-ins:** session tokens are sealed with `SESSION_SECRET` (Render
  generates it once for the service), so a token from one instance works on all
  of them. Logging out is shared through the `revokedSessions` collection.
- **Fresh data:** database triggers bump `sync_versions` on every change
  (`supabase/migrations/202611190002_sync_versions.sql`). Each instance polls
  it every 2 seconds (`SUPABASE_FOLLOW_INTERVAL_MS`) and reloads only the
  collections another instance changed, never one with its own writes still in
  flight.
- **Concurrent edits:** changes are saved per record, so two people editing
  different records of the same list both keep their changes. Two edits to the
  same record: the later one wins.

Render's free plan runs one instance; raise `numInstances` in `render.yaml` on a
paid plan. Supabase credentials are optional locally; without them, `npm start`
uses SQLite only (as the test suite does). Copy `.env.example` to `.env` for local cloud
testing and keep `.env` untracked.

## Run the project

From the repository root:

```powershell
npm start
```

Then open:

```text
http://localhost:3000/login.html
```

Keep the terminal open while using the application. Press `Ctrl+C` to stop the server.

Do not open the HTML files directly and do not use a basic Python static server for normal development. Those methods bypass the SQLite API and fall back to browser-only storage.

## Demo accounts

The maintained demo credentials are stored in [`.env`](.env). The current defaults are:

| Role | Username or ID | Password |
| --- | --- | --- |
| Administrator | `admin` | `admin123` |
| College Dean | `dean.demo` | `dean123` |
| Faculty Coordinator | `coordinator.demo` | `coord123` |
| Professor | `23-32534-345` | `reyes23` |
| Student | `2025-00002` | `santos2025` |

Nine additional Faculty Coordinator members are also seeded:

| Name | Username | Password |
| --- | --- | --- |
| Andrea Cruz | `coord.001` | `coord001` |
| Benjamin Flores | `coord.002` | `coord002` |
| Camille Garcia | `coord.003` | `coord003` |
| Daniel Mendoza | `coord.004` | `coord004` |
| Elena Navarro | `coord.005` | `coord005` |
| Francis Aquino | `coord.006` | `coord006` |
| Grace Villanueva | `coord.007` | `coord007` |
| Henry Bautista | `coord.008` | `coord008` |
| Isabella Ramos | `coord.009` | `coord009` |

These are demonstration credentials only and must not be reused for a production deployment.

## Data storage

When served at port 3000, SQLite is the primary source of truth. The database is created automatically at:

```text
data/neu-examination.sqlite
```

The browser retains a synchronous compatibility cache for the existing interface, but:

- server data wins during startup;
- browser migration only fills collections missing from SQLite;
- a write or deletion must succeed in SQLite before the browser cache changes; and
- session-only values remain in the browser.

Generated SQLite database, WAL, and shared-memory files are excluded from Git.

### CSV import and export

CSV is supported only for transferring tabular data. The parser supports UTF-8 BOM files, quoted commas, escaped quotes, and embedded line breaks. It rejects malformed rows, blank or duplicate headers, oversized requests, and unsupported collection names.

## Local API

The Node server provides:

- `GET /api/health` — server, SQLite cache, and Supabase replication status
- `GET /api/monitoring` — Administrator only: live Render server, Supabase and
  site metrics for the dashboard (add `RENDER_API_KEY` on Render to include the
  latest deploy status)
- `POST /api/auth/login` — validate a SQLite account and create a server session
- `GET /api/auth/session` — validate the current bearer token
- `DELETE /api/auth/logout` — revoke the current bearer token
- `GET /api/storage` — all stored collections (signed-in account)
- `GET /api/storage/:collection` — one collection (signed-in account)
- `PUT /api/storage/:collection` — save one collection (signed-in account)
- `DELETE /api/storage/:collection` — remove one collection (signed-in account)
- `POST /api/migrate` — transactional browser-data migration (Administrator)
- `POST /api/csv/:collection/import` — validated CSV-to-SQLite import (Administrator)
- `GET /api/csv/:collection/export` — SQLite-to-CSV export (Administrator)

Except for health and login, API requests require `Authorization: Bearer <token>`. CSV endpoints are transfer tools only: imports are parsed and saved into SQLite, and exports are generated from the current SQLite records. CSV files are never used as the live database.

## Tests

The repository currently contains 66 automated test files. The 2026-10-08 complete verification passed all 66 files, including server authentication sessions, collection-level authorization, protected approval writes, append-only audit enforcement, role-safe SQLite startup, Dean overload revalidation, Dean statistics and logs, Faculty Coordinator logs, cross-role approval UI, demo-data integrity, responsive safeguards, SQLite persistence, HTTP routes, and CSV import/export.

Run the SQLite tests without installing additional packages:

```powershell
npm test
node tests/t_http_backend.js
```

Run the complete browser-level suite:

```powershell
cd tests
npm install
npm test
```

See [`docs/completion-evidence.md`](docs/completion-evidence.md) for the verified workflow matrix, reproducible screenshot command, captured desktop/mobile evidence, and current limitations.

## Project structure

```text
assets/       Images and visual assets
css/          Shared and page-specific styles
data/         Runtime SQLite database (generated and ignored)
html/         Login and role dashboards
js/           Interface, authentication, demo data, and storage logic
server/       SQLite and CSV modules
tests/        Automated regression tests
.plans/       Requirements, ownership, progress, and design notes
server.js     Local HTTP and API server
```

## Team workflow

Before changing shared authentication, storage, permissions, or cross-role behavior, review [`.plans/new/.claim-work.md`](.plans/new/.claim-work.md) and coordinate ownership with the team.

Typical Git workflow:

```powershell
git pull
git add .
git commit -m "Describe your changes"
git push
```

## Scope note

This remains an HCI academic prototype. SQLite provides durable local persistence, collection-level authorization, protected sessions, academic-period backups, and controlled CSV transfer. Production deployment would still require password hashing, external secret management, multi-process concurrency planning, HTTPS, operational monitoring, off-device backup retention, and a deployment-specific security review. Automated tests and screenshots are implementation evidence; representative-user usability findings are still separate work.
