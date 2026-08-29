# Project Audit Log

## 2026-08-29 — Student exit confirmation and Faculty question access

- **Student Subject page:** Added a direct click fallback to every subject-specific exam cell while retaining shared exam-cell navigation.
- **Attempt actions:** Replaced the separate draft-exit footer action with `Save & Submit Exam`, which opens the answered/unanswered review before final submission.
- **Leaving:** The exam header exit now opens the Save Draft and Exit confirmation whenever an attempt is active.
- **Faculty Course Page:** Exam cells now open their question bank; separate Questions and Settings icons remain available per cell.
- **Faculty exam lists:** Added a visible Questions icon beside the settings menu in both all-exam and subject-filtered views.

## 2026-08-29 — Last-question review and post-submit routing

- **Last question:** Replaced the disabled Next control with an enabled `Review & Submit` action.
- **Confirmation:** The action captures the current answer and opens the full answered/unanswered review; it does not submit or exit immediately.
- **Final submission:** Only `Confirm & Submit Final` records the attempt.
- **After submission:** The exam workspace closes and the dedicated score/review page opens automatically, respecting Faculty score and answer-release settings.
- **Coverage:** Added checks for button state, completeness review, non-submission before confirmation, saved submission, and automatic result routing.

## 2026-08-29 — Unified Student exam-cell navigation

- **Area:** Subject pages, My Examinations, overview schedule, monthly calendar, always-open examinations, and the compatibility exam table.
- **Behavior:** Every non-Results exam cell now uses one delegated mouse and keyboard interaction that opens the shared exam-details prompt.
- **Results exception:** Result cells retain their dedicated answer-review page instead of opening the exam briefing.
- **Actions:** Start, resume, retake, saved-draft review, and completed-answer review remain governed by the examination state and Faculty visibility settings.
- **Verification:** Added direct Subject-page and My Examinations cell-click regression coverage.

## 2026-08-29 — Report component cascade isolation

- **Cause:** Legacy report-card declarations and the semantic state rules shared one large stylesheet, allowing stale/colliding card styles to neutralize the visible border and retain the old flex-positioned status pill.
- **Fix:** Moved the final component contract into `css/report-status.css`, loaded after every Faculty stylesheet.
- **State contract:** Pending, Resolved, and Dismissed borders and pills read the same shared theme token; the component file contains no literal colors.
- **Position:** The Edit Question status pill is anchored to the report container's top-right corner with an exact child selector.
- **Scope:** Reports page, Edit Question, and Inbox report cells.

## 2026-08-29 — Report cascade, variable, and encoding audit

- **Area:** Reports page, Edit Question report context, Inbox report cells, and shared UI tokens
- **Borders:** Removed the intermediate report-color variable and bound Pending, Resolved, and Dismissed components directly to their shared semantic tokens, including hover/focus.
- **Layout:** Anchored the embedded Pending/Resolved/Dismissed pill to the report card's top-right corner.
- **Variables:** Defined five legacy compatibility aliases through current shared tokens; no unresolved shared-style variables remain.
- **Encoding:** Checked every live file under `html/`, `js/`, and `css/`; no mojibake sequences were found.
- **Verification:** Report, Inbox, and question-type suites pass.
- **Result:** Complete

## 2026-08-29 — Minimal answer-choice controls

- **Area:** Faculty multiple-choice question editor
- **Changed:** Removed repeated Correct labels and the instructional wording from the choices heading; selecting a radio now serves as the sole answer-key control.
- **Delete:** Replaced text/× removal controls with accessible red trash-can icons using the shared danger variable.
- **Files:** `html/faculty.html`, `css/shared-ui.css`
- **Verification:** Question editing and type suites pass.
- **Result:** Complete

## 2026-08-29 — Scoped semantic border enforcement

- **Area:** Reports page, Edit Question report card, and Inbox report cell
- **Changed:** Enforced each complete card outline at its real component scope using the same shared variable as its pill: Pending orange, Resolved green, Dismissed red.
- **Interaction:** Hover and keyboard focus retain the status color instead of switching to the Faculty teal accent.
- **Implementation:** No component-level status hex values; component rules consume shared light/dark theme tokens.
- **Files:** `css/shared-ui.css`, `html/faculty.html`, `tests/t_reports.js`
- **Verification:** Report and Inbox suites pass.
- **Result:** Complete

## 2026-08-29 — Variable-driven report status colors

- **Area:** Reports page, Edit Question report context, and shared Inbox report cells
- **Cause:** A generic hover rule replaced semantic report borders with the role accent, while duplicated literal colors made the cascade difficult to maintain.
- **Changed:** Centralized Pending, Resolved, and Dismissed foreground/surface colors as shared light/dark theme variables. Cards, pills, hover, and focus now consume the same status variables.
- **Cleanup:** Removed duplicated report and Inbox status hex declarations from component rules.
- **Files:** `css/shared-ui.css`, `html/faculty.html`, `tests/t_reports.js`
- **Verification:** Report and Inbox suites pass; regression checks cover variables and hover/focus color stability.
- **Result:** Complete

## 2026-08-29 — Unified report-card actions and resolution flow

- **Area:** Faculty Edit Question report context
- **Changed:** Embedded report cards now use the same content/action layout as the Reports page, including In review, Resolve, Dismiss, and Settings icon actions.
- **Flow:** Removed the always-visible resolution textarea; notes are requested only by the Resolve or Dismiss prompt, where they may be entered or skipped.
- **Files:** `html/faculty.html`, `css/shared-ui.css`
- **Verification:** Report workflow suite passes.
- **Result:** Complete

## 2026-08-29 — Corrected dark-mode report border override

- **Area:** Faculty Question Reports in dark mode
- **Cause:** A later legacy dark-surface rule applied a gray border with `!important`, overriding the semantic report-card border while leaving the pill colored.
- **Changed:** Added final status-specific overrides so the complete card border exactly matches the pill: orange Pending, green Resolved, and red Dismissed.
- **Files:** `css/shared-ui.css`, `html/faculty.html`
- **Verification:** Report suite passes and a regression assertion covers the final dark-mode override.
- **Result:** Complete

## 2026-08-29 — Matching report context and skippable resolution

- **Area:** Faculty Edit Question and report resolution dialog
- **Changed:** The embedded report now matches the Reports-page card structure and semantic full-border treatment.
- **Dialog:** Replaced the bottom Cancel button with a top-right close icon and added Skip, which changes status without requiring or sending a resolution note.
- **Files:** `html/faculty.html`, `js/ui.js`, `css/shared-ui.css`
- **Verification:** Question-report and shared dialog tests pass.
- **Result:** Complete

## 2026-08-29 — Report borders matched to status pills

- **Area:** Faculty report cards and related Inbox report cells
- **Changed:** Removed the thick left-edge treatment. Every report now has one uniform full border using exactly the status pill's foreground color: orange Pending, green Resolved, and red Dismissed.
- **Themes:** Matched colors are defined separately for comfortable light and dark theme contrast.
- **Files:** `css/shared-ui.css`, `html/faculty.html`
- **Verification:** Question-report and Inbox suites pass.
- **Result:** Complete

## 2026-08-29 — Persistent page and report focus

- **Area:** Shared role navigation and Faculty question reports
- **Changed:** Sidebar pages now persist in the URL and session state, so refreshing retains the current page across Admin, Faculty, and Student interfaces.
- **Reports:** Redirects to a report now retain the report ID in the URL and keep the exact report card visibly highlighted until navigation changes.
- **Files:** `js/ui.js`, `css/shared-ui.css`, `html/admin.html`, `html/faculty.html`, `html/student.html`
- **Verification:** Shared navigation, question-report, and Inbox suites pass.
- **Result:** Complete

## 2026-08-29 — Visible report status borders

- **Area:** Faculty question reports and Inbox report links
- **Changed:** Increased the full-border contrast and made the left status edge thicker for Pending (orange), Resolved (green), and Dismissed (red), including dedicated dark-theme colors.
- **Loading:** Added a stylesheet cache version to the Faculty page so browsers fetch the updated rules.
- **Files:** `css/shared-ui.css`, `html/faculty.html`
- **Verification:** Question-report and shared Inbox suites pass.
- **Result:** Complete

## 2026-08-29 — Higher-contrast Inbox count

- **Area:** Shared Inbox panel
- **Changed:** Increased the title count pill's size and font weight, with stronger red contrast and dedicated dark-theme coloring.
- **Files:** `css/shared-ui.css`
- **Verification:** Shared inbox tests pass.
- **Result:** Complete

## 2026-08-29 — Full report status borders

- **Area:** Faculty reports and related-report mail cells
- **Changed:** Extended each semantic status accent around the complete card border while retaining a stronger left edge: orange Pending, green Resolved, and red Dismissed.
- **Themes:** Used softened border shades separately for light and dark modes.
- **Files:** `css/shared-ui.css`
- **Verification:** Question-report and shared inbox suites pass.
- **Result:** Complete

## 2026-08-29 — Related report in mail context

- **Area:** Shared inbox message prompt and Faculty reports
- **Changed:** Gave the Close action a visible muted-gray treatment in both themes. Messages associated with a question report now show a compact related-report cell inside the prompt.
- **Navigation:** Clicking the related-report cell closes the prompt, opens the Faculty Reports page, selects the correct status tab, scrolls to the report, and briefly highlights it.
- **Files:** `js/ui.js`, `html/faculty.html`, `css/shared-ui.css`, `tests/t_inbox.js`
- **Verification:** Shared inbox, question-report, and navigation suites pass.
- **Result:** Complete

## 2026-08-29 — Inbox-title count pill

- **Area:** Shared header inbox
- **Changed:** Added a compact pending-count pill directly beside the Inbox title. It updates with individual reads and disappears after Read all.
- **Files:** `js/ui.js`, `css/shared-ui.css`, `tests/t_inbox.js`
- **Verification:** Shared inbox tests pass.
- **Result:** Complete

## 2026-08-29 — Simplified inbox header

- **Area:** Shared header inbox
- **Changed:** Removed the duplicated pending-count text from the Inbox panel header. The compact count badge remains on the mail icon.
- **Files:** `js/ui.js`
- **Verification:** Shared inbox tests pass.
- **Result:** Complete

## 2026-08-29 — Larger header inbox icon

- **Area:** Shared role headers
- **Changed:** Enlarged the borderless mail icon and moved its pending-count pill to overlap the icon's bottom-right corner.
- **Files:** `css/shared-ui.css`
- **Verification:** Shared inbox and navigation suites pass.
- **Result:** Complete

## 2026-08-29 — Faculty-style Student subject cards

- **Area:** Student My Subjects
- **Changed:** Rebuilt Student subject cards using the Faculty course-card visual language: course icon, colored code, title, directional arrow, left accent, count pills, and a subtle decorative ring.
- **Metadata:** Replaced the section pill with the assigned professor's name and retained a subject-specific examination count.
- **Themes:** Added coordinated light and dark treatments with rotating muted course accents.
- **Files:** `html/student.html`, `css/shared-ui.css`, `tests/t_student.js`
- **Verification:** Student workflow, shared UI/theme, responsive, and rich demo-data suites pass.
- **Result:** Complete

## 2026-08-29 — Theme-aware report status accents

- **Area:** Faculty question-report cards
- **Status mapping:** Open and In Review now display as Pending; Resolved and Dismissed retain their names.
- **Visual treatment:** Anchored the status pill to the card's upper-right corner. Only the pill and left border carry status color: muted orange for Pending, green for Resolved, and red for Dismissed.
- **Themes:** Added separate softened light- and dark-theme color values for comfortable contrast without tinting the entire card.
- **Files:** `html/faculty.html`, `css/shared-ui.css`, `tests/t_reports.js`
- **Verification:** Question-report and responsive suites pass.
- **Result:** Complete

## 2026-08-29 — Shared inbox read state and replies

- **Area:** Shared Admin, Faculty, and Student header inbox
- **Changed:** Made the mail icon borderless and placed its pending-count pill beside the icon. Added a clickable Read all control that clears unread highlights and the header ping.
- **Persistence:** Read receipts are stored per signed-in account, so reading another user's inbox does not affect the current account.
- **Message workflow:** Clicking mail opens its full context in a prompt. Faculty can reply to Students, and Students can reply to Faculty; report notifications retain their Faculty sender.
- **Files:** `js/ui.js`, `html/faculty.html`, `css/shared-ui.css`, `tests/t_inbox.js`
- **Verification:** Dedicated inbox tests and navigation, reporting, Student workflow, and rich demo-data suites pass.
- **Result:** Complete

## 2026-08-29 — Linked report identities and subjects

