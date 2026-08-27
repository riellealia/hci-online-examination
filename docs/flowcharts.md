# Flowcharts

Covers the final deliverable *"Main and module-level flowcharts"*.

Each diagram describes the behaviour actually implemented, including the
validation and error paths — not just the happy path.

## Main system flow

```mermaid
flowchart TD
    A([Open index.html]) --> B[Choose role:<br/>Admin / Faculty / Student]
    B --> C[login.html?role=...]
    C --> D[/Enter username<br/>and password/]
    D --> E{Both fields<br/>filled?}
    E -->|No| F[Inline error:<br/>enter both fields]
    F --> D
    E -->|Yes| G{Credentials match<br/>AND role matches?}
    G -->|No| H[Inline error:<br/>details do not match this role]
    H --> D
    G -->|Yes| I[Store session:<br/>username + role only]
    I --> J{Which role?}
    J -->|admin| K[admin.html]
    J -->|faculty| L[faculty.html]
    J -->|student| M[student.html]

    K --> N[requireRole 'admin']
    L --> O[requireRole 'faculty']
    M --> P[requireRole 'student']

    N & O & P --> Q{Session valid,<br/>role correct,<br/>account still exists?}
    Q -->|No| R[Clear session<br/>redirect to index.html]
    Q -->|Yes| S[Render dashboard]
    S --> T([Log out clears session])
```

The gate at **Q** is the project plan's *"logic gate"*. It runs on every
dashboard load, so a page cannot be reached by typing its URL.

## Module 1 — Faculty and subject creation (Admin)

```mermaid
flowchart TD
    A([Admin dashboard]) --> B[Choose Faculty /<br/>Student / Subject]
    B --> C{Add or Edit?}
    C -->|Add| D[/Blank form/]
    C -->|Edit| E[/Form pre-filled<br/>from the record/]
    D & E --> F[Save]
    F --> G{All required<br/>fields present?}
    G -->|No| H[Toast + inline<br/>field error]
    H --> D
    G -->|Yes| I{Identifier already<br/>used by another record?}
    I -->|Yes| J[Toast: already exists]
    J --> D
    I -->|No| K{Editing, and the<br/>identifier changed?}
    K -->|Yes| L[Rewrite every reference:<br/>assignments, allotments,<br/>exams, submissions]
    L --> M[Migrate the login<br/>to the new username]
    K -->|No| N[Create or update record]
    M & N --> O[Persist + re-render]
    O --> P([Tables and counts refresh])

    B --> Q[Delete]
    Q --> R[Dialog names the record<br/>and lists what else goes]
    R --> S{Confirmed?}
    S -->|No| P
    S -->|Yes| T[Cascade delete:<br/>login, assignments,<br/>allotments, exams,<br/>questions, submissions]
    T --> O
```

## Module 2 — Subject allotment (Admin)

```mermaid
flowchart TD
    A([Admin]) --> B{Which allotment?}

    B -->|Faculty to subject| C[/Pick subject/]
    C --> D[/Pick one or more lecturers/]
    D --> E{Subject and at least<br/>one lecturer chosen?}
    E -->|No| F[Toast: select subject<br/>and a lecturer]
    F --> C
    E -->|Yes| G[Merge into<br/>subjectAssignments]
    G --> H([Assignment table refreshes])

    B -->|Student to subject| I[/Pick student/]
    I --> J[/Pick subject/]
    J --> K[Lecturer list is filtered to<br/>those assigned to that subject]
    K --> L[/Pick lecturer/]
    L --> M{All three chosen?}
    M -->|No| N[Toast: select all fields]
    N --> I
    M -->|Yes| O{Student already<br/>enrolled on this subject?}
    O -->|Yes, same lecturer| P[Toast: already enrolled]
    O -->|Yes, other lecturer| Q[Toast: enrolled under another<br/>lecturer - edit to transfer]
    P & Q --> I
    O -->|No| R{Lecturer assigned<br/>to this subject?}
    R -->|No| S[Toast: not assigned]
    S --> I
    R -->|Yes| T[Save allotment]
    T --> U([Admin table, both Faculty views<br/>and Student view all reflect it])
```

## Module 3 — Modifying questions (Faculty)

