# Project Completion Checklist

Last reviewed: 2026-08-25

Status key: `[x]` complete, `[~]` partial or needs verification, `[ ]` not started.

Implementation items marked `[x]` below are backed by the automated browser-level
test suite described in `audit-log.md` (302 assertions, all passing — see `tests/`). Items that
depend on human judgement — visual design, usability findings, documentation —
are not claimed complete on the basis of automated tests.

## Foundation and authentication

- [x] Admin, Faculty, and Student login entry points
- [x] Credential and role validation
- [x] Cross-role dashboard protection
- [x] Logout clears the current session
- [x] Clear and accessible authentication error state
- [x] Correct all HTML paths to shared CSS, JavaScript, logo, and background assets

## Module 1 — Faculty and subject creation

- [x] Create, list, edit, and delete faculty records
- [x] Create, list, edit, and delete student records
- [x] Create, list, edit, and delete subject records
- [x] Reject missing required fields
- [x] Reject duplicate faculty, student, and subject identifiers
- [x] Keep related prototype records consistent after identifier changes or deletions
- [x] Complete Module 1 requirements analysis — `docs/requirements.md`
- [x] Complete Module 1 flowchart, ERD updates, and Admin storyboard — `docs/flowcharts.md`, `docs/data-model-erd.md`, `docs/storyboards.md`
- [x] Complete Module 1 interface/control and dialog designs — `docs/interface-design.md`
- [~] Complete Module 1 report section and test evidence — test evidence in `docs/test-cases.md`; report section still to be written

## Module 2 — Subject allotment

- [x] Assign exactly one professor to each section-subject offering; professors may handle the same or different subjects across sections
- [x] Seed 2–3 selected curriculum subjects per program/year and demonstrate irregular students using different sections per subject
- [x] Store Program and Year Level separately on every section and display both in the Section table
- [x] Standardize demo IDs: `YYYY-NNNNN` students, `NN-NNNNN-NNN` teachers, and `CCS/CIT/CIS` + three digits + `-YY` subject codes
- [x] Display section, subject, and professor assignments in Admin tables
- [x] Display relevant subjects and students in Faculty and Student views
- [x] Reject duplicate IDs and normalize legacy conflicting section/professor assignments
- [x] Edit and remove section/subject/professor relationships consistently across affected views
- [x] Complete Module 2 requirements analysis — `docs/requirements.md`
- [x] Complete Module 2 flowchart, ERD updates, and role storyboards — `docs/flowcharts.md`, `docs/data-model-erd.md`, `docs/storyboards.md`
- [x] Complete Module 2 interface/control and dialog designs — `docs/interface-design.md`
- [~] Complete Module 2 report section and test evidence — test evidence in `docs/test-cases.md`; report section still to be written

## Week 9 — Integration and usability review

- [~] Integrate and test Modules 1 and 2 as one workflow — automated cross-view integration covered by `tests/t_transfer.js`; human walkthrough not yet run
- [~] Review navigation, terminology, consistency, and role restrictions — documented in `docs/interface-design.md`; not yet reviewed with users
- [ ] Conduct representative usability tasks — protocol ready in `docs/usability-protocol.md`
- [ ] Record observations, problems, and design revisions

## Module 3 — Modifying questions

- [x] Faculty can view assigned subjects
- [x] Create, list, edit, and delete exams
- [x] Store exam subject, title, instructions, date, start time, and end time
- [x] Add, list, edit, and delete questions
- [x] Support multiple-choice and written-answer questions
- [x] Store question points and correct or expected answers
- [x] Validate every required exam field and schedule rule
- [x] Reorder questions
- [x] Preview a complete exam before use
- [x] Complete Module 3 requirements analysis — `docs/requirements.md`
- [x] Complete Module 3 flowchart, ERD updates, and Faculty storyboard — `docs/flowcharts.md`, `docs/data-model-erd.md`, `docs/storyboards.md`
- [x] Complete Module 3 interface/control and dialog designs — `docs/interface-design.md`
- [~] Complete Module 3 report section and test evidence — test evidence in `docs/test-cases.md`; report section still to be written

## Module 4 — Conducting examinations

- [x] Student can view enrolled subjects and relevant exams
- [x] Student can answer multiple-choice and written questions
- [x] Store submitted answers with the student and exam
- [x] Automatically score multiple-choice answers
- [x] Store written answers as pending manual grading
- [x] Show exam instructions, schedule, and total points clearly
- [x] Enforce the exact exam start and end times
- [x] Add answer review or question navigation before submission
- [x] Add a clear final-submission confirmation
- [x] Prevent duplicate submissions
- [x] Complete Module 4 requirements analysis — `docs/requirements.md`
- [x] Complete Module 4 flowchart, ERD updates, and Student/Faculty storyboards — `docs/flowcharts.md`, `docs/data-model-erd.md`, `docs/storyboards.md`
- [x] Complete Module 4 interface/control and dialog designs — `docs/interface-design.md`
- [~] Complete Module 4 report section and test evidence — test evidence in `docs/test-cases.md`; report section still to be written

