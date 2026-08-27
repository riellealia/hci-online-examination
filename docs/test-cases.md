# Test Cases and Results

Covers the final deliverable *"Module test cases and usability findings"* — the
test-case half. Usability findings require human participants and are handled
separately in `usability-protocol.md`.

## How these were produced

These are **not** hand-written test cases. Each line below was extracted from an
actual run of the automated suite in `../tests/`, which loads the real pages in a
headless browser, clicks the real controls, and reads the real `localStorage`. A
line appears here only because the assertion passed when the suite was run.

To reproduce:

```
cd tests
npm install jsdom
node run-all.js
```

**Result at time of writing: 267 assertions, 0 failures.**

## Coverage by module

| Module | Test files | Assertions |
|---|---|---|
| Foundation and authentication | `t_auth`, `t_login`, `t_states` | 59 |
| Module 1 — record creation | `t_data`, `t_csv`, `t_pw` | 35 |
| Module 2 — allotment | `t_valid`, `t_edit`, `t_transfer`, `t_multi` | 41 |
| Module 3 — questions | `t_m3`, `t_m3b` | 24 |
| Module 4 — examinations | `t_m4`, `t_student`, `t_grade` | 63 |
| Shared UI and grading | `t_ui` | 45 |

## A note on method

Several tests reproduce the original defective behaviour before asserting the
fix, so the assertion cannot pass vacuously. For example, the option-removal
test first demonstrates that the old logic saved a question with *no* correct
answer at all, then asserts that the current logic keeps the option the lecturer
marked.

---

## Detailed results

#### A. No session -> every dashboard is blocked
<sub>t_auth.js</sub>

- PASS — admin.html blocks anonymous access
- PASS — faculty.html blocks anonymous access
- PASS — student.html blocks anonymous access

#### B. Wrong role is blocked
<sub>t_auth.js</sub>

- PASS — student cannot open admin.html
- PASS — student cannot open faculty.html
- PASS — admin cannot open student.html

#### C. Correct role is allowed through
<sub>t_auth.js</sub>

- PASS — admin allowed
- PASS — faculty allowed
- PASS — student allowed

#### D. Deleted account cannot keep using an open session
<sub>t_auth.js</sub>

- PASS — session for a deleted user is rejected
- PASS — stale session cleared from storage

#### E. URL tampering no longer switches identity
<sub>t_auth.js</sub>

- PASS — shows the logged-in lecturer (F1 Maria)
- PASS — does NOT switch to F2 Jose via ?facultyId=
- PASS — cannot see another lecturer's exams

#### Q. CSV import: real file path
<sub>t_csv.js</sub>

- PASS — duplicate row skipped (was silently added with no login)
- PASS — new row imported
- PASS — login created for imported faculty
- PASS — password = surname + last 3 chars of ID (ID "F9" is only 2 chars)
- PASS — reports imported vs skipped

#### Q2. subjectAssignments merge into facultyIds
<sub>t_csv.js</sub>

- PASS — merged into the existing subject row, not duplicated
- PASS — both lecturers on one assignment
- PASS — no mixed singular/plural shape left behind

#### Q3. unmatched references rejected
<sub>t_csv.js</sub>

- PASS — unknown subject rejected
- PASS — unknown faculty rejected

#### F. Deleting faculty cascades
<sub>t_data.js</sub>

- PASS — login account removed (was able to log in before)
- PASS — faculty record removed
- PASS — subject assignment cleaned
- PASS — student enrolments cleaned
- PASS — their exams removed
- PASS — orphaned questions removed
- PASS — other lecturer's exam untouched

#### G. Deleting a subject cascades
<sub>t_data.js</sub>

- PASS — assignment removed
- PASS — enrolments removed
- PASS — exams removed
- PASS — questions removed

#### H. Deleting a student cascades
<sub>t_data.js</sub>

- PASS — login removed
- PASS — enrolments removed
- PASS — their results removed

#### I. Duplicate IDs rejected
<sub>t_data.js</sub>

- PASS — duplicate faculty ID not added
- PASS — user told why

#### J. Changing an ID migrates the login + all references
<sub>t_data.js</sub>

