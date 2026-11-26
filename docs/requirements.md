# Requirements Analysis — New Era University Online Examination System

## 1. System Overview and Goals
The New Era University Online Examination System is an enterprise-grade Human–Computer Interaction (HCI) prototype engineered to streamline university learning, digital examination, grading, and academic governance.

The system enforces role-based access control (RBAC), academic integrity, collision-free weekly scheduling, multi-tiered approval workflows, and fault-tolerant examination taking with persistent draft recovery.

---

## 2. User Roles and Persona Profiles

| Role | Primary Responsibility | Key Operational Workspaces |
|---|---|---|
| **Administrator** | Governance, system maintenance, user accounts, role permissions, academic calendar, system-wide audit logging. | `admin.html` (Accounts, Roles, Semesters, Maintenance, Audit Logs) |
| **College Dean** | Academic supervision, personnel hiring/appointment, approving subject offerings, approving student overloads, college analytics. | `dean.html` (Personnel, Approvals, Analytics, Activity Logs) |
| **Faculty Coordinator** | Subject offering creation, section allotments, schedule conflict resolution, professor assignment requests, enrollment monitoring. | `coordinator.html` (Offerings, Sections, Schedules, Requests, Enrolment) |
| **Professor** | Examination authoring, question banks, exam timing/settings, grading written answers, student roster performance review. | `professor.html` / `faculty.html` (Exams, Questions, Grading, Roster) |
| **Student** | Enrolled subject viewing, sitting timed examinations, question flagging, review & submission, immediate analytics. | `student.html` (Dashboard, Exam Runner, Review, Results) |

---

## 3. System-Wide Non-Functional Requirements & Constraints

1. **Security & Session Management:**
   * Single unified entry point at `login.html` with automatic role-based dispatch.
   * Opaque session tokens sealed on the server side with configurable inactive-session timeouts.
   * Centralized session revocation (`revokedSessions`) ensuring immediate logout across all devices.
   * Sign-in rate limiting and brute-force protection.
   * Role and route protection gates (`requireRole`) preventing unauthorized direct URL navigation.

2. **Persistence & Data Integrity:**
   * Primary persistent database: Supabase PostgreSQL relational schema with automatic synchronization.
   * Resilient fallback: Embedded Node.js SQLite persistence engine for offline/local environments.
   * Zero data loss during exams: Client and server draft persistence caching student inputs per question keystroke.

3. **HCI & Accessibility Standards:**
   * WCAG 2.1 AA compliant color contrast ratios across light and dark themes.
   * Non-color dependent status cues (every status combines color, icon, and explicit text labels).
   * Accessible keyboard navigation and ARIA landmarks.
   * Responsive layout accommodating desktop, tablet, and mobile viewports.

---

## 4. Detailed Module Requirements

### Module 1: Personnel & Academic Governance (Admin & Dean)
* **Inputs:**
  * User identity: Unique ID (e.g., `YYYY-NNNNN` for students, `NN-NNNNN-NNN` for faculty), First Name, Last Name, Email, Role, Department/College.
  * Academic periods: School Year, Semester (1st, 2nd, Summer), Start Date, End Date, Status.
  * Role permissions & limits: Maximum allowable student units (standard vs. overload), professor teaching loads.
* **Outputs:**
  * Filterable user registries with search, pagination, and status filters.
  * Interactive lifecycle controls: Active, Deactivated, Archived, Restored.
  * Personnel appointment records (appointing coordinators, hiring professors).
* **Business Rules:**
  * Account deletion is replaced with soft-deletion and archiving to preserve historical grade and audit records.
  * Deactivated users cannot authenticate; active sessions are invalidated upon deactivation.
  * Closing an academic period locks grades and submissions for that term without modifying historical audits.

### Module 2: Section Allotment & Scheduling (Coordinator & Dean)
* **Inputs:**
  * Subject offerings: Subject code, title, units, lecture/lab hours, prerequisite subjects.
  * Section creation: Section name, program, year level, maximum student capacity.
  * Offering schedule: Day-of-week checkboxes, start time, end time, room assignment.
  * Assignment proposals: Assigning a professor to a section offering.
* **Outputs:**
  * Interactive weekly timetable grid displaying schedules per section, professor, and room.
  * Collision detection warnings for room overlaps, professor double-booking, and student schedule conflicts.
  * Availability badges: Available (>= 6 slots, green), Low Availability (1–5 slots, yellow), Full (0 slots, red).
  * Dean approval queue for professor assignments and student credit-overload requests.
* **Business Rules:**
  * A professor cannot be assigned to two overlapping classes.
  * A section cannot exceed its defined student capacity without an approved overload request.
  * Coordinator proposals require Dean authorization before becoming effective in student enrollments.

### Module 3: Examination Authoring & Question Banking (Professor)
* **Inputs:**
  * Exam metadata: Title, subject, assigned section(s), instructions, duration (minutes), passing mark.
  * Question definition: Question text, points, question type (Multiple Choice, True/False, Written/Essay), rich text formatting, media attachments (diagrams/images).
  * Navigation modes: Free navigation, Sequential (forward and review), or Forward-only (strict test integrity).
  * Security & timing rules: Randomized question order, option shuffling, strict end-time enforcement.
* **Outputs:**
  * Draft vs. Published examination states.
  * Exam catalog and searchable question repository.
  * Live status monitor indicating published, active, or closed examinations.
* **Business Rules:**
  * Published exams cannot be edited while an active exam session is ongoing.
  * Points must total a positive integer.
  * Option choices for MCQs must have exactly one correct answer selected.

### Module 4: Examination Runner, Grading & Analytics (Student & Professor)
* **Inputs:**
  * Student exam execution: Selected options, essay text responses, question flag toggles.
  * Navigation events: Previous, Next, Direct Navigator jumps, Save & Exit Draft, Review & Submit.
  * Professor evaluation: Manual score inputs and written feedback comments for essay submissions.
* **Outputs:**
  * Student Examination Runner:
    * Single-question viewport with repositionable, draggable floating question navigator handle.
    * Real-time countdown timer with automated warnings at 5 minutes and 1 minute remaining.
    * Pre-submission completeness review modal displaying answered, unanswered, and flagged questions.
    * Transparent post-exam score breakdown with automated grading for objective questions and pie-chart analytics.
  * Professor Gradebook:
    * Student submission list, grading status (Pending, Graded), class average, high/low scores, and grade distribution charts.
* **Business Rules:**
  * Time expiration triggers immediate auto-submission of all entered answers without student penalty.
  * Students can only attempt an exam once unless explicitly granted a retake permission by the professor/Dean.
  * Essay questions remain marked as "Pending Review" until evaluated by the assigned professor.
