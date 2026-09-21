# Admin Extended Plan

## Purpose

Admin owns system-wide configuration and account governance. Academic assignment work moves to the Faculty Coordinator, while Admin retains visibility, permission control, archival functions, and exceptional approvals.

## Priority legend

- **Required** — needed for the planned role workflow.
- **Recommended** — valuable for usability and demonstration after required behavior works.
- **Optional** — may be postponed without breaking the core workflow.
- **Needs confirmation** — requires a team or professor decision before implementation.

## Existing foundation

The current Admin area already contains a dashboard, monitoring, Faculty/Student/Subject/Section management, profiles, audit logs, announcements, maintenance controls, academic-period labels, access toggles, backup/restore, and integrity checks. Extend these components where practical; a complete visual rebuild is not required.

The current Section page remains useful. Curriculum management should extend the data and navigation around Subjects and Sections instead of discarding the page.

## Required pages

### Dashboard

Show:

- current academic period and status;
- active, deactivated, and archived account totals;
- pending overload and permission requests;
- active programs, curricula, sections, and offerings;
- system access and maintenance status;
- recent high-priority audit events;
- shortcuts to Accounts, Roles and Permissions, Academic Setup, Approvals, Archives, Logs, and System Management.

Dashboard statistics should link to their source lists.

### Accounts

Separate account creation from academic management. Provide role and lifecycle-status filters.

Account creation fields:

- institutional ID or username;
- first and last name;
- role;
- program association where applicable;
- initial password or password-generation method;
- lifecycle status;
- effective date.

Rules:

- usernames and institutional IDs are unique;
- role changes are explicit and logged;
- protected identity edits require Admin permission;
- deactivated accounts cannot log in;
- archived accounts are hidden from normal active lists;
- academic history is never removed when an account changes state.

### Roles, permissions, and limits

Create a dedicated Admin page showing:

- role name and description;
- accessible pages;
- allowed actions;
- approval authority;
- record visibility;
- configurable numeric limits;
- last change and actor.

Required controls:

- view the baseline permission matrix;
- enable or disable configurable permissions;
- set normal Student and Professor load limits;
- restore documented defaults;
- preview effective permissions for a role;
- confirm broad permission changes.

Hard safety boundaries remain. Faculty Coordinators cannot receive permanent-delete authority, and Students cannot receive administrative-log or grading authority.

### Account lifecycle and archives

Supported statuses:

- Active;
- Deactivated;
- Archived;
- Graduated for Students;
- Transferred for Students.

Required actions:

- deactivate and reactivate;
- archive with a required reason;
- restore;
- mark graduated or transferred;
- filter and export lifecycle lists;
- view lifecycle history.

Do not expose routine permanent deletion for people. Every change records actor, old status, new status, timestamp, and reason.

### Academic setup

Organize this area into Academic periods, Curricula, Subjects, Sections, and Load limits.

#### Academic periods

Fields:

- school year;
- term: First Semester, Second Semester, Summer, and the confirmed additional/special term;
- start and end dates;
- enrollment dates if used;
- status: Draft, Active, Closed, Archived.

Only one academic period should be Active by default.

Closing a period must:

- show an impact summary;
- warn about pending grading or approvals;
- preserve offerings, schedules, enrollments, examinations, submissions, and results;
- remove closed records from active operational views;
- keep them available through history and reports;
- log the close action.

Opening a new period may copy curriculum and selected setup records, but must not copy Student enrollments or Professor assignments silently.

#### Curriculum

A curriculum belongs to the college and a program. It is versioned so older Students can remain attached to their original curriculum.

Fields:

- curriculum ID/name;
- program;
- version or effective school year;
- active/inactive status;
- year level;
- term;
- Subject and units;
- prerequisite and optional corequisite;
- recommended sequence.

The curriculum interface may reuse the existing Subject and Section pages. Add a curriculum view grouping Subjects by program, year, and term. The Section page continues to manage actual Student groups; it does not become the curriculum itself.

#### Subjects and units

Retain Subject management and add academic units, lecture/laboratory classification if required, active state, curriculum relationships, and prerequisites. Unit changes must show affected curricula and load calculations.

#### Sections

Retain the existing Section page and add active academic period, program, year level, section identifier, capacity, status, and links to active offerings. Professor assignment, Student enrollment, and scheduling belong to the Faculty Coordinator.

#### Load limits

Configure normal and maximum Student units, normal and maximum Professor teaching load, and optional laboratory weighting. Changes are effective-dated and logged.

### Approvals

Admin configures the normal and absolute maximum Student load rules by program, year level, and term. Student overload applications are reviewed by the Dean; Admin retains system configuration and visibility.

Provide Pending, Approved, Rejected, Cancelled, Withdrawn, and All tabs, filterable by request type, requester, affected person, program, date, and status.

The decision view shows current and proposed load, affected offerings, conflicts, reason, supporting notes, and history. Rejection requires remarks. Decisions cannot erase the original request.

### Audit logs

Provide filters for date, actor, role, action, target type, target record, and result. Cover authentication, profile access, account/lifecycle changes, permissions, periods, curricula, limits, approvals, coordination actions, examinations, and grading where recorded.

Profile access events must be distinguishable from data-changing events.

## Recommended

- Saved filters and exports.
- Warnings for accounts without valid assignments.
- Dashboard trends for enrollment, grading, and requests.
- Read-only preview of what a selected role can see.

## Optional

- Profile-photo administration.
- Bulk lifecycle updates with preview.
- Database migration tools.
- Advanced security reports.
- Cross-college controls if scope expands.

## Acceptance criteria

- Accounts route to their stored role.
- Admin can configure documented permissions and limits.
- Deactivation blocks login without deleting academic records.
- Archival removes people from active lists while preserving history.
- Lifecycle lists and logs are filterable.
- Closing a term preserves history and clears only active views.
- Curricula group Subjects by program, year, and term.
- Student and Professor limits are stored separately.
- Admin can configure normal-load and maximum-load rules with an audit trail.
- Faculty Coordinator actions are visible to Admin but are not performed from ordinary Admin academic-management screens.
