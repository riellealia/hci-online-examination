# Additional UX and Examination Requirements

## Purpose and priority

This document expands `plan.md` with optional usability, authoring, navigation, review, and integrity features. The four assignment modules remain the priority.

- **Must:** necessary for a usable and reliable examination flow.
- **Should:** valuable after the required modules are stable.
- **Future:** advanced work that should not delay the core project.

## 1. Current usability improvements

- [x] Verify every visible button; remove or disable controls without an action.
- [x] Replace vague or missing prompts with clear instructions and feedback.
- [x] Give each major page obvious navigation and a current-location indicator.
- [x] Use consistent custom dialogs instead of mixing browser alerts and page messages.
- [~] Provide visible empty, loading, saving, saved, success, validation, and error states — empty, success, validation and error states done; saving/saved indicators arrive with autosave.
- [ ] Test representative Admin, Faculty, and Student tasks and record usability findings.

## 2. Student dashboard and exam details

### Dashboard — Must

- [x] Use a compact sidebar or top navigation for dashboard sections.
- [ ] Separate upcoming, active, submitted, pending-grade, graded, missed, and closed exams using filters or views.
- [x] Open an exam-details screen when an exam card or row is selected.
- [x] Communicate every status using text/icon as well as color.

### Details shown before starting

- Exam title, subject, Faculty, and instructions
- Allowed materials
- Number of questions and total points
- Passing grade as points and/or percentage
- Availability start and deadline
- Attempt time limit, when set
- Attempts allowed and remaining
- Navigation policy
- Score, submitted-answer, and correct-answer review policy
- Prerequisites
- Focus-monitoring rules and consequences

When special monitoring rules apply, require acknowledgement before starting. A disabled **Start Exam** button must explain why starting is unavailable.

## 3. Availability and timing

Keep these concepts separate:

- **Visibility:** when the listing can be seen.
- **Availability window:** when an attempt may start or continue.
- **Attempt duration:** time allowed after starting.
- **Effective end:** whichever occurs first—the availability deadline or attempt-duration deadline.

### Must

- [x] Faculty sets the availability start and deadline.
- [x] Faculty may set an attempt duration.
- [x] Show the active timer at the top-right of the exam page.
- [x] Label whether it is attempt time or time until the overall deadline.
- [x] Warn at thresholds such as 10, 5, and 1 minute remaining.
- [x] Autosubmit at the effective end and explain why.
- [x] Store timestamps consistently and display them in the user's local time zone.

### Should

- [ ] Apply one schedule to all selected sections or set schedules per section.
- [ ] Allow an authorized individual time extension.
- [ ] State how much time is available when an attempt starts close to the deadline.

## 4. Exam-taking layout and navigation

### Default layout

- [x] Show one question per page by default.
- [x] Let Faculty choose **one question per page** or **all questions on one page**.
- [x] Keep title, progress, save state, and timer visible.
- [~] Provide **Previous**, **Next**, **Flag**, **Report**, and **Review/Submit** controls — question reporting is not implemented.
- [x] Preserve answers when navigating.
- [x] Explain controls disabled by Faculty policy.

### Right-side question navigator

- [x] Use a partially collapsed handle on the right side.
- [x] Show numbered question cells when opened.
- [x] Mark current, answered, unanswered, and flagged questions with text/icon and color.
- [x] Open a selected question only when the navigation policy permits it.
- [x] Make it keyboard accessible and closable with Escape.
- [ ] Prevent it from hiding essential content on small screens.

### Faculty navigation modes

1. **Free navigation:** any available question may be opened.
2. **Sequential with review:** Previous and Next are available, but locked future questions cannot be skipped to.
3. **Forward-only:** continuing prevents return to earlier questions.

Disclose the rule before the attempt. In forward-only mode, confirm before permanently leaving a question.

## 5. Autosave, recovery, and connection loss

