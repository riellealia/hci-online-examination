# Project Completion Checklist

Last reviewed: 2026-09-02

Status key: `[x]` complete, `[~]` partial or needs verification, `[ ]` not started.

Implementation items marked `[x]` are backed by focused browser-level tests and
direct interface review. The 2026-09-02 complete-suite run reports 964 passing
and 6 failing assertions. The failures are stale UI-structure expectations in
three suites; see `audit-log.md`. Human usability findings are still not claimed
from automation.

## Foundation and authentication

- [x] Admin, Faculty, and Student login entry points
- [x] Credential and role validation
- [x] Cross-role dashboard protection
- [x] Admin dashboard Grid/List views saved per account, with an honest live client-side site-status panel
- [x] Logout clears the current session
- [x] Clear and accessible authentication error state
- [x] Correct all HTML paths to shared CSS, JavaScript, logo, and background assets
- [x] System Management page for announcements, maintenance mode, academic period, backup/restore, integrity checks, and account-access rules
- [x] Enforce maintenance mode, paused role access, disabled accounts, and configurable inactive-session expiry at authentication boundaries
- [x] Schedule, target, edit, archive, restore, and delete Admin announcements shown through the shared Inbox
- [x] Export and restore the complete browser-storage prototype as a versioned JSON backup
- [x] Present maintenance and role-login access settings as accessible, theme-aware toggle switches
- [x] Group Dashboard, System Management, and Audit Logs above a divider separating school controls

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
- [x] History-based Back behavior returns every role and nested detail page to the immediately previous screen
- [x] Success confirmation for every save action
- [x] Designed empty, success, validation, error and confirmation states — toasts, inline field errors and a designed confirm dialog replace every `alert()`/`confirm()`

## Optional and future work

- [x] CSV import preview flows
- [x] Manual grading and remarks
- [x] Grade and score history
- [x] Search, filtering, sorting, grouping, direction controls, and continuous scrolling
- [x] Upcoming-work list, grouped exam dates, live countdowns, and monthly calendar
- [x] Exam-details screen with passing grade, item count, attempts, timing, and review rules
- [x] Faculty-configurable one-question or all-questions layout
- [~] Responsive Faculty authoring navigation: editor actions and mobile bottom bar implemented; wider general-exam side rail remains
- [x] Full-width question editor with optional second-column settings inspector
- [x] Per-question autosave with visible saving, saved, and failure states
- [x] Save/Discard/Continue prompt for unsaved general settings
- [~] Impact confirmation for changes affecting submitted attempts; publishing and active-draft coverage remain
- [x] Previous/Next navigation, question navigator, and Faculty navigation policy
- [x] Draggable Student and Faculty question navigators open beside the handle and remain inside viewport bounds
- [x] Faculty question navigation is status-free while Student navigation retains answered and flagged states
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
- [~] Question-report management is complete; the optional dedicated grading inspector remains
- [ ] Results release, retake, reset, regrade, and export impact previews
- [ ] Exam and question snapshots with version history
- [~] Cross-role application audit log: global Admin and subject-scoped Faculty table views are complete; retention and export policy remain
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

## Course pages and weekly content

- [x] Clickable Faculty and Student subject/course pages
- [x] Full-width rows for professor, rules, schedule, weekly content, and exams
- [x] Collapsible weeks and individual content cells
- [x] Week editor for title, description, and contained learning cells
- [x] Text/Markdown, heading, external-link, and downloadable-attachment cells
- [x] Indefinite lock, scheduled opening, duration, and previous-cell prerequisite
- [x] Locked Student cells expose only their title and lock state
- [x] Three-dot week menu with labelled Edit and Remove actions
- [x] Three-dot menu on every editable cell with icon-labelled Delete, Move up, and Move down actions
- [x] Directly open examination details/questions by clicking an examination cell
- [x] Members and activity use compact tables and subtabs
- [x] Faculty-selected subject color and icon propagate to Faculty/Student cards and course-page hero profiles
- [x] Faculty and Student course-page tabs render directly below their hero profile

## Student subject and examination presentation

- [x] Use a two-column enrolled-subject grid without the Group by control
- [x] Show exam completion progress derived from each subject's current exam count
- [x] Use one examination per row in Faculty subject workspaces
- [x] Retain exactly two completed expired and two missed Student demo exams
- [x] Move other stale demo schedules into September 7–13 and migrate existing demo installations

## Repository and verification

- [x] Git repository initialized and complete project snapshot pushed to `origin/main`
- [x] `.env` included as requested
- [~] Reconcile six stale assertions identified by the 2026-09-02 full run (964 passing): one in `t_admin_modern.js`, one in `t_publish.js`, and four in `t_relationship_rules.js`

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
