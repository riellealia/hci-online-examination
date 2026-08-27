const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);

console.log('=== FACULTY SUBJECT WORKSPACE. Course-level authoring and oversight ===');
let seed=SEED();
let r=load('faculty.html',{...seed,currentUser:{username:'F1',role:'faculty'}});
ok(!!r.d.querySelector('#subjectList .sub-card[role="button"]'),'assigned subject card is clickable');
ok(!r.d.querySelector('#subjectList .view-exams-btn')&&!/Open Subject/.test(r.d.getElementById('subjectList').textContent),'subject cards do not repeat a separate open button');
r.w.FacultySubjectWorkspace.open('SUB1');
ok(r.d.getElementById('subject-workspace-tab').style.display==='block','subject opens its own workspace page');
ok(r.d.querySelectorAll('.workspace-tab').length===4,'Main, Members, Grades, and Logs tabs are present');
ok(!r.d.querySelector('.workspace-rail'),'large student preview rail is removed');
ok(!!r.d.querySelector('.workspace-menu-trigger'),'hero uses a three-dot options menu');
r.d.querySelector('.workspace-menu-trigger').click();
ok(r.d.querySelectorAll('.section-preview-option').length>0,'menu lists handled sections for preview');
r.d.querySelector('.section-preview-option').click();
ok(r.d.getElementById('facultySubjectWorkspace').classList.contains('is-section-preview'),'section selection transforms the workspace into preview mode');
ok(/Section preview/.test(r.d.querySelector('.preview-banner').textContent),'preview identifies the selected section');
r.w.FacultySubjectWorkspace.showTab('main');

r.d.getElementById('workspaceWeek').value='3';
r.d.getElementById('workspaceBlockTitle').value='Interaction Design';
r.d.getElementById('workspaceBlockBody').value='## Goals\n- Learn usability principles\n**Read carefully**';
r.w.FacultySubjectWorkspace.addBlock();
const content=r.read('subjectWorkspaceContent');
ok(content.some(item=>item.subjectCode==='SUB1'&&item.week===3&&item.title==='Interaction Design'),'weekly content cell autosaves');
ok(/Interaction Design/.test(r.d.querySelector('.week-stack').textContent),'saved cell appears in the selected week');
ok(!!r.d.querySelector('.content-block h2')&&!!r.d.querySelector('.content-block strong'),'Markdown headings and emphasis render inside cells');
ok(r.read('applicationAuditLog').some(item=>item.action==='add'&&item.entityType==='subject-content'),'content creation is audited');

r.w.FacultySubjectWorkspace.showTab('members');
ok(/Prof\.|F1/.test(r.d.querySelector('.workspace-main').textContent),'Members lists faculty across the subject');
ok(!!r.d.querySelector('.workspace-table table')&&!!r.d.querySelector('.member-row'),'Members use a professor table');
r.d.querySelector('.member-row').click();
ok(!!r.d.querySelector('.member-section-table'),'Professor row expands to a handled-sections table');
r.w.FacultySubjectWorkspace.showTab('grades');
ok(!!r.d.querySelector('.workspace-grade-table table'),'Grades provides a section assessment table');
r.w.FacultySubjectWorkspace.showTab('logs');
ok([...r.d.querySelectorAll('.workspace-subtabs button')].some(button=>button.textContent.includes('Faculty')),'Logs provides a Faculty subtab');
ok([...r.d.querySelectorAll('.workspace-subtabs button')].some(button=>button.textContent.includes('Students')),'Logs provides a Students subtab');
r.w.close();

seed.subjectWorkspaceContent=content;
let student=load('student.html',{...seed,currentUser:{username:'S1',role:'student'}});
student.w.openStudentSubject('SUB1');
ok(/Week 3/.test(student.d.getElementById('studentSubjectDetail').textContent),'Faculty weekly content appears on the real Student subject page');
ok(/Interaction Design/.test(student.d.getElementById('studentSubjectDetail').textContent),'Student sees the published content cell');
student.w.close();
process.exit(0);