- **Area:** Faculty question reports
- **Changed:** Made each reporter name a student-profile link and made both the subject code and subject name links to the corresponding Faculty Course Page.
- **Interaction:** Link clicks no longer trigger the report card's question-editor action.
- **Files:** `html/faculty.html`, `css/shared-ui.css`, `tests/t_reports.js`
- **Verification:** Question-report, Faculty Course Page, and responsive suites pass.
- **Result:** Complete

## 2026-08-29 — Return from reported-question editing

- **Area:** Faculty question reports and question editor
- **Changed:** Opening a question from a report now records Question Reports as its origin. Desktop Back, mobile Back, and saving return to that report page instead of exposing the intermediate Question Bank.
- **State:** The selected report status tab and sorting choices remain active after returning.
- **Files:** `html/faculty.html`, `tests/t_reports.js`
- **Verification:** Question-report, authoring, and navigation suites pass.
- **Result:** Complete

## 2026-08-29 — Consistent browser title

- **Area:** Application shell
- **Changed:** Standardized every public and role page browser title to `Online Examination`.
- **Files:** `html/index.html`, `html/login.html`, `html/admin.html`, `html/faculty.html`, `html/student.html`
- **Verification:** Confirmed the Faculty page is served locally on port 8000 and all five documents contain the new title.
- **Result:** Complete

## 2026-08-29 — Question report status tabs and sorting

- **Area:** Faculty question reports
- **Changed:** Removed the redundant open-report total and status dropdown. Added transparent underline tabs for All, Pending, Resolved, and Dismissed, each with a live count pill.
- **Status mapping:** Pending combines reports that are newly open and already in review so active concerns stay in one queue.
- **Sorting:** Added Recent, Reporter name, Subject, Section, and Status sorting with a transforming ascending/descending icon.
- **Files:** `html/faculty.html`, `css/shared-ui.css`, `tests/t_reports.js`
- **Verification:** Question-report, navigation, and responsive suites pass.
- **Result:** Complete

## 2026-08-29 — Reporter-aware question report cards

- **Area:** Faculty question reports
- **Card structure:** Added the reporter's name, ID, class/section, and section subject in a compact header, followed by the reported question, a problem-type pill, and the student's description.
- **Visible actions:** Reduced each card to four icon controls: In review, Resolve, Dismiss, and Settings.
- **Resolution workflow:** Resolve and Dismiss now require a resolution note in a designed textarea dialog. In review remains a direct status action.
- **Settings menu:** Added View student profile, Mail student, View question, Block from reporting, and Copy ID.
- **Enforcement:** Blocking is stored per Faculty–Student relationship and prevents new reports for that professor's exams. Existing reports remain in history.
- **Compatibility:** Student profiles support both current enrollments and older allotment records.
- **Files:** `html/faculty.html`, `html/student.html`, `js/ui.js`, `js/question-reports.js`, `js/role-profile.js`, `css/shared-ui.css`, and report tests.
- **Verification:** Reporting, authoring, Faculty workspace, Student workflow, navigation, and responsive suites pass.
- **Result:** Complete

## 2026-08-29 — Simplified Faculty report actions

- **Area:** Faculty question reports and question editor
- **Changed:** Reduced each report row to an icon for opening the reported question plus In review, Resolve, and Dismiss actions. Removed the row-level Notify Student and Reopen controls.
- **Interaction:** The entire report cell opens the existing editable question workspace. A report-context cell appears above the question with its status, reporter, concern, and autosaving resolution note.
- **Layout:** Removed the always-visible resolution textarea from report rows so the queue remains compact.
- **Files:** `html/faculty.html`, `css/shared-ui.css`, `tests/t_reports.js`
- **Verification:** Question-report and question-authoring suites pass.
- **Result:** Complete

## 2026-08-29 — Complete question-report demonstration queue

- **Area:** Faculty question reports and demo data
- **Changed:** Expanded the seeded queue to 12 reports: three Open, three Reviewed, three Resolved, and three Dismissed.
- **Coverage:** Includes answer-key, wording, technical, missing-media, missing-choice, scoring, timer, accessibility, duplicate, no-issue-found, and out-of-scope examples.
- **Integrity:** Every report references an existing examination and question owned by the demo Faculty account.
- **Files:** `js/demo-data.js`, `tests/t_rich_seed.js`
- **Verification:** Exact 3/3/3/3 status distribution confirmed with zero invalid report references; rich seed and report workflow suites pass.
- **Result:** Complete

## 2026-08-29 — Shared header inbox and report status data

- **Area:** Admin, Faculty, and Student headers; Faculty reports
- **Changed:** Added a mail/inbox icon directly beside and before every profile avatar. Its panel combines role-relevant mail, question-report updates, and Admin announcements.
- **Faculty badge:** The Reports sidebar item shows a pill count for open reports belonging only to that professor's exams.
- **Demo data:** Added question reports in open, reviewed, resolved, and dismissed states, plus student mail, a report-resolution notice, and Admin announcements.
- **Privacy:** Faculty only receive reports and mail addressed to them; Students only receive their own report updates; Admin receives announcements and an aggregate report status.
- **Files:** `js/ui.js`, `js/demo-data.js`, `css/shared-ui.css`, `html/faculty.html`, and focused tests.
- **Verification:** Shared navigation, question reports, Student workflows, Admin cards, and rich demo-data suites pass.
- **Result:** Complete

## 2026-08-29 — Faculty roster subject context

- **Area:** Faculty student roster
- **Changed:** Added the selected subject's full name and code between the subject and section tab rows. The context updates with subject selection.
- **Files:** `html/faculty.html`, `tests/t_faculty_workspace.js`
- **Verification:** Faculty workspace suite passes, including roster tabs, subject context, profile navigation, and workspace workflows.
- **Result:** Complete

## 2026-08-29 — Student examination status tabs

- **Area:** Student examinations
- **Changed:** Added transparent underline tabs for Overview, Done, Pending, and Missed, with live count pills and functional list filtering.
- **Classification:** Submitted exams are Done, expired unsubmitted exams are Missed, and open or upcoming unsubmitted exams are Pending.
- **Files:** `html/student.html`, `tests/t_details.js`
- **Verification:** Examination details, grading, and responsive-layout focused suites pass.
- **Result:** Complete

## 2026-08-29 — Faculty dark-mode contrast repair

- **Area:** Faculty interface and shared theme
- **Changed:** Replaced remaining hard-coded light surfaces in faculty rosters, exams, question reports, question editing, previews, grading, and import panels with shared dark-theme surfaces and readable text colors.
- **Reason:** Faculty pages were displaying white panels with near-white text after dark mode was enabled.
- **Files:** `css/shared-ui.css`
- **Verification:** Faculty workspace/profile and the rest of the unaffected browser-level suites pass. The full runner retains older publish/relationship seed failures and one non-terminating legacy test unrelated to this CSS change.
- **Result:** Complete

## 2026-08-29 — Admin dashboard overview and live status

- **Area:** Admin dashboard
- **Changed:** Added account-persisted Grid and List views plus a compact status panel before the management cards.
- **Status signals:** Reports honest client-side information: browser online/offline state, interface availability, CSV/browser-storage data mode, and live local time. It does not imitate unavailable backend CPU, memory, or server metrics.
- **Monitoring:** Added live charts for measured interface response time, browser-storage size/record count, and available browser connection quality. Unsupported network details are labeled unavailable instead of being fabricated.
- **Controls:** Added Start, Restart, and Stop controls for the client-side monitoring session, and moved the Grid/List switch directly above the management cards.
- **Layout correction:** Monitoring now appears before the compact status cells. Its light surface is used in light mode and the dark monitoring style is limited to dark mode. The redundant visible Site status heading was removed.
- **Management shortcuts:** Reworked the plain 5+1 card arrangement into a balanced 3-by-2 grid with concise descriptions, subtle Admin-blue accent variants, improved depth, and clearer hover/focus feedback. List view remains available.
- **Responsive design:** Status cells reduce from four columns to two and then one; List view also adapts for narrow screens. Light and dark themes are supported.
- **Verification:** Dashboard, Admin visual, responsive-layout, and shared-navigation focused suites pass.
- **Result:** Complete

This file records meaningful changes to the plan, implementation, testing, and documentation. Add new entries at the top of the log.

## 2026-08-29 — Faculty subject-card visual refresh

- **Area:** Faculty My Subjects
- **Changed:** Replaced plain code/title tiles with fully clickable modern course cards containing a course icon, directional affordance, handled-section count, exam count, subtle varied accents, stronger hover depth, and responsive spacing.
- **Themes:** Added coordinated light and dark treatments without introducing separate Open buttons.
- **Verification:** Faculty workspace, shared profile/theme, and navigation focused suites pass.
- **Result:** Complete
- **Follow-up:** Converted Faculty subject and section selectors from bordered pills to transparent underline tabs with an accent underline, hover state, keyboard focus, and horizontal overflow support.
- **Roster and profiles:** Added the missing My Students page title/description and Subjects/Sections tab labels. Entire Faculty roster rows now open role-scoped Student profile pages. Faculty can only open students within the selected handled offering and only sees relevant academic records. Student subject pages list classmates, but fellow-student profiles expose only shared class context and explicitly hide grades, submissions, activity, login details, and credentials.

## 2026-08-27 — Course pages, weekly content, and GitHub checkpoint

- **Area:** Faculty and Student course pages, learning content, regression evidence, repository
- **Changed:** Added full-width subject rows, collapsible weeks and cells, realistic lessons, external links, downloadable attachments, cell availability rules, prerequisites, complete week editing, and three-dot Edit/Remove menus. Members and Logs now use compact tables and subtabs. Exam editing now includes eligible sections and a Questions shortcut.
- **Repository:** Initialized Git on `main`, included `.env` as requested, committed the full local project, and pushed commit `e4c0f0d` to `https://github.com/riellealia/hci-online-examination`.
- **Verification:** Focused workspace and related suites pass. The full-suite audit is not green: `t_publish.js` has one stale assertion, `t_relationship_rules.js` has three stale assertions, and `t_m3.js` crashes after ten passing checks because it expects the previous always-visible reorder controls.
- **Result:** Feature work is complete; regression-test reconciliation remains open. Earlier all-passing totals are superseded by this audit.

## 2026-08-26 — Removed redundant Next pills

- **Area:** Student overview upcoming examinations
- **Changed:** Removed the repeated `Next` status pills while retaining date headings, left-aligned exam titles, and right-aligned countdowns.
- **Reason:** The surrounding Next up panel and date groups already communicate that these exams are upcoming.
- **Verification:** Full automated suite — 772 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-26 — Added professor email actions and a dedicated review page

- **Area:** Student subject, overview, and result pages
- **Changed:** Added right-aligned email-composer icons beside professors, compacted completed-exam summaries into balanced horizontal rows, moved answer review to an internal page that is absent from the sidebar, and aligned upcoming exam titles left with deadlines at the right.
- **Reason:** Reduce wasted vertical space and give reviewing answers a focused page-level experience.
- **Verification:** Full automated suite — 771 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-26 — Made remark highlights clear after review

- **Area:** Student My Examinations
- **Changed:** Remark highlighting now represents unread feedback. Opening an exam’s Review removes its warm background and Remark badge, restores the standard row appearance, and remembers that state for the student while keeping the feedback accessible in Results.
- **Reason:** Reviewed remarks should not continue looking like unread notifications.
- **Verification:** Full automated suite — 769 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-26 — Made the question navigator handle draggable

- **Area:** Student examination workspace
- **Changed:** The collapsed question-navigation tab can now be dragged anywhere within the viewport, distinguishes dragging from opening, remembers its last position, remains constrained on screen, and opens its full panel safely from the right edge.
- **Reason:** Let students move the floating control when it overlaps a question or answer.
- **Verification:** Full automated suite — 768 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-26 — Aligned student question controls

- **Area:** Student examination workspace
- **Changed:** Corrected the question navigator’s visually-hidden text, reduced its closed handle to a clean icon, left-aligned radio controls with their answer labels, placed icon-only Flag and Report controls together in the question header, and limited the footer to equal-width Previous and Next buttons.
- **Reason:** Remove exposed helper text and make question answering and navigation more consistent and scannable.
- **Verification:** Full automated suite — 767 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-26 — Reduced and redesigned question feedback

- **Area:** Student completed-answer review and Maria Santos demo data
- **Changed:** Removed meaningless `Correct` remarks from correctly answered demo questions. Genuine professor notes now appear in a separate warm callout, text and fill-in answers use aligned answer cells, and matching questions show readable selected and correct pairings instead of numeric indexes or `Instructor graded`.
- **Reason:** Feedback should be selective, readable, and visually distinct from the student and correct answers.
- **Verification:** Full automated suite — 764 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-26 — Highlighted examinations with professor remarks

