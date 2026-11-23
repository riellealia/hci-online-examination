const {createPersonnelService}=require('../server/personnel');
const ok=(c,m)=>{console.log(`  ${c?'✅':'❌'} ${m}`);if(!c)process.exitCode=1;};
function store(seed={}){const data=structuredClone(seed);return{read:(k,f)=>k in data?structuredClone(data[k]):f,write:(k,v)=>(data[k]=structuredClone(v),true),migrate:r=>(Object.entries(r).forEach(([k,v])=>data[k]=structuredClone(v)),true),data};}
console.log('=== CHANGE ACCOUNT ROLE ===');
const admin={username:'admin',role:'admin'};
const db=store({users:[{username:'admin',role:'admin'},{username:'S1',role:'student',first:'A',last:'B',status:'active',createdBy:'admin'},{username:'S2',role:'student',first:'C',last:'D',createdBy:'admin'},{username:'P1',role:'faculty',first:'E',last:'F',createdBy:'admin'},{username:'2025-00002',role:'student'},{username:'DEMO-PROF-0001',role:'faculty',createdAt:'2026-01-01'},{username:'OLD1',role:'student',effectiveDate:'2026-10-01',createdAt:'2026-10-01'}],
  students:[{id:'S1'},{id:'S2'},{id:'2025-00002'},{id:'OLD1'}],faculty:[{id:'P1'}],coordinators:[],studentEnrollments:[{studentId:'S2'}],exams:[],subjectAssignments:[],
  accessRoles:[{id:'r1',members:['S1']}],applicationAuditLog:[]});
const svc=createPersonnelService(db);
svc.changeRole('S1',{role:'faculty',reason:'Hired as professor'},admin);
ok(db.data.users.find(u=>u.username==='S1').role==='faculty','role updated on the account');
ok(!db.data.students.some(r=>r.id==='S1')&&db.data.faculty.some(r=>r.id==='S1'),'profile moved from students to faculty');
ok(db.data.accessRoles[0].members.length===0,'old permission-role membership cleared');
const ev=db.data.applicationAuditLog.at(-1);
ok(ev.action==='change-role'&&ev.previousValue.role==='student'&&ev.newValue.role==='faculty'&&ev.reason==='Hired as professor','audit event records old/new role and reason');
const err=(fn)=>{try{fn();return null}catch(e){return e.code}};
ok(err(()=>svc.changeRole('S2',{role:'faculty',reason:'x'},admin))==='ROLE_HAS_RECORDS','refused when student still has enrollments');
ok(err(()=>svc.changeRole('P1',{role:'student'},admin))==='INVALID_PERSONNEL_CHANGE','reason is required');
ok(err(()=>svc.changeRole('P1',{role:'faculty',reason:'x'},admin))==='NO_CHANGE','same role is rejected');
ok(err(()=>svc.changeRole('P1',{role:'dean',reason:'x'},{username:'P1',role:'admin'}))==='SELF_CHANGE','cannot change own role');
ok(err(()=>svc.changeRole('P1',{role:'dean',reason:'x'},{username:'d',role:'dean'}))==='FORBIDDEN','non-admin is refused');
ok(err(()=>svc.changeRole('P1',{role:'wizard',reason:'x'},admin))==='INVALID_PERSONNEL_CHANGE','unknown role rejected');
const db2=store({users:[{username:'A1',role:'admin',createdBy:'root'},{username:'A2',role:'admin',disabled:true,createdBy:'root'}],applicationAuditLog:[]});
ok(err(()=>createPersonnelService(db2).changeRole('A1',{role:'dean',reason:'x'},{username:'other',role:'admin'}))==='LAST_ADMIN','last active admin cannot be demoted');
ok(err(()=>svc.changeRole('2025-00002',{role:'faculty',reason:'x'},admin))==='DEMO_ACCOUNT_PROTECTED','seeded demo student cannot change role');
ok(err(()=>svc.changeRole('DEMO-PROF-0001',{role:'student',reason:'x'},admin))==='DEMO_ACCOUNT_PROTECTED','generated DEMO-* account cannot change role');
svc.changeRole('OLD1',{role:'faculty',reason:'legacy created account'},admin);
ok(db.data.users.find(u=>u.username==='OLD1').role==='faculty','account created before this update (has effectiveDate) can still change');
const created=createPersonnelService(store({users:[],applicationAuditLog:[]})).createAccount({username:'new.user',password:'password88',role:'student',first:'N',last:'U'},admin);
ok(created.account.createdBy==='admin','new accounts are stamped with who created them');