- PASS — old orphaned login removed
- PASS — new login created (before: none, locked out)
- PASS — password matches rule
- PASS — assignment follows the new ID
- PASS — enrolment follows the new ID
- PASS — exams follow the new ID

#### PP. Edit allotment opens populated (was blank)
<sub>t_edit.js</sub>

- PASS — student dropdown populated
- PASS — subject dropdown populated
- PASS — faculty dropdown populated
- PASS — current student preselected
- PASS — current subject preselected
- PASS — current lecturer preselected
- PASS — only lecturers assigned to SUB1 offered

#### QQ. Transfer to another lecturer
<sub>t_edit.js</sub>

- PASS — no duplicate created
- PASS — allotment transferred to F2
- PASS — admin table updated

*propagates to both faculty dashboards*

- PASS — F1 no longer sees the student
- PASS — F2 now sees the student

*and to the student view*

- PASS — still enrolled
- PASS — shows the new instructor only

#### RR. Edit faculty-subject assignment opens populated
<sub>t_edit.js</sub>

- PASS — subject dropdown populated (was blank)
- PASS — current subject preselected
- PASS — existing lecturers preselected
- PASS — saves without losing data

#### HH. Student submits a mixed exam
<sub>t_grade.js</sub>

- PASS — submission recorded
- PASS — MCQ auto-marked 10

#### II. Faculty results view
<sub>t_grade.js</sub>

- PASS — submitting student listed
- PASS — partial score shown
- PASS — pending count shown
- PASS — submitted tally shown

#### JJ. Grading a written answer
<sub>t_grade.js</sub>

- PASS — grading modal opens
- PASS — student's written answer visible to grader
- PASS — MCQ shown as already marked
- PASS — only the written answer is markable

*rejects an out-of-range mark*

- PASS — over-max mark rejected
- PASS — nothing written on invalid input

*accepts a valid mark*

- PASS — written mark saved
- PASS — final score = 10 auto + 7 manual
- PASS — marked as fully graded
- PASS — graded timestamp set
- PASS — overall remark saved
- PASS — per-question remark saved
- PASS — results view now shows Graded

#### KK. Student sees the graded result and feedback
<sub>t_grade.js</sub>

- PASS — exam listed in history
- PASS — final score shown
- PASS — status shows Final
- PASS — overall feedback shown to student
- PASS — per-question feedback shown to student

#### LL. Ungraded submission stays visibly pending
<sub>t_grade.js</sub>

- PASS — pending state shown, not a false final score
- PASS — partial score labelled "so far"

#### S. Credentials no longer exposed on screen
<sub>t_login.js</sub>

- PASS — no passwords rendered anywhere on the page
- PASS — credentials hint box gone
- PASS — username field is empty (was pre-filled)
- PASS — password field is empty (was pre-filled)

#### T. Clicking LOG IN on the blank form does nothing
<sub>t_login.js</sub>

- PASS — no session created from an empty form

#### U. Wrong credentials rejected
<sub>t_login.js</sub>

- PASS — bad password rejected
- PASS — inline auth error shown

#### V. Role cannot be crossed at login
<sub>t_login.js</sub>

- PASS — student creds rejected on the admin login

#### W. Correct credentials still work (typed, not pre-filled)
<sub>t_login.js</sub>

- PASS — admin logs in
- PASS — session stores no password
- PASS — faculty logs in with the seeded rule
- PASS — student logs in with the seeded rule

#### BB. Question reordering (plan: Module 3)
<sub>t_m3.js</sub>

- PASS — baseline order
- PASS — moved up correctly
- PASS — unknown id is a no-op
- PASS — still stable
- PASS — moved down correctly

#### CC. Reorder cannot run off the ends or touch other exams
<sub>t_m3.js</sub>

- PASS — moving first up is a no-op
- PASS — moving last down is a no-op
- PASS — other exam's questions untouched
- PASS — no questions lost or duplicated

#### DD. Reorder persists and renumbers the list
<sub>t_m3.js</sub>

- PASS — display renumbered after move
- PASS — first question cannot move up (button disabled)
- PASS — last question cannot move down (button disabled)

