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
    const user={username,password,role,status,first,last,program,effectiveDate:clean(input.effectiveDate)||now.slice(0,10),createdAt:now};
    const next={users:[...users,user]}, profile={id:username,username,first,last,program,status,createdAt:now};
    const key=role==='student'?'students':role==='faculty'?'faculty':role==='coordinator'?'coordinators':'';
    if(key){const records=store.read(key,[]);next[key]=[...records,{...profile,role}];}
    const logs=store.read('applicationAuditLog',[]), event=audit(session,source==='dean'?'hire-professor':'create-account',username,null,{role,status,program},{effectiveDate:user.effectiveDate});
    store.migrate({...next,applicationAuditLog:[...logs,event]});
    return {account:{...user,password:undefined},profile:key?profile:null,event};
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
  return {createAccount,appointCoordinator};
}
module.exports={createPersonnelService,ROLES};
