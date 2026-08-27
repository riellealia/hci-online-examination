# Online Examination System Plan

## Project goal and scope

This is a desktop-first HCI prototype for the four required modules:

1. Creation of assigned faculty and subjects
2. Subject allotment
3. Modification of questions
4. Conducting examinations

The users are Admin, Faculty, and Student. Local storage may serve as the prototype data layer; a production backend is outside the required scope.

## Shared interface and role identity

All roles must share layout principles, typography, spacing, control shapes, form behavior, and accessibility rules. One restrained accent color may identify each workspace:

- **Admin:** muted blue
- **Faculty:** muted teal
- **Student:** muted green

Only the accent and role-specific content should change. Buttons, cards, tables, dialogs, navigation, and forms should remain structurally consistent. Status colors must retain the same meaning across roles, and color must not be the only status indicator.

Use soft-rounded controls, visible keyboard focus, readable contrast, clear labels, and text or icons alongside status colors.

## Authentication and role access

- Provide Admin, Faculty, and Student login entry points.
- Validate both credentials and the selected role.
- Prevent users from opening another role's dashboard.
- Clear the session during logout.
- Show a clear error when authentication fails.

## Feature priority

### Must demonstrate

These features directly support the four required modules.

#### Admin

- Create, list, edit, and delete faculty, subject, and student records.
- Assign one or more faculty members to a subject.
- Assign a student to a subject and its assigned faculty member.
- Edit, transfer, or remove an allotment while keeping related prototype records consistent.
- Reject missing, duplicate, or invalid assignments.

#### Faculty

- View assigned subjects and enrolled students.
- Create, list, edit, and delete exams.
- Provide an exam title, subject, instructions, date, start time, and end time.
- Add, list, edit, delete, and reorder questions.
- Support multiple-choice and written-answer questions.
- Set points and a correct or expected answer where applicable.
- Preview an exam and its questions before use.
- add/edit delete a subject, added subject makes a 5 digit unique id

#### Student

- View enrolled subjects and available examinations.
- View exam instructions, schedule, and total points.
- Open an exam only during its allowed time window.
- Answer multiple-choice and written-answer questions.
- Review answers before submission.
- Confirm final submission and prevent accidental duplicate submission.
- See an automatically calculated multiple-choice result and a pending state for written answers.

### Should demonstrate

- Import roster, subject, allotment, or question data from CSV.
- Preview imported data before saving it.
- Select sections or individual students allowed to view an exam.
- Manually grade written answers and add remarks.
- Show student score and grade history.
- Show an upcoming-work list and simple calendar.
- Show due-today reminders inside the application.
- Search, filter, and sort major tables and lists.
- Provide clear empty, validation, confirmation, loading, success, and error states.
- Show text-and-color statuses for upcoming, active, submitted, pending, graded, and overdue exams.
- Support smaller screens while keeping desktop as the primary target.

### Future enhancements

- Audit logging.
- Subject descriptions, rules, curriculum, links, attachments, and learning materials.
- Term-wide subject access periods beyond individual exam schedules.
- Native desktop or mobile push notifications.
- Full XLSX, DOCX, and PDF import and validation.
- Automatic essay grading.
- Advanced analytics, commonly missed-question reports, and exports.
- Real backend authentication, database persistence, and synchronization.
- Fine-grained permissions beyond the three primary roles.

## Required HCI work for every module

The assignment states that the project requirements are the same for all modules. Each module must therefore produce:

1. **Requirements:** users, goals, inputs, outputs, rules, and constraints.
2. **Analysis diagrams:** the relevant flowchart, ERD updates, and role storyboard.
3. **Interface design:** screens, controls, forms, validation states, confirmation dialogs, and error states.
4. **Report:** design and implementation evidence, test results, limitations, and revisions after evaluation.

These are documentation and presentation deliverables, not additional website pages.

## Module schedule

### Module 1: Creation of assigned faculty and subjects — Weeks 1–4

- Identify Admin requirements for maintaining faculty, student, and subject records.
- Produce the Module 1 flowchart, ERD entities/relationships, and Admin storyboard.
- Design the dashboard, tables, forms, validation, and deletion dialogs.
- Implement and test record CRUD and role-based access.
- Complete the Module 1 report section with screenshots and test evidence.

