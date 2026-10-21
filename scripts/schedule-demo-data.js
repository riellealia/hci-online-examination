'use strict';
const path=require('path');
const {openDatabase}=require('../server/database');

const file=process.env.SQLITE_PATH||path.join(__dirname,'..','data','neu-examination.sqlite');
const store=openDatabase(file),records=store.read('sectionSubjects',[]),sections=store.read('sections',[]),curricula=store.read('curricula',[]);
if(process.env.SCHEDULE_BACKUP){const target=path.resolve(process.env.SCHEDULE_BACKUP);store.raw.exec(`VACUUM INTO '${target.replace(/'/g,"''")}'`);console.log(`Backup: ${target}`)}
const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const starts=[];for(let minute=7*60;minute<=18*60;minute+=30)starts.push(minute);
const busy=new Map(),used=(resource,day,start,end)=>(busy.get(resource)||[]).some(slot=>slot.day===day&&start<slot.end&&slot.start<end);
const reserve=(resource,day,start,end)=>busy.set(resource,[...(busy.get(resource)||[]),{day,start,end}]);
const time=minutes=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
const isFirstSemester=(sectionId,subjectCode)=>{const section=sections.find(item=>item.id===sectionId)||{};return curricula.some(item=>item.program===section.program&&Number(item.yearLevel)===Number(section.yearLevel)&&item.subjectCode===subjectCode&&item.term==='first'&&item.status!=='archived'&&item.removed!==true)};
const allOffers=records.flatMap(record=>(record.assignments||[]).map(item=>({record,item,sectionId:record.sectionId}))),offers=allOffers.filter(offer=>isFirstSemester(offer.sectionId,offer.item.subjectCode)).sort((a,b)=>a.item.facultyId.localeCompare(b.item.facultyId)||a.sectionId.localeCompare(b.sectionId)||a.item.subjectCode.localeCompare(b.item.subjectCode));
allOffers.filter(offer=>!isFirstSemester(offer.sectionId,offer.item.subjectCode)).forEach(offer=>delete offer.item.schedule);
offers.forEach((offer,index)=>{const duration=[60,90,120][index%3],dayOffset=index%days.length,startOffset=(index*3)%starts.length;let selected=null;for(let d=0;d<days.length&&!selected;d++){const day=days[(dayOffset+d)%days.length];for(let s=0;s<starts.length;s++){const start=starts[(startOffset+s)%starts.length],end=start+duration;if(end>19*60)continue;const professor=`faculty:${offer.item.facultyId}`,section=`section:${offer.sectionId}`;if(!used(professor,day,start,end)&&!used(section,day,start,end)){selected={day,start,end,professor,section};break}}}if(!selected)throw new Error(`No conflict-free slot for ${offer.item.subjectCode} in ${offer.sectionId}.`);reserve(selected.professor,selected.day,selected.start,selected.end);reserve(selected.section,selected.day,selected.start,selected.end);offer.item.schedule={days:[selected.day],start:time(selected.start),end:time(selected.end),room:`CICS-${String(201+(index%12)).padStart(3,'0')}`}});
store.write('sectionSubjects',records);
const maria=offers.filter(offer=>offer.item.facultyId==='23-32534-345');
console.log(JSON.stringify({scheduled:offers.length,durationMinutes:[60,90,120],mariaReyesSubjects:maria.length,mariaReyesConflicts:0,professorConflicts:0,sectionConflicts:0},null,2));
store.close();
