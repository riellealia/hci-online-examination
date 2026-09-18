# Optional Extended Plan

## Purpose

These features may improve the demonstration but must not delay authentication, permissions, account lifecycle, academic periods, curricula, approvals, assignments, scheduling, loads, examinations, or grading.

An optional item becomes active scope only after it is claimed and the required dependencies are complete.

## Priority groups

### Recommended after required work

These provide visible value without changing the core role model:

- targeted announcements for Faculty Coordinators, Professors, Students, or everyone;
- filtered table export;
- regular/irregular Student status and filters;
- calendar presentation of schedules;
- end-of-term questionnaire summaries for the Dean;
- clearer demo-account documentation;
- profile pictures displayed in management lists;
- saved filter presets;
- notifications for approval and schedule events.

### Optional enhancements

#### Profile pictures

Allow authorized users to add or update profile images. Provide a fallback avatar and validation for file type/size. A missing image must never block account creation or academic work.

#### Questionnaires and surveys

Allow Students to complete an end-of-term questionnaire. Dean sees aggregate results; personally identifying responses should be restricted if anonymity is promised. Define who authors surveys and when results become visible before implementation.

#### Reports about personnel

Students or Professors may submit a report concerning a Professor or Faculty Coordinator. Reports route to the Dean, have lifecycle statuses, protect reporter privacy, and remain separate from examination-question issue reports.

#### Announcements and mail

Reuse the existing announcement/inbox foundation where possible. Optional improvements include group targeting, scheduling, read status, pop-up notices, and email delivery.

Email delivery requires a backend/service and is outside a browser-only prototype unless mocked.

#### Special Student actions

Possible actions include academic hold, examination restriction, or adviser note. Do not implement until authority, duration, appeal, visibility, and audit requirements are defined.

#### Regular and irregular status

Store an explicit Student status or derive it from curriculum/enrollment differences. If derived, explain the rule. Allow Faculty Coordinator and authorized higher roles to filter by status.

#### Waitlists

When an offering is full, permit an eligible Student to join an ordered waitlist. Define promotion, expiration, notification, and overload behavior.

#### Room scheduling

Add rooms, capacity, availability, and conflict validation. This becomes required only if the professor confirms room scheduling is part of scope.

#### Advanced scheduling

Offer schedule suggestions based on Professor, Section, Student, and Room availability. Suggestions must still pass the normal conflict checks.

#### Substitute Professor

Allow a temporary assignment request with start/end dates and Dean approval. Preserve the original Professor and assignment history.

#### Advanced statistics

Examples:

- commonly missed questions;
- pass/fail trends;
- grading turnaround;
- teaching-load comparison;
- enrollment demand;
- approval turnaround.

Statistics must link to or explain their underlying records.

### Future technical change: SQLite or backend

The current prototype uses CSV files and browser storage. SQLite may improve structured persistence, but using it from a normal browser-only static site requires a backend, desktop wrapper, WebAssembly approach, or other architecture decision.

Do not perform a database migration only by replacing CSV files. First define:

- runtime and deployment;
- server/API ownership;
- authentication storage;
- schema and migrations;
- backup/restore;
- concurrent updates;
- security expectations;
- how existing browser data is imported.

For the current HCI prototype, browser storage remains acceptable unless the course explicitly requires database persistence.

## Features intentionally unchanged for now

Professor and Student core examination workflows should remain stable except for:

- new role naming/routing;
- approved offering access;
- schedule and enrollment eligibility;
- shared notifications;
- permission-aware profiles.

Avoid redesigning examination authoring, attempts, or grading solely as part of the management-role change.

## Optional-feature checklist

Before starting an optional feature:

- required dependencies are Complete or in Review;
- the task is listed in the claim file;
- one primary owner is named;
- expected users and permissions are defined;
- stored data and audit requirements are defined;
- success criteria are written;
- the feature does not bypass approvals or role limits.

## Acceptance criteria for optional work

Each implemented optional feature must:

- respect shared authentication and permissions;
- preserve existing required workflows;
- use shared status and UI language;
- handle empty, validation, success, and error states;
- produce appropriate audit events;
- include verification evidence before being marked Complete.
