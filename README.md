# HCI Online Examination System

## Project notes

This is a Human–Computer Interaction (HCI) school project for an online examination system. The project focuses on the interface, user experience, formatting, navigation, and interactive prototype rather than on production-level backend performance.

The project does not use a database. CSV files and browser storage are used for the demonstration data because the main objective is to present a working HCI interface.

Some interface elements may appear large or slightly over-scaled. This is manageable for the current prototype because the priority has been consistent formatting and a clear demonstration of the workflows rather than complete responsiveness and production scaling.

The Admin, Faculty, and Student workflows are connected and functional. Current polish includes role-aware light/dark themes, course pages, question authoring, exam attempts, grading, reports, System Management, and history-based navigation. The prototype remains browser-storage based and is not intended as a production deployment.

## Current verification

Run the automated browser-level suite with:

```powershell
node tests/run-all.js
```

The latest complete run on September 2, 2026 reports **964 passing and 6 failing assertions**. The six failures are known stale UI-structure expectations in three older test files; focused tests for the current interfaces pass. See [completion-rate.md](.plans/progress/completion-rate.md) for the exact breakdown.

Most planning notes, requirements, progress records, and design decisions are available in the [`.plans`](.plans) folder.

## Running the project locally

The project should be opened through a local web server instead of opening the HTML files directly.

1. Clone or pull the repository through GitHub in Visual Studio Code.
2. Open the project folder in VS Code.
3. Open a terminal in the project root.
4. Start a local server:

   ```powershell
   python -m http.server 8000
   ```

5. Open the following address in a browser:

   ```text
   http://localhost:8000/html/index.html
   ```

If `python` is unavailable on Windows, try:

```powershell
py -m http.server 8000
```

Keep the terminal open while using the website. Press `Ctrl+C` in the terminal to stop the server.

## Working with the repository

Use GitHub to connect the repository to Visual Studio Code. Before making changes, pull the latest version:

```powershell
git pull
```

After finishing and checking your changes, commit and push them so everyone receives the updated version:

```powershell
git add .
git commit -m "Describe your changes"
git push
```

Changes and improvements are welcome. Before changing an existing workflow, design decision, or shared file, please ping the group chat so the team can discuss and coordinate the change.

## Additional reference

Claude also generated an artifact that may be useful as a reference:

[Claude Code artifact](https://claude.ai/code/artifact/be825174-06bb-4d64-94d2-288611377b01)


## overview
**admin > dean > faculty > professor > students**
__scopes and fuctions__

admin = system overview / server maintenance / approval to join course
dean = approval
faculty = assigns professor / student for quizzes > goes to dean for approval
professor = handles exam and grading
student = takes exam

## log in details
- seperate log in dash board 
    - remove admin and faulty from log ins
    - log in should immedietly open (username, password, log in)
    - admin log in should be same
    log in according to credentials no more buttons if u are an adin or a faculty


## admin
- dashboard, statistics
- information logs (current log in logs only)
### add on changes 
- add logs when clicking profile, actions taken, actions other took, log in details filterable
### change 
- make add students and faculty different from managing
- move managing into the faculty 
    - should have no destructive commands, no changing basic details, faculty should just move the things
- change "delete students" to "archive and deactivate" 
- have a list/ page of archived student
- have a command that changes the school year and hides, and reset the pages. it should be seperated between, 1st sem, 2nd sem, summer, additionals
- add a course curriculum per college
    - per year and per sem until graduation
    - assign the date of semester starts

## dean pages
- log in
- dashboard
- member lists (filterable by faculty/ professors)
    - clicking a cell in lists opens ups the profile like in admin
- assign a prof as a faculty (much better if they can actually set permissions)
- statistics of a professor and faculty should be accesible here
    - optional but every survey or quetionaire after a semester should be seenable by dean

optional: announcement to faculty, student and professor? can be per group or everyone
could mail? (reusing the announcement on the admin is fine)

## faculty
- move assignment of subjects to professor here
    - make the dean approve of this
- move the managing of subjects to students here

## general changes that is shared
the profile overview when a name is clicked
- each profile should have its own hidden per student per permission
     ex. students should not be able to see the ligs and manging command, only the overview of the student
- Adding a section to a student an adding a subject to a prof
both should have red acent cell
- the list of section should be a list of cell on a grid type cell
- should have colored pill in each cell on availability, red for none, yellow for low, green for high availability 
low availitbity should start at 5 and below, it would then reflect on border accent outside the subject
- availability of a subject and section should be able to be filter and grouped by, year, section (cs, is, it, game dev and animation)



## optional
- editing the students details, such as profile picture
and it in turn it would show in the lists when being managed. useful for identifying annoying to code
- changing csv to sql lite (i thougght we are only gonna progess on the ui and ux importance so i didnt really think about it. but atp they gonna make us face professors for the upcoming shie. csv is kinda shiet)


## note
professor and students should have no further changes for now
at most special reports but it is optional such as 
- questionaire
- report a profesor, faculty (goes into dean)
- professor pop out announcement
- and announcement column for prof and students
- special actions against a student
- regular or irregular filter

please pick things you would develop and tell, so i could manage the rest and you guys would have somethig if a professor asked u a question on what u did.