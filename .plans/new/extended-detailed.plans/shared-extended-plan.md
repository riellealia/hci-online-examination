# Shared Features and Rules

## Purpose

This document is authoritative for behavior used by more than one role. Role plans may add restrictions but should not contradict these rules without updating this file.

## Priority legend

- **Required** — shared foundation.
- **Recommended** — usability improvement after the foundation.
- **Optional** — does not block the core workflow.
- **Needs confirmation** — unresolved decision.

## Required terminology

Use these role identifiers consistently:

- Admin
- Dean
- Faculty Coordinator
- Professor
- Student

Do not use “Faculty” when the system specifically means Faculty Coordinator. See [Role Hierarchy, Terms, and Permissions](../overview/heirarchy.md).

## Authentication and routing

Use one login page containing username, password, and Login controls.

Flow:

1. User submits credentials.
2. System validates the account.
3. System checks lifecycle status, maintenance rules, and role access.
4. System creates the session with the stored role.
5. System routes to that role’s dashboard.

Do not ask the user to select a role before authentication.

Required outcomes:

- invalid credentials show a neutral error;
- deactivated or archived accounts cannot log in and receive an appropriate message;
- unauthorized page access redirects safely;
- logout clears the session;
- inactivity timeout follows Admin configuration;
- maintenance rules do not lock out Admin;
- role validation occurs on protected pages and protected mutations.

Passwords must never appear in profiles or logs.

## Permission model

Each role has:

- accessible pages;
- view scope;
- allowed actions;
- approval authority;
- numeric or workload limits.

Admin has a dedicated permissions page. UI visibility is not sufficient security: every protected action must validate the session role and effective permission.

The prototype covers one college. Program, Section, Subject, offering, and self-only restrictions still apply.

## Profiles

Clicking a person in a supported list opens a role-aware profile.

Possible tabs:

- Overview;
- Assignments or enrollments;
- Performance/grades;
- Activity;
- Login/account summary;
- Administrative commands.

Only show tabs and fields permitted to the viewer. Students may see appropriate public/academic overview data but not administrative commands, internal logs, private login details, or another Student’s grades.

Profile access may be logged under a distinct Access activity category.

## Approval records

Required fields:

- request ID and type;
- requester and requester role;
- affected person/record;
- proposed change;
- reason;
- academic period;
- submitted timestamp;
- status;
- reviewer;
- reviewer remarks;
- decision timestamp;
- revision/history metadata.

Statuses:

- Pending;
- Approved;
- Rejected;
- Cancelled;
- Withdrawn.

Rules:

- original request data remains readable;
- rejection requires remarks;
- only the configured reviewer role may decide;
- requester cannot approve their own request;
- stale target data blocks the decision until reviewed;
- approval applies the exact proposed change;
- subsequent material changes require a new or revised request;
- decisions notify affected users and create audit events.

## Audit records

Required fields:

- event ID;
- timestamp;
- actor ID and role;
- action;
- target type and ID;
- previous and new values where appropriate;
- result;
- reason or metadata;
- academic period where relevant.

Required categories:

- authentication/session;
- access/profile view;
- account/lifecycle;
- permissions;
- academic setup;
- approval;
- assignment/enrollment;
- schedule/load;
- examination/grading;
- system/maintenance.

Logs are append-only through normal UI. Filters include date, actor, role, category, action, target, and result.

Visibility:

- Admin: all prototype events.
- Dean: college personnel, approvals, coordination, and academic summaries.
- Faculty Coordinator: own actions and workflows they manage.
- Professor: own relevant actions where an activity view is provided.
- Student: no administrative log; personal submission history is separate.

## Account lifecycle

### Active

- **Login:** Allowed.
- **Lists:** Appears in active lists.
- **History:** Retained.

### Deactivated

- **Login:** Blocked.
- **Lists:** Appears in active lists with a Deactivated status.
- **History:** Retained.

### Archived

