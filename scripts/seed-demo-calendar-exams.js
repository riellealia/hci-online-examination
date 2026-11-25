'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { openDatabase } = require('../server/database');
const { createSupabaseReplicatedStore } = require('../server/supabase-replica');

const root = path.join(__dirname, '..');
const localEnv = fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '';
const env = {...Object.fromEntries([...localEnv.matchAll(/^([A-Z_]+)=(.*)$/gm)].map(([, key, value]) => [key, value.trim()])), ...process.env};
const studentId = '2025-00002';
const day = '2026-11-26';
const schedule = [
  ['CCS2101', 'Logic and Sets Quiz', day, '19:00', '20:00', '2026-11-27'],
  ['CCS2102', 'Object-Oriented Programming Quiz', day, '00:00', '00:05'],
  ['CDS1101', 'Data Structures Quiz', day, '00:05', '00:10'],
  ['CHC1101', 'Usability Principles Quiz', '2026-11-27', '10:00', '11:00'],
  ['CIM1101', 'Relational Databases Quiz', '2026-11-27', '11:30', '12:30'],
  ['CMA1102', 'Calculus Fundamentals Quiz', '2026-11-28', '10:00', '11:00']
];
// Each pair contains one true statement followed by one false statement.
const topics = [
  ['The empty set is a subset of every set.', 'A set can contain the same element twice.', 'An implication with a false antecedent is true.', 'A conjunction is true whenever either operand is true.', 'Set union is commutative.', 'Set difference is always commutative.', 'A set with three elements has eight subsets.', 'Every relation is a function.', 'A biconditional is true when both sides have the same truth value.', 'Negating a conjunction produces a conjunction of the negations.'],
  ['An object is an instance of a class.', 'Every class must inherit directly from every other class.', 'Encapsulation can restrict direct access to internal state.', 'Constructors are used primarily to destroy objects.', 'Polymorphism allows a common interface to have different implementations.', 'Inheritance and composition are identical relationships.', 'A subclass can override an inherited virtual method.', 'An abstract class always has to be instantiated.', 'Composition models a has-a relationship.', 'Two objects of the same class must have identical field values.'],
  ['A stack follows last-in, first-out order.', 'A standard queue removes the newest element first.', 'Binary search requires ordered data.', 'A linked list always provides constant-time indexed access.', 'A hash collision occurs when distinct keys map to the same bucket.', 'Binary search has linear worst-case time on a sorted array.', 'Breadth-first search can use a queue.', 'A min-heap keeps its largest element at the root.', 'A tree with n vertices has n minus one edges.', 'An array must store each element at an unrelated memory location.'],
  ['Feedback helps users understand what happened after an action.', 'A usable interface should rely only on color to convey errors.', 'Consistency helps users transfer knowledge between screens.', 'Keyboard accessibility is unnecessary when a mouse is available.', 'Recognition can reduce the need to memorize commands.', 'An error message should hide how to recover.', 'Usability testing can reveal problems users encounter.', 'A larger number of clicks always guarantees better usability.', 'An undo action can support user control.', 'Screen readers interpret every decorative icon correctly without labels.'],
  ['A primary key uniquely identifies a row.', 'A foreign key must always have a different value in every row.', 'A join can combine matching rows from two tables.', 'A WHERE clause renames a table.', 'Normalization can reduce unnecessary duplication.', 'An UPDATE statement always creates a new table.', 'A transaction can group multiple changes into one unit.', 'COUNT(*) counts only columns.', 'An index can speed up some queries.', 'A SELECT statement necessarily deletes the rows it returns.'],
  ['The derivative of x squared is 2x.', 'The derivative of a constant is the constant itself.', 'A definite integral can represent signed area.', 'The derivative of sin(x) is minus cos(x).', 'The chain rule differentiates composite functions.', 'The integral of 1 with respect to x is always zero.', 'A differentiable function is continuous at the point of differentiation.', 'Every continuous function is differentiable everywhere.', 'The derivative of e to the x is e to the x.', 'The product rule multiplies the two derivatives together.']
];

