# Usability Evaluation Protocol

Covers the Week 9 *"Integration and usability review"* and the findings half of
*"Module test cases and usability findings"*.

> **This document contains no results.** Usability findings must come from real
> participants using the prototype. The tables below are left blank for you to
> fill in during the sessions. Inventing findings would misrepresent the
> evaluation, and an examiner can usually tell.

---

## 1. Purpose

Establish whether each role can complete its core tasks without assistance, and
identify interface problems that automated tests cannot detect — confusion,
hesitation, misreading, and wrong mental models.

## 2. Participants

Aim for **five participants per role** — the point at which additional
participants mostly re-find known problems.

| Role | Recruit | Target |
|---|---|---|
| Admin | Anyone who maintains records (a classmate is fine) | 5 |
| Faculty | Someone who has set a test or quiz | 5 |
| Student | Classmates who have not seen this system | 5 |

Record only: role, familiarity with online exam systems (none / some / a lot),
and whether they use a screen reader or keyboard-only navigation.

## 3. Setup

1. Open the prototype in a fresh browser profile so no previous data exists.
2. Sign in once as Admin and seed a small realistic data set.
3. Reset between participants so each starts identically.
4. Have the participant think aloud. Do not help unless they are fully stuck;
   record the moment assistance was needed as a failure of that task.

## 4. Tasks

### Admin

| # | Task | Success means |
|---|---|---|
| A1 | Add a lecturer, a student, and a subject | All three exist in their tables |
| A2 | Assign **two** lecturers to one subject | Both appear against that subject |
| A3 | Enrol the student on the subject | Enrolment shows the right lecturer |
| A4 | Try to enrol the same student on the same subject again | They notice the refusal and understand why |
| A5 | Move that enrolment to the other lecturer | Transfer completes without a duplicate |
| A6 | Delete the lecturer | They read the dialog and can say what else will be removed |

### Faculty

| # | Task | Success means |
|---|---|---|
| F1 | Create an exam for one of your subjects | Exam saved with a valid window |
| F2 | Set the end time before the start time | They notice the rejection and correct it |
| F3 | Add one MCQ and one essay question | Both appear with correct points |
| F4 | Delete an MCQ option, then set the correct answer | The right option is marked correct |
| F5 | Move the essay question to the top | Order changes and renumbers |
| F6 | Check the paper before releasing it | They find and use **Preview Exam** unprompted |
| F7 | Mark a submitted essay and leave feedback | Status becomes Graded |

### Student

| # | Task | Success means |
|---|---|---|
| S1 | Find which exams you can sit today | They distinguish open from not-yet-open |
| S2 | Open an exam and answer the questions | All questions answered |
| S3 | Check your answers before submitting | They use the review step and spot the blank |
| S4 | Go back and answer the one you skipped | They realise answers were preserved |
| S5 | Submit | They understand the submission is final |
| S6 | Find your result and say whether you passed | They read the rating correctly |
| S7 | Explain what "3.00" means | They can state that it is the passing mark |

## 5. Recording

For each task:

| Field | Values |
|---|---|
| Outcome | Completed unaided / Completed with hesitation / Needed help / Failed |
| Time | Seconds |
| Errors | Count of wrong actions |
| Quote | Anything revealing they said aloud |

### Results table — copy per participant

| Task | Outcome | Time | Errors | Notes / quotes |
|---|---|---|---|---|
| A1 | | | | |
| A2 | | | | |
| A3 | | | | |
| A4 | | | | |
| A5 | | | | |
| A6 | | | | |

## 6. Post-task questions

Ask after all tasks, not during:

1. What, if anything, was confusing?
2. Was there a moment you were unsure whether something had saved?
3. Did any message not tell you what to do next?
4. *(Student)* Before submitting, were you confident about what would happen?
5. *(Student)* Did you understand your grade without asking anyone?
6. *(Faculty)* Did you trust that the answer key was correct?

Then a short SUS (System Usability Scale) if your report requires a score.

## 7. Accessibility pass

Do this once per role, without a mouse:

| Check | Expected |
|---|---|
| Tab through the whole page | Focus is always visible |
| Reach every control by keyboard | Nothing is unreachable |
| Open and close the profile menu | Enter opens, Escape closes |
| Trigger a validation error | Message announced and reachable |
| Open a delete dialog and press Enter immediately | **Nothing is deleted** — focus is on Cancel |
| Fail a login | Error announced by the screen reader |

Known gap to check: sidebar links in `admin.html` are `<a>` elements without
`href`, so they may still not receive keyboard focus. Record what you observe.

## 8. Findings

Fill in after the sessions. One row per distinct problem.

| # | Problem observed | Participants affected | Severity | Heuristic violated | Proposed revision |
|---|---|---|---|---|---|
| 1 | | /15 | | | |
| 2 | | /15 | | | |

**Severity:** 1 cosmetic · 2 minor · 3 major · 4 prevents task completion.

**Heuristics** (Nielsen): visibility of system status; match with the real world;
user control and freedom; consistency and standards; error prevention;
recognition over recall; flexibility; aesthetic and minimalist design; help users
recognise and recover from errors; help and documentation.

## 9. Revisions

Record what you changed in response, and add an entry to
`.plans/progress/audit-log.md` for each change.

| Finding # | Change made | Files | Re-tested |
|---|---|---|---|
| | | | |