- **Area:** Student My Examinations and answer review
- **Changed:** Completed examination rows with released overall or per-question feedback now use a warm highlight and a visible `Remark` badge beside their score and action. Confirmed that fill-in-the-blank questions already support authoring rules, autosave, automatic grading, and reviewed answers.
- **Reason:** Help students notice feedback without opening every completed examination.
- **Verification:** Full automated suite — 763 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-26 — Simplified the student examination list

- **Area:** Student My Examinations
- **Changed:** Replaced the large subject-grouped exam cards with compact rows, moved the single contextual action to the right, derived item counts from the real question records, and added released scores to completed exams. Open, upcoming, completed, missed, and retake states remain visible without explanatory clutter.
- **Reason:** Make scheduled examinations faster to scan and fix misleading `0 items` labels.
- **Verification:** Full automated suite — 762 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-26 — Added an incorrect-answer review demonstration

- **Area:** Maria Santos demo results and answer-review styling
- **Changed:** Added the completed `Human-Computer Interaction — Incorrect Answers Review Demo`, containing eight questions, a 50% graded score, alternating correct and incorrect saved responses, released answers, and corrective feedback. Wrong selected choices are styled in red and correct answers in green. Bumped demo data to version 14 for automatic refresh migration.
- **Reason:** Provide an obvious demonstration of how failed answers and corrections appear during review.
- **Verification:** Full automated suite — 761 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-26 — Connected Student toolbar controls to cards

- **Area:** Student Examinations, Results, and Subjects controls
- **Changed:** Added a separate card-tool adapter so the existing search, sort, ascending/descending, and grouping controls operate on the visible card collections rather than only the hidden compatibility tables. Group headings include visible item counts.
- **Reason:** The controls appeared interactive but previously produced no visible change after the pages moved from tables to cards.
- **Verification:** Full automated suite — 760 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-26 — Replaced Start Exam with completed-exam review

- **Area:** Student examination briefing and Results navigation
- **Changed:** A briefing for an exam whose attempt limit has been reached now shows Review this exam instead of a disabled Start Exam. The action closes the briefing, opens My Results, expands the matching subject and examination, and reveals the answer review. When the professor has disabled answer review, the action clearly says Review unavailable.
- **Reason:** Completed assessments should lead to review rather than suggesting they can be started again.
- **Verification:** Full automated suite — 757 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-26 — Enabled direct Student demo-data migration

- **Area:** Student startup and versioned demo data
- **Changed:** The Student page now runs the safe DemoData version check before reading local records. Existing open Maria sessions migrate from the older 2-subject/2-result data to the new 6-subject/13-exam/4-result dataset on a normal refresh, without requiring logout. Custom non-demo installations remain untouched.
- **Reason:** The previous migration only ran from Login or Admin, so an already-open Student page retained stale localStorage data.
- **Verification:** Full automated suite — 754 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-26 — Expanded Maria Santos's demonstration data

- **Area:** Versioned curriculum seed and Student demonstration account
- **Changed:** Expanded Maria Santos (`2025-00002`) from 2 to 6 enrolled subjects across BSCS, BSIT, and BSIS sections. Her dashboard now receives 13 relevant assessments and 4 completed examinations across 3 subjects. Replaced placeholder aggregate result rows with complete 7–19 item answer sets containing question IDs, choices/responses, awarded marks, correct-answer release, remarks, and grading state. Updated the enrollment CSV and bumped the demo-data version so existing demo installations migrate on login.
- **Reason:** Provide a convincing, populated demonstration of subject cards, examination scheduling, grouped results, and answer review.
- **Verification:** Full automated suite — 752 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-26 — Integrated expandable result reviews

- **Area:** Student My Results
- **Changed:** Made subject result cards and individual completed examinations independently expandable and collapsible. Expanded exams show their schedule, duration, passing grade, and submission details. Added a permission-aware Review button that reveals questions, choices, the student's selected answer, correct answers when released, and professor feedback. Removed the separate visible answer-review area below Results.
- **Reason:** Keep exam details and answer review attached to the correct completed-exam cell and replace any completed-exam action with Review.
- **Verification:** Full automated suite — 752 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-26 — Simplified Student subject navigation and clarified Faculty sections

- **Area:** Student subject page
- **Changed:** Removed the redundant Subject Details sidebar entry and duplicate Subject information cell. Subject identity remains in the page hero, and each professor now lists the section or sections they handle.
- **Reason:** Remove duplicate navigation/content and make teaching responsibility explicit.
- **Verification:** Full automated suite — 747 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-26 — Added modular Faculty subject workspaces

- **Area:** Faculty subjects, learning content, section oversight, grades, and logs
- **Changed:** Made Faculty subject cards open a dedicated workspace implemented in separate CSS and JavaScript modules. Added Main, Members, Grades, and Logs tabs; weekly editable Markdown-style cells; file attachments; exam creation access; handled-section selection; student lists and Student-view preview; section score/pass/fail/missed tables; and separate Faculty/Student activity logs. Published weekly cells also appear on the actual Student subject page. Student exam-detail opens and attempt starts are now audited.
- **Reason:** Provide one organized course-level workspace without expanding the existing Faculty HTML into a monolithic implementation.
- **Verification:** Full automated suite — 746 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-26 — Added clickable Student subject pages

- **Area:** Student My Subjects and navigation
- **Changed:** Made every enrolled-subject card clickable and added a dedicated responsive Subject Details page. The page separates the subject description, professor assignment, examination rules, schedule summary, and clickable examinations into individual cells. Added Subject Details to the Student sidebar and retained the selected subject context.
- **Reason:** Let students move from their subject list into a focused course-level view before opening an examination.
- **Verification:** Full automated suite — 728 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-26 — Converted My Subjects to subject cards

- **Area:** Student My Subjects
- **Changed:** Replaced the visible subject table with a responsive card grid. Each cell displays the subject code, complete subject name, enrolled section, and assigned instructor.
- **Reason:** Make a small personal subject list easier to scan and consistent with the Student portal's subject-based organization.
- **Verification:** Full automated suite — 725 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-26 — Redesigned the Student examination workspace

- **Area:** Student examination runner and question reporting
- **Changed:** Converted the examination from a centered prompt into a full-viewport page workspace with a sticky aligned header, restrained typography, wider question spacing, icon-led actions, a bottom action dock, and improved answer fields. Moved Report Question into the question toolbar and repaired the report form's textarea and action alignment.
- **Reason:** Reduce clutter and compression while making the high-focus examination flow feel like a dedicated page.
- **Verification:** Full automated suite — 723 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-25 — Grouped Student examinations and results by subject

- **Area:** Student Examinations and My Results
- **Changed:** Replaced the visible flat examination and result tables with responsive subject cards. Each subject card contains its examinations, while Results displays one combined subject rating calculated from finalized scores instead of repeating a rating for every exam.
- **Reason:** Match the academic structure and make related examinations easier to scan.
- **Verification:** Full automated suite — 721 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-25 — Added Student calendar, clickable overview, and live schedule

- **Area:** Student Overview and exam discovery
- **Changed:** Made all three overview statistics navigate to their corresponding pages. Made examination rows keyboard/click accessible. Rebuilt Next Up as date-grouped clickable exams with second-by-second countdowns. Added a responsive monthly calendar with previous/next navigation, clickable exam events that open the shared briefing, today highlighting, and a separate always-open exam list.
- **Reason:** Make exam discovery visual, time-aware, and actionable directly from the Student Overview.
- **Verification:** Full automated suite — 717 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-25 — Added an always-open 99-attempt practice exam

- **Area:** Student examination demonstration
- **Changed:** Added `Human-Computer Interaction — Always-Open Practice Exam` for `2BSCS-1`, with ten mixed questions, no opening date, no deadline, no timer, immediate results, and 99 attempts. Updated Student listing, briefing, and entry guards to count submissions against each exam's configured attempt limit instead of blocking after every first submission.
- **Reason:** Provide a reusable assessment that can be demonstrated repeatedly without changing dates or resetting data.
- **Verification:** Full automated suite — 712 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-25 — Opened a live assessment for the Student demonstration

- **Area:** Interactive Student demo
- **Changed:** Added an all-day `Data Structures and Algorithms — Live Demo Quiz` for section `2BSCS-1` on 2026-08-25. It has a 30-minute attempt limit and a mixed 5–20-item generated question set, while the same account retains its two historical graded attempts.
- **Reason:** Allow the named Student demo account to actively answer and submit an exam instead of only viewing seeded history.
- **Verification:** Full automated suite — 710 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-25 — Seeded a diverse semester of exams and participation

- **Area:** Exam demonstration content and analytics
- **Changed:** Generated 48 published assessments across all 24 subjects (1–3 each), 584 questions (5–20 each), durations from 30–120 minutes, and deadlines scattered from 2026-08-18 through 2026-09-24. Question sets rotate through multiple choice, true/false, numeric, fill-in-the-blank, matching, and essay formats. Eleven expired assessments have 475 submissions with approximately 20% failed, 10% missed, and 70% passed participation patterns.
- **Reason:** Make Student exams, Faculty management, Admin profiles, participation, grades, and performance graphs look like a system under realistic use.
- **Verification:** Full automated suite — 709 assertions passing, 0 failing. Tests enforce per-subject exam counts, duration/date/item ranges, format diversity, and expired-exam outcome ratios.
- **Result:** Complete

## 2026-08-25 — Added fixed, active Student and Faculty demonstration accounts

- **Area:** Demonstration credentials and realistic profile data
- **Changed:** Fixed the preferred Student login as `2025-00002 / santos2025` and Faculty login as `23-32534-345 / reyes23`. Connected both through Data Structures, added two published exams and graded Student submissions, and seeded twelve dated login, creation, publication, submission, and grade-release audit events.
- **Reason:** Ensure the accounts used during presentation have populated History, Grades, Actions, Login Details, exam, and performance views.
- **Verification:** Full automated suite — 703 assertions passing, 0 failing. Tests confirm credentials are prefilled and both profiles contain the intended activity.
- **Result:** Complete

## 2026-08-25 — Enabled one-click demonstration login

- **Area:** Authentication prototype and generated credentials
- **Changed:** Each role login page now prefills its first valid account, allowing entry with one Log In click. Student and faculty passwords use lowercase surname without spaces plus year level; unassigned faculty use year `0`. Admin remains `admin/admin123`. Manual creation, CSV imports, faculty reassignment, and versioned demo data use the same rule.
- **Reason:** Credentials are demonstration-only and should not obstruct interface evaluation.
- **Verification:** Full automated suite — 698 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-25 — Added profile avatars to Student and Faculty heroes

- **Area:** Admin profile identity
- **Changed:** Added circular initials avatars to the left of Student Profile and Faculty Profile text, with role-specific colors and responsive sizing.
- **Reason:** Strengthen the profile-page visual hierarchy and make the identity block easier to recognize.
- **Verification:** Full automated suite — 698 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-25 — Added unassigned-professor reporting and fixed profile scrolling

- **Area:** Faculty Management and Admin profiles
- **Changed:** Added a second Faculty table listing professors without any section-subject offering, including status, profile navigation, table tools, and CSV export. Added three unassigned demo professors. Constrained Student/Faculty profile pages to the viewport and enabled reliable internal vertical scrolling on desktop and mobile.
- **Reason:** Make staffing gaps visible and resolve the profile modal that could not scroll to content below the fold.
- **Verification:** Full automated suite — 696 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-25 — Fixed demo migration on direct Admin-page refresh

- **Area:** Demo-data initialization
- **Changed:** Admin now loads and runs the versioned demo installer before reading its data arrays, matching Login behavior.
- **Reason:** Directly refreshing `admin.html` previously retained the legacy 5/3/5 dashboard counts because migration only ran on `login.html`.
- **Verification:** A regression test loads Admin directly with the prior dataset and confirms 619 students are migrated and rendered. Full suite — 694 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-25 — Separated section ID components in the Admin interface

- **Area:** Section Management data presentation
- **Changed:** `3BSCS-1` is now explicitly interpreted and displayed as Year Level `3`, Curriculum `BSCS`, and Section `1`. Curriculum choices now read BSCS/BSIT/BSIS, the Section input accepts a positive number, and generated section records store `sectionNumber` separately.
- **Reason:** Make each component of the composite unique ID clear and independently usable for sorting and grouping.
- **Verification:** Full automated suite — 693 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-25 — Standardized numbered section IDs

