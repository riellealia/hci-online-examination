# Requirements Analysis

Covers the final deliverable *"Requirements analysis for all four modules"*.

For each module: the users, their goals, the inputs they supply, the outputs the
system produces, the rules it enforces, and the constraints it operates under.
Every rule listed here is implemented and covered by a test in `../tests/`.

---

## System-wide

**Users.** Three roles, mutually exclusive.

| Role | Responsible for |
|---|---|
| Admin | Faculty, student, section and subject records; section-subject and professor-subject assignment |
| Faculty | Exams and questions for their own subjects; marking written answers |
| Student | Sitting examinations for subjects they are enrolled in; viewing results |

**Constraints.**

- Desktop-first browser prototype; no server, no database, no network.
- Data persists in `localStorage`, so it is per-browser and per-machine.
- Passwords are stored in plaintext — acceptable for a prototype, unacceptable
  for production, and recorded as a limitation.
- All three roles must share one visual and interaction language, differing only
  by accent colour.

**Rules.**

- A dashboard may only be opened by a signed-in user holding that exact role.
- A session that names a deleted account is rejected and cleared.
- Identity is taken from the session, never from the URL or a form field.
- Logging out clears the session.

---

## Module 1 — Creation of assigned faculty and subjects

**Primary user.** Admin.

**Goal.** Maintain the master records the rest of the system depends on.

**Inputs.**

| Record | Fields |
|---|---|
| Faculty | ID, last name, first name |
| Student | Unique ID, last name, first name, and per-subject section enrolments |
| Subject | Code, name |

Bulk input is also accepted as CSV, previewed before saving.

**Outputs.** Tables of each record type with edit and delete actions; dashboard
counts; automatically created login accounts.

**Rules.**

1. Every field except student sections is required.
2. Identifiers are unique within their record type; duplicates are rejected with
   the reason shown.
3. Creating a person creates their login. The password is their surname with
   spaces removed, followed by the last three characters of their ID
   (`Dela Cruz` + `2024-00001` → `DelaCruz001`).
4. Changing an identifier rewrites every reference to it and migrates the login,
   so the person can still sign in and nothing is orphaned.
5. Deleting a record removes everything that depended on it, and the deletion
   dialog states what will be removed before it happens.
6. CSV rows that duplicate an existing record, or reference something that does
   not exist, are skipped and counted rather than imported.

**Constraints.** Identifier format is not validated beyond being non-empty and
unique; the prototype accepts any string as an ID.

---

## Module 2 — Subject allotment

**Primary user.** Admin. **Also affects** Faculty and Student views.

**Goal.** Decide who teaches what, and who studies what under whom.

**Inputs.**

- *Professor → Offering*: each section-subject offering has one professor; the same subject may have different professors in different sections.
- *Student → Offering*: students may use different sections per subject when irregular; the compact prototype dataset assigns 2–3 selected offerings per student.
- *Student → Subject*: a student, a subject, and a lecturer chosen from those
  assigned to that subject.

**Outputs.** Two allotment tables for the Admin; the "My Subjects" and
"My Students" views for Faculty; the "My Enrolled Subjects" list and the
examination list for the Student.

**Rules.**

1. A subject may be taught by more than one lecturer.
2. The lecturer chosen for a student's enrolment must already be assigned to that
   subject. The dropdown is filtered to valid choices, and the rule is re-checked
   on save.
3. A student may be enrolled on a given subject only once. Attempting a second
   enrolment under a different lecturer is refused, and the message explains that
   editing the existing entry performs a transfer.
4. Editing an allotment opens with the current values already selected.
5. A transfer updates every affected view — the previous lecturer stops seeing
   the student, the new one starts, and the student sees the new instructor.
6. Removing an allotment removes only that enrolment.

**Constraints.** Section-level targeting of exams is defined in the plan as a
*should demonstrate* item and is not implemented; exams reach students through
subject enrolment.

---

## Module 3 — Modifying questions

**Primary user.** Faculty.

**Goal.** Build and maintain the examination papers for their own subjects.

