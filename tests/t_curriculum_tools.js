const fs=require('fs');
const {JSDOM}=require('jsdom');
const ok=(condition,message)=>{console.log(`  ${condition?'✅':'❌'} ${message}`);if(!condition)process.exitCode=1};

console.log('=== CURRICULUM TOOLS. Shared Admin theme and complete commands ===');
const dom=new JSDOM('<div id="systemManagementRoot"></div><div id="loadPolicyRoot"></div>',{runScripts:'outside-only',url:'http://localhost/admin.html'});
const w=dom.window,data={systemSettings:{},adminAnnouncements:[],subjects:[{code:'SUB1',name:'HCI'}],curricula:[{program:'BSCS',yearLevel:1,term:'first',subjectCode:'SUB1',subjectName:'HCI',units:3,status:'active'}]};
w.DB={read:(key,fallback)=>JSON.parse(JSON.stringify(data[key]??fallback)),write:(key,value)=>(data[key]=JSON.parse(JSON.stringify(value)),true)};
w.AuditLog={record:()=>{}};
w.notify=()=>{};
w.loadAll=()=>{};
w.eval(fs.readFileSync(require('path').join(__dirname,'..','js','system-management.js'),'utf8'));
w.SystemManagement.mount();

const toolbar=w.document.querySelector('.curriculum-admin-toolbar');
ok(!!toolbar,'curriculum toolbar renders');
const programLabels=[...w.document.querySelectorAll('.load-program-tabs button')].map(button=>button.textContent.trim());
ok(programLabels.includes('BSEMC \u2013 Game Development')&&programLabels.includes('BSEMC \u2013 Digital Animation')&&!programLabels.includes('BSGAMEDEV')&&!programLabels.includes('BSANIMATION'),'BSEMC curriculum tabs use proper degree names');
ok(['table-search-toggle','table-sort-toggle','table-direction','table-group-toggle'].every(name=>toolbar.querySelector(`.${name}`)),'toolbar uses Search, Sort, Direction, and Group controls');

const settings=[...toolbar.querySelectorAll('.curriculum-toolbar-settings nav button')];
ok(settings.map(button=>button.textContent.trim()).join('|')==='Edit subject|Remove subject|Archive subject|Move subject|Reorder subject|Adjust load','Settings contains every subject and load command');
ok(settings.every(button=>button.querySelectorAll('svg').length===1),'every Settings command renders one icon');
ok(settings.filter(button=>button.classList.contains('danger')).map(button=>button.textContent.trim()).join('|')==='Remove subject|Archive subject','only destructive Settings commands are red');

const semester=w.document.querySelector('.semester-accordion');
semester.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:100}));
const context=[...w.document.querySelectorAll('.curriculum-context-menu button')];
ok(context.every(button=>button.querySelectorAll('svg').length===1),'every semester context command renders one icon');
ok(context.filter(button=>button.classList.contains('danger')).map(button=>button.textContent.trim()).join('|')==='Remove subject','only Remove is destructive in the semester menu');

w.SystemManagement.openMergedSubjectEditor();
const programOptions=[...w.document.querySelectorAll('.curriculum-editor-modal select[name="program"] option')].map(option=>option.textContent.trim());
ok(programOptions.includes('BSEMC \u2013 Game Development')&&programOptions.includes('BSEMC \u2013 Digital Animation'),'Add subject form uses proper BSEMC degree names');
