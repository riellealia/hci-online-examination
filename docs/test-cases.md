# Test Cases and Verification Matrix

## 1. Test Architecture Overview
The system contains over 60 automated browser and unit test suites located in `../tests/`, verifying client rendering, DOM interactions, API session security, SQLite / Supabase transactions, and timing logic.

---

## 2. Test Suites & Coverage Matrix

| Test Suite File | Module / Domain | Key Verification Objective | Result |
|---|---|---|---|
| `tests/t_sqlite_backend.js` | Persistence | SQLite database creation, schema migrations, and relational round-trips. | **PASSED** |
| `tests/t_server_auth.js` | Authentication | Cryptographic session tokens, password verification, brute-force rate limits. | **PASSED** |
| `tests/t_runner.js` | Exam Execution | Single-question view, Next/Prev navigation, auto-save drafts, resume state. | **PASSED** |
| `tests/t_timing.js` | Exam Timing | Countdown timer execution, 5-min/1-min warnings, and zero-time auto-submit. | **PASSED** |
| `tests/t_question_order.js` | Exam Builder | Drag-and-drop question reordering, shuffle options, question numbering. | **PASSED** |
| `tests/t_multi.js` | Question Types | Multiple-choice evaluation, single-select constraints, radio accessibility. | **PASSED** |
| `tests/t_media.js` | Question Authoring | Rich-text formatting and media diagram upload/rendering. | **PASSED** |
| `tests/t_sections.js` | Allotment | Section creation, capacity constraints, program/year level categorization. | **PASSED** |
| `tests/t_section_capacity.js` | Enrollment | Slot availability calculations (Available / Low Availability / Full). | **PASSED** |
| `tests/t_relationship_rules.js` | Governance | Referential integrity when updating/deleting faculty and subject codes. | **PASSED** |
| `tests/t_protected_writes.js` | Security | Role permission checks preventing unauthorized database modifications. | **PASSED** |
| `tests/t_professor_access.js` | RBAC | Professor visibility restricted strictly to assigned section offerings. | **PASSED** |
| `tests/t_personnel_governance.js`| Dean Workflow | Dean hiring of faculty, coordinator appointments, and faculty lists. | **PASSED** |
| `tests/t_reports.js` | Analytics | Grade distributions, student roster score averages, and audit trails. | **PASSED** |
| `tests/t_responsive.js` | HCI Layout | Viewport responsiveness across desktop, tablet, and mobile breakpoints. | **PASSED** |
| `tests/t_system_management.js` | Admin Ops | Maintenance mode toggles, backup/restore JSON, and academic period changes. | **PASSED** |
| `tests/t_supabase_primary.js` | Cloud DB | Live Supabase table synchronizations and transactional rollbacks. | **PASSED** |

---

## 3. High-Priority Boundary & Stress Test Cases

### TC-SEC-01: Authentication Logic Gate & Session Tampering
* **Precondition:** User is unauthenticated.
* **Test Steps:**
  1. Attempt direct navigation to `admin.html` or `dean.html` via browser address bar.
  2. Attempt injecting modified session JSON into `localStorage` with `role: "admin"`.
* **Expected Result:**
  * System gatekeeper in `auth.js` interceptor inspects the cryptographically sealed server session.
  * Direct access is denied; local storage is wiped, and user is redirected to `login.html` with an unauthorized alert.
* **Status:** Verified.

### TC-EXAM-04: Resilient Recovery from Unexpected Browser Crash / Disconnect
* **Precondition:** Student is 30 minutes into a 60-minute exam with 15 questions answered.
* **Test Steps:**
  1. Student answers Question 16 and flags Question 12.
  2. Simulate abrupt browser close or power failure (`window.close()` / refresh).
  3. Reopen browser and navigate back to `student.html`.
* **Expected Result:**
  * Dashboard displays active exam with "Resume Attempt" action button.
  * Clicking "Resume Attempt" restores the exact question position (Q16), preserves all prior answers, maintains flagged badges, and calculates remaining time accurately against the server clock.
* **Status:** Verified.

### TC-SCHED-02: Overlap Collision Detection in Timetable Allocation
* **Precondition:** Section BSCS-3A is scheduled in Room 304 on Monday 9:00 AM – 10:30 AM under Prof. A.
* **Test Steps:**
  1. Coordinator attempts to schedule Section BSIT-2B in Room 304 on Monday 10:00 AM – 11:30 AM.
* **Expected Result:**
  * Validation engine computes interval overlap `[10:00, 10:30]`.
  * Form disallows submission, outlines the room in red, and outputs: *"Room Collision: Room 304 is occupied until 10:30 AM"*.
* **Status:** Verified.

### TC-TIME-03: Zero-Time Graceful Auto-Submission
* **Precondition:** Student is taking exam with 10 seconds remaining.
* **Test Steps:**
  1. Allow timer to reach `00:00`.
* **Expected Result:**
  * Client disables all radio inputs and textareas immediately to prevent post-expiry answers.
  * Notification toast announces: *"Time has expired. Submitting your examination..."*.
  * Automatic POST request is dispatched to the server; score is computed, and student is redirected to the submission receipt.
* **Status:** Verified.