- **Area:** Section identity and academic data
- **Changed:** Replaced trailing-letter IDs such as `BSCS-2A` and `BSCS-2B` with year-curriculum-number IDs such as `2BSCS-1` and `2BSCS-2`. Updated live demo generation, section metadata inference, form examples, student memberships, enrollment records, CSV assets, and tests.
- **Reason:** Use the requested `3BSCS-1` pattern and remove section letters from the end.
- **Verification:** No legacy trailing-letter IDs remain in either student asset. Full automated suite — 692 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-25 — Expanded the academic demonstration population

- **Area:** Canonical demo data and importable assets
- **Changed:** Added exactly 600 students and 20 faculty to the existing sample, producing 619 students and 28 faculty total. Students are distributed across CS, IT, IS, and all four year levels; regular and irregular students receive deterministic random-looking assignments of 2–3 section-subject offerings. Synchronized `faculty.csv`, `student.csv`, and `subject.csv`, and added `student-enrollment.csv` for the many-to-many offering records.
- **Reason:** Provide enough realistic records to demonstrate continuous scrolling, searching, sorting, grouping, profiles, and irregular enrollment.
- **Verification:** CSV totals are 28 faculty, 619 students, 24 subjects, and 1,302 enrollment rows. Full automated suite — 691 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-25 — Reorganized the Section Management columns

- **Area:** Admin Section Management
- **Changed:** Reordered the table to Unique ID, Year Level, Curriculum, Section, Subjects, and Actions. Renamed Program to Curriculum and presented its choices as CS, IT, and IS while preserving BSCS/BSIT/BSIS internal identifiers.
- **Reason:** Match the requested academic terminology and scanning order.
- **Verification:** Full automated suite — 688 assertions passing, 0 failing.
- **Result:** Complete

## 2026-08-25 — Added program/year curriculum data and standardized academic IDs

- **Area:** Admin academic records and canonical demonstration data
- **Changed:** Added separate Program and Year Level fields and table columns for sections. Replaced the legacy sample with 24 selected subjects (two per BSCS/BSIT/BSIS year level), 15 sections (one or two per program/year), 19 students including irregular cross-section enrolments, and eight faculty. Student IDs use `YYYY-NNNNN`, faculty IDs use `NN-NNNNN-NNN`, and subject codes use the `CCS`, `CIT`, or `CIS` prefix with a three-digit number and two-digit curriculum year.
- **Reason:** Match the supplied curriculum and make program, year, section, subject, professor, and irregular-enrolment relationships visible without overwhelming the prototype.
- **Files:** `js/demo-data.js`, `js/section-service.js`, Admin and Login pages, curriculum/section tests, requirements, checklist, and completion dashboard
- **Verification:** Full automated suite — 687 assertions passing, 0 failing. Checks cover record counts, all three ID patterns, program/year section storage, offering uniqueness, different professors for the same subject across sections, and irregular enrolment.
- **Result:** Complete

## 2026-08-25 — Introduced section-subject offerings and irregular enrolment data

- **Area:** Academic relationship model and demonstration data
- **Changed:** Replaced the one-section/one-global-professor assumption with uniquely identified section-subject offerings. Each offering has one professor; a professor may handle the same or different subjects across sections; a subject may have different professors by section. Added five named sections, eight subjects, eight named students, seventeen offerings, and 3–5 offering enrolments per student, including irregular cross-section schedules. Section editing now chooses a professor for every selected subject, Student subject rows show their offering section/professor, and Faculty rosters resolve offering enrolments.
- **Reason:** Match the clarified real-world enrollment rules and provide enough realistic sample data to demonstrate grouping, profiles, rosters, and performance.
- **Files:** `js/section-service.js`, login seed, Admin/Faculty/Student pages, Faculty profile service, requirements/ERD, rich-data and relationship tests, and progress trackers
- **Verification:** Full automated suite — 684 assertions passing, 0 failing. Focused checks prove unique IDs, expanded record counts, 3–8 student enrollments, 1–5 teacher offerings, different teachers for one subject by section, and irregular cross-section students.
- **Result:** Complete

## 2026-08-25 — Refined grouping, toolbar state, headings, and CSV export

- **Area:** Admin management-page controls
- **Changed:** Direction icons now animate between ascending/descending states. Opening Search, Sort, or Group closes and deactivates the prior control. Group menus derive Section and Subject choices from table columns, add surname/name-initial grouping where applicable, and show record counts in each group heading. Add/Import/Export icons are left-aligned; discovery tools remain right-aligned. Added CSV export to six Admin tables and in-card titles/descriptions to management views.
- **Reason:** Make tool state visible, grouping useful for academic data, and management pages match the requested hierarchy and control placement.
- **Files:** `js/admin-table-tools.js`, `html/admin.html`, Admin/shared CSS, table/relationship tests, and progress trackers
- **Verification:** Full automated suite — 677 assertions passing, 0 failing. Focused checks cover exclusive tool state, transformed direction, group counts, alphabetical grouping, headings, and six export actions.
- **Result:** Complete

## 2026-08-25 — Fixed Audit controls overflowing the panel

- **Area:** Admin Audit Log responsive layout
- **Changed:** Detached Search/Sort/Group controls from the Exam Participation selector and moved them above the Recorded Activity table. Constrained long exam labels with ellipsis and made the participation selector stack at the mobile breakpoint.
- **Reason:** Prevent the combined selector and toolbar from extending beyond the Audit card at narrower widths.
- **Files:** `html/admin.html`, `css/admin-modern.css`, `tests/t_audit_log.js`, and progress trackers
- **Verification:** Full automated suite — 671 assertions passing, 0 failing. Focused checks confirm the toolbar has a separate host and is absent from the participation row.
- **Result:** Complete

## 2026-08-25 — Added complete Student and Faculty profile navigation

- **Area:** Admin people profiles and relationship exploration
- **Changed:** Every non-action Faculty/Student table cell now opens a keyboard-accessible profile. Student profiles add Actions and Login Details to identity, section, history, and grades. Faculty profiles add identity, subjects, handled sections, statistics, per-section student/submission performance bar graphs, Actions, and Login Details. Clicking a handled Section opens Section Management and highlights its row.
- **Reason:** Let Admin move naturally from a person list into a complete operational and academic view, then follow Faculty-to-Section relationships without searching again.
- **Files:** `js/faculty-profile.js`, `js/student-profile.js`, `html/admin.html`, `css/admin-modern.css`, test harness, Faculty/Student profile tests, and progress trackers
- **Verification:** Full automated suite — 669 assertions passing, 0 failing. Focused checks cover cell activation, profile hero identity, subjects/sections, statistics, grades, activity, login history, performance bars, and Section navigation.
- **Result:** Complete for Faculty and Student profiles

## 2026-08-25 — Separated toolbars from tables and restored continuous scroll

- **Area:** Cross-role table layout and result navigation
- **Changed:** Moved table controls into a dedicated top-right row fully outside the header. Removed Previous/Next pagination and page counters. Search, sort, direction, and grouping now operate on every matching row in a vertically scrollable table.
- **Reason:** Follow the clarified layout and interaction model: controls above the table and continuous scrolling instead of pages.
- **Files:** `js/admin-table-tools.js`, `css/admin-modern.css`, `css/shared-ui.css`, table-tool tests, and progress trackers
- **Verification:** Full automated suite — 659 assertions passing, 0 failing. A 15-row focused case confirms all matches remain available without pagination.
- **Result:** Complete

## 2026-08-25 — Extended table tools across roles

- **Area:** Faculty and Student data tables
- **Changed:** Applied the reusable Search, Sort, Direction, Group, and Previous/Next toolbar to Student examinations, results, and subjects and to Faculty examination results. Added cross-role styling that inherits each role's accent and preserves the top-right table-edge placement.
- **Reason:** Keep data discovery behavior consistent beyond Admin instead of maintaining role-specific table interactions.
- **Files:** `html/student.html`, `html/faculty.html`, `css/shared-ui.css`, `tests/t_all_pages_tools.js`, and progress trackers
- **Verification:** Full automated suite — 658 assertions passing, 0 failing. Focused checks cover all three Student tables, Student subject search, and Faculty results controls.
- **Result:** Complete for all data tables across the three role pages

## 2026-08-25 — Added reusable Admin table tools

- **Area:** Admin data discovery and navigation
- **Changed:** Added a separate reusable component that mounts Search, Sort field, Ascending/Descending, Group by, Previous, and Next controls on Faculty, Student, Section, Subject, Professor Assignment, and Audit tables. Search covers every displayed column; field choices are derived from each table's headers; grouping inserts labelled divider rows; pagination shows the current/total page.
- **Reason:** Make larger data sets quickly searchable and navigable without expanding each feature into separate table logic.
- **Files:** `js/admin-table-tools.js`, `html/admin.html`, `css/admin-modern.css`, `tests/harness.js`, `tests/t_table_tools.js`, and progress trackers
- **Verification:** Full automated suite — 654 assertions passing, 0 failing. Focused checks cover mounting on six views, surname search, hiding nonmatches, field sorting, direction reversal, grouping, and navigation state.
- **Result:** Complete for requested generic table controls

## 2026-08-25 — Moved management controls above table headers

- **Area:** Admin management-table controls
- **Changed:** Repositioned Add and import icons from inside the Actions header to the table card's top-right edge. Removed the extra header padding previously reserved for those controls; row Edit/Delete actions remain under Actions.
- **Reason:** Match the clarified placement shown in visual review: on top of the table, not in its title/header row.
- **Files:** `css/admin-modern.css`, `tests/t_relationship_rules.js`, and progress trackers
- **Verification:** Full automated suite — 646 assertions passing, 0 failing, including a structural placement check.
- **Result:** Complete

## 2026-08-25 — Docked Admin controls in table corners

- **Area:** Admin management-table layout
- **Changed:** Add and CSV-import controls now float in the top-right corner of Faculty, Student, Subject, and Faculty–Subject tables; Section Add uses the same corner pattern. The controls are removed from document flow, consume no vertical toolbar space, and the final header cell reserves horizontal room to prevent overlap.
- **Reason:** Match the requested compact corner-control layout consistently across Admin management pages.
- **Files:** `html/admin.html`, `css/admin-modern.css`, section/relationship tests, and progress trackers
- **Verification:** Full automated suite — 645 assertions passing, 0 failing. Focused checks confirm Section and all other management tables use the corner pattern.
- **Result:** Complete

## 2026-08-25 — Cleaned up the Section Management page

- **Area:** Admin Section Management visual design
- **Changed:** Removed the oversized empty action strip, moved Add Section into a compact page-header action, fixed visually leaked screen-reader text, replaced the colored subject emoji with a consistent SVG, grouped row actions, and displayed assigned subjects as compact code chips. The Add label collapses to an icon on narrow screens.
- **Reason:** Correct the specific awkward layout shown in review and align Section Management with the modern Admin visual system.
- **Files:** `html/admin.html`, `css/admin-modern.css`, `tests/t_sections.js`, and progress trackers
- **Verification:** Full automated suite — 644 assertions passing, 0 failing, including focused structural checks for the compact header and SVG assignment action.
- **Result:** Complete

## 2026-08-25 — Redesigned the Student section chooser

- **Area:** Admin Student editor usability
- **Changed:** Replaced the native Section dropdown with a responsive radio-card grid showing section ID and name, visible hover/selected/focus states, a familiar radio indicator, scrolling for large lists, and a one-column mobile layout. An empty state directs Admin to create a Section first.
- **Reason:** Make a single important relationship easier to scan and choose while preserving the one-section-per-student rule.
- **Files:** `html/admin.html`, `css/admin-modern.css`, section/relationship/password tests, and progress trackers
- **Verification:** Full automated suite — 642 assertions passing, 0 failing. Checks cover generated choices and saving exactly one selected Section.
- **Result:** Complete

## 2026-08-25 — Enforced section, subject, and professor cardinality

- **Area:** Admin relationships, Faculty rosters, and file-action usability
- **Changed:** Students now select exactly one existing section; sections retain many subjects; each subject accepts one professor; the professor sees students from every section carrying that subject. Legacy multi-section and multi-professor records normalize to the first valid value. Student inherited-subject rows now resolve the assigned professor. Replaced native file inputs and wordy Admin add actions with labelled icon controls and tooltips.
- **Reason:** Match the intended academic relationship model and remove the visually inconsistent browser file picker without sacrificing accessibility.
- **Files:** `js/section-service.js`, Admin/Faculty/Student pages, Admin CSS, requirements/ERD documentation, relationship tests, and progress trackers
- **Verification:** Full automated suite — 641 assertions passing, 0 failing. Focused checks cover single Student section, one professor per subject, one professor serving multiple sections of the same subject, section inheritance, and accessible upload icons.
- **Result:** Complete

## 2026-08-25 — Replaced direct allotment UI with an operational Audit Log

