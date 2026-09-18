# Planned System Changes

This document is the short overview for the next development phase of the Online Examination System. It explains the main direction and links to the detailed requirements. Read the detailed plan for a feature before changing its code.

> Planning status: proposed requirements for team review. Items marked **Needs confirmation** must be settled before implementation.

## Documents

- [Claim or review work](.claim-work.md)
- [Role hierarchy and terminology](overview/heirarchy.md)
- [System relationships](overview/relationship-diagram.md)
- [Admin detailed plan](extended-detailed.plans/admin-extended-plan.md)
- [Dean detailed plan](extended-detailed.plans/dean-extended-plan.md)
- [Faculty Coordinator detailed plan](extended-detailed.plans/faculty-extended-plan.md)
- [Shared features and rules](extended-detailed.plans/shared-extended-plan.md)
- [Optional extensions](extended-detailed.plans/optional-extended-plan.md)

## Main change

The current system has Admin, Faculty, and Student accounts. The planned system separates academic coordination from teaching and uses five roles:

1. **Admin** — manages the system, accounts, permissions, academic periods, curricula, archives, limits, and system-wide logs.
2. **Dean** — supervises the college, manages Faculty Coordinators and Professors, reviews assignment requests, and views college statistics and logs.
3. **Faculty Coordinator** — manages subject offerings, sections, schedules, Professor assignments, Student enrollment, and academic loads within the college.
4. **Professor** — creates examinations and grades Students only for assigned subject offerings.
5. **Student** — views enrolled subjects and takes assigned examinations.

“Faculty” in the earlier notes means **Faculty Coordinator** in these plans. Professor and Faculty Coordinator are separate system roles.

## Required changes

### Shared login and access

- Use one login page with username, password, and Login controls.
- Remove role-selection buttons from the login flow.
- Detect the role from the authenticated account and open the correct dashboard.
- Give every role its own permissions, limits, and protected pages.
- Admin can configure role permissions and limits on a dedicated page.

### Admin

- Retain the dashboard, statistics, system monitoring, maintenance, and audit functions.
- Separate account creation from academic management.
- Create and manage the role and permission configuration page.
- Replace ordinary Student deletion with deactivate, archive, restore, and lifecycle-status controls.
- Add filterable active and archived account lists and log every lifecycle change.
- Manage school years, terms, start/end dates, curriculum versions, subject units, and load limits.
- Closing a term archives its active records; it must not erase historical records.
- Review exceptional requests such as Student overloads.

### Dean

- Add a separate Dean login destination and dashboard.
- Add filterable Faculty Coordinator and Professor lists with profile pages.
- Allow the Dean to add or hire Professors and appoint Faculty Coordinators.
- Add filterable approval, activity-log, and statistics pages.
- Let the Dean approve or reject Professor-to-subject-offering assignments proposed by Faculty Coordinators.

### Faculty Coordinator

- Move Professor subject/section assignment and Student enrollment management from Admin to the Faculty Coordinator.
- Do not allow the Faculty Coordinator to delete accounts or change protected identity fields.
- Add subject-offering schedules using weekday checkboxes and start/end time controls.
- Check Professor, Student, Section, and optional Room schedule conflicts.
- Calculate Professor teaching load and Student academic load.
- Send Professor assignment requests to the Dean.
- Send Student overload requests to Admin.
- Log every assignment, transfer, schedule, and load change.

### Professor and Student

- Preserve the current examination and grading workflows unless a shared permission or assignment change requires an adjustment.
- Professors may create examinations only for their approved subject offerings.
- Students may access examinations only through active enrollments and permitted sections.

## Shared interface rules

- Clicking a person opens a permission-aware profile.
- Tabs and commands that the viewer cannot use must not be shown.
- Lists must support relevant search, filters, sorting, and clear empty states.
- Section and subject-offering choices use grid cards where practical.
- Remaining Student slots use labeled availability states:
  - **Full** — 0 places, red.
  - **Low availability** — 1–5 places, yellow.
  - **Available** — 6 or more places, green.
- Color must not be the only status indicator.
- Filters may group results by program, year level, section, and availability.
- Important actions, approvals, profile access, logins, and account-status changes are auditable.
- Provide clearly labeled demo accounts and separate filler records for realistic lists.

## Approval summary

- **Assign or replace a Professor for a subject offering**
  - Submitted by: Faculty Coordinator
  - Reviewed by: Dean
- **Student enrollment within the normal load**
  - Submitted by: Faculty Coordinator
  - Reviewed by: No additional approval by default
- **Student overload**
  - Submitted by: Faculty Coordinator
  - Reviewed by: Admin
- **Appoint a Professor as Faculty Coordinator**
  - Submitted by: Dean
  - Reviewed by: Admin by default

All approval records use Pending, Approved, Rejected, Cancelled, or Withdrawn status and retain reviewer remarks and timestamps.

## Priority

1. Confirm terminology, permissions, and approval ownership.
2. Implement shared authentication, roles, permissions, audit records, and academic periods.
3. Implement Admin account, lifecycle, curriculum, and limit controls.
4. Implement Dean personnel and approval workflows.
5. Implement Faculty Coordinator assignments, schedules, enrollment, and load checks.
6. Integrate the existing Professor and Student examination workflows.
7. Consider optional features only after the required workflows work across roles.

## Needs confirmation

- Whether appointing a Faculty Coordinator requires Admin approval or takes effect immediately.
- Whether normal Student enrollment requires approval; the current proposal requires approval only for overloads.
- Whether room scheduling is part of the prototype.
- Whether the term called “Additionals” should be named “Additional Term” or “Special Term.”
- Exact Student and Professor load limits and whether laboratory units count differently.

## Team coordination

Before starting work, add the task to [`.claim-work.md`](.claim-work.md). Keep one primary owner per task, record whether the rest of the team has reviewed it, and coordinate before changing shared authentication, storage, or permission code.
