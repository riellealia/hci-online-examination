const {load,SEED}=require('./harness');
const ok=(condition,message)=>console.log(`  ${condition?'✅':'❌'} ${message}`);
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

(async()=>{
  console.log('=== SHARED INBOX. Read state, message context, and replies ===');
  const seed=SEED();
  seed.adminAnnouncements=[{id:'a1',title:'Reminder',message:'Check the schedule.',audience:'faculty',createdAt:'2026-08-29T08:00:00+08:00'}];
  seed.studentEmails=[{id:'m1',studentId:'S1',facultyId:'F1',subject:'Question about Exam 1',message:'Could you clarify question one?',sentAt:'2026-08-29T09:00:00+08:00',read:false}];
  seed.studentNotifications=[];
  seed.questionReports=[];

  let page=load('faculty.html',{...seed,currentUser:{username:'F1',role:'faculty'}});
  const inboxButton=page.d.querySelector('.header-inbox-btn');
  ok(inboxButton.querySelector('svg')?.nextElementSibling?.classList.contains('header-inbox-count'),'pending count pill sits beside the inbox icon');
  inboxButton.click();
  ok(page.d.querySelector('.header-inbox-title-count')?.textContent==='2','pending count pill appears beside the Inbox title');
  const mail=[...page.d.querySelectorAll('.header-inbox-item')].find(item=>/Student mail/.test(item.textContent));
  mail.click();await tick();
  ok(/Could you clarify question one/.test(page.d.querySelector('.confirm-msg')?.textContent||''),'clicking mail opens its full context prompt');
  page.d.getElementById('confirmYes').click();await tick();
  page.d.querySelector('.confirm-box textarea').value='Yes. Review the first lesson example.';
  page.d.querySelector('.confirm-box .confirm-ok').click();await tick();
  ok(page.read('studentNotifications').some(item=>item.studentId==='S1'&&item.facultyId==='F1'&&item.type==='faculty-mail'),'Faculty can mail a reply back to the student');
  inboxButton.click();
  page.d.querySelector('.header-inbox-read-all').click();
  ok(!page.d.querySelector('.header-inbox-count')&&!page.d.querySelector('.header-inbox-title-count')&&!page.d.querySelector('.header-inbox-item.pending'),'Read all removes both count pills and unread highlights');
  ok(page.read('inboxReadReceipts').length===2,'read state is stored for the signed-in Faculty account');
  page.w.close();

  const notice={id:'n1',studentId:'S1',facultyId:'F1',subject:'Re: Exam 1',message:'Please review the example.',createdAt:'2026-08-29T10:00:00+08:00',read:false,type:'faculty-mail'};
  page=load('student.html',{...seed,studentNotifications:[notice],currentUser:{username:'S1',role:'student'}});
  page.d.querySelector('.header-inbox-btn').click();
  page.d.querySelector('.header-inbox-item').click();await tick();
  page.d.getElementById('confirmYes').click();await tick();
  page.d.querySelector('.confirm-box textarea').value='Thank you, Professor.';
  page.d.querySelector('.confirm-box .confirm-ok').click();await tick();
  ok(page.read('studentEmails').some(item=>item.studentId==='S1'&&item.facultyId==='F1'&&/Thank you/.test(item.message)),'Student can reply back to Faculty mail');
  page.w.close();
  process.exit(0);
})();
