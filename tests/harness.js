const fs=require('fs'), {JSDOM,VirtualConsole}=require('jsdom');
const DIR=require('path').join(__dirname,'..','html')+'/';
const STORAGE=fs.readFileSync(DIR+'../js/storage.js','utf8');
const AUTH=fs.readFileSync(DIR+'../js/auth.js','utf8');
const UI=fs.readFileSync(DIR+'../js/ui.js','utf8');
const GRADING=fs.readFileSync(DIR+'../js/grading.js','utf8');
const DATES=fs.readFileSync(DIR+'../js/dates.js','utf8');
const TIMING=fs.readFileSync(DIR+'../js/exam-timing.js','utf8');
const ATTEMPT=fs.readFileSync(DIR+'../js/attempt.js','utf8');
const QUESTION_DRAFT=fs.readFileSync(DIR+'../js/question-draft.js','utf8');
const QUESTION_MEDIA=fs.readFileSync(DIR+'../js/question-media.js','utf8');
const QUESTION_TYPES=fs.readFileSync(DIR+'../js/question-types.js','utf8');
const QUESTION_CATALOG=fs.readFileSync(DIR+'../js/question-catalog.js','utf8');
const QUESTION_REPORTS=fs.readFileSync(DIR+'../js/question-reports.js','utf8');
const RESULT_VISIBILITY=fs.readFileSync(DIR+'../js/result-visibility.js','utf8');
const EXAM_PUBLISH=fs.readFileSync(DIR+'../js/exam-publish.js','utf8');
const SECTION_SERVICE=fs.readFileSync(DIR+'../js/section-service.js','utf8');
const STUDENT_PROFILE=fs.readFileSync(DIR+'../js/student-profile.js','utf8');
const FACULTY_PROFILE=fs.readFileSync(DIR+'../js/faculty-profile.js','utf8');
const AUDIT_SERVICE=fs.readFileSync(DIR+'../js/audit-service.js','utf8');
const ADMIN_TABLE_TOOLS=fs.readFileSync(DIR+'../js/admin-table-tools.js','utf8');
const DEMO_DATA=fs.readFileSync(DIR+'../js/demo-data.js','utf8');
const FACULTY_SUBJECT_WORKSPACE=fs.readFileSync(DIR+'../js/faculty-subject-workspace.js','utf8');
const STUDENT_CARD_TOOLS=fs.readFileSync(DIR+'../js/student-card-tools.js','utf8');
const ROLE_PROFILE=fs.readFileSync(DIR+'../js/role-profile.js','utf8');
const SYSTEM_MANAGEMENT=fs.readFileSync(DIR+'../js/system-management.js','utf8');