**Inputs.**

| Item | Fields |
|---|---|
| Exam | Subject, title, instructions, date, start time, end time |
| MCQ question | Text, points, two or more options, exactly one marked correct |
| Written question | Text, points, marking guide |

Questions may also be imported from a pipe-delimited file, previewed first.

**Outputs.** Exams grouped by subject; an ordered question list showing type,
points and the answer key; a full-paper preview.

**Rules.**

1. Subject, title, date, start and end are required.
2. The end time must be later than the start time.
3. A lecturer may only create exams for subjects assigned to them.
4. An MCQ needs at least two options, all non-empty, with exactly one marked
   correct. The correct answer is resolved by the option's position, so
   removing or reordering options cannot mis-key it.
5. Questions can be reordered, and the order shown to students is the order the
   lecturer sets. The first question cannot move up, the last cannot move down.
6. Changing a question's type replaces its type-specific data rather than leaving
   the old fields behind.
7. Deleting an exam deletes its questions and submissions; deleting a question
   names it in the confirmation.
8. The preview shows the paper as a student sees it, marks the answer key for
   proof-reading, and warns about any MCQ with no correct answer.

**Constraints.** The importer is pipe-delimited (`Question|mcq|A|B|C|index`)
rather than comma-delimited, because question text commonly contains commas.

---

## Module 4 — Conducting examinations

**Primary users.** Student (sitting), Faculty (marking).

**Goal.** Let a student answer a paper within its scheduled window, record the
answers reliably, mark what can be marked automatically, and give the rest to the
lecturer.

**Inputs.** Selected options for MCQs; typed text for written questions;
lecturer's marks and remarks afterwards.

**Outputs.** Examination list with live countdown and status; the answering view;
the review screen; a submission record containing every answer; auto-marked
score; transmuted percentage and 1.00–5.00 rating; instructor feedback.

**Rules.**

1. A student sees only exams for subjects they are enrolled in.
2. An exam can be opened only between its start and end times. The rule is
   enforced on the button *and* re-checked when the exam is opened.
3. Instructions, schedule, question count and total points are shown before
   answering.
4. Before submitting, every question and its answer is listed for review, with
   unanswered questions flagged in both text and colour.
5. Returning from review to the questions preserves everything already entered.
6. Submission requires an explicit confirmation, and a second confirmation if
   anything is unanswered.
7. A student may submit an exam once.
8. MCQs are marked automatically. Written answers are stored with no mark and
   flagged for the lecturer — they are never awarded marks automatically.
9. Marks entered by a lecturer must fall between zero and the points available;
   an invalid entry saves nothing.
10. A rating is shown only when every answer has been marked. Until then the
    student sees the marks so far, labelled as such, and a pending status.
11. Final percentage is `(score ÷ total × 50) + 50`, converted to the 1.00–5.00
    scale where 3.00 (75%) passes and 4.00/5.00 fail.

**Constraints.** There is no per-question timer or auto-submit at the end time; a
student already inside an exam when the window closes may still submit. Automatic
marking of written answers is listed as a future enhancement.

---

## Traceability

| Requirement group | Implemented in | Verified by |
|---|---|---|
| System-wide access control | `js/auth.js` | `tests/t_auth.js`, `tests/t_login.js` |
| Module 1 rules | `html/admin.html` | `tests/t_data.js`, `t_csv.js`, `t_pw.js` |
| Module 2 rules | `html/admin.html`, `html/faculty.html` | `tests/t_valid.js`, `t_edit.js`, `t_transfer.js`, `t_multi.js` |
| Module 3 rules | `html/faculty.html` | `tests/t_m3.js`, `t_m3b.js`, `t_valid.js` |
| Module 4 rules | `html/student.html`, `html/faculty.html` | `tests/t_m4.js`, `t_student.js`, `t_grade.js` |
| Grading conversion | `js/grading.js` | `tests/t_ui.js` |
| Shared states and dialogs | `js/ui.js`, `css/shared-ui.css` | `tests/t_states.js` |
