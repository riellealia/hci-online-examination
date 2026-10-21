'use strict';
const path=require('path');
const {openDatabase}=require('../server/database');

const file=process.env.SQLITE_PATH||path.join(__dirname,'..','data','neu-examination.sqlite');
const store=openDatabase(file),read=key=>store.read(key,[]);
if(process.env.REBALANCE_BACKUP){const target=path.resolve(process.env.REBALANCE_BACKUP);store.raw.exec(`VACUUM INTO '${target.replace(/'/g,"''")}'`);console.log(`Backup: ${target}`)}
const original={faculty:read('faculty'),students:read('students'),users:read('users'),coordinators:read('coordinators'),sections:read('sections'),sectionSubjects:read('sectionSubjects'),studentEnrollments:read('studentEnrollments'),exams:read('exams'),studentSubmissions:read('studentSubmissions')};
const students=original.students.filter(item=>item.lifecycleDemoSeed!=='v1'&&!String(item.id).startsWith('DEMO-ST-'));
const studentIds=new Set(students.map(item=>item.id));
const faculty=original.faculty.filter(item=>item.lifecycleDemoSeed!=='v1'&&!String(item.id).startsWith('DEMO-PROF-'));
const facultyLast=['Velasco','Domingo','Mercado','Padilla','Salazar','Valdez','Soriano','Pascual','Aguilar','Cabrera','Rosales','Manalo','Pineda','Marquez','De Leon','Evangelista','Estrada','Ferrer','Ocampo','Bernardo'];
const facultyFirst=['Alyssa','Ramon','Beatriz','Carlo','Diana','Enrique','Faith','Gabriel','Hazel','Ivan','Joanna','Kevin','Lara','Martin','Nina','Oscar','Patricia','Rafael','Teresa','Victor'];
const offers=original.sectionSubjects.flatMap(record=>(record.assignments||[]).map(item=>({...item,sectionId:record.sectionId}))),maxLoad=6,required=Math.ceil(offers.length/maxLoad);
for(let index=faculty.length;index<required;index++){const extra=index-28;faculty.push({id:`${String(60+extra%40).padStart(2,'0')}-${String(20000+extra*137).padStart(5,'0')}-${String(300+extra*11).padStart(3,'0')}`,first:facultyFirst[(extra+7)%facultyFirst.length],last:facultyLast[Math.floor(extra/facultyFirst.length)%facultyLast.length]})}
const records=original.sectionSubjects.map(record=>({...record,assignments:(record.assignments||[]).map(item=>({...item,facultyId:''}))}));
const liveOffers=records.flatMap(record=>record.assignments.map(item=>({...item,sectionId:record.sectionId}))),reyesId='23-32534-345',reserved=[];
const threeUnitCodes=new Set(read('subjects').filter(item=>Number(item.units)===3).map(item=>item.code));
const mariaOffer=liveOffers.find(item=>item.sectionId==='2BSCS-1'&&threeUnitCodes.has(item.subjectCode));if(mariaOffer)reserved.push(mariaOffer);
for(const offer of liveOffers){if(reserved.length>=19)break;if(reserved.includes(offer)||!threeUnitCodes.has(offer.subjectCode))continue;reserved.push(offer)}
if(reserved.length!==19)throw new Error('Maria Reyes requires exactly 19 three-unit offerings for the requested 57-unit exception.');
const loads=new Map(faculty.map(person=>[person.id,0]));reserved.forEach(offer=>{offer.facultyId=reyesId;loads.set(reyesId,(loads.get(reyesId)||0)+1)});
liveOffers.filter(offer=>!offer.facultyId).forEach(offer=>{const person=faculty.filter(item=>(loads.get(item.id)||0)<maxLoad).sort((a,b)=>(loads.get(a.id)||0)-(loads.get(b.id)||0)||a.id.localeCompare(b.id))[0];if(!person)throw new Error('Professor capacity was exhausted.');offer.facultyId=person.id;loads.set(person.id,(loads.get(person.id)||0)+1)});
liveOffers.forEach(offer=>{const stored=records.find(record=>record.sectionId===offer.sectionId).assignments.find(item=>item.id===offer.id);stored.facultyId=offer.facultyId});
const facultyIds=new Set(faculty.map(item=>item.id)),validOffers=new Set(liveOffers.map(item=>item.id));
const studentEnrollments=original.studentEnrollments.filter(item=>studentIds.has(item.studentId)&&validOffers.has(item.offeringId));
const users=original.users.filter(item=>item.lifecycleDemoSeed!=='v1'&&!/^DEMO-(?:ST|PROF|COORD|DEAN)-/.test(String(item.username)));
const knownUsers=new Set(users.map(item=>item.username));faculty.forEach(person=>{if(!knownUsers.has(person.id))users.push({username:person.id,password:`${String(person.last).toLowerCase().replace(/\s+/g,'')}1`,role:'faculty',status:'active'})});
const coordinators=original.coordinators.filter(item=>item.lifecycleDemoSeed!=='v1'&&!String(item.id).startsWith('DEMO-COORD-'));
const subjectAssignments=read('subjects').map(subject=>({subjectCode:subject.code,facultyIds:[...new Set(liveOffers.filter(offer=>offer.subjectCode===subject.code).map(offer=>offer.facultyId))]}));
const exams=original.exams.map(exam=>{const sectionIds=Array.isArray(exam.sections)?exam.sections:[];const match=liveOffers.find(offer=>offer.subjectCode===exam.subjectCode&&(!sectionIds.length||sectionIds.includes(offer.sectionId)))||liveOffers.find(offer=>offer.subjectCode===exam.subjectCode);return match?{...exam,facultyId:match.facultyId}:exam}).filter(exam=>facultyIds.has(exam.facultyId));
const examIds=new Set(exams.map(item=>item.id)),studentSubmissions=original.studentSubmissions.filter(item=>studentIds.has(item.studentId)&&examIds.has(item.examId));
const sectionCounts=new Map(original.sections.map(section=>[section.id,students.filter(student=>(student.sections||[]).includes(section.id)).length]));
const overflow=original.sections.filter(section=>(sectionCounts.get(section.id)||0)>Number(section.capacity||0));
if(overflow.length)throw new Error(`Section capacity remains exceeded: ${overflow.map(item=>item.id).join(', ')}`);
const nonReyesMaximum=Math.max(...[...loads].filter(([id])=>id!==reyesId).map(([,count])=>count));
if(nonReyesMaximum>maxLoad)throw new Error('A Professor other than Maria Reyes would exceed the six-offering limit.');
store.migrate({faculty,students,users,coordinators,sectionSubjects:records,studentEnrollments,subjectAssignments,exams,studentSubmissions});
console.log(JSON.stringify({before:{faculty:original.faculty.length,students:original.students.length,enrollments:original.studentEnrollments.length},after:{faculty:faculty.length,students:students.length,sections:original.sections.length,offerings:liveOffers.length,enrollments:studentEnrollments.length,mariaReyesOfferings:loads.get(reyesId),maxOtherProfessorOfferings:nonReyesMaximum,maxSectionStudents:Math.max(...sectionCounts.values())}},null,2));
store.close();
