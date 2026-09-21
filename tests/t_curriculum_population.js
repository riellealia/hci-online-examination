'use strict';
const assert=require('assert');
const {load}=require('./harness');
const curricula=require('../assets/philippine-curricula.json');

const page=load('login.html',{users:[],faculty:[],students:[],subjects:[],subjectAssignments:[],allotments:[],exams:[],questions:[],curricula},{query:'?role=admin'});
const students=page.read('students'),sections=page.read('sections'),records=page.read('sectionSubjects'),enrollments=page.read('studentEnrollments');
const programs=['BSCS','BSIT','BSIS','BSGAMEDEV','BSANIMATION'];

assert.strictEqual(sections.length,60,'five courses x four years x three sections must be seeded');
assert.strictEqual(students.length,1200,'twenty students per seeded section must be created');
for(const program of programs)for(const yearLevel of [1,2,3,4])assert.strictEqual(sections.filter(section=>section.program===program&&section.yearLevel===yearLevel).length,3,`${program} Year ${yearLevel} must have three sections`);

for(const section of sections){
  const studentIds=new Set(enrollments.filter(item=>item.sectionId===section.id).map(item=>item.studentId));
  assert(studentIds.size<=section.capacity,`${section.id} exceeds its capacity`);
  assert.strictEqual(studentIds.size,20,`${section.id} should have twenty demo students`);
  const expected=new Set(curricula.filter(item=>item.program===section.program&&Number(item.yearLevel)===section.yearLevel&&item.term==='first'&&item.status!=='archived'&&item.removed!==true).map(item=>item.subjectCode));
  const offered=new Set((records.find(item=>item.sectionId===section.id)?.assignments||[]).map(item=>item.subjectCode));
  assert.deepStrictEqual([...offered].sort(),[...expected].sort(),`${section.id} offerings must equal its first-semester curriculum`);
}

for(const student of students){
  assert.strictEqual(student.sections.length,1,`${student.id} must belong to one regular section`);
  const section=sections.find(item=>item.id===student.sections[0]);
  const expected=new Set(curricula.filter(item=>item.program===section.program&&Number(item.yearLevel)===section.yearLevel&&item.term==='first'&&item.status!=='archived'&&item.removed!==true).map(item=>item.subjectCode));
  const actual=new Set(enrollments.filter(item=>item.studentId===student.id).map(item=>item.subjectCode));
  assert.deepStrictEqual([...actual].sort(),[...expected].sort(),`${student.id} must receive the complete first-semester curriculum`);
}

page.w.close();
console.log('✅ students, sections, capacities, and first-semester curriculum enrollment pass');
