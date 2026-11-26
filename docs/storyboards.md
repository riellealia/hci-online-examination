# Interaction Storyboards and Wireframe Journeys

This document provides visual scenario storyboards and screen-by-screen state walkthroughs for all five roles in the system.

---

## 1. Scenario 1: Administrator — Academic Period Rollover & Account Governance

```
+----------------------------------------------------------------------------------------------------+
| Frame 1: Unified Login (admin credentials)                                                        |
+----------------------------------------------------------------------------------------------------+
|  [ University Logo ]  NEU ONLINE EXAMINATION PORTAL                                                |
|                                                                                                    |
|  Email or ID:   [ admin@neu.edu.ph                     ]                                           |
|  Password:      [ *******************                  ]  (👁 Show)                                |
|                                                                                                    |
|                 [        SIGN IN TO DASHBOARD        ]                                             |
|                                                                                                    |
|  Context: User submits admin credentials. Single gatekeeper validates role and opens admin.html.    |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
| Frame 2: Admin Governance Dashboard                                                                |
+----------------------------------------------------------------------------------------------------+
|  ADMIN PORTAL  | Dashboard | User Accounts | Semesters | System Settings | Audit Logs | [Admin ▼]    |
| ────────────────────────────────────────────────────────────────────────────────────────────────── |
|  [ STATS: 1,240 Students | 48 Faculty | 6 Deans/Coordinators | Active Term: 2026-2027 1st Sem ]    |
|                                                                                                    |
|  Quick Actions:                                                                                    |
|  [ + New User Account ]   [ ⚙ Toggle Maintenance Mode ]   [ 🔄 Roll Over Academic Period ]          |
|                                                                                                    |
|  System Health: 🟢 Supabase Synchronized  |  🟢 SQLite Replica Active  |  Session Security: Enforced|
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
| Frame 3: User Lifecycle Management & Account Deactivation Modal                                    |
+----------------------------------------------------------------------------------------------------+
|  SEARCH: [ Dela Cruz              ]  FILTER: [ Students ▼ ]  STATUS: [ Active ▼ ]                  |
|                                                                                                    |
|  ID           Name                  Role      Status    Actions                                    |
|  2024-00124   Dela Cruz, Juan       Student   Active    [ Edit ]  [ Deactivate ]  [ Archive ]      |
|                                                                                                    |
|  >>> Clicking [ Deactivate ] triggers modal:                                                       |
|  +----------------------------------------------------------------------------------------------+  |
|  | Deactivate User Account: Juan Dela Cruz (2024-00124)                                         |  |
|  | Warning: Deactivating will immediately revoke any active sessions. Historical submissions    |  |
|  | and grades will be preserved for transcript generation.                                      |  |
|  | [ Cancel ]                                         [ Confirm Deactivation (Orange) ]          |  |
|  +----------------------------------------------------------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Scenario 2: College Dean — Personnel Appointment & Overload Approval

```
+----------------------------------------------------------------------------------------------------+
| Frame 1: Dean Approvals Queue                                                                      |
+----------------------------------------------------------------------------------------------------+
|  DEAN'S OFFICE  |  Dashboard  |  Faculty Oversight  |  Approvals (3 Pending)  |  Reports  | [Dean ▼]  |
| ────────────────────────────────────────────────────────────────────────────────────────────────── |
|  Pending Request Queue:                                                                            |
|                                                                                                    |
|  [ Type ]               [ Target / Candidate ]       [ Requester ]        [ Actions ]              |
|  Professor Assignment   Prof. Alan Turing (CCS102)   Coord. Ada Lovelace  [ Review & Approve ]     |
|  Student Overload       Maria Santos (24 units)      Coord. Ada Lovelace  [ Review & Approve ]     |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
| Frame 2: Student Overload Review & Decision Modal                                                  |
+----------------------------------------------------------------------------------------------------+
|  Review Student Overload Application:                                                              |
|  Student: Maria Santos (ID: 2024-08912) | Year 4 BSCS                                              |
|  Current Load: 21 Units | Requested Addition: CS402 (3 Units) | Total Proposed: 24 Units (Max: 21) |
|  Academic Standing: GPA 1.25 (Dean's Lister) | Reason: Graduating in Current Term                  |
|                                                                                                    |
|  Dean's Remarks: [ Student is on track for graduation. Approved exception based on GPA.          ] |
|                                                                                                    |
|  [ Reject Request (Red) ]                                     [ Approve Overload (Green) ]         |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Scenario 3: Faculty Coordinator — Section Allotment & Collision Detection

```
+----------------------------------------------------------------------------------------------------+
| Frame 1: Weekly Timetable & Section Assignment Workspace                                           |
+----------------------------------------------------------------------------------------------------+
|  COORDINATOR  |  Offerings  |  Sections  |  Weekly Timetables  |  Proposals  | [Coordinator ▼]    |
| ────────────────────────────────────────────────────────────────────────────────────────────────── |
|  CREATE SECTION OFFERING:                                                                          |
|  Subject: [ CCS105 - Human Computer Interaction   ▼ ]   Section: [ BSCS-3A                ▼ ]      |
|  Professor: [ Prof. Grace Hopper                  ▼ ]   Room:    [ Lab 304                ▼ ]      |
|  Schedule Days:  [x] Mon  [ ] Tue  [x] Wed  [ ] Thu  [x] Fri                                       |
|  Timeslot: [ 09:00 AM ] to [ 10:30 AM ]                                                            |
|                                                                                                    |
|  [ Check Timetable Collision & Submit to Dean ]                                                    |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
| Frame 2: Collision Detection Warning Display (HCI Feedback Principle)                              |
+----------------------------------------------------------------------------------------------------+
|  ⚠️ SCHEDULE COLLISION DETECTED:                                                                   |
|  - Room Conflict: Lab 304 is already occupied by IT201 (Mon/Wed/Fri 08:30 AM - 10:00 AM).         |
|  - Professor Conflict: Prof. Grace Hopper has an active lecture in CIT101 until 09:30 AM.          |
|                                                                                                    |
|  Suggested Alternative: Lab 308 is free (Mon/Wed/Fri 10:30 AM - 12:00 PM).                         |
|  [ Adjust Timeslot ]                                               [ Pick Another Room ]           |
+----------------------------------------------------------------------------------------------------+
```

---

## 4. Scenario 4: Professor — Authoring Questions & Setting Exam Controls

```
+----------------------------------------------------------------------------------------------------+
| Frame 1: Exam Question Builder Workspace                                                           |
+----------------------------------------------------------------------------------------------------+
|  EXAM BUILDER  |  Title: Midterm Examination - HCI  |  Subject: CCS105  |  Duration: 60 mins       |
| ────────────────────────────────────────────────────────────────────────────────────────────────── |
|  Questions (Total: 40 pts | 20 Questions)                 [ + Add New Question ]  [ 🎲 Shuffle ]   |
|                                                                                                    |
|  ☰ Q1 (MCQ - 2 pts) "Which of Norman's principles is violated by unlabelled icons?"   [ Edit ] [x] |
|  ☰ Q2 (MCQ - 2 pts) "Define the primary goal of Fitts's Law in UI button design."      [ Edit ] [x] |
|  ☰ Q3 (Essay - 10 pts) "Evaluate the heuristic compliance of the current checkout flow."[ Edit ][x]|
|                                                                                                    |
|  Interactive Feature: Questions can be dragged (☰) to reorder or randomized at runtime.           |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
| Frame 2: Exam Timing & Navigation Security Configuration                                           |
+----------------------------------------------------------------------------------------------------+
|  Navigation Policy:                                                                                |
|  ( ) Free Navigation       - Student can jump between questions at any time                        |
|  (•) Sequential & Review    - Questions answered in sequence, full review allowed at end (Default) |
|  ( ) Strict Forward-Only   - No review; answer is locked immediately upon pressing Next            |
|                                                                                                    |
|  Timer Settings: [ 60 ] Minutes  |  Auto-submit on expiry: [x] Yes                                 |
|                                                                                                    |
|  [ Save as Draft ]                                                [ Publish to Enrolled Students ] |
+----------------------------------------------------------------------------------------------------+
```

---

## 5. Scenario 5: Student — Examination Runner, Floating Handle & Auto-Save

```
+----------------------------------------------------------------------------------------------------+
| Frame 1: Live Question Runner with Draggable Navigator Handle                                     |
+----------------------------------------------------------------------------------------------------+
|  HCI MIDTERM EXAM  |  Question 4 of 25  |  Points: 2.0         ⏱️ Time Remaining: [ 42:15 ]         |
| ────────────────────────────────────────────────────────────────────────────────────────────────── |
|                                                      [ ⠿ Drag Navigator Handle ]                   |
|  Question 4:                                         ┌──────────────────────────────────────────┐  |
|  According to Nielsen's 10 Heuristics, what is the  │ Quick Jump Navigator:                    │  |
|  purpose of providing clear undo and redo actions?   │ [1✓] [2✓] [3✓] [4●] [5 ] [6🚩] [7 ] ...  │  |
|                                                      │ (✓ Answered | ● Current | 🚩 Flagged)    │  |
|  ( ) A. Aesthetic and minimalist design              └──────────────────────────────────────────┘  |
|  (•) B. User control and freedom (Selected)                                                        |
|  ( ) C. Error prevention                                                                           |
|  ( ) D. Consistency and standards                                                                  |
|                                                                                                    |
|  [ 🚩 Flag for Review ]                                                                            |
|                                                                                                    |
|  [ ◀ Previous Question ]                                              [ Next Question ▶ ]          |
|  ────────────────────────────────────────────────────────────────────────────────────────────────  |
|  Auto-save: 💾 Saved at 08:14:02                        [ Save Draft & Exit ] [ Review & Submit ]  |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
| Frame 2: Completeness Review & Pre-Submission Dialog                                               |
+----------------------------------------------------------------------------------------------------+
|  +----------------------------------------------------------------------------------------------+  |
|  | Exam Completeness Check (Midterm Exam - HCI)                                                 |  |
|  | Total Questions: 25   |   Answered: 24   |   Unanswered: 1   |   Flagged: 2                   |  |
|  |                                                                                              |  |
|  | ⚠️ Notice: Question 19 is still unanswered!                                                  |  |
|  | Flagged Questions: [ Jump to Q6 ]  [ Jump to Q14 ]                                           |  |
|  |                                                                                              |  |
|  | Are you ready to submit your exam? You cannot modify your answers once submitted.           |  |
|  |                                                                                              |  |
|  | [ Return to Exam ]                                              [ Confirm Final Submission ] |  |
|  +----------------------------------------------------------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
| Frame 3: Instant Analytics & Performance Breakdown                                                 |
+----------------------------------------------------------------------------------------------------+
|  EXAM COMPLETED                                                                                    |
|  Submission Recorded: 2026-11-26 08:52:10 | Score: 36 / 40 (90%) - Rating: EXCELLENT               |
|                                                                                                    |
|  Objective Questions: 36/40 pts (Graded Instantly)                                                 |
|  Essay Question (Q25): Pending Professor Evaluation                                                |
|                                                                                                    |
|  Performance Chart: [ 90% Correct (Green) | 10% Incorrect (Red) ]                                   |
|  [ Return to Dashboard ]                                         [ Download Submission Receipt ]   |
+----------------------------------------------------------------------------------------------------+
```
