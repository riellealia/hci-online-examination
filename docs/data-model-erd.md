# Data Model and Entity-Relationship Architecture

## 1. Architectural Overview
The New Era University Online Examination System utilizes a relational database architecture synchronized between Supabase (PostgreSQL) and a local SQLite engine. The schema guarantees referential integrity, historical preservation through soft-deletions and audit logs, and conflict-free schedule allotments.

---

## 2. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--o| PROFILES : "has details"
    USERS ||--o{ AUDIT_LOGS : "triggers"
    USERS ||--o{ SESSIONS : "authenticates"

    ACADEMIC_PERIODS ||--o{ SECTION_OFFERINGS : "defines semester for"
    CURRICULA ||--o{ SUBJECTS : "structures"
    
    SUBJECTS ||--o{ SECTION_OFFERINGS : "offered as"
    SECTIONS ||--o{ SECTION_OFFERINGS : "scheduled in"
    USERS ||--o{ SECTION_OFFERINGS : "taught by (Professor)"
    
    SECTION_OFFERINGS ||--o{ STUDENT_ENROLLMENTS : "contains"
    USERS ||--o{ STUDENT_ENROLLMENTS : "enrolled in (Student)"

    SECTION_OFFERINGS ||--o{ APPROVAL_REQUESTS : "subject to"
    USERS ||--o{ APPROVAL_REQUESTS : "requested by / reviewed by"

    SECTION_OFFERINGS ||--o{ EXAMS : "administered in"
    USERS ||--o{ EXAMS : "authored by (Professor)"
    EXAMS ||--|{ QUESTIONS : "comprises"
    
    EXAMS ||--o{ STUDENT_SUBMISSIONS : "submitted for"
    USERS ||--o{ STUDENT_SUBMISSIONS : "taken by (Student)"
    STUDENT_SUBMISSIONS ||--|{ SUBMISSION_ANSWERS : "contains"
    QUESTIONS ||--o{ SUBMISSION_ANSWERS : "evaluates"

    USERS {
        string id PK "System identifier (e.g. 2026-00012 or 10-00123)"
        string email UK "University email"
        string role "admin | dean | coordinator | professor | student"
        string status "active | deactivated | archived"
        timestamp created_at
        timestamp updated_at
    }

    PROFILES {
        string user_id PK, FK
        string first_name
        string last_name
        string college
        string department
        int current_units
        int max_units
        string avatar_url
    }

    ACADEMIC_PERIODS {
        string id PK "e.g. 2026-2027-1S"
        string school_year "e.g. 2026-2027"
        string term "1st Semester | 2nd Semester | Summer"
        date start_date
        date end_date
        string status "upcoming | active | closed | archived"
    }

    SUBJECTS {
        string code PK "e.g. CCS101"
        string title
        int units
        int lecture_hours
        int lab_hours
        string prerequisite_code FK
    }

    SECTIONS {
        string id PK "e.g. BSCS-3A"
        string program "BSCS | BSIT | BSIS"
        int year_level "1 | 2 | 3 | 4"
        int max_capacity
    }

    SECTION_OFFERINGS {
        string id PK
        string subject_code FK
        string section_id FK
        string academic_period_id FK
        string professor_id FK
        string days_of_week "e.g. Mon,Wed,Fri"
        time start_time
        time end_time
        string room
        string status "draft | pending_approval | approved | closed"
    }

    STUDENT_ENROLLMENTS {
        string id PK
        string student_id FK
        string offering_id FK
        string status "enrolled | dropped | completed"
        timestamp enrolled_at
    }

    APPROVAL_REQUESTS {
        string id PK
        string request_type "professor_assignment | student_overload | curriculum_change"
        string offering_id FK
        string requested_by FK "Coordinator user id"
        string reviewed_by FK "Dean user id"
        string status "pending | approved | rejected"
        string remarks
        timestamp created_at
        timestamp resolved_at
    }

    EXAMS {
        string id PK
        string offering_id FK
        string author_id FK
        string title
        text instructions
        int duration_minutes
        int passing_percentage
        string navigation_mode "free | sequential | forward_only"
        boolean randomize_questions
        boolean shuffle_options
        string status "draft | scheduled | published | closed"
        timestamp start_window
        timestamp end_window
    }

    QUESTIONS {
        string id PK
        string exam_id FK
        int position
        string question_type "multiple_choice | true_false | essay"
        text question_text
        json options "List of choices for MCQ"
        string correct_answer "Key or boolean value"
        int points
        string media_url "Optional diagram or image"
    }

    STUDENT_SUBMISSIONS {
        string id PK
        string exam_id FK
        string student_id FK
        timestamp started_at
        timestamp submitted_at
        int total_score
        int max_score
        string status "in_progress | submitted | graded"
    }

    SUBMISSION_ANSWERS {
        string id PK
        string submission_id FK
        string question_id FK
        text student_answer
        boolean is_correct
        int score_awarded
        text professor_feedback
        boolean is_flagged
    }

    AUDIT_LOGS {
        string id PK
        string user_id FK
        string action "LOGIN | CREATE | UPDATE | APPROVE | REJECT | ARCHIVE"
        string target_entity "users | exams | offerings | approvals"
        string target_id
        json details
        string ip_address
        timestamp timestamp
    }
```

---

## 3. Data Dictionary and Integrity Rules

### Referential Integrity Enforcements
1. **Cascade & Restrict Safeguards**:
   * Direct record deletion is prevented when dependent active submissions, offerings, or enrollment records exist.
   * Soft-deletion (`status = 'archived'`) preserves all foreign keys for historical auditing.
2. **Schedule Conflict Checks**:
   * `SECTION_OFFERINGS` triggers evaluate `professor_id`, `room`, `days_of_week`, and `[start_time, end_time]` intervals to prevent double-booking.
3. **Student Load & Capacity Constraints**:
   * An enrollment insertion verifies current section headcount against `SECTIONS.max_capacity`.
   * Enrolling a student checks `PROFILES.current_units + SUBJECTS.units <= PROFILES.max_units`. If exceeded, enrollment is rejected unless an approved record exists in `APPROVAL_REQUESTS`.
