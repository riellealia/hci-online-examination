const {load,SEED}=require('./harness');
const ok=(condition,message)=>console.log(`  ${condition?'✅':'❌'} ${message}`);

console.log('=== SECTIONS. Separate records, memberships, and inherited subjects ===');
let seed=SEED();
let r=load('admin.html',{...seed,currentUser:{username:'admin',role:'admin'}});
ok(r.read('sections').some(section=>section.id==='A'),'legacy student section is migrated to a section record');
ok(!!r.d.querySelector('#sectionSection .table-corner-actions .corner-icon-btn svg'),'Section Add action floats in the table corner');
ok(r.d.querySelectorAll('#sectionTable .section-action-trigger').length===r.read('sections').length,'each section uses one settings action');
const sectionMenu=r.d.querySelector('#sectionTable .section-action-menu');
ok(!!sectionMenu&&/Assign subjects/.test(sectionMenu.textContent)&&/Edit section/.test(sectionMenu.textContent)&&/Delete section/.test(sectionMenu.textContent),'section settings menu names all existing actions');
r.w.openStudentModal();
ok(r.d.querySelectorAll('#sSections input[name="studentSection"]').length===1,'student editor selects from existing section cards');
r.w.closeModal('studentModal');

r.w.openSectionModal();
r.d.getElementById('sectionID').value='3bscs-2';
r.d.getElementById('sectionName').value='2';
r.d.getElementById('sectionProgram').value='BSCS';
r.d.getElementById('sectionYear').value='3';
r.w.saveSection();
ok(r.read('sections').some(section=>section.id==='3BSCS-2'&&section.program==='BSCS'&&section.yearLevel===3&&section.sectionNumber===2),'new section separates its ID, year, curriculum, and section number');
const headings=[...r.d.querySelectorAll('#sectionTable th')].map(cell=>cell.textContent.trim());
ok(headings.slice(0,5).join('|')==='Unique ID|Year Level|Curriculum|Section|Subjects','section table uses the requested academic column order');
ok([...r.d.getElementById('sectionProgram').options].map(option=>option.textContent).join('|')==='BSCS|BSIT|BSIS','curriculum choices are BSCS, BSIT, and BSIS');
const savedRow=[...r.d.querySelectorAll('#sectionTable tr')].find(row=>row.cells[0]?.textContent.includes('3BSCS-2'));
ok(savedRow&&savedRow.cells[1].textContent==='3'&&savedRow.cells[2].textContent==='BSCS'&&savedRow.cells[3].textContent==='2','3BSCS-2 displays as year 3, curriculum BSCS, section 2');
const yearGroup=r.d.querySelector('[data-table-tools="sections"] .group-field select');
const yearOption=[...yearGroup.options].find(option=>option.textContent==='Year Level');
ok(!!yearOption,'Section Management offers Group by Year Level');
yearGroup.value=yearOption.value; yearGroup.dispatchEvent(new r.w.Event('change',{bubbles:true}));
ok([...r.d.querySelectorAll('#sectionTable .table-group-row')].every(row=>/record/.test(row.textContent)),'year-level groups display their section counts');

const before=r.read('sections').length;
r.w.openSectionModal();
r.d.getElementById('sectionID').value='3BSCS-2';
r.d.getElementById('sectionName').value='Duplicate';
r.w.saveSection();
ok(r.read('sections').length===before,'duplicate section ID is rejected');

r.w.openSectionSubjects(0);
const subjectChecks=[...r.d.querySelectorAll('#sectionSubjects input[type="checkbox"]')];
ok(subjectChecks.length===2,'section editor presents every subject as an explicit checkbox');
subjectChecks.forEach(input=>input.checked=true);
[...r.d.querySelectorAll('#sectionSubjects select[data-faculty-for]')].forEach(select=>select.value='F1');
r.w.saveSectionSubjects();
ok(r.read('sectionSubjects')[0].assignments.length===2&&r.read('sectionSubjects')[0].assignments.every(item=>item.facultyId==='F1'),'multiple subject offerings with professors are saved to one section');
r.w.close();

seed=SEED(); seed.allotments=[]; seed.sections=[{id:'A',name:'Section A'}];
seed.sectionSubjects=[{sectionId:'A',subjectCodes:['SUB2']}];
r=load('student.html',{...seed,currentUser:{username:'S1',role:'student'}});
ok(r.d.getElementById('statSubjects').textContent==='1','student inherits the section subject without a direct allotment');
ok(r.d.getElementById('subjectsTable').textContent.includes('SUB2'),'inherited subject appears in the student subject list');
ok(r.d.getElementById('examTable').textContent.includes('F2 SECRET Exam'),'exam for inherited subject is visible');
r.w.close();
process.exit(0);