async function main() {
  const apply = process.argv.includes('--apply');
  const sync = process.argv.includes('--sync');
  const local = openDatabase(env.SQLITE_PATH || path.join(root, 'data', 'neu-examination.sqlite'));
  const store = createSupabaseReplicatedStore(local, sync ? {
    url:env.SUPABASE_URL, serviceKey:env.SUPABASE_SERVICE_ROLE_KEY,
    relational:String(env.SUPABASE_RELATIONAL || 'true').toLowerCase() !== 'false'
  } : {});
  try {
    if (sync && !store.status().enabled) throw new Error('Supabase configuration is required for --sync.');
    if (sync) await store.hydrate();
    if (!store.read('users', []).some(user => user.username === studentId && user.role === 'student')) throw new Error('Demo student account is missing.');
    const period = store.read('academicPeriods', []).find(item => item.status === 'active');
    if (!period) throw new Error('There is no active academic period.');
    const inPeriod = item => (!item.academicPeriodId || item.academicPeriodId === period.id) && (!item.periodStatus || item.periodStatus === 'active');
    const enrollments = store.read('studentEnrollments', []).filter(item => item.studentId === studentId && inPeriod(item));
    const offerings = store.read('sectionSubjects', []).filter(inPeriod).flatMap(row =>
      (row.assignments || []).filter(inPeriod).map(item => ({...item, sectionId:row.sectionId})));
    const exams = store.read('exams', []), questions = store.read('questions', []), submissions = store.read('studentSubmissions', []);
    const created = schedule.map(([subjectCode, title, date, start, end, endDate], index) => {
      const enrollment = enrollments.find(item => item.subjectCode === subjectCode);
      const offering = offerings.find(item => item.subjectCode === subjectCode && item.sectionId === enrollment?.sectionId && item.facultyId);
      if (!offering) throw new Error(`Demo student has no taught offering for ${subjectCode}.`);
      const id = `DEMO-CALENDAR-${day}-${index + 1}`;
      const paper = topics[index].map((statement, q) => ({
        id:`${id}-Q${q + 1}`, examId:id, type:'truefalse', text:statement, points:1, manualCheck:false,
        options:[{text:'True', isCorrect:q % 2 === 0}, {text:'False', isCorrect:q % 2 !== 0}]
      }));
      return {paper, exam:{id, title, subjectCode, date, start, end, ...(endDate ? {endDate} : {}), facultyId:offering.facultyId,
        academicPeriodId:period.id, periodStatus:'active', sections:[offering.sectionId],
        offeringIds:[offering.id], questionIds:paper.map(q => q.id), status:'published', maxAttempts:1,
        scoreRelease:'immediate', answerRelease:'after-deadline', showSubmittedAnswers:true, durationMinutes:0}};
    });
    const completed = created[2];
    const answers = completed.paper.map((q, index) => {
      const selectedIndex = index < 8 ? index % 2 : 1 - index % 2;
      return {questionId:q.id, type:q.type, points:1, selectedIndex, awarded:index < 8 ? 1 : 0, isCorrect:index < 8, needsManualGrading:false};
    });
    const result = {id:`${completed.exam.id}-RESULT`, examId:completed.exam.id, studentId, academicPeriodId:period.id,
      periodStatus:'active', submittedAt:`${day}T00:09:00+08:00`, total:10, score:8, status:'graded', pendingPoints:0, answers};
    const appendMissing = (existing, newRecords) => [...existing, ...newRecords.filter(record => !existing.some(item => item.id === record.id))];
    console.table(created.map(({exam,paper}) => ({subject:exam.subjectCode, date:exam.date, starts:exam.start,
      ends:`${exam.endDate || exam.date} ${exam.end}`, questions:paper.length, section:exam.sections[0]})));
    if (!apply) return;
    const seededIds = new Set(created.map(item => item.exam.id));
    const updatedExams = exams.map(exam => {
      if (!seededIds.has(exam.id) || exam.demoStudentId !== studentId) return exam;
      const updated = {...exam}; delete updated.demoStudentId;
      return updated;
    });
    store.migrate({exams:appendMissing(updatedExams, created.map(x => x.exam)), questions:appendMissing(questions, created.flatMap(x => x.paper)),
      studentSubmissions:appendMissing(submissions, [result])});
    if (sync) {
      if (!await store.flush()) throw new Error(store.status().error || 'Supabase write failed.');
      await store.hydrate();
    }
    for (const {exam} of created) {
      const saved = store.read('exams', []).find(item => item.id === exam.id);
      const paper = store.read('questions', []).filter(item => item.examId === exam.id);
      if (saved?.subjectCode !== exam.subjectCode || saved?.sections?.[0] !== exam.sections[0] || paper.length !== 10 || paper.some(item => item.type !== 'truefalse' || item.manualCheck)) {
        throw new Error(`Verification failed for ${exam.id}.`);
      }
    }
    const results = store.read('studentSubmissions', []).filter(item => item.studentId === studentId);
    if (!results.some(item => item.id === result.id && item.score === 8) || results.some(item => item.examId === created[1].exam.id)) {
      throw new Error('Completed or missed status could not be verified.');
    }
    console.log(`Verified six exams in ${sync ? 'SQLite and Supabase' : 'SQLite'} for ${studentId}.`);
  } finally {
    store.close();
  }
}

main().catch(error => {console.error(error.message); process.exitCode = 1;});
