'use strict';
const crypto = require('crypto');

const ROLES = new Set(['admin','dean','coordinator','faculty','student']);
const clean = value => String(value || '').trim();
function fail(message, status = 400, code = 'INVALID_PERSONNEL_CHANGE') { throw Object.assign(new Error(message), { status, code }); }
function audit(session, action, target, previousValue, newValue, details = {}) {
  return { id:`AUD-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`, at:new Date().toISOString(), actorId:session.username, actorRole:session.role, action, category:'account/lifecycle', entityType:'account', entityId:target, previousValue, newValue, result:'success', details };
}
function createPersonnelService(store) {
  function createAccount(input, session, source = 'admin') {
    const username=clean(input.username), first=clean(input.first), last=clean(input.last), role=source==='dean'?'faculty':clean(input.role).toLowerCase(), password=clean(input.password), program=clean(input.program);
    if(!username || !/^[A-Za-z0-9._-]{3,40}$/.test(username)) fail('Use a unique institutional ID or username with 3–40 letters, numbers, dots, underscores, or dashes.');
    if(!first || !last) fail('First and last name are required.');
    if(!ROLES.has(role)) fail('Select one of the five supported roles.');
    if(password.length < 8) fail('The initial password must contain at least 8 characters.');
    if(source==='dean' && role!=='faculty') fail('The Dean may create Professor accounts only.',403,'FORBIDDEN');
    const users=store.read('users',[]); if(users.some(item=>String(item.username).toLowerCase()===username.toLowerCase())) fail('That institutional ID or username already exists.',409,'DUPLICATE_ACCOUNT');
    const now=new Date().toISOString(), status=clean(input.status||'active').toLowerCase();
    if(!['active','deactivated'].includes(status)) fail('New accounts may start as Active or Deactivated.');
    const user={username,password,role,status,first,last,program,effectiveDate:clean(input.effectiveDate)||now.slice(0,10),createdAt:now,createdBy:session.username};
    const next={users:[...users,user]}, profile={id:username,username,first,last,program,status,createdAt:now};
    const key=role==='student'?'students':role==='faculty'?'faculty':role==='coordinator'?'coordinators':'';
    if(key){const records=store.read(key,[]);next[key]=[...records,{...profile,role}];}
    const logs=store.read('applicationAuditLog',[]), event=audit(session,source==='dean'?'hire-professor':'create-account',username,null,{role,status,program},{effectiveDate:user.effectiveDate});
    store.migrate({...next,applicationAuditLog:[...logs,event]});
    return {account:{...user,password:undefined},profile:key?profile:null,event};
  }

  const PROFILE_KEY={student:'students',faculty:'faculty',coordinator:'coordinators'};
  const isManagedAccount=u=>Boolean(u&&u.createdBy)||(Boolean(u&&u.effectiveDate)&&!/^DEMO-/i.test(String(u.username||'')));
  const isActive=u=>!u.disabled && String(u.lifecycleStatus||u.status||'Active').toLowerCase()==='active';
  function changeRole(username, input, session) {
    if(!session||session.role!=='admin') fail('Only an Administrator can change an account role.',403,'FORBIDDEN');
    const newRole=clean(input.role).toLowerCase(), reason=clean(input.reason);
    if(!ROLES.has(newRole)) fail('Select one of the five supported roles.');
    if(!reason) fail('A reason is required to change an account role.');
    const users=store.read('users',[]), index=users.findIndex(item=>item.username===username);
    if(index<0) fail('Account not found.',404,'NOT_FOUND');
    const prior=users[index], oldRole=clean(prior.role).toLowerCase();
    if(!isManagedAccount(prior)) fail('Demo and seeded accounts keep their role. Only accounts created through Add user can have their role changed.',403,'DEMO_ACCOUNT_PROTECTED');
    if(oldRole===newRole) fail('The account already has that role.',409,'NO_CHANGE');
    if(username===session.username) fail('You cannot change your own role.',403,'SELF_CHANGE');
    if(oldRole==='admin' && users.filter(u=>clean(u.role).toLowerCase()==='admin'&&isActive(u)&&u.username!==username).length===0)
      fail('This is the last active Administrator, so its role cannot be changed.',409,'LAST_ADMIN');
    const blockers=[];
    const enrollments=(store.read('studentEnrollments',[])||[]).filter(r=>r.studentId===username).length;
    const submissions=(store.read('studentSubmissions',[])||[]).filter(r=>r.studentId===username).length;
    const exams=(store.read('exams',[])||[]).filter(r=>r.facultyId===username).length;
    const assigned=(store.read('subjectAssignments',[])||[]).filter(r=>r.facultyId===username||(r.facultyIds||[]).includes(username)).length;
    if(oldRole==='student'&&enrollments) blockers.push(`${enrollments} enrollment record(s)`);
    if(oldRole==='student'&&submissions) blockers.push(`${submissions} exam submission(s)`);
    if(['faculty','coordinator'].includes(oldRole)&&exams) blockers.push(`${exams} exam(s) they created`);
    if(['faculty','coordinator'].includes(oldRole)&&assigned) blockers.push(`${assigned} subject assignment(s)`);
    if(blockers.length) fail(`This account still has ${blockers.join(', ')}. Remove or reassign these first, or create a new account in the new role.`,409,'ROLE_HAS_RECORDS');
    const program=clean(input.program||prior.program);
    users[index]={...prior,role:newRole,program};
    const next={users}, oldKey=PROFILE_KEY[oldRole], newKey=PROFILE_KEY[newRole];
    let profile=null;
    if(oldKey){const list=store.read(oldKey,[]);profile=list.find(r=>r.id===username)||null;next[oldKey]=list.filter(r=>r.id!==username);}
    if(newKey){
      const list=next[newKey]||store.read(newKey,[]);
      const base=profile||{id:username,username,first:prior.first,last:prior.last,createdAt:prior.createdAt};
      next[newKey]=[...list.filter(r=>r.id!==username),{...base,id:username,username,role:newRole,program,status:base.status||prior.status||'active'}];
    }
    const roles=store.read('accessRoles',null);
    if(Array.isArray(roles)) next.accessRoles=roles.map(r=>Array.isArray(r.members)?{...r,members:r.members.filter(m=>m!==username)}:r);
    const logs=store.read('applicationAuditLog',[]);
    const event={...audit(session,'change-role',username,{role:oldRole},{role:newRole,program},{reason}),reason};
    next.applicationAuditLog=[...logs,event];
    store.migrate(next);
    return {account:{...users[index],password:undefined},event};
  }
  function appointCoordinator(username, input, session) {
    const authority=store.read('systemSettings',{})?.coordinatorAppointmentAuthority||'admin-confirmation';
    if(authority!=='dean-direct')fail('Coordinator appointments currently require Administrator confirmation.',409,'ADMIN_CONFIRMATION_REQUIRED');
    const users=store.read('users',[]), index=users.findIndex(item=>item.username===username); if(index<0)fail('Professor account not found.',404,'NOT_FOUND');
    const prior=users[index]; if(prior.role!=='faculty')fail('Only an active Professor may be appointed as Faculty Coordinator.');
    if(prior.disabled===true || ['deactivated','archived','graduated','transferred'].includes(String(prior.status).toLowerCase()))fail('Only an active Professor may be appointed.');
    const effectiveDate=clean(input.effectiveDate); if(!effectiveDate)fail('An effective date is required.');
    const program=clean(input.program||prior.program); users[index]={...prior,role:'coordinator',program};
    const faculty=store.read('faculty',[]), person=faculty.find(item=>item.id===username)||{};
    const coordinators=store.read('coordinators',[]); if(coordinators.some(item=>item.id===username))fail('This Professor is already a Faculty Coordinator.',409,'DUPLICATE_APPOINTMENT');
    const appointment={id:`APT-${Date.now()}`,personId:username,program,effectiveDate,appointedBy:session.username,appointedAt:new Date().toISOString(),status:'active'};
    const logs=store.read('applicationAuditLog',[]), event=audit(session,'appoint-coordinator',username,{role:'faculty'},{role:'coordinator',program},{effectiveDate,appointmentId:appointment.id});
    store.migrate({users,coordinators:[...coordinators,{...person,id:username,username,role:'coordinator',program,status:'active',appointmentId:appointment.id}],coordinatorAppointments:[...store.read('coordinatorAppointments',[]),appointment],applicationAuditLog:[...logs,event]});
    return {appointment,event};
  }
  return {createAccount,changeRole,appointCoordinator,isManagedAccount};
}
module.exports={createPersonnelService,ROLES};
