'use strict';
const fs=require('fs'),path=require('path');
const {openDatabase}=require('../server/database');

const file=process.env.SQLITE_PATH||path.join(__dirname,'..','data','neu-examination.sqlite');
const backup=path.join(path.dirname(file),`neu-examination.pre-maria-demo-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`);
fs.copyFileSync(file,backup);
const store=openDatabase(file),records=store.read('sectionSubjects',[]),sections=store.read('sections',[]),subjects=store.read('subjects',[]),mariaId='23-32534-345';
const offers=records.flatMap(record=>(record.assignments||[]).map(item=>({item,sectionId:record.sectionId})));
const overlap=(left,right)=>left&&right&&(left.days||[]).some(day=>(right.days||[]).includes(day))&&left.start<right.end&&right.start<left.end;
const maria=offers.filter(offer=>offer.item.facultyId===mariaId&&offer.item.schedule),groups=new Map();
offers.forEach(offer=>{if(!groups.has(offer.item.subjectCode))groups.set(offer.item.subjectCode,[]);groups.get(offer.item.subjectCode).push(offer)});
const freeForSection=(offer,schedule)=>!offers.some(other=>other!==offer&&other.sectionId===offer.sectionId&&overlap(schedule,other.item.schedule));
let demo=null;
for(const [subjectCode,items] of groups){
  if(items.length!==3||items.some(offer=>offer.item.facultyId===mariaId))continue;
  for(const blocked of items){
    const mariaSlot=maria.map(offer=>offer.item.schedule).find(schedule=>freeForSection(blocked,schedule));
    if(mariaSlot){demo={subjectCode,items,blocked,mariaSlot};break}
  }
  if(demo)break;
}
if(!demo)throw new Error('No safe three-Section subject could be prepared for the Maria Reyes demo.');

const proposed=[];
for(const offer of demo.items.filter(item=>item!==demo.blocked)){
  let chosen=null;
  for(const day of ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])for(let start=7*60;start<=18*60&&!chosen;start+=30){
    const end=start+90,schedule={days:[day],start:`${String(Math.floor(start/60)).padStart(2,'0')}:${String(start%60).padStart(2,'0')}`,end:`${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`,room:offer.item.schedule?.room||'CICS-Demo'};
    if(end<=19*60&&freeForSection(offer,schedule)&&!maria.some(current=>overlap(schedule,current.item.schedule))&&!proposed.some(current=>overlap(schedule,current)))chosen=schedule;
  }
  if(!chosen)throw new Error(`No conflict-free demo schedule found for ${offer.sectionId}.`);
  proposed.push(chosen);offer.item.schedule=chosen;
}
demo.blocked.item.schedule={...demo.mariaSlot,days:[...demo.mariaSlot.days],room:demo.blocked.item.schedule?.room||'CICS-Demo'};
demo.items.forEach((offer,index)=>{offer.item.facultyId='';offer.item.demoAssignment=index===demo.items.indexOf(demo.blocked)?'conflict':index===demo.items.length-1?'extra':'available'});
store.write('sectionSubjects',records);
const assignments=subjects.map(subject=>({subjectCode:subject.code,facultyIds:[...new Set(offers.filter(offer=>offer.item.subjectCode===subject.code).map(offer=>offer.item.facultyId).filter(Boolean))]}));
store.write('subjectAssignments',assignments);store.close();
console.log(JSON.stringify({backup,professor:'Maria Reyes',facultyId:mariaId,subjectCode:demo.subjectCode,subjectName:subjects.find(item=>item.code===demo.subjectCode)?.name||'Subject',sections:demo.items.map(offer=>({sectionId:offer.sectionId,state:offer.item.demoAssignment,schedule:offer.item.schedule}))},null,2));
