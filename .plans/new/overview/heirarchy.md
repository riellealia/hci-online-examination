# Role Hierarchy, Terms, and Permissions

This document defines the official role terminology for the planned system. The filename retains the original spelling so existing links do not break.

## Organizational scope

The prototype is designed for one college. College-specific access therefore does not require multi-college switching. Program, year-level, section, subject, and account restrictions still apply.

## Roles

### Admin

System-level role responsible for accounts, permissions, academic periods, curriculum configuration, archives, maintenance, data integrity, limits, and exceptional approvals. Admin may view all records in the prototype.

### Dean

College-level supervisory role responsible for Faculty Coordinator and Professor personnel, assignment approvals, relevant audit records, and academic statistics. The Dean does not directly schedule Professors or enroll Students during the normal workflow.

### Faculty Coordinator

Academic coordination role responsible for subject offerings, sections, schedules, Professor assignment requests, Student enrollment, transfers, and load management. Earlier notes that say “Faculty” refer to this role.

### Professor

Teaching role responsible for course content, examinations, questions, grading, results, and reports for approved assigned offerings only.

### Student

Learner role that views active enrollments, course content, schedules, examinations, submissions, and released results.

## Authority is not automatic inheritance

The visual ordering is:

```text
Admin
  └─ Dean
      └─ Faculty Coordinator
          └─ Professor
              └─ Student
```

This ordering describes organizational responsibility, not unrestricted inheritance. A higher role sees only the pages and actions explicitly granted to it. For example, a Dean can review Professor statistics but does not automatically edit Professor examinations.

## Permission principles

- Admin owns the permission configuration page and assigns limits per role.
- Protected identity fields can be changed only by Admin or another explicitly authorized role.
- Faculty Coordinators manage academic placement but cannot delete accounts.
- Professors operate only on approved assigned offerings.
- Students see only their own academic records and permitted public profile information.
- Hidden actions must also be protected from direct URLs and script calls.
- Every permission-sensitive mutation is logged.

## Baseline permissions by role

The following lists are the default permissions. Any configurable exception must be explicit, logged, and bounded by role limits.

### Admin permissions

- **Roles and limits:** Manage.
- **Accounts:** Create and manage accounts for every role.
- **Protected identity:** Edit.
- **Account lifecycle:** Archive, deactivate, reactivate, and restore.
- **Curricula and term limits:** Manage.
- **Professor assignments:** View requests and resulting assignments.
- **Student enrollment and transfers:** View.
- **Student overloads:** Approve or reject.
- **Examinations and grading:** View reports only; does not perform ordinary grading.
- **Audit logs:** View all system audit records.

### Dean permissions

- **Roles and limits:** View the Dean role and its effective limits.
- **Accounts:** Create or manage Professor and Faculty Coordinator personnel within granted authority.
- **Protected identity:** Limited editing only when Admin grants it.
- **Account lifecycle:** Request a change or perform limited actions when Admin grants it.
- **Curricula and term limits:** View.
- **Professor assignments:** Review, approve, or reject Faculty Coordinator requests.
- **Student enrollment and transfers:** View.
- **Student overloads:** View requests and decisions.
- **Examinations and grading:** View statistics; cannot edit examinations or grades.
- **Audit logs:** View college-relevant personnel, approval, and academic activity.

### Faculty Coordinator permissions

- **Roles and limits:** View the Faculty Coordinator role and its effective limits.
- **Accounts:** Cannot create accounts.
- **Protected identity:** Cannot edit.
- **Account lifecycle:** Cannot archive or deactivate accounts.
- **Curricula and term limits:** View and use them during academic management.
- **Professor assignments:** Create and manage proposals for Dean review.
- **Student enrollment and transfers:** Manage.
- **Student overloads:** Submit requests to Admin.
- **Examinations and grading:** View assignment or completion status only.
- **Audit logs:** View their own actions and the workflows they manage.

### Professor permissions

- **Roles and limits:** View the Professor role and its effective limits.
- **Accounts:** Cannot create accounts.
- **Protected identity:** Edit only allowed personal profile fields.
- **Account lifecycle:** Cannot archive or deactivate accounts.
- **Curricula and term limits:** View information relevant to assigned offerings.
- **Professor assignments:** View their own approved and pending assignments.
- **Student enrollment and transfers:** View class lists for assigned offerings.
- **Student overloads:** No approval or request authority.
- **Examinations and grading:** Manage examinations and grades for approved assignments.
- **Audit logs:** View their own relevant activity when provided.

### Student permissions

- **Roles and limits:** View the Student role and applicable limits.
- **Accounts:** Cannot create accounts.
- **Protected identity:** Edit only allowed personal profile fields.
- **Account lifecycle:** Cannot archive or deactivate accounts.
- **Curricula and term limits:** View information relevant to their program and enrollment.
- **Professor assignments:** No management access.
- **Student enrollment and transfers:** View their own enrollment.
- **Student overloads:** View their own request and decision.
- **Examinations and grading:** Take assigned examinations and view released results.
- **Audit logs:** No administrative-log access; personal examination history remains available separately.

## Account lifecycle terms

- **Active** — can log in and participate normally.
- **Deactivated** — login is blocked, but the person remains in active academic records.
- **Archived** — removed from normal active lists while all history remains available.
- **Restored** — returned from Archived to an appropriate active or deactivated state.
- **Graduated** — archived Student with graduation information retained.
- **Transferred** — archived Student whose departure reason is transfer.

Normal interfaces should not permanently delete people. Active, deactivated, and archived lists must be filterable. Every transition records the actor, old state, new state, date, and reason.

## Academic terms

- **Program** — BSCS, BSIT, BSIS, Game Development, Animation, or another college program.
- **Section** — a group of Students within a program and year level.
- **Subject** — curriculum definition containing code, name, units, and prerequisites.
- **Subject offering** — a Subject delivered in one academic period to a Section, by an approved Professor, at a defined schedule.
- **Student load** — total academic units enrolled by a Student in an academic period.
- **Professor load** — total assigned teaching units or hours in an academic period.
- **Academic period** — school year plus First Semester, Second Semester, Summer, or the confirmed additional/special term.
- **Approval request** — review record for a proposed controlled action.
