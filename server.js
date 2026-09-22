'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('node:util');
const { createAuth } = require('./server/auth');
const { requireCollectionAccess, visibleRecords } = require('./server/access-policy');
const { validateProtectedWrite } = require('./server/protected-write');
const { openDatabase } = require('./server/database');
const { parseCsv, stringifyCsv } = require('./server/csv');
const { createAcademicPeriodService, initialFromSettings, normalizeOperationalWrite, validateSettingsWrite, ACTIVE_COLLECTIONS } = require('./server/academic-periods');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const DB_FILE = process.env.SQLITE_PATH || path.join(ROOT, 'data', 'neu-examination.sqlite');
const MAX_BODY = 10 * 1024 * 1024;
const KEY_RE = /^[A-Za-z0-9:_-]{1,80}$/;
const CSV_COLLECTIONS = new Set(['users','faculty','students','subjects','sections','sectionSubjects','studentEnrollments','subjectAssignments','exams','questions','studentSubmissions','applicationAuditLog']);
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.md':'text/markdown; charset=utf-8'};
const store = openDatabase(DB_FILE);
function readEnvFile(filename){try{return Object.fromEntries(fs.readFileSync(filename,'utf8').split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith('#')&&line.includes('=')).map(line=>{const index=line.indexOf('=');return[line.slice(0,index).trim(),line.slice(index+1).trim()]}));}catch{return{};}}
function ensureDemoAccounts(){const existing=store.read('users',[]),env={...readEnvFile(path.join(ROOT,'.env')),...process.env};const required=[
  {username:env.ADMIN_USERNAME||'admin',password:env.ADMIN_PASSWORD||'admin123',role:'admin',status:'active'},
  {username:env.DEAN_USERNAME||'dean.demo',password:env.DEAN_PASSWORD||'dean123',role:'dean',status:'active'},
  {username:env.FACULTY_COORDINATOR_USERNAME||'coordinator.demo',password:env.FACULTY_COORDINATOR_PASSWORD||'coord123',role:'coordinator',status:'active'},
  {username:env.PROFESSOR_USERNAME||'23-32534-345',password:env.PROFESSOR_PASSWORD||'reyes23',role:'faculty',status:'active'},
  {username:env.STUDENT_USERNAME||'2025-00002',password:env.STUDENT_PASSWORD||'santos2025',role:'student',status:'active'}
];const users=Array.isArray(existing)?existing:[],initialCount=users.length,known=new Set(users.map(item=>item.username));required.forEach(item=>{if(!known.has(item.username))users.push(item)});if(users.length!==initialCount)store.write('users',users);const profiles=store.read('coordinators',[]);if(!Array.isArray(profiles)||!profiles.length){store.write('coordinators',required.filter(item=>item.role==='coordinator').map(({username,role})=>({id:username,username,role,first:'Demo',last:'Santos',college:'College of Information and Computer Studies',status:'active'})));}}
ensureDemoAccounts();
function ensureOfficialCurricula(){const file=path.join(ROOT,'assets','philippine-curricula.json');if(!fs.existsSync(file))return;const official=JSON.parse(fs.readFileSync(file,'utf8')),current=store.read('curricula',[]),records=Array.isArray(current)?current:[],officialPrograms=new Set(official.map(item=>item.program)),bySubject=new Map(records.filter(item=>officialPrograms.has(item.program)).map(item=>[`${item.program}|${item.subjectCode}`,item])),merged=official.map(item=>({...item,...(bySubject.get(`${item.program}|${item.subjectCode}`)||{}),sourceUrl:item.sourceUrl,institution:item.institution})),custom=records.filter(item=>!officialPrograms.has(item.program)||item.institution&&item.institution!=='University of the East');store.write('curricula',[...merged,...custom]);}
ensureOfficialCurricula();
initialFromSettings(store);
const auth = createAuth(store);
const academicPeriods = createAcademicPeriodService(store);

function send(res, status, body, type='application/json; charset=utf-8', headers={}) { res.writeHead(status, {'Content-Type':type,'X-Content-Type-Options':'nosniff',...headers}); res.end(type.startsWith('application/json') ? JSON.stringify(body) : body); }
function readBody(req) { return new Promise((resolve,reject)=>{let size=0,chunks=[];req.on('data',chunk=>{size+=chunk.length;if(size>MAX_BODY){reject(Object.assign(new Error('Request body is too large.'),{status:413}));req.destroy();}else chunks.push(chunk);});req.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));req.on('error',reject);}); }
function cleanKey(value) { const key=decodeURIComponent(value||''); if(!KEY_RE.test(key)) throw Object.assign(new Error('Invalid collection name.'),{status:400}); return key; }
function collectionFromCsvPath(pathname) { const match=pathname.match(/^\/api\/csv\/([^/]+)\/(import|export)$/); if(!match)return null;const key=cleanKey(match[1]);if(!CSV_COLLECTIONS.has(key))throw Object.assign(new Error('CSV is not enabled for this collection.'),{status:400});return{key,action:match[2]}; }