- [x] Autosave after every answer change using a short debounce.
- [x] Show **Saving**, **Saved**, or **Save failed**.
- [x] Preserve current question, answers, flags, start time, and remaining-time state after refresh.
- [ ] Warn before leaving or refreshing an active exam.
- [x] Define whether interrupted attempts may resume.
- [ ] Retain answers locally during connection loss, show an offline warning, and retry synchronization.
- [x] Never erase a saved answer because rendering or connectivity failed.
- [~] Record whether submission was manual, timed out, or triggered by an allowed integrity rule — manual and timeout recorded; integrity rules not implemented.

The local-storage prototype must disclose that its data is limited to the same browser and device.

## 6. Flagging, reporting, and submission

### Flags

- [x] Students can flag and unflag questions for personal review.
- [x] Flags persist across navigation and refresh.
- [x] Flag state appears in the navigator and submission review.

### Question reports

- [x] Report a question without leaving the exam or pausing the timer.
- [x] Categories: unclear wording, possible wrong answer, missing media, formatting, technical problem, or other.
- [x] Allow a short explanation.
- [x] Store exam, question, student, attempt, and timestamp automatically.
- [x] Faculty sees reports as open, reviewed, resolved, or dismissed and can filter by status.
- [x] Faculty can autosave a resolution note, resolve or reopen reports, and optionally notify the affected student after confirmation.

### Review and final submission

Selecting **Review/Submit** must not submit immediately.

- [x] List all question numbers and answered, unanswered, and flagged states.
- [~] Show answered, unanswered, and flagged totals — answered and unanswered totals are shown; flagged items are labelled individually.
- [x] Allow return when the navigation policy permits it.
- [x] Warn when unanswered questions remain.
- [x] Require an explicit **Submit Final Answers** action.
- [x] Prevent repeated clicks and duplicate submissions.
- [ ] Show a receipt with exam, student, timestamp, attempt number, and status.
- [x] Lock editing after submission unless Faculty reopens the attempt.

## 7. Result and review permissions

Faculty configures these independently:

- **Show score:** immediately, after deadline, after manual grading, on a chosen date, or never.
- **Show submitted answers:** yes or no.
- **Show correct answers:** immediately, after deadline, on a chosen date, or never.
- **Show Faculty feedback:** yes or no.

Always show a submission receipt. If written answers are pending, label an automatic MCQ subtotal as partial—not the final grade.

### Optional Faculty grading workspace

Manual grading is optional for this prototype. Faculty should define the correct answer, accepted answer, numeric tolerance, or marking guide while authoring each question so every supported objective question can be graded automatically.

- Multiple choice and true/false use the selected correct answer.
- Number questions use an exact value, accepted range, or tolerance.
- Short text uses Faculty-defined accepted answers and matching rules.
- Paragraph/essay responses cannot be graded reliably from a single expected answer; they remain pending unless Faculty chooses to grade them manually.
- Faculty may force manual review for any question when automatic matching is not appropriate.

If optional manual grading is implemented, it may use:

- A student/submission list on the left
- The selected submission and answers in the main area
- A grading inspector for points, remarks, rubric, and review status
- Autosaved draft marks
- A warning before leaving with an unsaved grading failure
- Confirmation before grades or remarks are released to students

## 8. Faculty exam settings

Group the form into manageable sections.

### General

- Title, subject, description, instructions, passing grade, and allowed materials
- Draft, published, closed, or archived status
- Attempts allowed
- Optional prerequisite exam or minimum prerequisite score

### Audience and scheduling

- Checklist of sections that can see the exam
- Checklist of sections that can access the exam
- One schedule for all selected sections or schedules per section
- Individual visibility, access, or extra-time exceptions

Visibility and access are different: a visible exam may remain locked until availability begins.

### Timing and navigation

- Availability start and deadline
- Optional attempt duration and warning thresholds
- One-question or all-questions layout
- Free, sequential-with-review, or forward-only navigation
- Question and answer-choice randomization

### Attempts and review

- Attempts allowed and whether highest, latest, or first attempt counts
- Resume interrupted attempts: allowed or prohibited
- Autosubmit at effective end
- Score, answer, correct-answer, and feedback visibility
- Optional delayed-review date

### Integrity and accommodations

