# Dean Extended Plan

## Purpose

The Dean supervises the college’s Faculty Coordinators and Professors, reviews controlled academic assignments, and sees relevant personnel performance, approval history, and activity.

## Priority legend

- **Required** — needed for the planned Dean workflow.
- **Recommended** — useful after required behavior works.
- **Optional** — may be postponed.
- **Needs confirmation** — requires a decision before implementation.

## Scope

The prototype covers one college, so the Dean does not need a college switcher. Program, role, personnel, request-status, and date filters are still required.

## Required pages

### Dashboard

Show pending and aging approvals, personnel totals, unassigned Professors, load warnings, schedule warnings, recent decisions, relevant audit events, and existing examination/grading statistics. Dashboard cards should link to their filtered source list.

### Member management

Use Faculty Coordinator and Professor tabs.

Required columns:

- name and institutional ID;
- role and program;
- account status;
- current load;
- pending request count;
- actions.

Filters include role, program, lifecycle status, assigned/unassigned, load state, name, and ID. Clicking a row opens a permission-aware profile.

### Profiles

Common tabs:

- Overview;
- Assignments;
- Performance/statistics;
- Activity;
- Login/account summary without passwords.

The Dean may see identity, role, program, active and historical offerings, load, sections, examination and grading summaries, approvals, and relevant actions. The Dean cannot edit examinations or grades from a profile.

### Personnel actions

Required actions:

- add/hire a Professor;
- appoint an existing Professor as Faculty Coordinator;
- view appointment effective date and history;
- set program responsibility;
- request or perform lifecycle changes according to Admin-configured permission.

By default, a Coordinator appointment requires Admin confirmation. This is **Needs confirmation**. The Dean does not directly assign Professors to Subjects.

### Approvals

Use Pending, Approved, Rejected, Cancelled/Withdrawn, and All tabs.

Each Professor-assignment request displays:

- request ID and requester;
- Professor, Subject, Section, and period;
- schedule;
- current and proposed load;
- conflict result;
- reason, date, and history.

Rules:

- approval activates the assignment;
- rejection requires remarks;
- unresolved hard conflicts block approval;
- a request cannot be silently modified during review;
- changes after approval need a new request or revision record;
- requester and Professor are notified;
- request and decision are logged.

### Logs

Show relevant Dean, Faculty Coordinator, Professor-assignment, approval, and personnel events. Filter by actor, role, action, target, date, program, and result. Unrelated server-maintenance events are not required.

### Statistics

Show personnel totals, assigned/unassigned Professors, teaching-load distribution, approval counts and age, examination creation, grading completion, and existing Student participation summaries. Statistics are read-only and link to supporting records.

## Recommended

- Group announcements.
- Reminders for aging requests.
- Workload comparison charts.
- End-of-term survey summaries.
- Export of filtered views.

## Optional

- Approval conversations.
- Complaint/report intake.
- Permission templates.
- Substitute-Professor workflow.
- Advanced evaluation.

## Empty and error states

Explain empty member or approval lists. Stale requests must identify changed records and block decisions. Conflict messages must name the conflicting offering and schedule. Permission errors return safely to the dashboard.

## Demo data

Provide a labeled Dean demo account, several Professors, at least one Coordinator, requests in several statuses, varied loads, and enough activity for filters and statistics.

## Acceptance criteria

- Dean has a distinct protected dashboard.
- Member lists distinguish Coordinators and Professors and are filterable.
- Member rows open correct permission-aware profiles.
- Dean can add a Professor and process Coordinator appointments according to configured authority.
- Assignment requests preserve decisions and remarks.
- Approval grants Professor access; rejection does not.
- Logs and statistics are filterable and evidence-backed.
- Dean cannot edit examinations or ordinary Student enrollment.