async function api(req,res,url) {
  if(url.pathname==='/api/health'&&req.method==='GET') return send(res,200,{ok:true,storage:'sqlite',database:path.basename(DB_FILE)});
  if(url.pathname==='/api/auth/login'&&req.method==='POST'){const parsed=JSON.parse(await readBody(req)||'{}');const result=auth.login(String(parsed.username||''),String(parsed.password||''),req.socket.remoteAddress||'');return send(res,200,result);}
  if(url.pathname==='/api/auth/session'&&req.method==='GET'){const session=auth.requireSession(req);return send(res,200,{session});}
  if(url.pathname==='/api/auth/logout'&&req.method==='DELETE'){const token=auth.tokenFrom(req);if(token)auth.logout(token);return send(res,200,{ok:true});}
  if(url.pathname==='/api/academic-periods'&&req.method==='GET'){const session=auth.requireSession(req);return send(res,200,{periods:academicPeriods.list(),session:{username:session.username,role:session.role}});}
  if(url.pathname==='/api/academic-periods'&&req.method==='POST'){const session=auth.requireSession(req,['admin']);return send(res,201,{period:academicPeriods.create(JSON.parse(await readBody(req)||'{}'),session)});}
  const periodRecords=url.pathname.match(/^\/api\/academic-periods\/([^/]+)\/records\/([^/]+)$/);
  if(periodRecords&&req.method==='GET'){const session=auth.requireSession(req),id=decodeURIComponent(periodRecords[1]),key=cleanKey(periodRecords[2]);if(!ACTIVE_COLLECTIONS.includes(key))throw Object.assign(new Error('That collection is not period-scoped.'),{status:400});requireCollectionAccess(session,key,'GET');const period=id==='current'?academicPeriods.list().find(item=>item.status==='active'):academicPeriods.list().find(item=>item.id===id);if(!period)throw Object.assign(new Error('Academic period not found or not active.'),{status:404});return send(res,200,{period,collection:key,records:id==='current'?academicPeriods.activeRecords(key):academicPeriods.recordsForPeriod(key,id)});}
  const periodAction=url.pathname.match(/^\/api\/academic-periods\/([^/]+)\/(impact|activate|close|archive)$/);
  if(periodAction){const session=auth.requireSession(req,['admin']),id=decodeURIComponent(periodAction[1]),action=periodAction[2];if(req.method==='GET'&&action==='impact')return send(res,200,academicPeriods.impact(id));if(req.method==='POST'&&action!=='impact'){const parsed=JSON.parse(await readBody(req)||'{}');return send(res,200,action==='activate'?{period:academicPeriods.activate(id,session,parsed.reason)}:academicPeriods[action](id,parsed.reason,session));}}
  if(url.pathname==='/api/storage'&&req.method==='GET'){const session=auth.requireSession(req);const all=store.all();return send(res,200,{records:visibleRecords(session,all),collections:Object.keys(all),session:{username:session.username,role:session.role,expiresAt:session.expiresAt}});}
  if(url.pathname==='/api/migrate'&&req.method==='POST'){
    auth.requireSession(req,['admin']);
    const parsed=JSON.parse(await readBody(req)||'{}');
    if(!parsed.records||typeof parsed.records!=='object'||Array.isArray(parsed.records))throw Object.assign(new Error('records must be an object.'),{status:400});
    const records={...parsed.records};
    for(const key of Object.keys(records)){
      cleanKey(key);
      if(key==='academicPeriods')throw Object.assign(new Error('Academic periods must be changed through the protected academic-period workflow.'),{status:403,code:'PROTECTED_WRITE_FORBIDDEN'});
      if(parsed.missingOnly===true&&store.read(key,null)!==null)continue;
      if(key==='systemSettings')validateSettingsWrite(store,records[key]);
      records[key]=normalizeOperationalWrite(store,key,records[key]);
    }
    store.migrate(records,{missingOnly:parsed.missingOnly===true});
    return send(res,200,{ok:true,count:Object.keys(records).length,missingOnly:parsed.missingOnly===true});
  }
  if(url.pathname==='/api/storage/applicationAuditLog/append'&&req.method==='POST'){const session=auth.requireSession(req);requireCollectionAccess(session,'applicationAuditLog','PUT');const parsed=JSON.parse(await readBody(req)||'{}'),entry=parsed.entry;if(!entry||typeof entry!=='object'||Array.isArray(entry))throw Object.assign(new Error('entry is required.'),{status:400});const existing=store.read('applicationAuditLog',[]);validateProtectedWrite(store,session,'applicationAuditLog',[...existing,entry]);const value=store.append('applicationAuditLog',entry);return send(res,200,{ok:true,key:'applicationAuditLog',entry,value});}
  const storageMatch=url.pathname.match(/^\/api\/storage\/([^/]+)$/);
  if(storageMatch){const session=auth.requireSession(req);const key=cleanKey(storageMatch[1]);if(req.method==='GET'){requireCollectionAccess(session,key,'GET');return send(res,200,{key,value:store.read(key,null),session:{username:session.username,role:session.role}});}if(req.method==='PUT'){requireCollectionAccess(session,key,'PUT');const parsed=JSON.parse(await readBody(req)||'{}');if(!Object.hasOwn(parsed,'value'))throw Object.assign(new Error('value is required.'),{status:400});if(key==='applicationAuditLog'){const existing=store.read(key,[]),next=parsed.value;if(!Array.isArray(next))throw Object.assign(new Error('Audit history must be an array.'),{status:400});const before=new Map(existing.map(item=>[item.id,item])),seen=new Set();for(const item of next){if(!item?.id||seen.has(item.id))throw Object.assign(new Error('Audit records must have unique IDs.'),{status:403});seen.add(item.id);if(before.has(item.id)&&!isDeepStrictEqual(before.get(item.id),item))throw Object.assign(new Error('Existing audit records cannot be changed.'),{status:403});}const added=next.filter(item=>!before.has(item.id));if(added.length){validateProtectedWrite(store,session,key,[...existing,...added]);let value=existing;for(const entry of added)value=store.append(key,entry);return send(res,200,{ok:true,key,value,mergedLegacyAudit:true,appended:added.length});}return send(res,200,{ok:true,key,value:existing,mergedLegacyAudit:true,appended:0});}const next=normalizeOperationalWrite(store,key,parsed.value);if(key==='systemSettings')validateSettingsWrite(store,next);validateProtectedWrite(store,session,key,next);store.write(key,next);return send(res,200,{ok:true,key,value:next});}if(req.method==='DELETE'){requireCollectionAccess(session,key,'DELETE');if(['approvalRequests','applicationAuditLog','academicPeriods','systemSettings'].includes(key))throw Object.assign(new Error('Protected history cannot be deleted.'),{status:403,code:'PROTECTED_WRITE_FORBIDDEN'});normalizeOperationalWrite(store,key,[]);store.delete(key);return send(res,200,{ok:true,key});}}
  const csv=collectionFromCsvPath(url.pathname);
  if(csv&&csv.action==='import'&&req.method==='POST'){auth.requireSession(req,['admin']);const rows=normalizeOperationalWrite(store,csv.key,parseCsv(await readBody(req)));store.write(csv.key,rows);store.recordImport(csv.key,rows.length);return send(res,200,{ok:true,collection:csv.key,rows:rows.length});}
  if(csv&&csv.action==='export'&&req.method==='GET'){auth.requireSession(req,['admin']);const rows=store.read(csv.key,[]);if(!Array.isArray(rows))throw Object.assign(new Error('Stored collection is not tabular.'),{status:409});const filename=`${csv.key}.csv`;return send(res,200,stringifyCsv(rows),'text/csv; charset=utf-8',{'Content-Disposition':`attachment; filename="${filename}"`});}
  return false;
}

