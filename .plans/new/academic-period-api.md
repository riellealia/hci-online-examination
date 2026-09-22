# Academic-period backend

The SQLite server owns academic-period transitions. The current Admin form still edits the older `systemSettings` labels; the Admin rollover UI will use these routes in a later phase.

All routes require a server session. Create, impact, activate, close, and archive require an Administrator. Period-scoped record reads also apply the existing collection read policy.

- `GET /api/academic-periods` — list Draft, Active, Closed, and Archived periods.
- `POST /api/academic-periods` — create a Draft with `schoolYear` (`YYYY-YYYY`), `term`, `startDate`, `endDate`, optional `enrollmentStart`/`enrollmentEnd`, and optional `reason`.
- `GET /api/academic-periods/:id/impact` — count scoped offerings, enrollments, assignments, exams, questions, submissions, and approvals; warn about pending grading/approvals.
- `POST /api/academic-periods/:id/activate` — activate a Draft only when no other period is Active. Optional body: `{ "reason": "..." }`.
- `POST /api/academic-periods/:id/close` — close the Active period. Body: `{ "reason": "..." }`.
- `POST /api/academic-periods/:id/archive` — archive a Closed period. Body: `{ "reason": "..." }`.
- `GET /api/academic-periods/current/records/:collection` — active-period records.
- `GET /api/academic-periods/:id/records/:collection` — historical records for that period.

`close` and `archive` retain operational records and audit history in one SQLite transaction. New enrollments or assignments are never copied automatically into the next period. Generic storage writes, CSV imports, and migration cannot change historical operational records; new operational records are tagged with the Active period. The period collection and current school-year/term labels cannot be rewritten through generic storage routes.

The future UI must use the period-scoped read routes for active lists and history. The existing browser pages still read the broad legacy collections, so they are not yet period-filtered visually.

Backups include `academicPeriods`, but the current SQLite restore button cannot safely replace protected period history. It now refuses such a restore before changing any records. A protected, transactional restore workflow belongs in the later Admin UI/integration phase.
