# System Flowcharts & Interaction Workflows

## 1. Unified Authentication & Role-Based Dispatch Flowchart

```mermaid
flowchart TD
    Start([User Visits Portal]) --> EnterCreds[/Enter University Email / ID<br/>and Password/]
    EnterCreds --> Submit[Click Sign In]
    Submit --> ValEmpty{Are both fields<br/>non-empty?}
    ValEmpty -->|No| ShowEmptyErr[Display inline field error:<br/>All fields required] --> EnterCreds
    ValEmpty -->|Yes| RateLimitCheck{Exceeded 5 failed<br/>attempts in 10 mins?}
    RateLimitCheck -->|Yes| BlockAttempt[Block request: HTTP 429<br/>Rate limit exceeded. Try later.] --> EnterCreds
    RateLimitCheck -->|No| CheckCreds{Validate against<br/>Database / Supabase}
    CheckCreds -->|Invalid| IncFail[Increment failure count<br/>Show 'Invalid credentials'] --> EnterCreds
    CheckCreds -->|Valid| CheckStatus{Is User Status<br/>'Active'?}
    CheckStatus -->|Deactivated / Archived| ShowDeact[Access Denied:<br/>Account is inactive] --> EnterCreds
    CheckStatus -->|Active| CheckMaint{Is System in<br/>Maintenance Mode?}
    CheckMaint -->|Yes and Not Admin| ShowMaint[Maintenance Mode Active:<br/>Access restricted] --> EnterCreds
    CheckMaint -->|No or Is Admin| GenSession[Generate Cryptographically Sealed Token<br/>Store Session Cookie & Local Session]
    GenSession --> LogLogin[Record Audit Log: USER_LOGIN]
    LogLogin --> DispatchRole{Identify Role}
    DispatchRole -->|admin| OpenAdmin[Open admin.html]
    DispatchRole -->|dean| OpenDean[Open dean.html]
    DispatchRole -->|coordinator| OpenCoord[Open coordinator.html]
    DispatchRole -->|professor| OpenProf[Open professor.html]
    DispatchRole -->|student| OpenStudent[Open student.html]
    
    OpenAdmin & OpenDean & OpenCoord & OpenProf & OpenStudent --> GateKeeper{Page Gatekeeper:<br/>requireRole matches session?}
    GateKeeper -->|Mismatch / Stale| ClearSession[Revoke Session & Redirect to login.html]
    GateKeeper -->|Matches| MountDashboard([Render Workspace Dashboard])
```

---

## 2. Subject Offering & Dean Approval Workflow

```mermaid
flowchart TD
    CoordStart([Faculty Coordinator Workspace]) --> CreateOffering[/Select Subject, Section,<br/>Schedule Days, Times, and Professor/]
    CreateOffering --> CheckCollision{Run Collision Detection:<br/>1. Professor free?<br/>2. Room available?<br/>3. Section slots free?}
    CheckCollision -->|Collision Detected| WarnConflict[Highlight Conflicting Timeslot<br/>and Disallow Submission] --> CreateOffering
    CheckCollision -->|Clear| SubmitProposal[Submit Proposal to Dean<br/>Status: 'pending_approval']
    
    SubmitProposal --> DeanNotif[Dean Approval Queue Alerted]
    DeanNotif --> DeanReview([Dean Workspace: Approvals])
    DeanReview --> InspectDetails[/Inspect Professor Load & Class Roster/]
    InspectDetails --> Decision{Dean Decision}
    Decision -->|Reject| EnterRemarks[/Enter Rejection Reason/] --> SendRejection[Status: 'rejected'<br/>Notify Coordinator] --> CoordRevise([Coordinator Modifies Offering])
    Decision -->|Approve| ApproveOffering[Update Status: 'approved'<br/>Bind Professor to Section Offering]
    ApproveOffering --> OpenEnrollment[Offering Active in Student Enrollment Catalog]
    OpenEnrollment --> LogApproval[Write Audit Log: OFFERING_APPROVED]
```

---

## 3. Examination Authoring & Publication Lifecycle