#### EE. Exam preview
<sub>t_m3.js</sub>

- PASS — preview opens
- PASS — exam title shown
- PASS — question count + total points
- PASS — all questions rendered
- PASS — answer key marked for proofing
- PASS — written-question marking guide shown
- PASS — correct options highlighted
- PASS — preview closes

#### FF. Preview warns about an unanswerable question
<sub>t_m3b.js</sub>

- PASS — flags an MCQ with no correct option

#### GG. Reordering actually changes what the student sees
<sub>t_m3b.js</sub>

- PASS — faculty moved BETA first
- PASS — student sees BETA as Question 1
- PASS — student sees ALPHA as Question 2

#### X. Schedule + total points shown (plan: Module 4)
<sub>t_m4.js</sub>

- PASS — question count shown
- PASS — total points shown
- PASS — schedule shown

#### Y. Review step lists answers and flags blanks
<sub>t_m4.js</sub>

- PASS — review screen shown
- PASS — question view hidden
- PASS — answered count correct
- PASS — unanswered count flagged
- PASS — final-submission warning present
- PASS — blank question visually marked
- PASS — non-colour indicator (text tag) present
- PASS — chosen MCQ option echoed back

#### Z. Back to questions preserves answers
<sub>t_m4.js</sub>

- PASS — returned to questions
- PASS — MCQ answer preserved
- PASS — newly typed answer picked up
- PASS — no blanks left

#### AA. Submit only happens from the confirm button
<sub>t_m4.js</sub>

- PASS — explicit final confirmation button
- PASS — nothing submitted just by reviewing
- PASS — submitted on confirm
- PASS — typed answer stored
- PASS — review screen cleared after submit

#### SS. Assigning multiple lecturers to one subject
<sub>t_multi.js</sub>

- PASS — faculty select accepts multiple
- PASS — both lecturers saved (previously only one survived)
- PASS — correct lecturers
- PASS — both shown in the table

#### Password rule consistency (realistic IDs)
<sub>t_pw.js</sub>

- PASS — CSV import strips spaces (was "Dela Cruz042" — could not log in)
- PASS — manual add uses the same rule
- PASS — faculty rule matches the login page hint (Reyes890)

#### XX. alert() is gone; toasts replace it
<sub>t_states.js</sub>

- PASS — no toast on a clean load
- PASS — toast appears on a validation failure
- PASS — typed as an error
- PASS — carries the message
- PASS — has a word, not just a colour (non-colour indicator)
- PASS — has an icon
- PASS — announced to screen readers
- PASS — can be dismissed
- PASS — dismiss removes it

*success toasts are distinguishable*

- PASS — import reports success, not error
- PASS — labelled Success

#### YY. Designed confirmation dialog replaces confirm()
<sub>t_states.js</sub>

- PASS — dialog rendered
- PASS — uses role=alertdialog
- PASS — marked modal
- PASS — names what is being deleted
- PASS — spells out the cascade
- PASS — warns it is irreversible
- PASS — destructive action styled as dangerous
- PASS — focus starts on Cancel, not Delete

*cancelling really cancels*

- PASS — record still present after Cancel
- PASS — dialog dismissed

*Escape cancels too*

- PASS — Escape leaves the record alone

*confirming proceeds*

- PASS — record deleted on confirm

#### ZZ. Accessible login error (plan: Foundation)
<sub>t_states.js</sub>

- PASS — error region exists
- PASS — role=alert
- PASS — aria-live=assertive
- PASS — hidden until needed
- PASS — empty form gives a specific message
- PASS — wrong password explained without leaking which field
- PASS — fields marked invalid
- PASS — error clears as soon as the user types
- PASS — aria-invalid cleared
- PASS — correct credentials still log in

#### K. No fabricated enrolments
<sub>t_student.js</sub>

- PASS — shows 0 subjects (was showing 3 fake ones)
- PASS — empty state shown
- PASS — no unrelated exams leaked

#### L. Exam window is enforced
<sub>t_student.js</sub>

- PASS — upcoming exam not launchable
- PASS — direct call blocked too
- PASS — closed exam not launchable
- PASS — direct call blocked too
- PASS — in-window exam IS open

