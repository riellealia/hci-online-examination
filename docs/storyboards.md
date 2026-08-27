# Role Storyboards

Covers the final deliverable *"Admin, Faculty, and Student storyboards"*.

Each storyboard follows one representative user through a complete task, frame by
frame, naming what they see and what the system does. Frames correspond to states
that exist in the prototype.

---

## Admin — "Set up a new subject and put a class on it"

**Persona.** Ms. Alvarez, department secretary. Comfortable with spreadsheets,
not with software. Works at a desktop machine.

| # | Frame | What she sees | What she does | What the system does |
|---|---|---|---|---|
| 1 | Role choice | NEU header, three role buttons | Clicks **ADMIN** | Opens the admin login |
| 2 | Login | Empty username and password, "Not an admin?" link | Types her credentials | Validates against the account list *and* the role |
| 3 | Dashboard | Five cards with live counts, each with a **+** | Reads the counts to confirm she is in the right place | — |
| 4 | Sidebar | Hamburger opens a soft-edged drawer, current page highlighted in blue | Chooses **Subject Management** | Shows the subject table |
| 5 | Add subject | Modal with Code and Name | Enters `CCS315-18`, "Data Structures", saves | Checks the code is unused, saves, refreshes the table and the dashboard count |
| 6 | Duplicate attempt | She retypes a code that exists | Saves | Toast: *"A subject with code … already exists."* Nothing is written |
| 7 | Faculty–Subject | Assign modal, faculty list allows multi-select | Picks the subject, selects two lecturers | Stores both against the subject |
| 8 | Student–Subject | Student, Subject, then Faculty | Picks the subject first | The faculty list narrows to only the two assigned lecturers |
| 9 | Conflict | She tries to enrol the same student again | Confirms | Toast explains they are already enrolled and that editing performs a transfer |
| 10 | Delete | Chooses **Delete** on a lecturer | — | Dialog names the lecturer and lists their login, exams, questions and enrolments; focus is on Cancel |
| 11 | Confirmed | Clicks **Delete** | — | Everything cascades; tables and counts refresh; nothing orphaned |
| 12 | Log out | Clicks her avatar, then **Log out** | — | Session cleared, back to role choice |

**Design consequence.** Frame 8 exists because ordering the fields Student →
Subject → Faculty lets the system remove invalid lecturers before she can pick
one, preventing the error rather than reporting it.

---

## Faculty — "Set a midterm and mark it"

**Persona.** Prof. Reyes, teaches two subjects. Prepares papers the evening
before. Wants to check the paper reads correctly before students see it.

| # | Frame | What he sees | What he does | What the system does |
|---|---|---|---|---|
| 1 | Login | Faculty login, teal accent after entry | Signs in | Session records his ID; the dashboard reads identity from it, not the URL |
| 2 | My Subjects | One card per assigned subject, teal left edge | Clicks **Create Exam** on HCI | Opens the exam form with that subject selected |
| 3 | Exam form | Title, instructions, date, start, end | Enters 14:00–09:00 by mistake | Toast: *"The end time must be later than the start time."* Nothing saved |
| 4 | Corrected | Fixes the end time | Saves | Exam appears grouped under its subject |
| 5 | Questions | Empty state: *"No questions added yet."* | Clicks **Add Question** | Opens the question editor with two blank options |
| 6 | MCQ | Types the stem, four options | Removes option A, marks the last one correct | Options renumber; the correct answer is resolved by position, so it stays on the option he marked |
| 7 | Written question | Switches type to Essay | Enters a marking guide and points | MCQ options are discarded rather than left behind |
| 8 | Reorder | Question list with ↑ / ↓ | Moves the essay to the end | List renumbers; first ↑ and last ↓ are disabled |
| 9 | Preview | Clicks **Preview Exam** | Reads the paper | Shows it as students will see it, marks the answer key, warns about any MCQ with no correct option |
| 10 | After the exam | Clicks **Results** | — | Lists who submitted, who has not, marks so far, and how many answers await marking |
| 11 | Marking | Opens a submission | Reads the essay, enters `7` of 10 and a remark | MCQ shown as already marked; only written answers are editable |
| 12 | Out of range | Types `99` | Saves | Toast: *"Marks must be between 0 and 10."* Nothing saved |
| 13 | Graded | Enters a valid mark and an overall remark | Saves | Total recomputed, status becomes **Graded**, rating appears |

**Design consequence.** Frame 9 exists because a lecturer cannot proof-read a
paper from a list of database rows. Frame 12 validates before writing anything,
so a slip cannot half-save a submission.

---

## Student — "Sit a midterm and find out how I did"

**Persona.** Juan, third year. Checks the dashboard between classes on a laptop.
Anxious about accidentally submitting early.

| # | Frame | What he sees | What he does | What the system does |
|---|---|---|---|---|
| 1 | Dashboard | Green accent, three stat cards, exam table | Scans for what is due | Countdown ticks once per second |
| 2 | Not yet open | *"Not yet open"*, disabled button, countdown | Tries to click | Nothing happens; the rule is also re-checked on entry |
| 3 | Open | Status becomes **Active / Open**, button enabled | Clicks **Take Exam** | Shows title, subject, schedule, question count and total points before any question |
| 4 | Answering | Questions with soft-edged option rows | Answers the MCQs, skips one essay | Nothing is submitted yet |
| 5 | Review | Clicks **Review Answers** | Reads the list | Every question with the answer given; the skipped one flagged *"Not answered"* in text and colour; *"2 of 3 answered"*; a warning that submission is final |
| 6 | Back | Clicks **← Back to Questions** | Fills in the essay | His earlier answers are still there — the inputs were hidden, not rebuilt |
| 7 | Review again | Returns to review | Sees *"3 of 3 answered"* | — |
| 8 | Confirm | Clicks **Confirm & Submit Final** | — | Submits; if anything were blank a second dialog would warn it scores zero |
| 9 | Result | Score box | Reads it | MCQs marked instantly; the essay is reported as awaiting the instructor, and **no rating is shown yet** |
| 10 | Waiting | My Results row | Checks back later | Marks shown *"(so far)"*, rating column reads **Pending** |
| 11 | Marked | Same row after the lecturer marks it | — | Percentage, rating (e.g. **1.75**), **Final** status, and the instructor's remarks |
| 12 | Understanding | Expands *"How grades are calculated"* | Reads the scale | Shows the transmutation formula and the full 1.00–5.00 band table |

**Design consequences.**

- Frames 5–8 exist because submission is irreversible. A single click should not
  end an examination.
- Frame 6 is why the review step hides the question view instead of replacing it.
- Frames 9–11 are why a rating is withheld until marking is complete: showing
  3.00 from a half-marked paper would misinform the student about whether they
  had passed.

---

## Common thread

All three storyboards share the same structural moments — sign in behind the
gate, work in a soft-edged surface with a role accent, get told plainly when
something is wrong, confirm anything irreversible in a dialog that names what is
at stake, and leave through the same profile menu. Only the accent and the
content change between roles.