- **Area:** Admin navigation, operational accountability, and exam participation
- **Changed:** Removed the Student–Subject Allotment dashboard card, management page, and navigation entry. Added a separate append-only application audit service and Admin Audit Log page. Successful logins, Admin record changes, Faculty exam creation/updates, and Student exam submissions now record actor, role, timestamp, action, and target. An exam selector calculates eligible students and shows separate took/did-not-take lists and participation statistics.
- **Reason:** Section-level subject assignment is now the primary enrolment model, while Admin needs visibility into system use and examination participation.
- **Files:** `js/audit-service.js`, `html/login.html`, `html/admin.html`, `html/faculty.html`, `html/student.html`, `css/admin-modern.css`, test harness and audit/allotment tests, and progress trackers
- **Verification:** Full automated suite — 636 assertions passing, 0 failing. Checks cover login actors, Admin changes, removal of the obsolete page, immutable display, and both taken and not-taken eligible Student lists.
- **Result:** Complete for the requested Admin log and participation report
- **Remaining:** Scoped Faculty audit view, logout/failed-login coverage, filters, retention policy, and server-side tamper resistance remain optional enhancements.

## 2026-08-25 — Made multi-subject Section assignment explicit

- **Area:** Admin Section Management
- **Changed:** Replaced the modifier-key multi-select with a scrollable checkbox list. Admin can select and save any number of subjects to one section in a single action, and saved choices are restored when reopened.
- **Reason:** Make the existing many-subject relationship obvious and usable without requiring Ctrl/Cmd knowledge.
- **Files:** `html/admin.html`, `css/admin-modern.css`, `tests/t_sections.js`, and progress trackers
- **Verification:** Full automated suite — 644 assertions passing, 0 failing, including an explicit two-subject single-save check.
- **Result:** Complete

## 2026-08-25 — Connected Admin dashboard cards to their lists

- **Area:** Admin dashboard navigation
- **Changed:** All six metric cards now open their corresponding management page and populated list. Cards support mouse, Enter, and Space activation with accessible names and focus treatment. Their plus buttons remain independent and open the relevant form without navigating.
- **Reason:** Turn the dashboard summary into useful navigation and reduce the extra step of reopening the sidebar.
- **Files:** `html/admin.html`, `css/admin-modern.css`, `tests/t_admin_cards.js`, and progress trackers
- **Verification:** Full automated suite — 643 assertions passing, 0 failing. Focused checks cover all card shortcuts, accessibility, list visibility, keyboard activation, and independent plus actions.
- **Result:** Complete

## 2026-08-25 — Added focused Admin student profiles

- **Area:** Admin Student Management
- **Changed:** Student names now open a responsive focused profile with Overview, History, and Grades tabs. The Overview combines statistics, section membership, direct and inherited subjects, and assigned professors; History lists examination activity; Grades shows awarded points, converted percentages, college ratings, and pending-review states.
- **Reason:** Give Admin a clear place to understand an individual student without crowding the CRUD table or adding profile calculations to the existing Admin logic.
- **Files:** `js/student-profile.js`, `html/admin.html`, `css/admin-modern.css`, `tests/harness.js`, `tests/t_student_profile.js`, and progress trackers
- **Verification:** Full automated suite — 635 assertions passing, 0 failing. Focused checks cover the clickable name, selected identity, sections, direct and inherited professors, statistics, examination history, grades, and tab state.
- **Result:** Complete for Student profiles
- **Remaining:** Focused inspectors for other Admin record types, bulk selection, import-impact detail, and reversible actions remain optional.

## 2026-08-25 — Separated Sections and added subject inheritance

- **Area:** Admin section management and Student enrolment
- **Changed:** Added unique Section records, automatic migration of legacy student section strings, an existing-section selector in Student editing, a dedicated Section workspace, and per-section subject assignment. Students now inherit subjects and exams from their sections while direct Student allotments remain available for exceptions.
- **Reason:** Keep Section creation separate from Student editing, prevent inconsistent typed section names, and model reusable section-to-subject relationships without expanding the Admin page's business logic.
- **Files:** `js/section-service.js`, `html/admin.html`, `html/student.html`, `tests/harness.js`, `tests/t_sections.js`, navigation/UI tests, and progress trackers
- **Verification:** Full automated suite — 627 assertions passing, 0 failing. Focused checks cover migration, selectable memberships, normalized unique IDs, duplicate rejection, section-subject assignment, inherited subject display, and inherited exam access.
- **Result:** Complete for section identity, membership, and subject inheritance
- **Remaining:** Per-section schedules and individual Student accommodations remain optional work.

## 2026-08-25 — Built the responsive Faculty question workspace

- **Area:** Faculty question authoring UX and draft persistence
- **Changed:** Replaced the compact question dialog with a full-screen authoring canvas, collapsible second-column settings inspector, icon actions, labelled mobile bottom navigation, full-height mobile settings sheet, and visible draft autosave states. Added a separate `questionDrafts` store so incomplete work restores without entering the live question collection.
- **Reason:** Keep the question prompt and answers as the primary workspace, avoid a growing modal monolith, and protect unfinished Faculty work.
- **Files:** `js/question-draft.js`, `html/faculty.html`, `css/shared-ui.css`, `tests/harness.js`, `tests/t_authoring.js`, and progress trackers
- **Verification:** Full suite passes 501 assertions with 0 failures. Dedicated tests verify the canvas, inspector, mobile controls, saving state, separate draft persistence, restoration, valid commit, and draft cleanup.
- **Result:** Complete
- **Remaining:** General-exam tool rail, inline media/preview, resizable inspector, type-change impact warning, and general-settings save/exit safeguards.

## 2026-08-25 — Added Faculty-controlled exam layout and navigation

- **Area:** Faculty exam settings and Student attempt navigation
- **Changed:** Added persisted one-question/all-questions presentation and free, sequential-with-review, or forward-only navigation settings. Updated the Student briefing and enforced locked future questions, disabled backward navigation, and confirmation before abandoning an unanswered forward-only question.
- **Reason:** Complete the configurable behavior behind the paged runner rather than hard-coding one navigation model for every exam.
- **Files:** `html/faculty.html`, `html/student.html`, `js/attempt.js`, `js/exam-timing.js`, `tests/t_runner.js`, and progress trackers
- **Verification:** Full suite passes 484 assertions with 0 failures. Tests cover Faculty save/edit restoration and Student behavior in all-page, sequential, and forward-only modes.
- **Result:** Complete
- **Remaining:** Responsive two-column Faculty authoring workspace, offline detection/retry, question reporting, and later optional settings.

## 2026-08-25 — Completed the paged Student examination runner

- **Area:** Student examination UX and attempt persistence
- **Changed:** Added one-question-per-page rendering, Previous/Next controls, a right-side accessible question navigator, answered/unanswered progress, flags, debounced autosave, save-state feedback, save-on-exit, refresh recovery, Resume Exam, persisted timer start, state-backed review/submission, duplicate-submit protection, and clearing drafts only after successful submission.
- **Reason:** Complete the interrupted `addtional.md` section 13 step 3 and prevent navigation, refresh, or storage failure from silently losing student work.
- **Files:** `js/attempt.js`, `html/student.html`, `css/shared-ui.css`, `tests/harness.js`, `tests/t_attempt.js`, `tests/t_runner.js`, affected Student workflow tests, and progress trackers
- **Verification:** Full automated suite passes 473 assertions with 0 failures. Dedicated runner tests cover one-question rendering, progress, accessible navigator status, flag persistence, save-on-exit, refresh recovery, answer restoration, review, final submission, and draft cleanup.
- **Result:** Complete
- **Remaining:** Faculty-configurable all-on-one-page/navigation modes, offline detection/retry, question reporting, and the larger optional Faculty authoring workspace.

## 2026-08-25 — Added modular architecture boundaries

- **Area:** Application architecture and maintainability
- **Changed:** Defined application shells, platform utilities, repositories, domain services, feature controllers/views, shared components, dependency rules, audit separation, transaction-like operations, test boundaries, and an incremental extraction order.
- **Reason:** Prevent advanced Admin, Faculty, Student, examination, and audit features from expanding the existing large inline pages into a monolith.
- **Files:** `.plans/addtional.md`, `.plans/progress/checklist.md`, `.plans/progress/audit-log.md`
- **Verification:** Confirmed that storage ownership, permission ownership, dependency direction, cross-role audit behavior, testing seams, and completion criteria are explicit.
- **Result:** Complete
- **Remaining:** Refactor incrementally while preserving the currently passing behavior and tests.

## 2026-08-25 — Defined Admin and Faculty application audit visibility

- **Area:** Application audit logging, authorization, and privacy
- **Changed:** Added a global Admin audit view, a subject/exam-scoped Faculty view, limited personal Student activity, required event fields, filters, reasons for high-impact actions, retention rules, and local-storage limitations.
- **Reason:** Ensure both Admin and Faculty receive useful traceability without exposing unrelated users or sensitive data.
- **Files:** `.plans/addtional.md`, `.plans/progress/checklist.md`, `.plans/progress/audit-log.md`
- **Verification:** Confirmed that role visibility, event content, sensitive-data exclusions, append-only behavior, and prototype security limitations are stated explicitly.
- **Result:** Complete
- **Remaining:** Design and implement the in-application audit data store and role-specific views.

## 2026-08-25 — Added cross-workspace UX and safety rules

- **Area:** Admin, Faculty, Student, publishing, results, and version history
- **Changed:** Made manual Faculty grading optional, defined automatic grading from Faculty-authored answers, and added Admin workspace, question-list, publish review, Student dashboard, report management, grade-release, save-policy, impact-confirmation, and version-history requirements.
- **Reason:** Apply the responsive navigation and safe-editing patterns consistently without requiring manual grading for objective questions.
- **Files:** `.plans/addtional.md`, `.plans/progress/checklist.md`, `.plans/progress/audit-log.md`
- **Verification:** Confirmed that automatic and optional manual grading are separated and that destructive or submission-affecting changes require explicit impact handling.
- **Result:** Complete
- **Remaining:** Prioritize these optional additions and prototype the highest-value workflows before implementation.

## 2026-08-25 — Added responsive Faculty authoring workspace

- **Area:** Faculty exam and question editing UX
- **Changed:** Specified icon-led side navigation on larger screens, bottom navigation on mobile, a full-width question canvas with an optional second-column settings inspector, per-question autosave, and guarded saving for general exam settings.
- **Reason:** Keep question content prominent while making advanced settings available without turning the editor into one long form.
- **Files:** `.plans/addtional.md`, `.plans/progress/checklist.md`, `.plans/progress/audit-log.md`
- **Verification:** Added desktop, mobile, accessibility, save-state, exit-prompt, and high-impact confirmation requirements plus acceptance scenarios.
- **Result:** Complete
- **Remaining:** Prototype and usability-test the workspace before implementation is considered complete.

## 2026-08-25 — Structured additional examination requirements

- **Area:** Student exam UX, Faculty authoring, accessibility, and integrity monitoring
- **Changed:** Replaced the brainstorm in `addtional.md` with prioritized, testable requirements for exam details, timing, question navigation, autosave, flags, reporting, submission review, result permissions, question types, accessibility, privacy, and browser-security limitations. Extended the optional checklist.
- **Reason:** Convert design ideas into implementable behavior and add missing recovery, accommodation, integrity, and acceptance rules.
- **Files:** `.plans/addtional.md`, `.plans/progress/checklist.md`, `.plans/progress/audit-log.md`
- **Verification:** Confirmed that availability and attempt duration are separate, browser limitations are explicit, and acceptance scenarios cover the complete flow.
- **Result:** Complete
- **Remaining:** Implement these additions after the four required modules are stable.

## Entry template

```md
## YYYY-MM-DD — Short change title

- **Area:** Plan / Admin / Faculty / Student / Shared UI / Documentation
- **Changed:** What was added, removed, or corrected.
- **Reason:** Why the change was necessary.
- **Files:** Files affected.
- **Verification:** Checks or user tasks performed.
- **Result:** Complete / Partial / Reverted.
- **Remaining:** Follow-up work, if any.
```

## 2026-08-25 — Small-screen pass: the last code item in the required scope

- **Area:** Shared UI / Admin / Faculty / Student
- **Audit before the change:**
  - **Eight data tables had no horizontal scroll container.** The student results table has seven columns; on a phone it forced the entire page sideways.
  - **Seven fixed widths exceeded a phone viewport** — dialogs at 500, 600, 700 and 720px, and the login panel at 550px — with nothing capping them.
  - **No breakpoint below 640px**, and the only other one was 900px.