- **Login:** Blocked.
- **Lists:** Appears only in archive/history views.
- **History:** Retained.

### Graduated

- **Login:** Blocked by default.
- **Lists:** Appears only in archive/history views.
- **History:** Retained with graduation information.

### Transferred

- **Login:** Blocked by default.
- **Lists:** Appears only in archive/history views.
- **History:** Retained with transfer information.

Every transition requires authorization and a reason when archiving, graduating, or transferring. Lists must be filterable. Restore returns a record without losing history.

## Academic periods

An Academic period combines school year, term, dates, and status.

Closing a period archives operational relationships rather than deleting them. Historical offerings, enrollments, schedules, exams, submissions, grades, approvals, and logs remain readable.

Active pages default to the current period. Historical filters allow past periods to be selected.

## Curriculum, Subjects, Sections, and offerings

- Curriculum: versioned academic sequence for a program.
- Subject: reusable definition with code, name, units, and prerequisites.
- Section: Student group associated with program and year.
- Subject offering: period-specific delivery of a Subject to a Section by an approved Professor.
- Enrollment: Student membership in an offering.

Do not attach a universal schedule directly to the reusable Subject. Schedule the Subject offering.

## Schedule rules

A schedule slot contains weekdays, start time, end time, and optional room.

Two slots conflict when:

- they belong to the same active period;
- they share a weekday;
- the first begins before the second ends; and
- the second begins before the first ends.

Check conflicts for Professor, Section, enrolled Students, and enabled Room. Adjacent slots are allowed by default. Conflicts must identify the affected record and existing slot.

## Load rules

- Student load: sum of Subject units in active enrollments for one period.
- Professor load: sum of configured units/hours for approved active offerings in one period.
- Admin configures normal limits and optional maximum ceilings.
- Load calculation must be visible before an assignment is submitted.
- Admin configures normal-load and absolute maximum-load rules by program, year level, and term. Faculty Coordinators process Student subject/load changes and submit overload applications; Student overload requires Dean approval before the additional enrollment becomes active.
- Professor overload handling is **Needs confirmation**; Dean review of the assignment is always required.

## Capacity and availability

Remaining capacity equals Section/offering capacity minus active enrollments.

- Full: 0, red.
- Low availability: 1–5, yellow.
- Available: 6 or more, green.

Show text, number, and color. Do not rely on color alone. Filters may group by program, year, Section, and availability.

## Common list behavior

Major lists should provide relevant search, filters, sorting, clear active filters, empty states, and reset controls. Export is recommended. Destructive or high-impact operations require confirmation and an impact summary.

## Notifications

Required notifications:

- approval submitted;
- approved;
- rejected with remarks;
- request cancelled/withdrawn;
- assignment activated/replaced;
- Student enrollment or transfer;
- overload decision;
- important schedule change;
- account lifecycle change where appropriate.

In-app notifications are required for core workflows. Email is optional.

## Data integrity

Reject or clearly handle:

- duplicate IDs/accounts;
- orphaned role/person records;
- duplicate enrollments;
- offerings without valid period/Subject/Section;
- Professor access without approved assignment;
- schedule conflicts;
- invalid load totals;
- references to archived records in new assignments.

Historical records may reference inactive people or Subjects but must retain readable labels/snapshots.

## Demo and filler data

Provide one clearly labeled demo account per role and sufficient filler records for lists, filters, conflicts, approvals, capacity states, loads, examinations, and history. Demo data should include valid and intentionally varied states, not broken relationships.

## Shared acceptance criteria

- All role pages use the same authenticated identity and permission source.
- Hidden controls cannot be activated through direct calls.
- Approval and lifecycle history is retained.
- Cross-role changes appear consistently in affected views.
- Academic rollover preserves historical records.
- Filters and status labels use shared terms.
- Audit entries identify actor, action, target, time, and result.
- Schedule, capacity, and load validation produces specific feedback.
