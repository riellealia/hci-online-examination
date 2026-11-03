# Professor Instruction: Enrollment and Approval Migration

This is a local implementation plan. It does not change GitHub ownership or issue status.

## Confirmed workflow

1. **Admin owns normal Student enrollment.** Admin may add, move, or remove a Student from an active Subject offering when all capacity, duplicate, schedule, and load checks pass.
2. **Professor enrollment changes are requests.** A Professor may propose adding, moving, or removing a Student only within the Professor's approved active Subject offerings. The proposal must not change `studentEnrollments` while pending.
3. **Dean reviews every Professor proposal.** Approval applies the exact saved proposal after revalidating the Student, Professor ownership, offering, capacity, duplicate Subject, schedule, and load. Rejection requires remarks.
4. **Overloads remain approval-gated.** No role may create an overload enrollment early. The existing Dean overload workflow remains authoritative until its requester is deliberately migrated.
5. **Faculty Coordinator enrollment writes are retired.** The existing Coordinator Student Management page becomes read-only/oversight for enrollment data; it must not duplicate Admin ownership.
6. **Exam creation needs no second approval.** A Professor may select only approved active offerings and groups already assigned to that Professor. Eligible Students come only from active enrollments in those selected offerings.

## Local task sequence

Each task receives its own test run, commit, and push to `origin/oogabooga`. Do not merge these intermediate checkpoints into `dev` until the complete workflow passes end to end.

### Task 1 — Shared request contract and server boundary

- [x] Add a `faculty-student-enrollment` approval type submitted by Professor and reviewed by Dean.
- [x] Support proposed actions `add`, `move`, and `remove` without mutating enrollment while pending.
- [x] Add submit-time and approval-time validation plus an apply handler.
- [x] Remove direct Faculty write permission for `studentEnrollments`.
- [x] Extend protected-write rules, permissions, query visibility, audit events, and notifications.

### Task 2 — Faculty request-only interface

- [x] Keep the existing Student/Subject/Section picker layout.
- [x] Replace Add, Change, and Remove writes with request submission.
- [x] Show Pending/Approved/Rejected/Withdrawn history and prevent duplicate pending proposals.
- [x] Keep Faculty restricted to owned approved active offerings.

### Task 3 — Dean enrollment-request review

- [x] Add clear request cards for Student, Professor, action, Subject, current Section, proposed Section, schedule, capacity, load, reason, and history.
- [x] Revalidate on approval and leave stale/conflicting requests pending with an audited failure.
- [x] Notify the Professor and affected Student after a decision.

### Task 4 — Admin enrollment ownership

- [x] Keep Admin's direct add/move/remove workflow for normal-load enrollment.
- [x] Apply capacity, duplicate, active-period, schedule, and load checks consistently.
- [x] Route overload attempts into the existing Dean approval flow without creating enrollment early.
- [x] Make Admin history distinguish direct enrollment from approved Professor requests.

### Task 5 — Faculty Coordinator cleanup

- [x] Remove direct enrollment mutation controls from Coordinator Student Management.
- [x] Preserve read-only Student profile, enrollment, capacity, load, and application visibility.
- [x] Keep Professor-assignment and overload responsibilities unchanged unless separately instructed.

### Task 6 — Exam group restriction

- [x] Restrict exam groups to the Professor's approved active Subject offerings.
- [x] Restrict eligible Students to active enrollments in the selected groups.
- [x] Verify that no additional Dean approval is requested during exam creation.

### Task 7 — End-to-end regression and tracker reconciliation

- [x] Test direct Admin enrollment, pending Faculty request, Dean approval/rejection, stale approval, overload, notifications, audit history, and exam eligibility.
- [x] Run the complete test suite and document any environment-only cleanup failures separately.
- [x] Reconcile local task statuses without changing GitHub ownership unless explicitly requested.

## Non-goals for this migration

- Do not redesign the existing profile/enrollment visuals.
- Do not change Professor-assignment approval ownership.
- Do not grant Dean or Professor general access to Admin account management.
- Do not merge intermediate task checkpoints into `dev`.