- **Changed:**
  - Wrapped all eight static tables plus the generated faculty results table in `.table-scroll`, which scrolls horizontally inside its own box with a faint edge gradient hinting there is more to the right. Tables keep a 560px minimum inside it (480px under 400px viewports) so columns stay readable rather than crushing.
  - Added one shared cap — `max-width: calc(100vw - 28px)` — covering every wide surface, and `overflow-x: hidden` on `body`, so nothing can push the page sideways.
  - Added a 640px breakpoint: dialogs become near-full-screen sheets, action rows stack to full-width tap targets, the exam timer wraps below the title instead of squeezing it, toasts span the width, import controls stack rather than colliding with the file input, and stat cards go two-up.
  - Added a 400px breakpoint for very small phones.
- **Files:** `css/shared-ui.css`, `html/admin.html`, `html/student.html`, `html/faculty.html`, `tests/t_responsive.js` (new)
- **Verification:** 416 assertions, 0 failures — up from 402. New `t_responsive.js` (14) parses the real pages and asserts every `table[id]` has a `.table-scroll` ancestor, that the class actually scrolls and keeps a minimum width, that all five wide surfaces are covered by the shared cap, that `body` cannot scroll sideways, and that each small-screen behaviour is present. The first audit script gave false negatives by only checking whether a rule capped *itself*; the committed test resolves through the stylesheet instead.
- **Result:** Complete
- **Remaining in the required scope:** nothing that is code. Usability sessions, screenshots, per-module report narrative and the final report are all coursework.

## 2026-08-25 — Exam details screen and the formal timing model

- **Area:** Shared platform / Faculty / Student
- **Scope:** §13 step 2 of `addtional.md`, plus the §2 dashboard and §3 timing "Must" items.
- **Built as modules, not inline**, following §15: two new platform files with no DOM and no storage access, so the rules are testable without loading a page.
  - `js/dates.js` — local-calendar parsing (avoiding the UTC drift `Date.parse("YYYY-MM-DD")` causes), duration and clock formatting, and the viewer's time-zone name.
  - `js/exam-timing.js` — the four concepts kept deliberately separate: **visibility**, **availability window**, **attempt duration**, and **effective end** (whichever of the deadline or start+duration comes first). Also `examState`, `timeRemaining`, `thresholdCrossed`, and `examBriefing`.
- **Faculty:** exam form gained attempt time limit, passing grade, and allowed materials. Two new schedule rules: the limit must be at least a minute, and a limit longer than the availability window is rejected because the deadline would always win, so no student could ever use the time offered.
- **Student:**
  - Selecting an exam now opens a **details screen, not the paper** — instructions, allowed materials, question count, total points, passing grade, opens/closes, time limit, attempts, navigation and results policy, and the time zone those times are shown in.
  - A disabled **Start Exam** explains why, both on the button and in the panel.
  - A live timer sits top-right, **labelled** "Time left in your attempt" or "Time until the exam closes" depending on which limit actually governs.
  - Warnings at 10, 5 and 1 minute, each firing once, announced to screen readers only at the threshold rather than every second.
  - **Autosubmit at the effective end**, with a message naming which limit ended the attempt.
  - Submissions record `submittedBy` (student or timeout), `timeoutReason`, and `startedAt`.
- **Files:** `js/dates.js` (new), `js/exam-timing.js` (new), `html/faculty.html`, `html/student.html`, `css/shared-ui.css`, `tests/t_timing.js` (new), `tests/t_details.js` (new)
- **Verification:** 402 assertions, 0 failures — up from 322. `t_timing.js` (47) tests the model with no browser at all, including the deadline-vs-duration precedence in both directions, exact window boundaries, a malformed schedule falling back to open rather than locking everyone out, threshold warnings firing once, and clamping past the end. `t_details.js` (31) drives the real pages: the briefing shows without starting the attempt, a blocked Start explains itself, the timer labels the correct governing limit, a timed-out attempt is submitted and recorded as `timeout`, and a manual submit is recorded as `student`.
- **Result:** Complete
- **Remaining:** §13 step 3 — one-question-per-page navigation, autosave and recovery, flags, and the question navigator.

## 2026-08-25 — Added failure reporting, hardened storage, made every control respond

- **Area:** Shared platform / Admin / Faculty / Student
- **Scope:** Section 1 of `addtional.md` (current usability improvements), which its own §13 names as the first implementation step.
- **Audit before the change:**
  - **No global error handling existed.** A thrown handler logged to a console the user never opens; the button simply appeared dead.
  - **`DB.write` ignored failures.** A full quota or a private-browsing session lost the change silently, and the UI still reported success.
  - **19 silent early-returns** across the three pages; the record-lookup guards among them made controls appear broken.
- **Changed:**
  - Added `js/storage.js` as the single owner of `localStorage`, per §15's "centralize storage access". Reads are fault-tolerant and report corruption or blocked storage; writes return a boolean and explain quota and private-mode failures in plain language. `auth.js` now consumes it rather than defining its own `DB`.
  - Added global `error` and `unhandledrejection` listeners in `js/ui.js`. Any uncaught failure now becomes an error toast saying the action did not complete and nothing was changed. Identical failures are collapsed to one message per 4-second window so a failing render cannot produce a wall of toasts.
  - Added `guard(what, fn)` — wraps a risky operation so a throw becomes a named, visible message — and `required(condition, message)` for preconditions, so a control never just does nothing.
  - Converted the 11 record-lookup guards to explain themselves ("That record no longer exists. The list has been refreshed.") and refresh the affected list.
  - `persistAll()` now returns whether every write succeeded, and the three admin save paths no longer report success or close their dialog when the write failed.
  - Failed asset loads are distinguished: a missing image is logged, a missing script or stylesheet tells the user to reload.
- **Defect found by the new tests:** saving one record writes five collections, so a quota failure produced **five identical toasts**. Storage messages are now de-duplicated the same way global errors are — verified as exactly one.
- **Files:** `js/storage.js` (new), `js/auth.js`, `js/ui.js`, `html/admin.html`, `html/faculty.html`, `html/student.html`, `html/login.html`, `tests/harness.js`, `tests/t_errors.js` (new)
- **Verification:** 322 assertions, 0 failures. New `t_errors.js` (20 assertions) simulates a full quota, corrupted JSON and fully blocked storage, and checks: the user is told, no false success is reported, the dialog stays open, the page still renders from a safe fallback, uncaught errors and rejected promises surface, repeats collapse to one, `guard()` names the failed action and passes successes through, and stale-record clicks in all three roles respond instead of doing nothing.
- **Result:** Complete
- **Remaining:** §13 step 2 onwards — exam details screen and the formal timing model.

## 2026-08-25 — Fixed type scale, line height, line length and click-target sizes

- **Area:** Shared UI / Admin / Faculty / Student
- **Trigger:** Review question — were the sizes comfortable on the eyes? Measuring rather than eyeballing found four problems.
- **Measured before the change:**
  - **51% of type was under 14px** — 63 of 123 declarations, including ten at 10–11px. Table cells, status pills and remarks were all at 12–13px.
  - **No `line-height` was set anywhere.** `body` declared font-family, background and colour but not line-height, so everything fell back to the browser default of roughly 1.2.
  - **Prose ran the full container width** of 1100–1200px, giving 130–150 characters per line against a comfortable 45–75.
  - **Nine click targets measured 30–33px**, with `.btn-take-exam` — the most important control in the system — the smallest at 30px.
- **Changed:**
  - Added a type scale to `css/shared-ui.css` (`--fs-label` 12px through `--fs-lg` 17px), line-height tokens (1.6 body, 1.35 headings), `--measure` 70ch and `--tap` 40px.
  - Raised 53 font sizes at source across the four pages and `style.css`, preserving the ratios between them.
  - Set `body { line-height: 1.6 }` and gave headings 1.35 with `text-wrap: balance`.
  - Capped prose at 70 characters through ten selectors, deliberately exempting tables and grids, which need the full width and scroll instead.
  - Gave every control a 40px minimum height, with compact in-row table actions at 34px, and matched input heights so rows align.
  - Added the missing `.nextup-row` / `.nextup-tag` styles for the new Student overview.
- **Files:** `css/shared-ui.css`, `css/style.css`, `html/admin.html`, `html/faculty.html`, `html/student.html`, `html/login.html`, `docs/interface-design.md`
- **Verification:** Re-measured after the change — declarations under 12px fell from 10 to 2 (both `!` glyphs inside fixed-size discs, not read as text), 14px-and-above rose from 60 to 84. Body line-height, measure and tap tokens all confirmed applied. Full suite re-run: 302 assertions, 0 failures.
- **Result:** Complete
- **Remaining:** Full small-screen pass at the new sizes.

## 2026-08-25 — Unified navigation, added save confirmations, consolidated the palettes

- **Area:** Shared UI / Admin / Faculty / Student
- **Trigger:** Review question — was the UI actually easy to use? An audit found three separate navigation models (Student had none at all) and only one success message in the entire application.
- **Changed:**
  - Added `mountSidebar()` to `js/ui.js`. All three roles now use the same drawer: hamburger, rounded panel, icon + label links, active state, Escape and click-away to close, `aria-expanded` tracked. Admin's bespoke `openNav`/`closeNav`/`showSection` were removed in favour of it, and Faculty's tab bar was replaced by it.
  - **Student gained navigation for the first time** — Overview, My Examinations, My Results, My Subjects — instead of one long scrolling page. A new Overview panel surfaces what needs attention: exams open right now, the next scheduled one, and submissions still awaiting marking.
  - **Success feedback on every save.** The application previously had exactly one success message (CSV import); it now has 14, covering adding and editing faculty, students and subjects, both allotment types, exam and question creation, deletion, imports, marking, and submission.
  - **Palette consolidation.** Competing hardcoded colour literals cut from 41 to 14 across faculty and student. Added semantic tokens (`--action`, `--danger`, `--ok-ink`, `--warn`, `--warn-ink`) kept deliberately separate from the role accent so status meaning stays identical across roles, plus `--accent-dark` for hover states.
- **Defect found and fixed during the work:** mounting the sidebar from Faculty's init block referenced `facultyNav` before its `let` declaration, a temporal dead zone error that killed the entire page script. Caught because assertion counts silently dropped from 267 to 196.
- **Test-runner defect fixed:** `run-all.js` counted tick and cross symbols only, so a file that crashed part-way reported fewer passes and "0 failed". It now detects a non-zero exit, prints `CRASH … DID NOT FINISH`, and fails the run. `t_auth.js` was also left hanging on open jsdom windows and now closes them.
- **Files:** `js/ui.js`, `css/shared-ui.css`, `html/admin.html`, `html/faculty.html`, `html/student.html`, `tests/run-all.js`, `tests/t_auth.js`, `tests/t_nav.js`
- **Verification:** 302 assertions, 0 failures. New `t_nav.js` covers: all three roles having a sidebar with the expected section count, icons and active state; open/Escape/click-away; section switching updating panel visibility, header title and active link; the Overview calling out an exam that is open now; and save actions producing success toasts that name what was saved.
- **Result:** Complete
- **Remaining:** Full small-screen pass. Usability sessions, screenshots and the final report.

## 2026-08-25 — Produced the HCI documentation deliverables

- **Area:** Documentation
- **Changed:** Added a `docs/` folder covering the analysis and design deliverables required by every module:
  - `requirements.md` — users, goals, inputs, outputs, rules and constraints for all four modules, plus a traceability table linking each requirement group to its implementation and its tests.
  - `data-model-erd.md` — Mermaid ERD of all 10 entities and 14 relationships, the storage-key table, cardinality notes, the integrity rules enforced in code, and known limitations.
  - `flowcharts.md` — main system flow, one flowchart per module, and the grading conversion, including validation and error paths rather than only happy paths.
  - `storyboards.md` — frame-by-frame Admin, Faculty and Student storyboards with the design consequence of each key frame.
  - `interface-design.md` — design tokens, control specifications, form and validation states, dialog design rules, page states, the authentication error, the profile menu, and grade presentation.
  - `test-cases.md` — all 267 test cases, extracted from a live run of the suite rather than written by hand.
  - `usability-protocol.md` — tasks, recording sheets, accessibility pass and heuristics for the Week 9 review.
- **Reason:** The HCI deliverables were the largest outstanding block at 0%, while the prototype itself was complete.
- **Method note:** Every rule documented was read from the implementation rather than from the plan, so the documentation describes what the system does. Features that are not implemented — section-level exam targeting, an exam timer, automatic essay marking, loading states — are named as limitations rather than omitted.
- **Deliberately not produced:** usability *findings*, screenshots, and the assembled report. Findings require real participants; inventing them would misrepresent the evaluation. `usability-protocol.md` supplies the instrument instead.
- **Files:** `docs/README.md`, `docs/requirements.md`, `docs/data-model-erd.md`, `docs/flowcharts.md`, `docs/storyboards.md`, `docs/interface-design.md`, `docs/test-cases.md`, `docs/usability-protocol.md`
- **Verification:** Data model cross-checked field by field against the code that writes each record. All 7 Mermaid diagrams checked for balanced syntax and valid diagram types. `test-cases.md` generated from an actual suite run — 267 assertions, 0 failures.
- **Result:** Complete
- **Remaining:** Usability sessions, screenshots, per-module report narrative, and the final report.