#### M. Grading: written answers no longer auto-score full marks
<sub>t_student.js</sub>

- PASS — MCQ scored 10
- PASS — essay held for manual grading (was auto-awarded 10)
- PASS — score is no longer inflated to full marks
- PASS — auto-marked denominator excludes the essay

#### N. Answers are actually stored (were discarded)
<sub>t_student.js</sub>

- PASS — answers recorded
- PASS — essay text preserved for grading
- PASS — flagged for manual grading
- PASS — MCQ choice preserved

#### O. Cannot resubmit the same exam
<sub>t_student.js</sub>

- PASS — resubmission blocked

#### OO. Transferring an allotment updates every affected view
<sub>t_transfer.js</sub>

- PASS — transfer did not duplicate the record
- PASS — allotment now under F2
- PASS — admin table reflects the transfer

*faculty views*

- PASS — former lecturer F1 no longer sees the student
- PASS — new lecturer F2 now sees the student

*student view*

- PASS — student still enrolled in the subject
- PASS — student sees the new instructor
- PASS — old instructor no longer shown

#### TT. Profile menu on every dashboard
<sub>t_ui.js</sub>

- PASS — admin.html: avatar button present
- PASS — admin.html: initials "AD"
- PASS — admin.html: role accent set (data-role="admin")
- PASS — admin.html: panel starts closed
- PASS — admin.html: shows "Administrator"
- PASS — admin.html: enlarged hero avatar present
- PASS — admin.html: Settings + Log out present
- PASS — admin.html: old duplicate logout button removed
- PASS — faculty.html: avatar button present
- PASS — faculty.html: initials "MR"
- PASS — faculty.html: role accent set (data-role="faculty")
- PASS — faculty.html: panel starts closed
- PASS — faculty.html: shows "Maria Reyes"
- PASS — faculty.html: enlarged hero avatar present
- PASS — faculty.html: Settings + Log out present
- PASS — faculty.html: old duplicate logout button removed
- PASS — student.html: avatar button present
- PASS — student.html: initials "JC"
- PASS — student.html: role accent set (data-role="student")
- PASS — student.html: panel starts closed
- PASS — student.html: shows "Juan Cruz"
- PASS — student.html: enlarged hero avatar present
- PASS — student.html: Settings + Log out present
- PASS — student.html: old duplicate logout button removed

#### UU. Panel opens, closes, and Settings works
<sub>t_ui.js</sub>

- PASS — opens on click
- PASS — aria-expanded updated
- PASS — closes on click-away
- PASS — closes on Escape
- PASS — Settings dialog opens
- PASS — shows account details
- PASS — panel closed when Settings opened

#### VV. Transmuted grade shown to the student
<sub>t_ui.js</sub>

- PASS — 20/20 gives rating 1.00
- PASS — shows 100%
- PASS — history shows 1.00 Passed
- PASS — 0/20 gives rating 5.00
- PASS — floors at 50% (transmutation)
- PASS — history shows Failed
- PASS — scale reference available to student

#### WW. Rating withheld until written answers are marked
<sub>t_ui.js</sub>

- PASS — rating shows Pending while unmarked
- PASS — no rating number shown yet

*after the lecturer marks it*

- PASS — faculty sees no rating while pending
- PASS — 20/20 after marking
- PASS — faculty results now show 1.00
- PASS — student now sees final 1.00 Passed
- PASS — and the transmuted percentage

#### MM. Allotment validation (plan: Module 2)
<sub>t_valid.js</sub>

- PASS — exact duplicate enrolment rejected
- PASS — told why

*same subject, different lecturer*

- PASS — conflicting enrolment rejected
- PASS — explains the transfer path

*lecturer not assigned to the subject*

- PASS — invalid faculty/subject pairing rejected
- PASS — told why

*a genuinely valid allotment still saves*

- PASS — valid allotment accepted

#### NN. Exam schedule validation (plan: Module 3)
<sub>t_valid.js</sub>

- PASS — end-before-start rejected
- PASS — told why
- PASS — zero-length window rejected
- PASS — valid window accepted