function staticFile(req,res,url){let pathname=url.pathname==='/'?'/html/index.html':url.pathname;let decoded;try{decoded=decodeURIComponent(pathname);}catch{return send(res,400,{error:'Invalid path.'});}if(/^\/[A-Za-z0-9_-]+\.html$/.test(decoded))decoded='/html'+decoded;const target=path.resolve(ROOT,'.'+decoded);if(target!==ROOT&&!target.startsWith(ROOT+path.sep))return send(res,403,{error:'Forbidden.'});fs.stat(target,(error,stat)=>{if(error||!stat.isFile())return send(res,404,{error:'File not found.'});fs.createReadStream(target).on('error',()=>send(res,500,{error:'Could not read file.'})).pipe((res.writeHead(200,{'Content-Type':MIME[path.extname(target).toLowerCase()]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'}),res));});}

const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');try{if(url.pathname.startsWith('/api/')){const handled=await api(req,res,url);if(handled!==false)return;return send(res,404,{error:'API route not found.'});}if(!['GET','HEAD'].includes(req.method))return send(res,405,{error:'Method not allowed.'});staticFile(req,res,url);}catch(error){const status=error.status||400;if(status>=500)console.error(error);send(res,status,{error:error.message||'Request failed.'});}});
server.listen(PORT,()=>console.log(`NEU Examination server: http://localhost:${PORT}\nSQLite: ${DB_FILE}`));
process.on('SIGINT',()=>{store.close();server.close(()=>process.exit(0));});
