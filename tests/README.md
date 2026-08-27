# Automated test evidence

These tests load the **real pages** from `../html/` in a headless browser
(jsdom), click the real controls, and read the real `localStorage`. They are
not mocks of the application — a test only passes if the page itself behaves.

They exist to supply the *test evidence* required by each module in
`.plans/plan.md`, and to back the `[x]` items in
`.plans/progress/checklist.md`.

## Running them

```
cd tests
npm install jsdom      # once
node run-all.js
```

Run a single file with `node t_grade.js`.

## What each file covers

| File | Area | Covers |
|---|---|---|
| `t_auth.js` | Foundation | Anonymous and wrong-role access blocked on all three dashboards; deleted accounts cannot keep a session; `?facultyId=` tampering cannot switch identity |
| `t_login.js` | Foundation | Credentials not exposed, no auto-fill, wrong password rejected, role cannot be crossed, valid logins still work |
| `t_states.js` | Foundation / Shared UI | Toast notifications, the designed confirmation dialog (cancel, Escape, confirm), and the accessible inline login error |
| `t_data.js` | Module 1 | Cascading deletes, duplicate identifiers rejected, identifier changes migrating logins and every reference |
| `t_csv.js` | Module 1 / optional | CSV import de-duplication, merging, and rejection of unmatched references |
| `t_pw.js` | Module 1 | Password rule identical across manual entry and CSV import |
| `t_valid.js` | Modules 2 & 3 | Duplicate/conflicting allotments rejected; exam end-before-start rejected |
| `t_edit.js` | Module 2 | Edit dialogs open populated; transfer works and propagates |
| `t_transfer.js` | Module 2 | A transferred allotment updates Admin, both Faculty views, and the Student view |
| `t_multi.js` | Module 2 | Assigning more than one lecturer to a subject |
| `t_m3.js`, `t_m3b.js` | Module 3 | Question reordering (including that students see the new order), exam preview, missing-answer-key warning |
| `t_m4.js` | Module 4 | Schedule and total points shown; answer review; blanks flagged; answers preserved on going back; explicit final confirmation |
| `t_student.js` | Module 4 | Enrolment accuracy, exam window enforcement, grading of written answers, no duplicate submission |
| `t_grade.js` | Module 4 / optional | Full submit → mark → student-feedback round trip, including mark validation |
| `t_ui.js` | Shared UI | Profile menu on every dashboard, role accents, and the transmuted grade / 1.00–5.00 rating |

## Notes

- `harness.js` loads a page with a seeded `localStorage` and inlines the shared
  scripts, because jsdom will not fetch them from disk.
- `r.confirmAll(fn)` drives the real confirmation dialog rather than stubbing it.
- Tests that assert a defect was fixed generally reproduce the original broken
  behaviour first, so the assertion cannot pass vacuously.
