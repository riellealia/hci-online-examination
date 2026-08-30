const {load,SEED}=require('./harness');
let pass=0,fail=0;
function ok(value,message){if(value){pass++;console.log('PASS',message)}else{fail++;console.log('FAIL',message)}}

const seed=SEED();
seed.exams.push({id:'e3',facultyId:'F1',subjectCode:'SUB1',title:'Second Exam',status:'published'});
seed.studentSubmissions=[{id:'sub1',studentId:'S1',examId:'e1',submittedAt:'2026-08-30T10:00:00Z'}];
const result=load('student.html',{...seed,currentUser:{username:'S1',role:'student'}});
const progress=result.d.querySelector('[data-subject="SUB1"] .student-course-progress');
ok(progress?.getAttribute('aria-valuenow')==='50','subject progress is completed exams divided by current exams');
ok(/1 of 2 exams completed/.test(progress?.textContent||''),'subject card explains the completion count');

const completed=SEED();
completed.studentSubmissions=[{id:'sub1',studentId:'S1',examId:'e1',submittedAt:'2026-08-30T10:00:00Z'}];
const finished=load('student.html',{...completed,currentUser:{username:'S1',role:'student'}});
ok(finished.d.querySelector('[data-subject="SUB1"] .student-course-progress')?.getAttribute('aria-valuenow')==='100','finishing the only exam produces 100 percent');

const noExam=SEED(); noExam.exams=[];
const empty=load('student.html',{...noExam,currentUser:{username:'S1',role:'student'}});
ok(empty.d.querySelector('[data-subject="SUB1"] .student-course-progress')?.getAttribute('aria-valuenow')==='0','a subject without exams starts at zero percent');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