- Focus monitoring, clipboard deterrence, and fullscreen request toggles
- Allowed violation count and consequence
- Individual extra time or relaxed-monitoring accommodation

Provide helper text for high-impact settings. Warn before published-exam changes that could affect existing attempts.

### Responsive Faculty authoring workspace

Use an application-style workspace rather than one long editing form.

#### Desktop and tablet layout

- [~] Place primary authoring navigation on the left and general exam tools/settings on the right — Back is left and question settings are right; the wider general-exam tool rail remains.
- [x] Use icons as the primary visual treatment, but give every icon an accessible name, tooltip, and visible selected state.
- [ ] Keep destructive actions visually separated from ordinary navigation.
- [x] Allow the side navigation to collapse so the question canvas can use the full width.
- [~] Keep the active exam, active question, save state, preview, and publish status visible — active question and save state are visible; exam/preview/publish context remains.

Recommended left navigation:

- Back to exams
- Question list
- Add question
- Reorder questions
- Preview exam

Recommended right-side general tools:

- General exam settings
- Audience and section access
- Schedule and timer
- Attempts and navigation policy
- Results and review permissions
- Integrity and accommodations
- Publish status

#### Mobile layout

- [x] Move the most important navigation actions to a fixed bottom bar.
- [x] Limit the bottom bar to approximately four or five primary actions; place less frequent actions in a labelled **More** menu.
- [x] Account for device safe areas and prevent the bar from covering form fields or buttons.
- [x] Open settings as a full-height sheet or page instead of squeezing two columns onto a narrow screen.
- [x] Preserve the current question and scroll position when switching between editor and settings.

Icons must not be the only way to understand an action. On narrow screens, use short labels below the icons. Tooltips alone are insufficient because touch users cannot reliably hover.

### Two-column question editor

The question content is the primary workspace.

- [x] Default to a full-width question editor when the question-settings inspector is closed.
- [x] Selecting the **Question Settings** icon opens an inspector as the second column.
- [x] The main column contains the prompt, answer controls, media, and a live student preview.
- [x] The inspector contains only settings that apply to the active question.
- [x] Closing the inspector returns the main editor to full width without losing data or position.
- [ ] Let the inspector be resized within reasonable minimum and maximum widths on larger screens.
- [x] On mobile, open the inspector as a full-screen sheet with a clear return action.
- [x] Warn before switching question type when existing answers or options would be discarded or converted.

Per-question inspector groups:

- Question type
- Points and required/optional response
- Correct answer or marking guide
- Case, whitespace, punctuation, and numeric-tolerance rules when relevant
- Number and behavior of answer choices when relevant
- Randomization
- Manual-review override
- Image, link, alternative text, and caption settings
- Question visibility or section override only if the system supports it

Do not show irrelevant controls. For example, case sensitivity must not appear for multiple-choice or essay questions.

### Save and exit behavior

Use different save policies for question content and general exam settings.

#### Question editing

- [x] Autosave question content and per-question settings after a short pause.
- [x] Show **Saving**, **Saved**, or **Save failed** in the workspace header.
- [ ] Save before changing questions when possible, and block navigation only when saving fails.
- [x] Keep a recoverable local draft if persistence fails.
- [x] Do not show repetitive confirmation dialogs after every small question edit.

#### General exam settings

- [x] Treat changes as a draft until the Faculty user selects **Save Changes**.
- [x] When leaving with unsaved changes, show one dialog with **Save and Exit**, **Discard Changes**, and **Continue Editing**.
- [x] Require an additional impact confirmation for exam-setting changes that affect submitted attempts.
- [~] The impact confirmation summarizes changed settings and affected submissions; section counts and reversibility guidance remain.
- [ ] Disable repeated submissions while saving and keep the user on the page if saving fails.

Avoid two identical confirmation dialogs. “Double confirmation” should mean a normal save followed by a specific impact confirmation for a dangerous action—not forcing two confirmations for ordinary edits.

## 9. Question authoring

### Implement first

- [x] Multiple choice with configurable choices
- [x] True or false
- [x] Short text
- [x] Paragraph or essay
- [x] Number input with an accepted value and optional tolerance

