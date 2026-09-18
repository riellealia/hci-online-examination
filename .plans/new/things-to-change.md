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