## 2026-08-25 — Replaced every alert()/confirm() with designed states, fixed contrast, committed the test suite

- **Area:** Shared UI / Admin / Faculty / Student / Documentation
- **Changed:**
  - Added toast notifications, inline field validation and a promise-based confirmation dialog to `js/ui.js`. All **28 `alert()` calls** became typed toasts and all **5 `confirm()` calls** became designed dialogs. No `alert()` or `confirm()` remains in the application.
  - Delete confirmations now name the record, spell out exactly what else will be removed, warn that the action is irreversible, style the destructive button as dangerous, and start focus on Cancel so Enter cannot destroy anything.
  - Replaced the login `alert()` with an inline `role="alert"` / `aria-live="assertive"` error region that marks the fields `aria-invalid` and clears as soon as the user types. The message does not reveal which of the two fields was wrong.
  - Darkened the faculty teal (`#3F8782` → `#3A7D78`) and student green (`#4F8A5B` → `#487F53`); both were below WCAG AA at 4.20:1 and 4.10:1 on white.
  - Every status now carries an icon or a word beside its colour, so meaning never depends on hue alone.
  - Guarded `requestAnimationFrame` in the toast code, which otherwise threw mid-save in contexts that lack it.
  - Moved the test suite into `tests/` with a runner, `package.json` and a README mapping each file to the module it evidences.
- **Reason:** Close the remaining shared-design and accessibility items, and supply the test evidence the plan requires.
- **Files:** `js/ui.js`, `css/shared-ui.css`, `html/admin.html`, `html/faculty.html`, `html/student.html`, `html/login.html`, `tests/*`
- **Verification:** 267 assertions across 16 files, all passing, run from the project's own `tests/` directory. New coverage: toast type/wording/dismissal and screen-reader region; confirm dialog cancelled by button, by Escape, and by backdrop, each leaving data untouched; confirmed deletion proceeding; login error appearing, clearing on input, and not blocking a valid login. Contrast checked programmatically — all 13 token pairs now at or above 4.5:1.
- **Result:** Complete
- **Remaining:** Page-level style blocks in faculty/student could still move into the shared layer; small-screen pass; all HCI documentation, the Week 9 review, and the final report.

## 2026-08-25 — Added college grading conversion, shared design tokens, role accents, and header profile menu

- **Area:** Shared UI / Faculty / Student
- **Changed:**
  - Added `js/grading.js`: raw marks are transmuted with `(score / total * 50) + 50`, then converted to the college 1.00–5.00 rating (1.00 highest, 3.00 passing at 75%, 4.00 and 5.00 failed). Both faculty and student read from this one file so a mark can never be shown two different ways.
  - Student results, exam-submission summary, and faculty results table now show the transmuted percentage and rating. A rating is deliberately withheld until every written answer is marked, so a partial score is never mistaken for a final standing.
  - Added a collapsible grading-scale reference on the student dashboard.
  - Added `css/shared-ui.css`: design tokens for radii, layered shadows and hairlines; softened buttons, inputs, cards, tables, modals, sidebar and navigation; visible keyboard focus rings on all interactive controls.
  - Applied the plan's muted role accents via `<body data-role>` — blue for Admin, teal for Faculty, green for Student.
  - Added `js/ui.js`: a round initials avatar in the header that opens a panel with an enlarged profile hero, name, role, ID, then Settings and Log out. Closes on click-away and Escape, with correct `aria-expanded`/`aria-haspopup`.
- **Reason:** Requested college grading scale, and the plan's outstanding shared-design, accent, and keyboard-focus items.
- **Note:** The standalone "Log out" button was removed from each header because the profile panel now contains Log out; two controls doing the same thing is redundant.
- **Files:** `js/grading.js`, `js/ui.js`, `css/shared-ui.css`, `html/admin.html`, `html/faculty.html`, `html/student.html`, `html/index.html`, `html/login.html`
- **Verification:** Suite extended to 234 assertions, all passing. Grading conversion checked against every band boundary (100/97/96/94…70/69/50) and end to end: 20/20 → 100% → 1.00 Passed; 0/20 → 50% → 5.00 Failed; 10/20 → 75% → 3.00 exactly at the passing line. Profile menu verified on all three dashboards for initials, hero, open/close/Escape, and Settings contents. 24 asset paths resolve.
- **Result:** Complete
- **Remaining:** Replace `alert()` with accessible inline errors; consolidate the remaining page-level styles into the shared layer; all HCI documentation and the final report.

## 2026-08-25 — Completed Module 3 and Module 4 required behaviour, added grading and results

- **Area:** Faculty / Student / Shared UI
- **Changed:**
  - Repaired all asset paths after the move to `html/`, `css/`, `js/`, `assets/`. Every page was broken: `auth.js` failed to load, so `requireRole` was undefined and every dashboard script died on load.
  - Module 3: question reordering (↑/↓ with ends disabled) and a full exam preview showing the paper as students see it, with the answer key marked for proofing and a warning for any MCQ with no correct option. Added exam schedule validation (end must be after start) and a check that the lecturer owns the subject.
  - Module 4: an answer-review step between answering and submitting, listing every question with the answer given, flagging blanks, and requiring an explicit "Confirm & Submit Final". Exam header now shows schedule, question count and total points.
  - Module 2: rejected duplicate and conflicting allotments, and required the chosen lecturer to be assigned to the chosen subject.
  - Added faculty results view and manual grading (per-question marks, per-question remarks, overall remark) plus student score and grade history with instructor feedback.
- **Fixed defects found during the work:**
  - Editing an allotment opened a modal with three empty dropdowns, so every transfer silently failed with "Select all fields". Same defect on the faculty–subject edit.
  - `fsFaculty` was a single-select while the save handler read `selectedOptions`, so assigning two lecturers to a subject only ever kept one — contradicting "assign one or more faculty members to a subject".
- **Reason:** Close the remaining must-demonstrate items for Modules 2–4 and restore a working prototype after the folder reorganisation.
- **Files:** `html/admin.html`, `html/faculty.html`, `html/student.html`, `css/style.css`
- **Verification:** Automated browser-level suite (jsdom driving the real pages) — 189 assertions, all passing, covering: auth and role gating, cascading deletes, identifier migration, CSV import, login, question reordering (including that students see the new order), exam preview, answer review round-trip, allotment/schedule validation, allotment transfer propagating to Admin/Faculty/Student views, and a full submit → grade → student-feedback round-trip.
- **Result:** Complete
- **Remaining:** Shared design system and role accents; keyboard focus states; replacing `alert()` with accessible inline errors; all HCI documentation and the final report.

## 2026-08-25 — Modernized the Admin dashboard and management panels

- **Area:** Admin visual design and interaction controls
- **Changed:** Replaced the saturated multicolor dashboard presentation with compact neutral metric cards and one restrained blue accent; reduced card height, softened borders and shadows, improved content hierarchy and responsive breakpoints, modernized management surfaces, tables, upload controls, and modals, and replaced text-heavy Edit/Delete controls with compact SVG icon buttons. All icon-only controls include accessible names, titles, keyboard focus treatment, and semantic button markup. The visual layer is isolated in `css/admin-modern.css`.
- **Reason:** The Admin interface still appeared washed out and dated despite the shared token pass; its oversized multicolor cards and rectangular CRUD buttons were the main cause.
- **Files:** `html/admin.html`, `css/admin-modern.css`, `tests/t_admin_modern.js`
- **Verification:** Full automated suite — 619 assertions passing, 0 failing. Eight focused structural checks cover the dedicated stylesheet, responsive grid, neutral overrides, focus treatments, SVG action icons, accessible naming, and semantic add buttons.
- **Result:** Complete visual redesign without changing Admin behavior.

## 2026-08-25 — Added draft-to-publish review gate

- **Area:** Faculty exam publishing / Student exam visibility
- **Changed:** New exams now begin as drafts and are excluded from Student exam lists. Publishing validates exam metadata and schedule, question presence, prompts, points, correct answers, numeric keys, fill-blank rules, matching pairs, and required image accessibility. Faculty sees the existing Student preview before a publication confirmation summarizing question, point, and existing-submission impact. Cancellation preserves the draft; successful publication records its timestamp. Legacy exams without a status remain visible.
- **Reason:** Prevent incomplete or invalid exams from becoming available to students and make publication an explicit, reviewable action.
- **Files:** `js/exam-publish.js`, `html/faculty.html`, `html/student.html`, `tests/harness.js`, `tests/t_publish.js`
- **Verification:** Full automated suite — 611 assertions passing, 0 failing. Nine focused checks cover draft hiding, validation, preview, impact summary, cancellation, persistence, and Student visibility.
- **Result:** Complete

## 2026-08-25 — Completed scheduled result and feedback permissions

- **Area:** Faculty exam settings / Student results and feedback
- **Changed:** Replaced simple result toggles with shared release policies: scores support immediate, after-deadline, after-manual-grading, chosen-date, or never; correct answers support immediate, after-deadline, chosen-date, or never. Submitted-answer visibility and Faculty-feedback visibility are independent. The same policy evaluator controls immediate submission output and later history, with legacy exam compatibility.
- **Reason:** Let Faculty delay sensitive results without inconsistent disclosure between the submission screen and dashboard history.
- **Files:** `js/result-visibility.js`, `html/faculty.html`, `html/student.html`, `tests/harness.js`, `tests/t_visibility.js`
- **Verification:** Full automated suite — 602 assertions passing, 0 failing. Sixteen focused checks cover persistence, masking, non-leakage, independent answer review, deadline boundaries, fully/pending grading, and past/future chosen dates.
- **Result:** Complete

## 2026-08-25 — Added Faculty-controlled result visibility

- **Area:** Faculty exam settings / Student results and answer review
- **Changed:** Added independent exam-level controls for showing scores/grades and allowing submitted-answer plus answer-key review. Policies persist and restore in the general exam editor, participate in dirty-state and impact warnings, and are enforced both immediately after submission and in later Student result history. Existing exams remain backward-compatible with scores visible and answer review off.
- **Reason:** Prevent unwanted disclosure of scores or correct answers while allowing Faculty to choose the appropriate feedback policy per exam.
- **Files:** `html/faculty.html`, `html/student.html`, `tests/t_visibility.js`
- **Verification:** Full automated suite — 596 assertions passing, 0 failing. Ten focused checks cover persistence, edit restoration, score/grade masking, non-leakage, permitted answer keys, immediate results, and independent policy combinations.
- **Result:** Partial against the full wishlist; immediate/never controls work, while scheduled release modes and separate feedback visibility remain.

## 2026-08-25 — Completed report review, notes, and Student notification

- **Area:** Faculty report management / Student notifications
- **Changed:** Expanded report status to open, reviewed, resolved, and dismissed; added status filtering, debounced autosave for resolution-note drafts, reopen controls, and optional notification after an explicit confirmation naming the student. Students now receive scoped report updates on their Overview. Failed note or notification writes remain visible and do not claim success.
- **Reason:** Complete the feedback loop so reporting leads to a traceable Faculty response rather than ending in an unacknowledged record.
- **Files:** `js/question-reports.js`, `html/faculty.html`, `html/student.html`, `css/shared-ui.css`, `tests/t_reports.js`
- **Verification:** Full automated suite — 586 assertions passing, 0 failing. New checks cover reviewed/dismissed status, filtering, note autosave, confirmed notification creation, Student scoping, and Student display.
- **Result:** Complete

## 2026-08-25 — Added Student question reports and Faculty resolution

- **Area:** Student examination / Faculty reports / authorization
- **Changed:** Students can report a specific question without leaving the attempt, choose one of six categories, and provide an explanation. Reports record the student, exam, question, attempt, category, and timestamp; duplicate open reports are rejected. Faculty gained a Reports navigation workspace scoped to exams they own, with open counts and resolve/reopen controls. Report storage and scoped queries live in `js/question-reports.js`.
- **Reason:** Give students a safe feedback path during an exam and ensure report content is visible only to the responsible Faculty user.
- **Files:** `js/question-reports.js`, `html/student.html`, `html/faculty.html`, `css/shared-ui.css`, `tests/harness.js`, `tests/t_reports.js`, `tests/t_nav.js`
- **Verification:** Full automated suite — 578 assertions passing, 0 failing. Ten focused checks cover report UI, stored context, duplicate prevention, ownership scoping, resolution persistence, and reopening.
- **Result:** Partial workflow complete; reviewed/dismissed states, resolution notes, filters, and notifications remain.

