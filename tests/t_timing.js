/* Pure-module tests: no DOM, no storage — exactly the "test domain rules
   without loading full HTML pages" boundary the plan asks for. */
const fs=require('fs'),path=require('path');
const J=p=>fs.readFileSync(path.join(__dirname,'..','js',p),'utf8');
eval(J('dates.js')); eval(J('exam-timing.js'));
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const at=(d,t)=>parseLocal(d,t);

console.log('=== MMM. Local date parsing (no UTC drift) ===');
const p=parseLocal('2026-09-01','14:30');
ok(p.getFullYear()===2026&&p.getMonth()===8&&p.getDate()===1,'date parts preserved');
ok(p.getHours()===14&&p.getMinutes()===30,'wall-clock time preserved in local zone');
ok(parseLocal('2026-09-01')!==null,'time is optional');
ok(parseLocal('not-a-date','10:00')===null,'malformed date rejected');
ok(parseLocal('2026-09-01','99:99')===null,'impossible time rejected');

console.log('\n=== NNN. Duration formatting ===');
ok(formatDuration(3930000)==='1h 5m 30s',`3930000ms -> ${formatDuration(3930000)}`);
ok(formatDuration(45000)==='45s',`45000ms -> ${formatDuration(45000)}`);
ok(formatDuration(0)==='0s','zero handled');
ok(formatClock(3930000)==='1:05:30',`clock -> ${formatClock(3930000)}`);
ok(formatClock(330000)==='5:30',`under an hour -> ${formatClock(330000)}`);
ok(describeMinutes(90)==='1 hour 30 minutes',`90 -> ${describeMinutes(90)}`);
ok(describeMinutes(0)==='No limit','no duration set');

console.log('\n=== OOO. Effective end = whichever comes FIRST ===');
const exam={date:'2026-09-01',start:'09:00',end:'12:00',durationMinutes:60};
let e=effectiveEnd(exam,at('2026-09-01','09:00'));
ok(e.reason==='duration'&&e.at.getHours()===10,'started early: 60min duration ends at 10:00, before the 12:00 deadline');
e=effectiveEnd(exam,at('2026-09-01','11:30'));
ok(e.reason==='deadline'&&e.at.getHours()===12,'started late: deadline 12:00 beats 12:30 duration end');
e=effectiveEnd({date:'2026-09-01',start:'09:00',end:'12:00'},at('2026-09-01','09:00'));
ok(e.reason==='deadline','no duration set: deadline governs');
e=effectiveEnd({durationMinutes:30},at('2026-09-01','09:00'));
ok(e.reason==='duration','no deadline set: duration governs');

console.log('\n=== PPP. Exam state across the window ===');
const s=(t)=>examState(exam,{now:at('2026-09-01',t)});
ok(s('08:00').state==='upcoming'&&!s('08:00').canStart,'before open: upcoming, cannot start');
ok(/opens on/.test(s('08:00').reason),'and explains when it opens');
ok(s('09:00').state==='open'&&s('09:00').canStart,'exactly at open: can start');
ok(s('11:59').state==='open','inside window: open');
ok(s('12:00').state==='open','exactly at close: still open');
ok(s('12:01').state==='closed'&&!s('12:01').canStart,'after close: closed');
ok(/closed on/.test(s('12:01').reason),'and explains when it closed');
ok(examState(exam,{now:at('2026-09-01','10:00'),submitted:true}).state==='submitted','submitted overrides open');
ok(!examState(exam,{now:at('2026-09-01','10:00'),submitted:true}).canStart,'submitted cannot restart');

console.log('\n=== QQQ. A malformed schedule must not lock everyone out ===');
const broken=examState({date:'',start:'',end:''},{now:new Date()});
ok(broken.state==='open'&&broken.canStart,'unparseable schedule falls back to open, not permanently locked');

console.log('\n=== RRR. Time remaining is labelled correctly ===');
let r=timeRemaining(exam,at('2026-09-01','09:00'),at('2026-09-01','09:30'));
ok(r.reason==='duration'&&/attempt/.test(r.label),`labelled "${r.label}"`);
ok(Math.round(r.ms/60000)===30,'30 minutes left of the 60-minute allowance');
r=timeRemaining(exam,at('2026-09-01','11:30'),at('2026-09-01','11:45'));
ok(r.reason==='deadline'&&/closes/.test(r.label),`labelled "${r.label}"`);
ok(Math.round(r.ms/60000)===15,'15 minutes until the exam closes');
r=timeRemaining(exam,at('2026-09-01','09:00'),at('2026-09-01','10:30'));
ok(r.expired===true&&r.ms===0,'past the effective end: expired, clamped to zero');
r=timeRemaining({},null);
ok(r.ms===Infinity&&/No time limit/.test(r.label),'no limits set at all');

console.log('\n=== SSS. Threshold warnings fire once each ===');
ok(thresholdCrossed(11*60000,10*60000)===10,'10-minute warning');
ok(thresholdCrossed(6*60000,5*60000)===5,'5-minute warning');
ok(thresholdCrossed(2*60000,60000)===1,'1-minute warning');
ok(thresholdCrossed(10*60000,9*60000)===null,'already past 10: does not re-fire');
ok(thresholdCrossed(20*60000,19*60000)===null,'no threshold crossed');
ok(thresholdCrossed(12*60000,4*60000)===10,'a big jump reports the largest crossed');

console.log('\n=== TTT. Briefing shown before starting ===');
const qs=[{points:10},{points:5},{points:5}];
const b=examBriefing({...exam,title:'Midterm',subjectCode:'SUB1',desc:'Answer all.',passingPercent:75},
  {questions:qs,faculty:{first:'Maria',last:'Reyes'},subject:{name:'HCI'},now:at('2026-09-01','10:00')});
ok(b.questionCount===3,'question count');
ok(b.totalPoints===20,'total points summed from the questions');
ok(b.passingPercent===75,'passing grade');
ok(b.durationText==='1 hour','attempt duration described');
ok(b.facultyName==='Maria Reyes','instructor named');
ok(b.subjectName==='HCI','subject named');
ok(b.canStart===true&&b.blockedReason==='','open: start permitted');
ok(!!b.zone,'time zone reported so times are unambiguous');
const blocked=examBriefing(exam,{questions:qs,now:at('2026-09-01','08:00')});
ok(blocked.canStart===false&&/opens on/.test(blocked.blockedReason),'blocked start explains itself');