### Future question types

- [x] Matching column A to column B
- [x] Fill in the blank with configurable case, whitespace, and symbol sensitivity
- [x] Image-based drag and drop with keyboard, touch, and native-select alternatives

Matching and drag-and-drop require more complex authoring, accessibility, validation, responsive layout, and scoring; they should not delay the core flow.

### Shared question settings

- Prompt, optional instructions, points, and required/optional response
- External link with descriptive text
- Uploaded or hosted image with alternative text and optional caption
- Manual-review override and Faculty-only marking note
- Randomization group

Validate media URLs and file types, preview media, and show a broken-media state. Never make an image the only way to understand a question.

### Short-text grading

Faculty may configure accepted answers, case sensitivity, whitespace normalization, punctuation/symbol sensitivity, exact/contains matching, and manual review for near matches. Paragraph answers normally require manual grading.

### Multiple choice

- Minimum two choices and a reasonable maximum, such as ten
- Exactly one correct answer for single-choice questions
- Require a correct answer before publication
- Optional answer-choice randomization

## 10. Focus and integrity monitoring

### A website can

- Request fullscreen.
- Detect fullscreen exit while the page remains active.
- Detect some tab switches or focus loss.
- Discourage ordinary selection, copying, pasting, dragging, and context-menu use.
- Warn, record incidents, and apply a disclosed configured consequence.

### A website cannot reliably prevent

- Operating-system screenshots or screen recording
- Switching applications or opening another browser
- Permanently leaving fullscreen
- Developer tools or accessibility-level clipboard methods
- Use of another device, notes, or a camera

Call this **Focus and Integrity Monitoring**, not a secure or lockdown browser. True lockdown requires managed kiosk software or a dedicated application such as Safe Exam Browser.

### Safe behavior

- [ ] Faculty explicitly enables monitoring per exam.
- [ ] Disclose monitored events and consequences before starting.
- [ ] Warn and log the first incident.
- [ ] Apply the configured rule to later incidents: warn, notify Faculty, or submit.
- [ ] Never submit on one focus loss; system dialogs and assistive tools can trigger it.
- [ ] Provide an accommodation or alternative mode.
- [ ] Do not block keyboard navigation, screen readers, zoom, or essential accessibility tools.

## 11. Accessibility, privacy, and data handling

- [ ] Make the entire exam usable by keyboard.
- [ ] Move focus predictably during navigation and dialogs.
- [ ] Announce question number, type, points, save state, timer warnings, and errors to screen readers.
- [ ] Give images meaningful alternative text.
- [ ] Do not rely only on color, animation, or sound.
- [ ] Preserve controls and content when zoomed or used on smaller screens.
- [ ] Tell students which attempt, report, and monitoring data is collected.
- [ ] Restrict answers, scores, reports, and monitoring records to authorized roles.
- [ ] Define retention for reports and monitoring events.
- [ ] Never expose correct answers without review permission.

## 12. Minimum acceptance scenarios

1. Faculty creates an exam for selected sections with schedule, duration, navigation, attempts, passing grade, and review permissions.
2. Student reads details, acknowledges special rules, and starts only during availability.
3. Answers, flags, position, and time state survive navigation and refresh.
4. The effective end automatically submits the correct attempt.
5. Submission review identifies unanswered and flagged questions and requires confirmation.
6. Results obey visibility settings and distinguish pending manual grading.
7. A question report reaches Faculty without ending or pausing the attempt.
8. A monitored incident is disclosed, recorded, and handled by the configured rule.
9. A keyboard-only user completes the exam flow.
10. Refresh or connection loss does not silently erase saved answers.
11. On desktop, Faculty opens and closes the question-settings inspector without losing edits; on mobile, the same settings remain usable in a full-screen sheet.
12. Question changes autosave visibly, while leaving unsaved general settings offers Save, Discard, and Continue Editing.

## 13. Recommended implementation order

