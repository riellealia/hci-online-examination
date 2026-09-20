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
- SQLite as the primary data source when the Node server is running; and
- CSV as an import/export format rather than the application database.

The Dean and Faculty Coordinator dashboards currently use the Admin dashboard as their initial structural basis. Their complete role-specific workflows remain tracked in [`.plans/new`](.plans/new).

## Requirements

- Node.js 22.5 or newer (Node 24 LTS is recommended)
- A current desktop browser

No production dependencies need to be installed. The server uses Node's built-in SQLite support.

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

- `GET /api/health` — server and storage status
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

The repository currently contains 54 automated test files. The latest complete verification passed all 54 files, including server authentication sessions, collection-level authorization, protected approval writes, append-only audit enforcement, role-safe SQLite startup, cross-role approval UI, stale-request protection, approved academic changes, SQLite persistence, source-of-truth migration, HTTP routes, and CSV import/export.

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

This remains an HCI academic prototype. SQLite provides durable local persistence, and all storage and CSV routes now require a valid server session; migration and CSV transfer additionally require an Administrator account. Production deployment would still require collection-level authorization, password hashing, secret management, backups, concurrency planning, HTTPS, and a deployment-specific security review.