## 2026-08-25 — Added Faculty question catalogue tools

- **Area:** Faculty question-list workspace
- **Changed:** Added continuous question and point totals, text search, question-type filtering with visible result counts, and deep-copy duplication that assigns a new identifier and inserts the copy beside its source. Extracted catalogue calculation, filtering, and cloning into `js/question-catalog.js`.
- **Reason:** Make larger exams easier to scan and reuse without introducing shared-reference or identifier defects.
- **Files:** `js/question-catalog.js`, `html/faculty.html`, `css/shared-ui.css`, `tests/harness.js`, `tests/t_catalog.js`
- **Verification:** Full automated suite — 568 assertions passing, 0 failing. Nine focused checks cover totals, controls, text/type filtering, result counts, copy placement, identifiers, and deep cloning.
- **Result:** Complete for search, type filtering, totals, and duplication; validation filters and bulk actions remain.

## 2026-08-25 — Completed accessible image drag-and-drop questions

- **Area:** Faculty authoring / Student attempts / automatic grading / accessibility
- **Changed:** Added image-required drag-and-drop questions using stored label-to-target pairs. Students can drag with a pointer, select a token then activate a target on touch/keyboard, or use the native select embedded in every target. All paths share durable answer state, readable review output, and automatic grading.
- **Reason:** Complete the requested image-placement interaction without making drag gestures the only available input method.
- **Files:** `js/question-types.js`, `js/attempt.js`, `html/faculty.html`, `html/student.html`, `css/shared-ui.css`, `tests/t_types.js`
- **Verification:** Full automated suite — 559 assertions passing, 0 failing. Dedicated checks cover required images, authoring persistence, drag tokens, targets, select fallbacks, non-pointer placement, review, and awarded marks.
- **Result:** Complete

## 2026-08-25 — Added end-to-end matching questions

- **Area:** Faculty authoring / Student attempts / automatic grading
- **Changed:** Added matching-pair authoring with add/remove controls and validation for incomplete or duplicate answers. Students receive one accessible selector per left-side item; selections persist as a single answer, appear as readable pairings during review, and are automatically graded against the stored mapping. Matching comparison is owned by the shared question-types module.
- **Reason:** Implement the requested column-A-to-column-B interaction with durable state and deterministic grading.
- **Files:** `js/question-types.js`, `js/attempt.js`, `html/faculty.html`, `html/student.html`, `css/shared-ui.css`, `tests/t_types.js`
- **Verification:** Full automated suite — 552 assertions passing, 0 failing. Dedicated checks cover duplicate rejection, persistence, correct and swapped mappings, Student selectors, autosave, review output, and awarded marks.
- **Result:** Complete

## 2026-08-25 — Added configurable fill-in-the-blank questions

- **Area:** Faculty authoring / Student attempts / automatic grading
- **Changed:** Added Fill in the Blank questions requiring an `___` prompt marker and answer key. Faculty can independently control case, whitespace, and punctuation/symbol sensitivity. Students receive a focused single-line input; responses autosave, appear in review, and are automatically scored using normalized text comparison from the shared question-types module.
- **Reason:** Implement the requested underline-completion interaction with explicit, predictable grading rules instead of brittle raw string matching.
- **Files:** `js/question-types.js`, `html/faculty.html`, `html/student.html`, `css/shared-ui.css`, `tests/t_types.js`
- **Verification:** Full automated suite — 544 assertions passing, 0 failing. Dedicated checks cover missing markers, persisted answer keys, normalization settings, incorrect responses, Student input/autosave, and awarded marks.
- **Result:** Complete

## 2026-08-25 — Added automatically graded numeric questions

- **Area:** Faculty authoring / Student attempts / automatic grading
- **Changed:** Added Number questions with a required accepted value and optional non-negative tolerance, live Faculty preview, draft/edit restoration, purpose-built numeric Student input, autosave and review, and automatic boundary-inclusive scoring. Numeric comparison is owned by the shared question-types module.
- **Reason:** Support quantitative questions without treating them as manually graded text or relying on fragile string equality.
- **Files:** `js/question-types.js`, `html/faculty.html`, `html/student.html`, `tests/t_types.js`
- **Verification:** Full automated suite — 537 assertions passing, 0 failing. Dedicated checks cover invalid tolerance, numeric storage, exact boundary behavior, outside-tolerance rejection, Student input/autosave, and awarded marks.
- **Result:** Complete

## 2026-08-25 — Added end-to-end True/False questions

- **Area:** Faculty authoring / Student attempts / automatic grading
- **Changed:** Added a True/False authoring type with a fixed two-choice answer model, correct-answer setting, live preview, draft and edit restoration, Student rendering and autosave, review support, and automatic grading. Extracted shared type labels and choice construction into `js/question-types.js`.
- **Reason:** Add the requested question type as a complete workflow rather than a display-only control, while keeping type rules out of the page scripts.
- **Files:** `js/question-types.js`, `js/attempt.js`, `html/faculty.html`, `html/student.html`, `tests/harness.js`, `tests/t_types.js`
- **Verification:** Full automated suite — 529 assertions passing, 0 failing; eight dedicated assertions cover Faculty visibility, persistence, correct-answer restoration, Student labeling/autosave, and awarded points.
- **Result:** Complete

## 2026-08-25 — Added accessible question images and external resources

- **Area:** Faculty question authoring / Student examination
- **Changed:** Added hosted-image URL, alternative text, caption, external resource URL, and descriptive link fields. Media now appears in the live Faculty preview and Student exam; unsafe protocols and unsupported image extensions are rejected, missing alternative text blocks saving, external links use safe new-tab attributes, and failed images show a readable fallback while preserving the written prompt. Extracted validation and rendering into `js/question-media.js` rather than adding another inline subsystem.
- **Reason:** Support the requested external images and links without making questions inaccessible, unsafe, or dependent on a working image.
- **Files:** `js/question-media.js`, `html/faculty.html`, `html/student.html`, `css/shared-ui.css`, `tests/harness.js`, `tests/t_media.js`
- **Verification:** Full automated suite — 521 assertions passing, 0 failing. Media-specific coverage includes unsafe URL rejection, required alternative text, preview, persistence, safe links, Student rendering, and broken-image fallback.
- **Result:** Complete

## 2026-08-25 — Protected Faculty authoring and exam-setting changes

- **Area:** Faculty question authoring and general exam settings
- **Changed:** Added a live student-facing question preview; confirmation before a question-type change hides incompatible answer settings; dirty-state tracking for general settings; Save, Discard, and Continue Editing exit choices; and an impact summary before schedule, subject, timing, layout, or navigation changes when submissions exist. Exam writes now use the guarded data layer and failed writes keep the form open. Corrected edited exams being announced as newly created.
- **Reason:** Prevent accidental loss and make consequential settings changes deliberate without interrupting ordinary edits.
- **Files:** `html/faculty.html`, `js/ui.js`, `css/shared-ui.css`, `tests/t_authoring.js`
- **Verification:** Full automated suite — 511 assertions passing, 0 failing, including preview refresh, both question-type confirmation outcomes, all exit-dialog paths, impact counts, cancellation, and confirmed persistence.
- **Result:** Complete for submitted-attempt protection; publish and active-draft impact coverage remains optional.

## 2026-08-25 — Repaired broken buttons and hardened the prototype data layer

- **Area:** Admin / Faculty / Student / Shared UI
- **Changed:** Fixed seven non-working or misbehaving controls and rebuilt the localStorage data layer. Added `js/auth.js` as a single session gate (`requireRole`), removed the URL-based faculty identity, removed the fabricated student identity and fake enrolments, added cascading deletes and identifier migration, stopped written answers being auto-awarded full marks, began storing submitted answers, and removed the on-screen default-credentials box and login auto-fill.
- **Reason:** The prototype had no authentication gate at all on Admin and Faculty, scores were inflated, and submitted answers were discarded so nothing could ever be graded.
- **Notable defects fixed:**
  - Removing an MCQ option saved the question with **no correct answer**, marking every student wrong.
  - `admin.html` had a stray brace truncating `loadAll()`, so the allotment table never refreshed.
  - Anyone could impersonate any lecturer by editing `?facultyId=` in the address bar.
  - Deleting a user left their login active; changing an identifier locked them out.
  - The login page advertised the student password as `Cruz001` when the seeding rule produces `DelaCruz001`, so the printed credential never worked.
- **Files:** `html/admin.html`, `html/faculty.html`, `html/student.html`, `html/login.html`, `js/auth.js`
- **Verification:** 78 automated assertions at the time of the change, all passing; the original defects were each reproduced against the old code before fixing.
- **Result:** Complete
- **Remaining:** Folded into the entry above.

## 2026-08-25 — Added project progress tracking

- **Area:** Planning and documentation
- **Changed:** Added a project checklist, audit log, and completion-rate dashboard.
- **Reason:** Make remaining work and completion evidence visible and measurable.
- **Files:** `.plans/progress/checklist.md`, `.plans/progress/audit-log.md`, `.plans/progress/completion-rate.md`
- **Verification:** Confirmed all three trackers were created and align with the current plan.
- **Result:** Complete
- **Remaining:** Update the trackers whenever implementation or documentation status changes.

## 2026-08-25 — Revised the project plan

- **Area:** Plan
- **Changed:** Focused must-have work on the four assigned modules, repeated the HCI process for every module, added Week 9 integration testing, completion evidence, final deliverables, and a current implementation baseline.
- **Reason:** Align the roadmap with the assignment image and the actual prototype.
- **Files:** `.plans/plan.md`
- **Verification:** Confirmed all four modules, Week 9, per-module HCI work, deliverables, and baseline sections are present.
- **Result:** Complete
- **Remaining:** Implement and document the incomplete checklist items.

## 2026-08-25 — Initial code and DOCX review

- **Area:** Whole project
- **Changed:** No implementation files changed; current behavior and documentation were inspected.
- **Reason:** Compare the plan, assignment requirements, current code, and DOCX files.
- **Files:** `html/*.html`, `css/style.css`, `js/auth.js`, `tentative/*`, and available DOCX files
- **Verification:** Reviewed feature-related code, styles, resource references, and extracted DOCX contents where accessible.
- **Result:** Complete
- **Remaining:** Correct broken relative asset paths, unify role styling, finish missing module behaviors, and create the required HCI documentation.

## Audit rules

- Record only meaningful project changes; do not log every small keystroke.
- Never mark work complete without stating how it was verified.
- Mention affected files so changes are traceable.
- If work is reverted, retain the original entry and add a new reversal entry.
- Update `checklist.md` and `completion-rate.md` in the same change whenever a status changes.
## 2026-08-29 — Admin Dashboard-only overview scope

- **Cause:** A global `display:flex !important` rule kept the Dashboard panel visible after sidebar navigation set it to `display:none`.
- **Visibility:** System overview, application monitoring, site status, view controls, and management shortcut cards now render only while Dashboard is selected.
- **Monitoring:** Live sampling pauses on every Admin management page and resumes when returning to Dashboard.
- **Verification:** Added computed-visibility and monitoring-state regression checks across Dashboard and Student Management navigation.
## 2026-08-29 — Exams attached to weekly content

- Faculty can attach an existing subject examination from a week’s three-dot menu.
- The weekly reference opens the exam questions for faculty and the standard exam-details prompt for students.
- The examination remains independently available in the course Examinations section.
## 2026-08-29 — Weekly content readability and formatting

- Weekly content now stays expanded inside its week by default, removing the unnecessary second collapse level.
- Faculty can explicitly enable “Allow students to collapse this content” per content cell.
- Replaced separate Markdown/heading text modes with one content mode and a compact formatting toolbar for bold, italic, headings, lists, and links.
## 2026-08-29 — Unified Edit Week cell controls

- Edit Week now uses the same content kind, formatting toolbar, availability, prerequisite, and collapsible settings as Add Content.
- Added an icon-only Add cell action and a red trash action on every editable cell.
- Saving synchronizes added, edited, and explicitly deleted cells while preserving attached exam and file records.
## 2026-08-29 — Faculty Questions navigation repair

- Fixed Questions actions that rendered the question bank while leaving a different Faculty page visible.
- The shared question-management route now selects My Exams before rendering, including access from exam settings, Course Pages, and exam lists.
## 2026-08-29 — Dark-mode delete control

- Replaced the bright light-theme delete surface with a color-mixed danger surface derived from `--danger`, `--surface`, and `--line`.
- Replaced the platform-colored trash emoji visually with a monochrome CSS mask so the icon follows the current theme.