1. Fix remaining broken controls, prompts, navigation, and inconsistent UI.
2. Add exam details and the formal timing model.
3. Build one-question navigation, autosave, flags, and submission review.
4. Build the responsive Faculty authoring workspace and two-column question inspector.
5. Add Faculty audience, attempt, timing, navigation, and review settings.
6. Implement result permissions and manual-grading behavior.
7. Add question reporting and resolution.
8. Add true/false, number, and improved short-text questions.
9. Add optional focus monitoring with accommodations.
10. Add advanced question types only after usability testing.

## 14. Additional workspace and safety requirements

### Admin management workspace

- [x] Manage sections as separate records with a normalized unique section ID and name.
- [x] Let Student creation/editing preserve multiple sections for irregular per-subject enrolment instead of accepting free-text names.
- [x] Open an existing section to assign one or more existing subjects to it.
- [x] Model each section-subject offering with its own unique ID and one professor; allow the same subject to have different professors by section and irregular students to enroll in different sections per subject.
- [ ] Use consistent sidebar navigation on desktop and bottom navigation on mobile.
- [~] Open record details in a side inspector or focused editor instead of stacking many dialogs — the Student profile is a focused full-page view; other Admin record types remain.
- [~] Add search, filters, sorting, and scalable result navigation — reusable cross-column search, field sorting, ascending/descending direction, grouping, and continuous scrolling are complete; domain-specific filters and total-result count remain. Pagination was deliberately removed in favor of the requested scroll model.
- [ ] Support bulk selection only where it saves meaningful work.
- [ ] Preview CSV imports and show valid, invalid, duplicate, and skipped rows before committing.
- [ ] Before deletion, transfer, or bulk changes, summarize affected subjects, enrollments, exams, and accounts.
- [ ] Provide Undo for low-risk reversible actions when practical.

### Faculty question-list workspace

- [ ] Support drag-and-drop and keyboard-accessible question reordering.
- [x] Duplicate a question without duplicating its identifier.
- [ ] Support multi-select and carefully scoped bulk actions.
- [~] Filter questions by text and type; validation-problem and manual-review filters remain.
- [x] Show total question count and total points continuously.
- [ ] Mark missing points, missing correct answers, broken media, and invalid settings before publication.
- [ ] Show draft, valid, warning, and published states using icons/text and color.

Bulk deletion requires confirmation. Reordering and removal of an unsaved option should prefer Undo over repeated confirmation dialogs.

### High-impact exam-setting changes

Show an impact summary before Faculty:

- Shortens an active availability window or deadline
- Changes the attempt duration
- Removes a section or student's access
- Changes navigation to forward-only
- Reduces allowed attempts
- Hides previously released scores or answers
- Changes a correct answer after submissions exist
- Reopens, resets, invalidates, or deletes attempts

The summary must identify how many sections, students, active attempts, and submissions are affected. Require stronger authorization or confirmation for attempt resets and mass changes.

### Publish review

Publishing uses a deliberate three-step flow:

1. **Save Draft**
2. **Review Exam**
3. **Confirm Publish**

The review checks:

- Missing or empty questions
- Missing correct answers or grading rules
- Invalid or zero points
- Total points and passing-grade validity
- Broken or inaccessible media
- Schedule conflicts or an expired deadline
- No selected audience
- Attempt, navigation, timing, result-review, and integrity settings
- Warnings about changes that affect existing attempts

Provide **Preview as Student** before publication. Publishing must be blocked for errors and may proceed with acknowledged non-critical warnings.

### Student dashboard additions

- [ ] Provide filters for active, upcoming, submitted, pending-grade, and graded exams.
- [ ] Add a notification center for schedule changes, released results, reopened attempts, and Faculty report responses.
- [x] Show a clear resume-attempt prompt when an unfinished attempt exists.
- [ ] Design explicit empty, unavailable, locked, missed, and connection-error states.
- [ ] Keep dashboard preferences and the last selected filter as low-risk autosaved preferences.

### Question-report management

If reporting is implemented, Faculty receives:

- A filterable report list
- The reported question, exam, student, attempt, category, and timestamp
- Status controls for new, reviewed, resolved, and dismissed
- An autosaved resolution-note draft
- A count of potentially affected students and submissions
- Confirmation before notifying students or changing awarded points