```mermaid
flowchart TD
    ProfStart([Professor Workspace]) --> CreateExam[/Create Exam Form:<br/>Title, Subject, Assigned Section(s),<br/>Duration, Passing %, Navigation Mode/]
    CreateExam --> SaveExamDraft[Save Draft Exam Record]
    SaveExamDraft --> AddQuestions[/Add Questions from Catalog<br/>or Create New Question/]
    AddQuestions --> QuestionType{Select Type}
    QuestionType -->|Multiple Choice| InputMCQ[/Question Text, Options, Select Correct Choice/]
    QuestionType -->|True / False| InputTF[/Question Text, Select True or False/]
    QuestionType -->|Written / Essay| InputEssay[/Prompt Text, Rubric, Max Points/]
    
    InputMCQ & InputTF & InputEssay --> AttachMedia{Attach Diagram / Image?}
    AttachMedia -->|Yes| UploadImg[Upload & Preview Media Asset] --> SaveQ[Save Question]
    AttachMedia -->|No| SaveQ
    
    SaveQ --> ReorderQuestions{Drag & Drop<br/>Reorder or Shuffle?}
    ReorderQuestions -->|Yes| UpdatePositions[Update Question Position Array] --> ReviewExam
    ReorderQuestions -->|No| ReviewExam[/Review Total Points & Exam Timing/]
    
    ReviewExam --> PublishTrigger{Click Publish?}
    PublishTrigger -->|No| KeepDraft[Keep as Editable Draft]
    PublishTrigger -->|Yes| ValidateExam{Validation:<br/>- At least 1 question?<br/>- Valid duration?<br/>- Assigned section?}
    ValidateExam -->|Fail| ShowPubErr[Display Missing Requirements Toast] --> ReviewExam
    ValidateExam -->|Pass| SetPublished[Status: 'published'<br/>Lock Question Edits]
    SetPublished --> NotifyStudents[Push Notification to Enrolled Students' Inboxes]
```

---

## 4. Student Examination Runner & Attempt State Lifecycle

```mermaid
flowchart TD
    StudStart([Student Dashboard]) --> SelectExam[/Select Published Exam/]
    SelectExam --> CheckWindow{Is Current Time within<br/>Exam Schedule Window?}
    CheckWindow -->|No| ShowLocked[Display Scheduled Date/Time]
    CheckWindow -->|Yes| CheckPrior{Prior Attempt<br/>Exists?}
    CheckPrior -->|Completed| ShowResult[Display Prior Score & Summary]
    CheckPrior -->|In Progress| OfferResume[Display 'Resume Attempt' Button] --> LaunchRunner
    CheckPrior -->|New Attempt| InitAttempt[Create In-Progress Attempt Record<br/>Initialize Timer & State] --> LaunchRunner
    
    LaunchRunner([Mount Single-Question Runner]) --> RenderQ[/Display Current Question<br/>Show Floating Navigation Handle<br/>Start Countdown Clock/]
    
    RenderQ --> StudentAction{Student Action}
    
    StudentAction -->|Select / Type Answer| AutoSave[Immediate Keystroke Save<br/>Update Progress Indicator<br/>Mark Navigator Item as Answered] --> RenderQ
    StudentAction -->|Click Flag Button| ToggleFlag[Toggle Question Flagged State<br/>Announce Flag to Screen Reader<br/>Update Navigator Badge] --> RenderQ
    StudentAction -->|Click Next / Previous| NavMove[Check Navigation Mode Constraints<br/>Save Current State<br/>Transition to Target Question] --> RenderQ
    StudentAction -->|Drag Navigator Handle| RepositionHandle[Reposition Floating Handle<br/>Preserve Safe Viewport Margin] --> RenderQ
    StudentAction -->|Click Save Draft & Exit| ConfirmExit{Confirm Exit Modal}
    ConfirmExit -->|Cancel| RenderQ
    ConfirmExit -->|Confirm| SaveStateAndExit[Persist Position, Answers, Flags<br/>Return to Student Dashboard]
    
    StudentAction -->|Click Review & Submit| OpenReviewModal[/Display Completeness Modal:<br/>- Total Questions<br/>- Answered Count<br/>- Unanswered Count<br/>- Flagged Questions/]
    OpenReviewModal --> ModalChoice{Student Choice}
    ModalChoice -->|Jump to Question| DirectJump[Close Modal & Jump to Selected Question] --> RenderQ
    ModalChoice -->|Confirm Final Submit| FinalSubmitProcess[Lock Attempt from Edits<br/>Record submitted_at Timestamp<br/>Calculate Objective Scores]
    
    StudentAction -->|Timer Runs Out| TimeExpiredAlert[Display Time Expired Banner<br/>Auto-Submit Immediately] --> FinalSubmitProcess
    
    FinalSubmitProcess --> DisplayResults([Display Score Breakdown, Rating & Pie Chart])
```
