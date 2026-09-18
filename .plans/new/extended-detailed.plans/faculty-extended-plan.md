# Faculty Coordinator Extended Plan

## Purpose

The Faculty Coordinator manages subject offerings, sections, Professor assignment requests, Student enrollment and transfers, schedules, capacity, and loads. This replaces the ambiguous “Faculty” management role in earlier notes.

## Priority legend

- **Required** — needed for the core workflow.
- **Recommended** — useful after required behavior works.
- **Optional** — may be postponed.
- **Needs confirmation** — requires a decision.

## Restrictions

The Faculty Coordinator cannot permanently delete accounts, edit protected identity details, grant permissions, approve their own requests, approve overloads, or modify Professor examinations and grades.

## Required pages

### Dashboard

Show the current period, active Sections and offerings, unassigned offerings, pending requests, load warnings, low/full Sections, schedule conflicts, and recent activity.

### Subject offerings

A Subject offering connects the academic period, Subject, Section, approved Professor, schedule slots, capacity, enrollment, and status.

Statuses: Draft, Pending assignment, Active, Closed, Historical.

Filters: program, year, Section, Subject, Professor, status, availability, and weekday.

The Coordinator may prepare offerings from the active curriculum. Subjects outside the Section curriculum require an explicit exception or are blocked.

### Professor assignment

1. Select an offering.
2. View available Professors.
3. Check program eligibility if modeled.
4. Show schedule and teaching load.
5. Choose a Professor.
6. Explain replacements.
7. Submit to the Dean.
8. Keep the offering pending.
9. Activate access only after approval.

Professor choices must identify available, near limit, schedule conflict, load conflict, and already assigned states. Rejected requests remain in history.

### Student enrollment and sections

The Coordinator may view enrollments, enroll a Student, transfer Sections, withdraw with a reason, view load, filter regular/irregular status if implemented, and submit overload requests.

The Coordinator cannot change protected identity or lifecycle status.

Validation:

- active Student and period;
- active offering;
- no duplicate;
- capacity available;
- prerequisites satisfied when enforced;
- no schedule conflict;
- load within limit or approved overload.

Normal enrollment is active without additional approval by default. Overloads remain pending until Admin approval.

### Scheduling

Use weekday checkboxes Monday through Sunday, start and end time pickers, optional room/location, and multiple slots for lecture/laboratory schedules.

Validate at least one day, start before end, no duplicate/overlap, and no Professor, Section, enrolled Student, or enabled Room conflict.

Conflict messages name the conflicting record and time. Adjacent slots are allowed. Changes affecting enrolled people require an impact summary. Whether schedule changes require Dean approval is **Needs confirmation**.

### Load management

Student load is total Subject units for active period enrollments. Professor load is calculated from approved offerings using units or configured teaching-hour weighting.

Show current limit, proposed load, remaining capacity, overload amount, conflict state, and approval status. Use Admin-configured values.

### Availability

- **Full**: 0 remaining places, red label and border.
- **Low availability**: 1–5 places, yellow label and border.
- **Available**: 6 or more places, green label and border.

Always show the numeric places remaining. Use grid cards where comparison helps and allow grouping/filtering by program, year, Section, and availability.

### Logs

Record offering changes, assignment requests/replacements, enrollments, withdrawals, transfers, schedules, loads, overload requests, and required profile access. Coordinators see their actions and relevant workflow history; Dean and Admin see them through scoped logs.

## Recommended

- Batch enrollment with preview.
- Copy prior offering structures without enrollments.
- Saved filters.
- Calendar schedule view.
- Explanations for disabled choices.
- Notifications after approved changes.

## Optional

- Room inventory.
- Waitlists.
- Automatic schedule suggestions.
- Substitute requests.
- Bulk schedule import.
- Adviser notes.

## Acceptance criteria

- Coordinator has a protected workspace and cannot perform restricted actions.
- Offerings connect Subject, Section, period, schedule, and approved Professor.
- Professor assignment activates only after Dean approval.
- Professors create exams only for approved active offerings.
- Schedule input supports multiple days and times.
- Conflicting schedules are rejected.
- Normal enrollment updates both Student and offering views.
- Overload remains pending until Admin approval.
- Loads use Subject units and configured limits.
- Availability thresholds and labels are consistent.
- Material actions are logged.
