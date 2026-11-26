# HCI Usability Testing Protocol & Heuristic Evaluation Guide

## 1. Evaluation Objectives
The objective of this usability evaluation protocol is to empirically measure the effectiveness, efficiency, and user satisfaction of the New Era University Online Examination System across representative user cohorts (Students, Professors, and Academic Administrators).

---

## 2. Participant Recruitment & Target Profiles

| User Cohort | Target Sample Size | Profile Criteria | Primary Testing Workspaces |
|---|---|---|---|
| **Student Cohort** | 6–8 Participants | Undergraduate university students with diverse digital literacy levels. | `student.html` (Exam taking, navigation, review) |
| **Faculty Cohort** | 4–6 Participants | University lecturers/professors with experience authoring assessments. | `professor.html` (Authoring, timing, grading) |
| **Administrative Cohort** | 3–4 Participants | Department coordinators, deans, or registrar administrators. | `coordinator.html`, `dean.html`, `admin.html` |

---

## 3. Formal Usability Task Scenarios

### Scenario 1 (Student): Sitting an Exam with Flagging & Completeness Review
* **Task Instruction:**
  *"Sign in as student Juan Dela Cruz. Launch the Midterm Examination for CCS105. Answer the first 3 questions, flag Question 2 for later review, use the floating handle to jump to Question 5, and then navigate to the Review & Submit page to inspect your answered status before final submission."*
* **Target Success Metrics:**
  * Task Completion Rate: >= 95%
  * Time on Task: < 4 minutes
  * Error Rate: 0 critical navigation failures

### Scenario 2 (Professor): Creating a Multi-Type Timed Exam
* **Task Instruction:**
  *"Sign in as Professor Grace Hopper. Create a new examination titled 'Quiz 1 - Interaction Principles' for Section BSCS-3A. Add one multiple choice question, one essay question, attach a diagram image to the MCQ, configure a 45-minute countdown timer, and publish the exam."*
* **Target Success Metrics:**
  * Task Completion Rate: >= 90%
  * Time on Task: < 6 minutes
  * System Usability Rating: >= 80 SUS score

### Scenario 3 (Coordinator & Dean): Scheduling & Approving an Offering
* **Task Instruction:**
  *"As Faculty Coordinator Ada Lovelace, create a new offering for CCS101 assigned to Section BSIT-1A under Prof. Turing on Mon/Wed 9:00–10:30 AM. Review the collision checker. Submit the proposal to the Dean. Then sign in as Dean and execute the approval."*
* **Target Success Metrics:**
  * Task Completion Rate: >= 90%
  * Time on Task: < 5 minutes

---

## 4. Standardized System Usability Scale (SUS) Questionnaire
Participants complete the following 10-item standard SUS survey upon task conclusion (Scored on a 5-point Likert Scale: 1 = Strongly Disagree to 5 = Strongly Agree):

1. *I think that I would like to use this system frequently.*
2. *I found the system unnecessarily complex.*
3. *I thought the system was easy to use.*
4. *I think that I would need the support of a technical person to be able to use this system.*
5. *I found the various functions in this system were well integrated.*
6. *I thought there was too much inconsistency in this system.*
7. *I would imagine that most people would learn to use this system very quickly.*
8. *I found the system very cumbersome to use.*
9. *I felt very confident using the system.*
10. *I needed to learn a lot of things before I could get going with this system.*

### Scoring Methodology:
* For odd-numbered items (1, 3, 5, 7, 9): Score = `Response - 1`.
* For even-numbered items (2, 4, 6, 8, 10): Score = `5 - Response`.
* Multiply the sum of all converted scores by `2.5` to obtain a final SUS score between 0 and 100.
* Target Benchmark: **SUS > 80.3 (Grade A / Excellent Usability)**.

---

## 5. Nielsen's 10 Heuristics Expert Review Matrix

| Heuristic | System Design Implementation | Evaluation Rubric |
|---|---|---|
| **1. Visibility of system status** | Live countdown timer, auto-save status timestamp (`Saved at 08:14:02`), real-time sync indicators. | Score (1-5) & Qualitative Observation |
| **2. Match between system & real world** | University academic terms: Semesters, Syllabi, Units, Overload, Grading Rosters. | Score (1-5) & Qualitative Observation |
| **3. User control and freedom** | Repositionable navigator handle, Save Draft & Exit, clear modal cancellation buttons. | Score (1-5) & Qualitative Observation |
| **4. Consistency and standards** | Unified header bar, standard button alignments, cohesive color palette per role. | Score (1-5) & Qualitative Observation |
| **5. Error prevention** | Timetable collision detector, destructive action confirmation modals, required field validation. | Score (1-5) & Qualitative Observation |
| **6. Recognition rather than recall** | Color + Icon status badges on question navigator (✓, ●, 🚩), pre-submission checklist. | Score (1-5) & Qualitative Observation |
| **7. Flexibility and efficiency of use** | Draggable question handle, keyboard navigation, instant direct-question jump links. | Score (1-5) & Qualitative Observation |
| **8. Aesthetic and minimalist design** | Distraction-free single question focus, clean typography, whitespace management. | Score (1-5) & Qualitative Observation |
| **9. Help users recognize & recover from errors** | Descriptive error alerts (e.g. "Room 304 occupied until 10:30 AM") with suggested remedies. | Score (1-5) & Qualitative Observation |
| **10. Help and documentation** | Guided instructions per exam, contextual tooltip helpers, comprehensive documentation. | Score (1-5) & Qualitative Observation |