Student identities and report content must be visible only to authorized users.

### Results, regrading, and grade release

Use preview and impact confirmation before:

- Releasing scores or written feedback
- Regrading submissions after a correct-answer change
- Resetting or reopening an attempt
- Granting a retake
- Exporting grade data

Show affected student and submission counts. A regrade must preserve the previous score and explain the reason for the change.

### System-wide save and confirmation policy

Use one consistent policy:

- **Autosave:** student answers and flags, question drafts, optional grading drafts, report-resolution drafts, and layout preferences.
- **Manual Save:** general exam settings, user records, subject records, and allotment forms.
- **One confirmation:** final exam submission, publishing, grade release, imports, and ordinary destructive actions.
- **Impact confirmation:** irreversible deletion, attempt reset, mass update, regrading, and changes affecting active attempts or existing submissions.
- **Undo:** low-risk reversible actions such as reordering, dismissing notifications, or removing an unsaved choice.

Do not show confirmations for harmless navigation. Do not silently autosave high-impact general settings.

### Exam and question version history

Version history is strongly recommended once published exams can be edited.

- [ ] Create an immutable published version or snapshot used by each attempt.
- [ ] Preserve the exact question text, choices, media references, points, and grading rules that a student originally received.
- [ ] Record who changed an exam or question, when it changed, and a short reason.
- [ ] Do not retroactively change completed attempts unless Faculty explicitly starts a regrade.
- [ ] Allow Faculty to compare the current draft with the published version.
- [ ] Let Faculty restore a previous draft without erasing the audit trail.
- [ ] Require a new publish action before draft changes reach students.

For the local-storage prototype, version history may be demonstrated with snapshots and an activity list rather than a production-grade audit system.

### Cross-role application audit log

The application audit log is different from `.plans/progress/audit-log.md`. The project file records development work; the application log records actions performed inside the Online Examination System.

#### Admin view

Admin may view the complete application audit log, including:

- Admin creation, editing, deletion, import, transfer, and allotment actions
- Faculty exam, question, publishing, scheduling, grading, regrading, report-resolution, and attempt-management actions
- Student attempt lifecycle events such as start, resume, submit, timeout, and configured integrity incidents
- Successful logins, logouts, and repeated failed-login events when appropriate
- System outcomes such as rejected imports, validation failures, and failed saves

Admin can filter by date range, actor, role, action, module, affected record, subject, exam, student, and success/failure outcome. Admin must not be able to silently edit an audit entry.

#### Faculty view

Faculty may view only audit events within their authorized scope:

- Their own exam and question changes
- Publishing and schedule changes for their assigned subjects
- Student attempts and submissions for exams they own
- Grade, feedback, regrade, retake, and attempt-reset actions they performed or are authorized to review
- Question reports and resolution actions for their exams
- Relevant integrity incidents for their exam attempts

Faculty must not see unrelated Faculty activity, unrelated subjects, Admin account-management details, or authentication events belonging to other users.

#### Student visibility

Students do not receive the administrative audit log. They may see a limited personal activity history containing their own attempt start, autosave/recovery, submission receipt, timeout, result release, retake grant, and disclosed integrity incidents.

#### Required audit-entry fields

Every entry should contain:

- Unique event identifier
- Timestamp and displayed time zone
- Actor identifier and role
- Action name and outcome
- Affected entity type and identifier
- Subject and exam identifiers when relevant
- Safe before/after summary for meaningful changes
- Optional reason for high-impact actions
- Correlation or attempt identifier for related events

Never record passwords, full authentication secrets, or unnecessary copies of student answers in the audit message. Link authorized users to the protected record instead.

#### Integrity and retention rules

