const {createPersonnelService}=require('../server/personnel');
const ok=(condition,message)=>console.log(`  ${condition?'✅':'❌'} ${message}`);
function store(seed={}){const data=structuredClone(seed);return{read:(key,fallback)=>key in data?structuredClone(data[key]):fallback,write:(key,value)=>(data[key]=structuredClone(value),true),migrate:records=>(Object.entries(records).forEach(([key,value])=>data[key]=structuredClone(value)),true),data};}
console.log('=== PERSONNEL GOVERNANCE. Accounts, hiring, and appointments ===');
const db=store({users:[],faculty:[],students:[],coordinators:[],applicationAuditLog:[],systemSettings:{coordinatorAppointmentAuthority:'dean-direct'}}),service=createPersonnelService(db),admin={username:'admin',role:'admin'},dean={username:'dean.demo',role:'dean'};
service.createAccount({username:'2026-10001',password:'student88',role:'student',first:'Ana',last:'Cruz',program:'BSCS',status:'active'},admin);
ok(db.data.users.some(item=>item.username==='2026-10001'&&item.role==='student'),'Admin creates one of the five supported account roles');
ok(db.data.students.some(item=>item.id==='2026-10001'),'account creation also creates the matching academic identity without enrollment');
let duplicate=false;try{service.createAccount({username:'2026-10001',password:'student88',role:'student',first:'Ana',last:'Cruz'},admin)}catch(error){duplicate=error.code==='DUPLICATE_ACCOUNT'}
ok(duplicate,'duplicate institutional IDs are rejected');
service.createAccount({username:'26-90001',password:'professor88',first:'Mina',last:'Reyes',program:'BSCS'},dean,'dean');
ok(db.data.faculty.some(item=>item.id==='26-90001')&&db.data.users.some(item=>item.username==='26-90001'&&item.role==='faculty'),'Dean hiring creates linked Professor account and profile');
service.appointCoordinator('26-90001',{program:'BSCS',effectiveDate:'2026-10-13'},dean);
ok(db.data.users.find(item=>item.username==='26-90001').role==='coordinator'&&db.data.coordinators.some(item=>item.id==='26-90001'),'authorized Dean appointment promotes the account and records a Coordinator profile');
ok(db.data.applicationAuditLog.filter(item=>item.entityId==='26-90001').length===2,'Professor hiring and Coordinator appointment retain audit events');
const blockedDb=store({users:[{username:'P1',role:'faculty',status:'active'}],faculty:[{id:'P1'}],coordinators:[],applicationAuditLog:[],systemSettings:{coordinatorAppointmentAuthority:'admin-confirmation'}}),blocked=createPersonnelService(blockedDb);let confirmation=false;try{blocked.appointCoordinator('P1',{program:'BSCS',effectiveDate:'2026-10-13'},dean)}catch(error){confirmation=error.code==='ADMIN_CONFIRMATION_REQUIRED'}
ok(confirmation,'Admin-confirmation policy blocks direct Dean appointment');
