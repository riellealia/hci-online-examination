const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
console.log('=== STUDENT PROFILE HISTORY TOOLBAR. Search/filter/group/sort reused from Account Lifecycle ===');
const seed=SEED();
seed.studentSubmissions=[
  {studentId:'S1',examId:'e1',submittedAt:'2026-08-10T10:00:00Z',total:10,answers:[{awarded:9,needsManualGrading:false}]},
  {studentId:'S1',examId:'e2',submittedAt:'2026-08-20T10:00:00Z',total:10,answers:[{awarded:null,needsManualGrading:true}]}
];
const r=load('admin.html',{...seed,currentUser:{username:'admin',role:'admin'}});

// Read-only Student Profile modal.
r.w.openStudentProfile(0);
r.w.showStudentProfileTab('history');
const host=r.d.getElementById('studentProfileContent');
ok(host.querySelector('.student-history-toolbar')&&!!host.querySelector('.lifecycle-tools-right'),'History tab shows the reused Account Lifecycle toolbar cluster');
ok(host.querySelectorAll('.lifecycle-icon').length===5,'search, filter, group, sort, and direction icons are present');
ok(host.querySelectorAll('#studentProfileContentHistoryTable tbody tr, #studentProfileContentHistoryTable tr').length>=2,'both exam attempts are listed');

host.querySelector('[data-history-menu="search"]').click();
const search=host.querySelector('#studentProfileContentHistorySearch');
search.value='SUB2'; search.dispatchEvent(new r.w.Event('input',{bubbles:true}));
let rows=[...host.querySelectorAll('#studentProfileContentHistoryTable tr')].filter(row=>row.querySelector('td'));
ok(rows.length===1&&/SUB2/.test(rows[0].textContent),'search narrows the history list without losing focus (table-only update)');
search.value=''; search.dispatchEvent(new r.w.Event('input',{bubbles:true}));

host.querySelector('[data-history-menu="filter"]').click();
host.querySelector('.lifecycle-popover input[value="Awaiting review"]').click();
host.querySelector('[data-history-action="apply"]').click();
rows=[...r.d.getElementById('studentProfileContent').querySelectorAll('#studentProfileContentHistoryTable tr')].filter(row=>row.querySelector('td'));
ok(rows.length===1&&/Awaiting review/.test(rows[0].textContent),'filtering by status keeps only matching rows');
r.d.getElementById('studentProfileContent').querySelector('[data-history-menu="filter"]').click();
r.d.getElementById('studentProfileContent').querySelector('[data-history-action="clear"]').click();

const freshHost=r.d.getElementById('studentProfileContent');
freshHost.querySelector('[data-history-menu="group"]').click();
freshHost.querySelector('input[name="studentHistoryGroup"][value="status"]').click();
ok(r.d.getElementById('studentProfileContent').querySelectorAll('.workspace-group-row').length===2,'grouping by status partitions the two attempts');

// The administrative "Manage student" modal renders its own copy of the same toolbar, wired independently.
r.w.openStudentEnrollmentPage(0);
r.w.showStudentCommandTab('history');
const adminHost=r.d.getElementById('studentEnrollmentContent');
ok(!!adminHost.querySelector('.student-history-toolbar'),'the administrative Manage-student History tab also gets the toolbar');
ok(adminHost.querySelectorAll('#studentEnrollmentContentHistoryTable tr').length>=2,'reopening resets the filters carried over from the read-only profile');
adminHost.querySelector('#studentEnrollmentContentHistoryDirection').click();
ok(r.d.getElementById('studentEnrollmentContent').querySelector('#studentEnrollmentContentHistoryDirection').classList.contains('is-descending')===false,'the direction toggle works from the administrative modal too');
r.w.close(); process.exit(0);