- [ ] Append entries rather than editing existing events.
- [ ] Require a reason for attempt resets, regrades, reopened submissions, mass changes, and published-exam corrections.
- [ ] Record both successful and failed high-impact operations.
- [ ] Use a consistent controlled list of action names instead of arbitrary labels.
- [ ] Provide filtering, pagination, and a clear empty state.
- [ ] Restrict export to Admin or another explicitly authorized role.
- [ ] Define retention and deletion rules for audit, login, report, and integrity-monitoring events.
- [ ] Preserve a safe display snapshot or tombstone so an event remains understandable after its related record is deleted.
- [ ] Log access to the audit log itself and to especially sensitive exports.
- [ ] Alert Admin to suspicious patterns such as repeated failed logins, mass deletion, or many attempt resets without making automatic accusations.
- [ ] Clearly distinguish a user action from an automatic system event.

Local storage can demonstrate the interface and event model, but it cannot provide a tamper-proof audit trail because a user can modify browser storage. Production audit integrity requires server-side, append-only storage and authorization checks.

## 15. Modular architecture and separation of concerns

Do not add all new behavior directly to `admin.html`, `faculty.html`, or `student.html`. Those pages already contain substantial markup, styling, and behavior; continuing to place every feature inline would create a monolith that is difficult to test and change safely.

Use feature-based modules with one clear responsibility each. Separation should follow actual behavior boundaries—not create dozens of tiny files that merely move code around.

### Required architectural layers

#### Application shell

Owns page startup, role layout, navigation, and composition only.

- `admin-app.js`
- `faculty-app.js`
- `student-app.js`

These entry files initialize features. They should not contain full CRUD, grading, timing, audit, or question-authoring implementations.

#### Shared platform modules

- `auth.js` — session validation, role gates, login, and logout
- `storage.js` — safe reads/writes, schema version, migrations, and storage errors
- `permissions.js` — centralized role and ownership checks
- `validation.js` — reusable validation helpers and normalized errors
- `ui.js` — dialogs, toasts, loading states, focus management, and shared UI behavior
- `router.js` — dashboard section navigation and URL/state restoration if needed
- `events.js` — small event bus only when features genuinely need loose communication
- `dates.js` — time-zone-safe parsing, display, deadline, and duration calculations
- `ids.js` — collision-resistant prototype identifiers

No feature module should parse `currentUser` independently or invent its own permission rules.

#### Data repositories

Only repository modules directly read or write their owned records. UI modules call repository functions instead of using `localStorage` directly.

- `faculty-repository.js`
- `student-repository.js`
- `subject-repository.js`
- `allotment-repository.js`
- `exam-repository.js`
- `question-repository.js`
- `attempt-repository.js`
- `report-repository.js`
- `audit-repository.js`

Repository operations must preserve related records or call an explicit domain service that does so. Avoid scattered storage-key strings across page scripts.

#### Domain services

Domain services contain rules spanning multiple repositories:

- `allotment-service.js` — assignment validation, transfer, removal, and consistency
- `exam-service.js` — draft, publish, schedule, audience, attempt, and version rules
- `question-service.js` — type conversion, validation, ordering, duplication, and scoring configuration
- `attempt-service.js` — start, resume, autosave, deadline, submission, and duplicate prevention
- `grading-service.js` — objective grading, pending/manual review, release, and regrade
- `audit-service.js` — normalized event creation, role-scoped queries, and sensitive-data filtering
- `report-service.js` — question-report creation, authorization, status, and resolution
- `integrity-service.js` — disclosed focus/fullscreen events and configured consequences

Do not put DOM selectors or rendered HTML inside domain services.

#### Feature controllers and views

Each major interface feature gets its own controller/view pair or cohesive feature module:

- Admin record management
- Admin allotment management
- Admin audit viewer
- Faculty exam list
- Faculty exam settings
- Faculty question list/editor
- Faculty publish review
- Faculty submissions/results
- Faculty question reports
- Student dashboard
- Student exam details
- Student attempt runner
- Student submission review
- Student results/history

Controllers coordinate UI events and services. Views render and update the DOM. Neither should own raw persistence rules.

#### Shared components

Reusable components should cover:

- App shell and responsive navigation
- Icon button with tooltip and accessible label
- Side inspector and mobile sheet
- Dialog and impact-confirmation dialog
- Form field and inline validation
- Status badge
- Data table, filters, pagination, and empty state
- Save-state indicator
- Timer and warning banner
- Question navigator
- Submission receipt