function load(page, seed, opts={}){
  // Inline auth.js: jsdom will not fetch it from disk.
  let html=fs.readFileSync(DIR+page,'utf8')
    .replace('<script src="../js/storage.js"></script>', `<script>${STORAGE}</script>`)
    .replace('<script src="../js/section-service.js"></script>', `<script>${SECTION_SERVICE}</script>`)
    .replace('<script src="../js/student-profile.js"></script>', `<script>${STUDENT_PROFILE}</script>`)
    .replace('<script src="../js/faculty-profile.js"></script>', `<script>${FACULTY_PROFILE}</script>`)
    .replace('<script src="../js/audit-service.js"></script>', `<script>${AUDIT_SERVICE}</script>`)
    .replace('<script src="../js/admin-table-tools.js"></script>', `<script>${ADMIN_TABLE_TOOLS}</script>`)
    .replace('<script src="../js/demo-data.js"></script>', `<script>${DEMO_DATA}</script>`)
    .replace(/<script src="\.\.\/js\/faculty-subject-workspace\.js(?:\?[^"]*)?"><\/script>/, `<script>${FACULTY_SUBJECT_WORKSPACE}</script>`)
    .replace('<script src="../js/student-card-tools.js"></script>', `<script>${STUDENT_CARD_TOOLS}</script>`)
    .replace('<script src="../js/role-profile.js"></script>', `<script>${ROLE_PROFILE}</script>`)
    .replace('<script src="../js/auth.js"></script>', `<script>${AUTH}</script>`)
    .replace(/<script src="\.\.\/js\/ui\.js(?:\?[^\"]*)?"><\/script>/, `<script>${UI}</script>`)
    .replace('<script src="../js/system-management.js"></script>', `<script>${SYSTEM_MANAGEMENT}</script>`)
    .replace('<script src="../js/dates.js"></script>', `<script>${DATES}</script>`)
    .replace('<script src="../js/exam-timing.js"></script>', `<script>${TIMING}</script>`)
    .replace('<script src="../js/grading.js"></script>', `<script>${GRADING}</script>`);
  html=html.replace('<script src="../js/attempt.js"></script>', `<script>${ATTEMPT}</script>`);
  html=html.replace('<script src="../js/question-draft.js"></script>', `<script>${QUESTION_DRAFT}</script>`);
  html=html.replace('<script src="../js/question-media.js"></script>', `<script>${QUESTION_MEDIA}</script>`);
  html=html.replace('<script src="../js/question-types.js"></script>', `<script>${QUESTION_TYPES}</script>`);
  html=html.replace('<script src="../js/question-catalog.js"></script>', `<script>${QUESTION_CATALOG}</script>`);
  html=html.replace('<script src="../js/question-reports.js"></script>', `<script>${QUESTION_REPORTS}</script>`);
  html=html.replace('<script src="../js/result-visibility.js"></script>', `<script>${RESULT_VISIBILITY}</script>`);
  html=html.replace('<script src="../js/exam-publish.js"></script>', `<script>${EXAM_PUBLISH}</script>`);

  const mem={}; Object.entries(seed).forEach(([k,v])=>mem[k]=JSON.stringify(v));
  // opts.raw injects unparseable values, to exercise corruption handling.
  if(opts.raw) Object.entries(opts.raw).forEach(([k,v])=>mem[k]=v);
  const rec={_alerts:[],errors:[]};
  const vc=new VirtualConsole();
  vc.on('jsdomError',e=>rec.errors.push(e.message||String(e)));

  const dom=new JSDOM(html,{
    runScripts:'dangerously', url:'http://localhost/'+page+(opts.query||''),
    virtualConsole:vc,
    beforeParse(w){
      Object.defineProperty(w,'localStorage',{value:{
        getItem:k=>{
          if(opts.blockReads) throw new Error('SecurityError: storage blocked');
          return k in mem?mem[k]:null;
        },
        setItem:(k,v)=>{
          if(opts.quotaFull && k!=='__probe__'){
            const e=new Error('quota'); e.name='QuotaExceededError'; throw e;
          }
          mem[k]=String(v);
        },
        removeItem:k=>{delete mem[k]}
      }});
      w.alert=m=>rec._alerts.push(String(m));
      w.confirm=()=>opts.confirm===undefined?true:opts.confirm;
    }
  });
  const w=dom.window, d=dom.window.document;
  // Drives the designed confirm dialog instead of the native confirm().
  rec.confirmAll = async (fn, accept=true) => {
    const p = Promise.resolve(fn());
    for (let i=0;i<6;i++){
      const btn = d.getElementById(accept?'confirmYes':'confirmNo');
      if (btn){ btn.click(); break; }
      await new Promise(r=>setTimeout(r,0));
    }
    return p;
  };
  // Toast text, so assertions that used to read alerts still work.
  Object.defineProperty(rec,'toasts',{get:()=>
    [...d.querySelectorAll('.toast-body')].map(n=>n.textContent.trim())});
  Object.defineProperty(rec,'alerts',{get:()=>
    [...d.querySelectorAll('.toast-body')].map(n=>n.textContent.trim())
      .concat(rec._alerts||[])});
  const blocked=rec.errors.some(e=>/Not authorised/.test(e));
  return {dom,w,d,rec,confirmAll:rec.confirmAll,
          blocked, read:k=>mem[k]?JSON.parse(mem[k]):null};
}
const SEED=()=>({
  users:[{username:'admin',password:'a',role:'admin'},
         {username:'F1',password:'p',role:'faculty'},
         {username:'F2',password:'p',role:'faculty'},
         {username:'S1',password:'p',role:'student'}],
  faculty:[{id:'F1',last:'Reyes',first:'Maria'},{id:'F2',last:'Santos',first:'Jose'}],
  students:[{id:'S1',last:'Cruz',first:'Juan',sections:['A']}],
  subjects:[{code:'SUB1',name:'HCI'},{code:'SUB2',name:'SE'}],
  subjectAssignments:[{subjectCode:'SUB1',facultyIds:['F1']},{subjectCode:'SUB2',facultyIds:['F2']}],
  allotments:[{studentId:'S1',subjectCode:'SUB1',facultyId:'F1'}],
  exams:[{id:'e1',facultyId:'F1',subjectCode:'SUB1',title:'F1 Exam',date:'2020-01-01',start:'08:00',end:'23:59'},
         {id:'e2',facultyId:'F2',subjectCode:'SUB2',title:'F2 SECRET Exam',date:'2020-01-01',start:'08:00',end:'23:59'}],
  questions:[{id:'q1',examId:'e1',type:'mcq',text:'Q1',points:10,options:[{text:'A',isCorrect:true},{text:'B',isCorrect:false}]},
             {id:'q2',examId:'e1',type:'essay',text:'Essay Q',points:10,expectedAnswer:'x'}],
  studentSubmissions:[]
});
module.exports={load,SEED};