**Completion evidence**

- Admin can add, view, edit, and delete each required record type.
- Required fields and duplicate identifiers are rejected clearly.
- Identifier changes and deletions do not leave invalid login or assignment records.

### Module 2: Subject allotment — Weeks 5–8

- Identify allotment requirements and business rules for all affected roles.
- Update the flowchart, ERD relationships, and role storyboards.
- Design allotment forms, empty states, validation, and transfer/removal dialogs.
- Implement faculty-to-subject and student-to-subject allotment.
- Display assignments in the appropriate Admin, Faculty, and Student views.
- Complete the Module 2 report section with screenshots and test evidence.

**Completion evidence**

- Only an assigned faculty member can be selected for a subject allotment.
- Duplicate, missing, and conflicting allotments are rejected.
- Editing, transferring, or removing an allotment updates every affected view.

### Integration and usability review — Week 9

- Integrate Modules 1 and 2.
- Check navigation, terminology, data consistency, and role restrictions.
- Conduct a short usability evaluation with representative tasks.
- Record findings and design revisions before Module 3.

### Module 3: Modifying questions — Weeks 10–13

- Identify Faculty requirements for maintaining exams and questions.
- Update the flowchart, ERD, and Faculty storyboard.
- Design exam forms, question controls, lists, previews, validation, and deletion dialogs.
- Implement exam creation and question creation, editing, deletion, reordering, and preview.
- Support multiple-choice and written questions with points and expected answers.
- Complete the Module 3 report section with screenshots and test evidence.

**Completion evidence**

- Faculty sees only appropriate assigned subjects and students.
- An exam cannot be saved without its required details and schedule.
- Questions can be added, edited, deleted, reordered, and previewed.
- MCQs identify a correct option; written questions preserve a marking guide.

### Module 4: Conducting examinations — Weeks 14–17

- Identify requirements for access, answering, submission, scoring, and feedback.
- Update the flowchart, ERD, and Student/Faculty storyboards.
- Design exam details, answering, answer review, submission confirmation, results, and pending-grade states.
- Implement schedule enforcement, answering, submission, automatic scoring, and written-answer storage.
- Complete the Module 4 report section and assemble the final report.

**Completion evidence**

- Student sees only exams for enrolled subjects or permitted sections.
- An exam cannot open before its start time or after its end time.
- Answers are saved once and associated with the correct student and exam.
- Multiple-choice answers are scored correctly.
- Written answers are stored and shown as awaiting manual grading.

## Final deliverables checklist

- [ ] Requirements analysis for all four modules
- [ ] Main and module-level flowcharts
- [ ] ERD covering all implemented relationships
- [ ] Admin, Faculty, and Student storyboards
- [ ] Interface and control designs
- [ ] Forms, validation states, and dialog-box designs
- [ ] Module test cases and usability findings
- [ ] Screenshots or prototype evidence for every completion criterion
- [ ] Final project report

## Current implementation baseline

Already present:

- Role-based login and dashboard protection
- Faculty, student, and subject CRUD
- Faculty-subject and student-subject allotment
- Faculty exam and question management
- Multiple-choice and written-answer questions
- CSV preview/import flows
- Student exam access, submission, automatic MCQ scoring, and pending written-answer results

Incomplete or requiring verification:

- Correct HTML paths to the shared CSS, authentication script, logo, and background.
- Replace page-level styling with shared components and role accent variables.
- Apply the muted blue, teal, and green accents consistently.
- Implement or verify question reordering and exam preview.
- Add explicit exam targeting if it remains in scope.
- Add answer review/navigation and duplicate-submission protection.
- Verify access-window enforcement at exact start and end times.
- Add consistent validation, empty, error, success, and confirmation states.
- Complete the HCI diagrams, storyboards, designs, test evidence, and report.

## Implementation rules

- Prioritize the four required modules before optional features.
- Use shared design tokens and components; role colors are accents, not separate visual systems.
- Keep role-specific features behind the authentication gate.
- Preserve related records when identifiers or assignments change.
- Do not mark a feature complete until its completion evidence is demonstrated.
- Treat the DOCX code copies as references or backups, not as substitutes for required HCI documentation.