Use shared CSS component files and role theme variables. Do not copy a component's styles into each HTML page.

### Suggested project structure

```text
html/
  admin.html
  faculty.html
  student.html

css/
  tokens.css
  base.css
  layout.css
  components.css
  exam-runner.css
  role-themes.css

js/
  apps/
    admin-app.js
    faculty-app.js
    student-app.js
  platform/
    auth.js
    storage.js
    permissions.js
    validation.js
    ui.js
    dates.js
    ids.js
  repositories/
    exam-repository.js
    question-repository.js
    attempt-repository.js
    audit-repository.js
  services/
    exam-service.js
    question-service.js
    attempt-service.js
    grading-service.js
    audit-service.js
  features/
    admin/
    faculty/
    student/
  components/
    dialog.js
    inspector.js
    save-state.js
    question-navigator.js
```

This is a target organization, not a requirement to create every empty file immediately. Add a module when a real responsibility is extracted into it.

### Dependency rules

- App entry points may depend on feature modules and shared components.
- Feature modules may depend on domain services and shared components.
- Domain services may depend on repositories and platform utilities.
- Repositories may depend on `storage.js`, but never on views or page-specific code.
- Shared components must not contain Admin-, Faculty-, or Student-specific business rules.
- Lower layers must not import higher layers.
- Avoid circular dependencies, shared mutable globals, `eval`, and duplicated business rules.
- Prefer exported functions with explicit inputs and outputs over functions that silently read global page state.

### Audit separation

Audit logging must be a cross-cutting service, not copied into every feature.

- Feature/domain operations call `audit-service.js` after a successful transaction and after relevant failures.
- `audit-service.js` normalizes action names and removes sensitive fields.
- `audit-repository.js` owns audit persistence and scoped queries.
- Admin and Faculty audit viewers use the same records but different permission-filtered queries.
- Audit failures must not silently corrupt the primary operation; define whether to fail safely or surface a visible warning.

### Transaction-like operations

Operations that update several local-storage collections must be coordinated in one service, including:

- Faculty/student identifier changes
- Subject deletion
- Allotment transfer
- Exam publication and version creation
- Final submission
- Attempt reset or reopen
- Correct-answer changes and regrading

Validate first, construct the complete next state, then commit related writes together as closely as the prototype permits. Keep a recovery snapshot when partial writes could leave inconsistent data.

### Test boundaries

- Unit-test domain rules without loading full HTML pages.
- Test repositories with isolated storage fixtures.
- Test permission filtering for Admin, Faculty, and Student explicitly.
- Test feature controllers with representative DOM fixtures.
- Keep a small end-to-end flow for login, authoring, publication, attempt, submission, and result release.
- Every bug involving a domain rule should receive a regression test at the lowest useful layer.

### Incremental migration order

1. Move remaining inline scripts and page-level shared styles into external files without changing behavior.
2. Centralize storage access, identifiers, dates, authentication, permissions, and validation.
3. Extract repositories from Admin, Faculty, and Student pages.
4. Extract exam, question, attempt, grading, and allotment rules into services.
5. Extract shared dialogs, inspectors, save indicators, tables, and navigation components.
6. Build new optional features only through the new module boundaries.
7. Remove obsolete duplicated code after tests confirm parity.

### Architecture completion criteria

- [ ] Page entry files mainly compose features and remain reasonably small.
- [ ] No page directly writes domain collections to local storage.
- [ ] Each storage collection has one repository owner.
- [ ] Authentication and authorization checks are centralized.
- [ ] Exam timing and grading rules have one implementation each.
- [~] Admin and Faculty audit views share one audit service with scoped permissions — the shared service and global Admin viewer are implemented; the scoped Faculty viewer remains.
- [ ] Shared controls are implemented once and themed by variables.
- [ ] Domain services can be tested without a browser page.
- [ ] New features do not require editing all three role pages.
- [ ] Architecture and ownership are documented in a short module map.