## Shared HCI and visual design

- [x] Create shared design tokens and reusable components
- [x] Apply muted blue Admin accent
- [x] Apply muted teal Faculty accent
- [x] Apply muted green Student accent
- [x] Remove or consolidate conflicting page-level styles — competing colour literals cut from 41 to 14, and the 14 that remain are semantic status tints that must stay off-accent
- [x] Responsive layout for smaller screens — tables scroll in their own container, dialogs become full-width sheets, 640px and 400px breakpoints
- [x] Visible keyboard focus across interactive controls
- [x] Readable color contrast — all 13 token pairs verified at or above WCAG AA 4.5:1
- [x] Non-color indicators for all statuses — every status carries an icon or word alongside its colour
- [x] Consistent soft-rounded controls
- [x] One shared navigation model across all three roles
- [x] Success confirmation for every save action
- [x] Designed empty, success, validation, error and confirmation states — toasts, inline field errors and a designed confirm dialog replace every `alert()`/`confirm()`

## Optional and future work

- [x] CSV import preview flows
- [x] Manual grading and remarks
- [x] Grade and score history
- [ ] Search, filtering, and sorting
- [ ] Upcoming-work calendar and due-today reminders
- [x] Exam-details screen with passing grade, item count, attempts, timing, and review rules
- [x] Faculty-configurable one-question or all-questions layout
- [~] Responsive Faculty authoring navigation: editor actions and mobile bottom bar implemented; wider general-exam side rail remains
- [x] Full-width question editor with optional second-column settings inspector
- [x] Per-question autosave with visible saving, saved, and failure states
- [x] Save/Discard/Continue prompt for unsaved general settings
- [~] Impact confirmation for changes affecting submitted attempts; publishing and active-draft coverage remain
- [x] Previous/Next navigation, question navigator, and Faculty navigation policy
- [~] Autosave, refresh recovery, and visible save state implemented; offline warning/retry remains
- [x] Separate availability window and attempt-duration timer
- [x] Flagged-question workflow
- [x] Student question reporting and Faculty-scoped review, resolution notes, status filtering, resolution, dismissal, reopening, and confirmed Student notifications
- [x] Faculty independently controls submitted answers and feedback plus immediate, after-deadline, after-grading, chosen-date, or never release policies where applicable
- [~] Section-specific schedules, access, and individual accommodations — unique section records, student membership, section-subject assignment, and inherited Student access are complete; per-section schedules and individual accommodations remain
- [x] True/False, numeric-with-tolerance, fill-in-the-blank, matching, and accessible image-based drag-and-drop
- [x] Question images, links, alternative text, URL/file-type validation, preview, and broken-media states
- [ ] Optional focus and integrity monitoring with disclosed limitations
- [~] Admin inspector, bulk-selection, import-impact, and reversible-action patterns — focused Student and Faculty profiles with identity, relationships, performance, activity, and login details are complete; other record inspectors and bulk/reversible patterns remain
- [~] Faculty question-list search/type filtering, deep-copy duplication, and continuous totals complete; bulk and validation-state actions remain
- [x] Publish review with draft-only Student hiding, question/grading/media validation, Student preview, impact summary, cancellation, and explicit confirmation
- [~] Student resume prompt implemented; notification center and exam filters remain
- [ ] Report-management and optional grading inspectors
- [ ] Results release, retake, reset, regrade, and export impact previews
- [ ] Exam and question snapshots with version history
- [~] Cross-role application audit log: global Admin view and scoped Faculty view — successful logins, Admin record changes, Faculty exam creation/updates, Student submissions, and took/did-not-take participation are in the Admin view; scoped Faculty view and further event coverage remain
- [ ] Personal Student attempt/activity history without administrative events
- [ ] Audit filters, controlled event names, reasons, outcomes, retention, and export permissions
- [ ] Extract inline page behavior into feature-based JavaScript modules
- [ ] Centralize storage, authentication, authorization, validation, dates, and identifiers
- [ ] Give each data collection one repository owner
- [ ] Separate exam, question, attempt, grading, allotment, report, and audit domain services
- [ ] Build reusable navigation, inspector, dialog, table, timer, and save-state components
- [ ] Remove duplicated business rules, global mutable state, and direct page storage writes
- [ ] Add unit, permission, repository, controller, and end-to-end test boundaries
- [ ] Document module responsibilities and dependency direction
- [ ] Advanced analytics and exports
- [ ] Full XLSX, DOCX, and PDF import

## Final deliverables

- [x] Requirements analysis for all four modules
- [x] Main and module-level flowcharts
- [x] Complete ERD
- [x] Admin, Faculty, and Student storyboards
- [x] Interface and control designs
- [x] Form, validation-state, and dialog-box designs
- [~] Test cases and usability findings — 267 documented cases in `docs/test-cases.md`; usability findings still to be gathered
- [ ] Screenshots for every completion criterion
- [ ] Final project report
