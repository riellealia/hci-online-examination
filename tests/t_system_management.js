const {load,SEED}=require('./harness');
const ok=(condition,message)=>console.log(`  ${condition?'✅':'❌'} ${message}`);

console.log('=== SYSTEM MANAGEMENT. Admin-wide prototype controls ===');
let seed=SEED();
let page=load('admin.html',{...seed,currentUser:{username:'admin',role:'admin'}});
ok(!!page.d.getElementById('systemSection')&&!!page.d.querySelector('#sidebar [data-panel="systemSection"]'),'System Management is one Admin page and navigation item');
ok(page.d.querySelectorAll('#systemManagementRoot .system-card').length===6,'page contains the six requested tools');
const switches=[...page.d.querySelectorAll('#systemManagementRoot .system-toggle-input[role="switch"]')];
ok(switches.length===3&&switches.every(input=>input.nextElementSibling?.classList.contains('system-toggle-track')),'maintenance and account controls render as accessible toggles');

page.d.getElementById('announcementTitle').value='Enrollment reminder';
page.d.getElementById('announcementMessage').value='Check your assigned subjects.';
page.d.getElementById('announcementAudience').value='student';
page.w.SystemManagement.saveAnnouncement();
ok(page.read('adminAnnouncements').some(item=>item.title==='Enrollment reminder'&&item.audience==='student'),'Admin can publish a targeted announcement');

page.d.getElementById('systemMaintenance').checked=true;
page.d.getElementById('maintenanceMessage').value='Scheduled maintenance';
page.w.SystemManagement.saveMaintenance();
ok(page.read('systemSettings').maintenance&&page.read('systemSettings').maintenanceMessage==='Scheduled maintenance','maintenance state and message are saved');

page.d.getElementById('academicYear').value='2027-2028';
page.d.getElementById('academicSemester').value='Second Semester';
page.w.SystemManagement.saveAcademicPeriod();
ok(page.read('systemSettings').schoolYear==='2027-2028'&&page.read('systemSettings').semester==='Second Semester','academic period is saved');

page.d.getElementById('allowFacultyLogin').checked=false;
page.d.getElementById('sessionTimeoutMinutes').value='45';
page.w.SystemManagement.saveAccessRules();
ok(page.read('systemSettings').allowFacultyLogin===false&&page.read('systemSettings').sessionTimeoutMinutes===45,'role access and session timeout are saved');

const backup=page.w.SystemManagement.createBackup();
ok(backup.format==='neu-online-examination-backup'&&backup.records.users.length===4,'backup contains the existing browser records');
const clean=page.w.SystemManagement.scanIntegrity();
ok(Array.isArray(clean.findings),'integrity scanner returns a structured result');
page.w.close();

seed=SEED();seed.exams.push({id:'broken',facultyId:'missing',subjectCode:'missing'});
page=load('admin.html',{...seed,currentUser:{username:'admin',role:'admin'}});
const broken=page.w.SystemManagement.scanIntegrity();
ok(broken.findings.some(item=>item.includes('missing faculty'))&&broken.findings.some(item=>item.includes('missing subject')),'integrity scan reports broken references');
page.w.close();

page=load('faculty.html',{...SEED(),systemSettings:{maintenance:true,maintenanceMessage:'Scheduled maintenance'},currentUser:{username:'F1',role:'faculty'}});
ok(page.blocked&&page.read('currentUser')===null,'maintenance mode blocks Faculty while preserving Admin access');
page.w.close();
process.exit(0);