```mermaid
flowchart TD
    A([Faculty dashboard]) --> B[My Subjects]
    B --> C{Action}

    C -->|Create / edit exam| D[/Title, subject, instructions,<br/>date, start, end/]
    D --> E{Required fields<br/>present?}
    E -->|No| F[Toast: fill required fields]
    F --> D
    E -->|Yes| G{End time later<br/>than start time?}
    G -->|No| H[Toast: end must be<br/>after start]
    H --> D
    G -->|Yes| I{Lecturer assigned<br/>to that subject?}
    I -->|No| J[Toast: not assigned]
    J --> D
    I -->|Yes| K[Save exam]

    C -->|Manage questions| L[Question list]
    L --> M{Question action}
    M -->|Add / edit| N[/Text, type, points/]
    N --> O{Type}
    O -->|MCQ| P[/At least 2 options,<br/>one marked correct/]
    P --> Q{Valid?}
    Q -->|No| R[Toast: add options /<br/>select the correct one /<br/>fill blanks]
    R --> P
    O -->|Written| S[/Marking guide/]
    Q -->|Yes| T[Save question]
    S --> T
    M -->|Reorder| U[Swap with neighbour;<br/>ends are disabled]
    U --> V[Renumber list]
    M -->|Delete| W[Dialog names the question]
    W --> X{Confirmed?}
    X -->|Yes| Y[Remove question]

    C -->|Preview exam| Z[Render the paper as<br/>students will see it]
    Z --> AA{Any MCQ without<br/>a correct answer?}
    AA -->|Yes| AB[Warn: would score<br/>zero for everyone]
    K & T & V & Y & AB --> AC([Question list refreshes])
```

## Module 4 — Conducting examinations (Student, then Faculty)

```mermaid
flowchart TD
    A([Student dashboard]) --> B[Examination list]
    B --> C{Exam state}
    C -->|Before start| D[Countdown shown<br/>button: Not yet open]
    C -->|After end| E[Button: Closed]
    C -->|Already submitted| F[Button: Submitted]
    C -->|Within window| G[Button: Take Exam]

    G --> H[Re-check window and<br/>prior submission on entry]
    H --> I{Still allowed?}
    I -->|No| J[Toast explains why]
    J --> B
    I -->|Yes| K[Show instructions,<br/>schedule, total points]
    K --> L[/Answer questions/]
    L --> M[Review Answers]
    M --> N[Every question listed with<br/>the answer given;<br/>blanks flagged in text<br/>and colour; count shown]
    N --> O{Ready?}
    O -->|Back to questions| L
    O -->|Confirm and Submit| P{Any blanks?}
    P -->|Yes| Q[Dialog: n unanswered<br/>will score zero]
    Q --> R{Submit anyway?}
    R -->|No| N
    R -->|Yes| S[Mark]
    P -->|No| S

    S --> T[MCQs auto-marked]
    T --> U[Written answers stored<br/>with awarded = null]
    U --> V[Save submission<br/>with all answers]
    V --> W{Anything awaiting<br/>manual marking?}
    W -->|No| X[Show final grade:<br/>transmuted % and rating]
    W -->|Yes| Y[Show auto-marked score<br/>and a pending notice]

    Y --> Z([Faculty: Results])
    Z --> AA[/Enter marks and remarks<br/>for each written answer/]
    AA --> AB{Marks within<br/>0..available?}
    AB -->|No| AC[Toast: out of range,<br/>nothing saved]
    AC --> AA
    AB -->|Yes| AD[Recompute total,<br/>set status]
    AD --> AE{All answers marked?}
    AE -->|No| AF[Stays pending]
    AE -->|Yes| AG[status = graded]
    AG --> AH([Student sees final rating<br/>and instructor feedback])
    X --> AH
```

## Grading conversion

```mermaid
flowchart LR
    A[Marks awarded<br/>e.g. 15 of 20] --> B["Transmute:<br/>(score / total x 50) + 50"]
    B --> C[Percentage<br/>87.5%]
    C --> D[Round to whole<br/>88]
    D --> E{Band}
    E -->|97-100| F[1.00]
    E -->|94-96| G[1.25]
    E -->|91-93| H[1.50]
    E -->|88-90| I[1.75]
    E -->|85-87| J[2.00]
    E -->|82-84| K[2.25]
    E -->|79-81| L[2.50]
    E -->|76-78| M[2.75]
    E -->|75| N[3.00 passing]
    E -->|70-74| O[4.00 failed]
    E -->|below 70| P[5.00 failed]
```

A blank paper floors at 50%, and exactly half the raw marks reaches the passing
75% / 3.00.
