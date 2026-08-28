/* Canonical, versioned curriculum demo data. Replaces only the known legacy
   sample set; custom installations are left untouched. */
const DemoData = {
  version: 21,
  ensureLearningContent() {
    const key='subjectWorkspaceContent',current=DB.read(key,[]);
    const cleaned=current.filter(item=>!(item.subjectCode==='CCS211-24'&&(!item.title||item.title==='Untitled')));
    const createdAt='2026-08-20T08:00:00+08:00',base={subjectCode:'CCS211-24',updatedBy:'23-32534-345',createdAt,availability:'open',durationMinutes:0,requiresPrevious:false};
    const lessons=[
      {...base,id:'demo-ccs211-content-01',week:1,weekTitle:'Foundations',type:'heading',title:'Course orientation',body:'## Data Structures and Algorithms\nReview the course outcomes, grading guide, and learning sequence.'},
      {...base,id:'demo-ccs211-content-02',week:1,weekTitle:'Foundations',type:'text',title:'Why data structures matter',body:'Learn how arrays, lists, stacks, and queues organize information for efficient programs.'},
      {...base,id:'demo-ccs211-content-03',week:2,weekTitle:'Linear structures',type:'text',title:'Stacks and queues',body:'Compare LIFO and FIFO behavior, then trace basic push, pop, enqueue, and dequeue operations.',requiresPrevious:true},
      {...base,id:'demo-ccs211-content-04',week:2,weekTitle:'Linear structures',type:'text',title:'Practice activity',body:'Create one real-world example for a stack and one for a queue. Explain why each structure fits.',requiresPrevious:true},
      {...base,id:'demo-ccs211-content-05',week:3,weekTitle:'Searching and sorting',type:'text',title:'Algorithm walkthrough',body:'Study linear search, binary search, and the effect of sorted input on search performance.'},
      {...base,id:'demo-ccs211-content-06',week:3,weekTitle:'Searching and sorting',type:'text',title:'Weekly review',body:'Summarize the key operations and complete the short quiz in the Examinations section.',requiresPrevious:true},
      {...base,id:'demo-ccs211-content-07',week:2,weekTitle:'Linear structures',type:'link',title:'Interactive algorithm visualizer',body:'Open the visualizer in a new tab.',url:'https://visualgo.net/en/list'},
      {...base,id:'demo-ccs211-content-08',week:3,weekTitle:'Searching and sorting',type:'file',title:'Week 3 review checklist',fileName:'week-3-review-checklist.txt',dataUrl:'data:text/plain;charset=utf-8,Week%203%20Review%20Checklist%0A-%20Compare%20linear%20and%20binary%20search%0A-%20Trace%20a%20sorting%20pass%0A-%20Review%20time%20complexity'}
    ];
    const existingIds=new Set(cleaned.map(item=>item.id)),missing=lessons.filter(item=>!existingIds.has(item.id));
    if(!missing.length&&cleaned.length===current.length)return false;
    DB.write(key,[...cleaned,...missing]);return true;
  },
  install() {
    this.ensureLearningContent();
    if (Number(localStorage.getItem('demoCurriculumVersion') || 0) >= this.version) return false;
    const currentStudents=DB.read('students',[]);
    const looksLikeDemo=!currentStudents.length||Number(localStorage.getItem('demoCurriculumVersion')||0)>0||currentStudents.some(item=>item.id==='2024-00001');
    if(!looksLikeDemo)return false;
    const faculty=[
      ['23-32534-345','Reyes','Maria'],['18-76421-908','Santos','Jose'],['31-48295-167','Cruz','Angela'],['27-61943-520','Garcia','Luis'],
      ['14-85327-641','Flores','Elena'],['36-29418-735','Mendoza','Paolo'],['22-57196-483','Navarro','Camille'],['29-43812-956','Aquino','Daniel']
    ].map(([id,last,first])=>({id,last,first}));
    const facultyLast=['Velasco','Domingo','Mercado','Padilla','Salazar','Valdez','Soriano','Pascual','Aguilar','Cabrera','Rosales','Manalo','Pineda','Marquez','De Leon','Evangelista','Estrada','Ferrer','Ocampo','Bernardo'];
    const facultyFirst=['Alyssa','Ramon','Beatriz','Carlo','Diana','Enrique','Faith','Gabriel','Hazel','Ivan','Joanna','Kevin','Lara','Martin','Nina','Oscar','Patricia','Rafael','Teresa','Victor'];
    facultyLast.forEach((last,index)=>faculty.push({id:`${40+index}-${String(10000+index*173).padStart(5,'0')}-${String(100+index*7).padStart(3,'0')}`,last,first:facultyFirst[index]}));
    const curriculum={
      BSCS:[['Introduction to Computing','Computer Programming 1'],['Data Structures and Algorithms','Human-Computer Interaction'],['Design and Analysis of Algorithms','Introduction to Artificial Intelligence'],['Cloud Computing','Thesis / Capstone Project 2']],
      BSIT:[['Introduction to Computing','Web Systems and Technologies'],['Networking 1','Information Management'],['Cloud Computing','Information Assurance and Security'],['IT Service Management','IT Internship / OJT']],
      BSIS:[['Fundamentals of Information Systems','Business Organization and Management'],['Systems Analysis and Design','Database Management Systems'],['Business Intelligence','Information Systems Project Management'],['IT Audit and Controls','Capstone Project 2']]
    }, prefixes={BSCS:'CCS',BSIT:'CIT',BSIS:'CIS'};
    const sections=[],subjects=[],sectionSubjects=[]; let offerNo=1, subjectNo=1;
    Object.entries(curriculum).forEach(([program,years],programIndex)=>years.forEach((names,yearIndex)=>{
      const yearLevel=yearIndex+1, sectionCount=yearLevel===2?2:1;
      const yearSubjects=names.map((name,index)=>{const code=`${prefixes[program]}${yearLevel}${11+index}-24`;subjects.push({code,name,program,yearLevel});return code;});
      for(let sectionIndex=0;sectionIndex<sectionCount;sectionIndex++){
        const sectionNumber=sectionIndex+1,id=`${yearLevel}${program}-${sectionNumber}`;sections.push({id,name:String(sectionNumber),sectionNumber,program,yearLevel});
        const assignments=yearSubjects.map(subjectCode=>{const number=offerNo++;return{id:`OFR-${String(number).padStart(3,'0')}`,subjectCode,facultyId:faculty[(number-1)%(faculty.length-3)].id};});
        sectionSubjects.push({sectionId:id,assignments});
      }
    }));
    // Give the named faculty demo account a varied teaching load and keep her
    // connected to several of Maria Santos's actual enrolled offerings.
    const mariaReyesLoad=[
      ['2BSCS-1','CCS211-24'],['2BSCS-1','CCS212-24'],
      ['2BSCS-2','CCS211-24'],
      ['2BSIT-1','CIT211-24'],['2BSIS-1','CIS211-24']
    ];
    mariaReyesLoad.forEach(([sectionId,subjectCode])=>{
      const offering=sectionSubjects.find(record=>record.sectionId===sectionId)?.assignments.find(item=>item.subjectCode===subjectCode);
      if(offering)offering.facultyId='23-32534-345';
    });
    const students=[]; let studentNo=1;
    sections.forEach((section,index)=>{const entryYear=2027-section.yearLevel,baseFirst=['Juan','Maria','Pedro','Sofia','Miguel','Camille','Bianca','Andre'][index%8];students.push({id:`${entryYear}-${String(studentNo++).padStart(5,'0')}`,last:['Dela Cruz','Santos','Reyes','Mendoza','Navarro','Villanueva','Castillo','Bautista'][index%8],first:index>=8?`${baseFirst} A.`:baseFirst,sections:[section.id]});});
    // Four irregular students take offerings from two sections.
    for(let i=0;i<4;i++){const first=sections[i],second=sections[(i+5)%sections.length],entryYear=2026-i%3;students.push({id:`${entryYear}-${String(studentNo++).padStart(5,'0')}`,last:['Ramos','Torres','Lim','Gonzales'][i],first:['Leah','Marco','Iris','Noel'][i],sections:[first.id,second.id]});}
    const studentLast=['Abad','Alcantara','Andres','Balagtas','Cabral','David','Escobar','Francisco','Galang','Herrera','Ignacio','Javier','Katigbak','Lacsamana','Macapagal','Natividad','Ortega','Quintos','Rivera','Samson','Tolentino','Uy','Vergara','Yap'];
    const studentFirst=['Aaron','Abigail','Adrian','Alexa','Brandon','Chloe','Christian','Denise','Ethan','Frances','Gian','Hannah','Isaac','Julia','Kyle','Louise','Nathan','Olivia','Paolo','Queenie','Sean','Trisha','Vincent','Zoe'];
    for(let i=0;i<600;i++){
      const primary=sections[i%sections.length],memberships=[primary.id];
      if(i%10===0){const alternate=sections.find(section=>section.yearLevel===primary.yearLevel&&section.program!==primary.program);if(alternate)memberships.push(alternate.id);}
      const entryYear=2027-primary.yearLevel;
      const last=studentLast[i%studentLast.length],firstBase=studentFirst[Math.floor(i/studentLast.length)%studentFirst.length],cycle=Math.floor(i/(studentLast.length*studentFirst.length)),first=cycle?`${firstBase} ${String.fromCharCode(64+cycle)}.`:firstBase;
      students.push({id:`${entryYear}-${String(studentNo++).padStart(5,'0')}`,last,first,sections:memberships});
    }
    const offers=sectionSubjects.flatMap(record=>record.assignments.map(item=>({...item,sectionId:record.sectionId}))),studentEnrollments=[];
    const maria=students.find(student=>student.id==='2025-00002');
    if(maria)maria.sections=['2BSCS-1','2BSIT-1','2BSIS-1'];
    students.forEach((student,index)=>{let chosen=offers.filter(offer=>student.sections.includes(offer.sectionId));if(student.sections.length>1)chosen=chosen.slice(0,3);else chosen=chosen.slice(0,2);chosen.forEach((offer,i)=>studentEnrollments.push({id:`ENR-${student.id}-${i+1}`,studentId:student.id,offeringId:offer.id,subjectCode:offer.subjectCode,sectionId:offer.sectionId}));});
    const mariaCodes=['CCS211-24','CCS212-24','CIT211-24','CIT212-24','CIS211-24','CIS212-24'];
    for(let index=studentEnrollments.length-1;index>=0;index--)if(studentEnrollments[index].studentId==='2025-00002')studentEnrollments.splice(index,1);
    mariaCodes.forEach((code,index)=>{const offer=offers.find(item=>item.subjectCode===code&&['2BSCS-1','2BSIT-1','2BSIS-1'].includes(item.sectionId));if(offer)studentEnrollments.push({id:`ENR-2025-00002-${index+1}`,studentId:'2025-00002',offeringId:offer.id,subjectCode:offer.subjectCode,sectionId:offer.sectionId});});
    const subjectAssignments=subjects.map(subject=>({subjectCode:subject.code,facultyIds:[...new Set(offers.filter(offer=>offer.subjectCode===subject.code).map(offer=>offer.facultyId))]}));
    const passwordName=value=>value.toLowerCase().replace(/\s+/g,'');
    const users=[{username:'admin',password:'admin123',role:'admin'},...faculty.map(item=>{const firstOffer=offers.find(offer=>offer.facultyId===item.id),year=firstOffer?sections.find(section=>section.id===firstOffer.sectionId)?.yearLevel||0:0;return{username:item.id,password:item.id==='23-32534-345'?'reyes23':passwordName(item.last)+year,role:'faculty'};}),...students.map(item=>({username:item.id,password:item.id==='2025-00002'?'santos2025':passwordName(item.last)+(sections.find(section=>section.id===item.sections[0])?.yearLevel||0),role:'student'}))];
    const exams=[],questions=[],studentSubmissions=[],anchor=new Date(Date.UTC(2026,7,25));
    const isoDate=offset=>{const date=new Date(anchor);date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10);};
    const durationChoices=[30,45,60,75,90,120],assessmentNames=['Quick Quiz','Skills Check','Unit Test'],questionTypes=['mcq','truefalse','number','fillblank','matching','essay'];
    const buildQuestion=(exam,index,subject)=>{const type=questionTypes[index%questionTypes.length],base={id:`${exam.id}-Q${String(index+1).padStart(2,'0')}`,examId:exam.id,type,text:`${subject.name}: practice item ${index+1}`,points:2};
      if(type==='mcq')return{...base,text:`Which option best applies to ${subject.name}?`,options:[{text:'The primary concept shown in the lesson',isCorrect:true},{text:'An unrelated hardware procedure',isCorrect:false},{text:'A random administrative task',isCorrect:false},{text:'None of the listed concepts',isCorrect:false}]};
      if(type==='truefalse')return{...base,text:`${subject.name} uses systematic concepts and methods.`,options:[{text:'True',isCorrect:true},{text:'False',isCorrect:false}]};
      if(type==='number')return{...base,text:`Enter the result of ${index+2} + ${index+3}.`,acceptedValue:(index+2)+(index+3),tolerance:0};
      if(type==='fillblank')return{...base,text:`Complete the statement: ${subject.name} is studied through ___.`,expectedAnswer:'practice',caseSensitive:false,symbolSensitive:false,whitespaceSensitive:false};
      if(type==='matching')return{...base,text:`Match the ${subject.name} terms with their descriptions.`,pairs:[{left:'Concept',right:'Core idea'},{left:'Method',right:'Way of working'},{left:'Result',right:'Observed outcome'}]};
      return{...base,text:`Briefly explain one practical use of ${subject.name}.`,expectedAnswer:'Responses should identify a valid use and explain it.',needsManualGrading:true};};
    subjects.forEach((subject,subjectIndex)=>{
      const subjectOffers=offers.filter(offer=>offer.subjectCode===subject.code),examCount=subjectIndex%3+1;
      for(let examIndex=0;examIndex<examCount;examIndex++){
        const offer=subjectOffers[examIndex%subjectOffers.length],number=exams.length+1,itemCount=5+((subjectIndex*7+examIndex*5)%16);
        const normalOffset=((subjectIndex*3+examIndex*11)%38)-7,dayOffset=subject.code==='CCS211-24'?(examIndex<2?(-7+examIndex*5):0):normalOffset;
        const isLiveDemo=subject.code==='CCS211-24'&&examIndex===2;
        const exam={id:`DEMO-EXAM-${String(number).padStart(3,'0')}`,facultyId:offer.facultyId,subjectCode:subject.code,title:`${subject.name} — ${isLiveDemo?'Live Demo Quiz':assessmentNames[examIndex]}`,desc:`A short ${assessmentNames[examIndex].toLowerCase()} covering varied concepts and response formats.`,date:isoDate(dayOffset),start:isLiveDemo?'00:00':'08:00',end:isLiveDemo?'23:59':'20:00',durationMinutes:isLiveDemo?30:durationChoices[(subjectIndex+examIndex)%durationChoices.length],passingPercent:70,materials:examIndex%2?'Scratch paper permitted':'No additional materials',questionLayout:examIndex%2?'all':'one',navigationMode:examIndex%3?'free':'forward',status:'published',scoreRelease:'after-deadline',answerRelease:examIndex%2?'after-deadline':'never',showSubmittedAnswers:true,showFeedback:true,sections:[offer.sectionId]};
        exams.push(exam);for(let q=0;q<itemCount;q++)questions.push(buildQuestion(exam,q,subject));
        if(dayOffset<0){const eligible=[...new Set(studentEnrollments.filter(item=>item.subjectCode===subject.code&&item.sectionId===offer.sectionId).map(item=>item.studentId))],total=itemCount*2;
          eligible.forEach((studentId,rank)=>{if(rank%10===0)return;const failed=rank%10===1||rank%10===2,awarded=failed?Math.floor(total*.5):Math.min(total,Math.ceil(total*(.75+(rank%4)*.05)));studentSubmissions.push({id:`SUB-${exam.id}-${studentId}`,studentId,examId:exam.id,submittedAt:`${exam.date}T${String(10+rank%7).padStart(2,'0')}:15:00+08:00`,total,answers:[{awarded,needsManualGrading:false}]});});}
      }
    });
    const practiceSubject=subjects.find(subject=>subject.code==='CCS212-24'),practiceOffer=offers.find(offer=>offer.subjectCode==='CCS212-24'&&offer.sectionId==='2BSCS-1');
    const practiceExam={id:'DEMO-ALWAYS-OPEN',facultyId:practiceOffer.facultyId,subjectCode:practiceSubject.code,title:'Human-Computer Interaction — Always-Open Practice Exam',desc:'A reusable practice assessment with no opening date or deadline.',date:'',start:'',end:'',durationMinutes:0,maxAttempts:99,passingPercent:70,materials:'Notes permitted',questionLayout:'one',navigationMode:'free',status:'published',scoreRelease:'immediate',answerRelease:'immediate',showSubmittedAnswers:true,showFeedback:true,sections:['2BSCS-1']};
    exams.push(practiceExam);for(let q=0;q<10;q++)questions.push(buildQuestion(practiceExam,q,practiceSubject));
    const mistakesExam={id:'DEMO-REVIEW-MISTAKES',facultyId:practiceOffer.facultyId,subjectCode:practiceSubject.code,title:'Human-Computer Interaction — Incorrect Answers Review Demo',desc:'A completed demonstration assessment containing both correct and incorrect responses.',date:isoDate(-1),start:'10:00',end:'11:00',durationMinutes:45,maxAttempts:1,passingPercent:70,materials:'No additional materials',questionLayout:'one',navigationMode:'free',status:'published',scoreRelease:'immediate',answerRelease:'immediate',showSubmittedAnswers:true,showFeedback:true,sections:['2BSCS-1']};
    exams.push(mistakesExam);for(let q=0;q<8;q++)questions.push(buildQuestion(mistakesExam,q,practiceSubject));
    // Give Maria a convincing history: every completed paper stores answers for
    // the actual questions, allowing the Results review to show choices,
    // responses, correct answers, and feedback instead of an aggregate score.
    for(let index=studentSubmissions.length-1;index>=0;index--)if(studentSubmissions[index].studentId==='2025-00002')studentSubmissions.splice(index,1);
    const mariaPastExams=exams.filter(exam=>mariaCodes.includes(exam.subjectCode)&&exam.date&&exam.date<isoDate(0));
    mariaPastExams.forEach((exam,examIndex)=>{
      exam.scoreRelease='immediate';exam.answerRelease='immediate';exam.showSubmittedAnswers=true;exam.showFeedback=true;
      const paper=questions.filter(question=>question.examId===exam.id),answers=paper.map((question,questionIndex)=>{
        const correct=exam.id==='DEMO-REVIEW-MISTAKES'?questionIndex%2===0:questionIndex%6!==5,common={questionId:question.id,needsManualGrading:false,awarded:correct?(question.points||2):0,remark:correct?'':'Review this concept before the next assessment.'};
        if(question.type==='mcq'||question.type==='truefalse'){const selectedIndex=correct?question.options.findIndex(option=>option.isCorrect):Math.max(0,question.options.findIndex(option=>!option.isCorrect));return{...common,selectedIndex,selectedText:question.options[selectedIndex]?.text||''};}
        if(question.type==='number')return{...common,response:correct?String(question.acceptedValue):String(Number(question.acceptedValue)+2)};
        if(question.type==='fillblank')return{...common,response:correct?(question.expectedAnswer||'practice'):'study'};
        if(question.type==='matching')return{...common,matches:correct?question.pairs.map((_,pairIndex)=>pairIndex):question.pairs.map((_,pairIndex)=>(pairIndex+1)%question.pairs.length)};
        return{...common,response:`A practical use of ${subjects.find(subject=>subject.code===exam.subjectCode)?.name||'the topic'} is applying its concepts to solve a real user or system problem.`};
      }),total=paper.reduce((sum,question)=>sum+(question.points||2),0),score=answers.reduce((sum,answer)=>sum+answer.awarded,0);
      studentSubmissions.push({id:`DEMO-MARIA-SUB-${String(examIndex+1).padStart(2,'0')}`,studentId:'2025-00002',examId:exam.id,submittedAt:`${exam.date}T${String(9+examIndex%7).padStart(2,'0')}:${examIndex%2?'42':'18'}:00+08:00`,total,score,status:'graded',gradedAt:`${exam.date}T18:00:00+08:00`,remarks:examIndex%3===0?'Good work. Review the marked item for improvement.':'Well done. Keep practicing the key concepts.',answers});
    });
    const auditEntry=(id,at,actorId,actorRole,action,entityType,entityId,details={})=>({id,at,actorId,actorRole,action,entityType,entityId,details});
    const applicationAuditLog=[
      auditEntry('demo-a01','2026-08-05T07:51:00+08:00','23-32534-345','faculty','login','session','23-32534-345'),
      auditEntry('demo-a02','2026-08-17T08:14:00+08:00','23-32534-345','faculty','create','exam','DEMO-EXAM-004',{title:'Data Structures and Algorithms — Quick Quiz'}),
      auditEntry('demo-a03','2026-08-17T10:22:00+08:00','23-32534-345','faculty','publish','exam','DEMO-EXAM-004'),
      auditEntry('demo-a04','2026-08-18T09:03:00+08:00','2025-00002','student','login','session','2025-00002'),
      auditEntry('demo-a05','2026-08-18T09:42:00+08:00','2025-00002','student','submit','exam','DEMO-EXAM-004'),
      auditEntry('demo-a06','2026-08-13T15:30:00+08:00','23-32534-345','faculty','release-grade','submission','DEMO-SUB-1'),
      auditEntry('demo-a07','2026-08-18T13:05:00+08:00','23-32534-345','faculty','login','session','23-32534-345'),
      auditEntry('demo-a08','2026-08-22T13:25:00+08:00','23-32534-345','faculty','publish','exam','DEMO-EXAM-005'),
      auditEntry('demo-a09','2026-08-23T13:37:00+08:00','2025-00002','student','login','session','2025-00002'),
      auditEntry('demo-a10','2026-08-23T14:18:00+08:00','2025-00002','student','submit','exam','DEMO-EXAM-005'),
      auditEntry('demo-a11','2026-08-20T08:45:00+08:00','23-32534-345','faculty','release-grade','submission','DEMO-SUB-2'),
      auditEntry('demo-a12','2026-08-24T18:12:00+08:00','2025-00002','student','login','session','2025-00002')
    ];
    const questionReports=[
      {id:'DEMO-REPORT-001',studentId:'2025-00002',examId:'DEMO-EXAM-004',questionId:'DEMO-EXAM-004-Q01',category:'Incorrect answer key',details:'The displayed answer appears different from the lesson example.',status:'open',createdAt:'2026-08-28T09:15:00+08:00',resolvedAt:null},
      {id:'DEMO-REPORT-002',studentId:'2025-00017',examId:'DEMO-EXAM-004',questionId:'DEMO-EXAM-004-Q03',category:'Unclear wording',details:'The wording could be interpreted in two different ways.',status:'open',createdAt:'2026-08-27T14:30:00+08:00',resolvedAt:null},
      {id:'DEMO-REPORT-003',studentId:'2025-00021',examId:'DEMO-EXAM-007',questionId:'DEMO-EXAM-007-Q02',category:'Technical issue',details:'The selected choice cleared when I moved to the next question.',status:'open',createdAt:'2026-08-27T10:10:00+08:00',resolvedAt:null},
      {id:'DEMO-REPORT-004',studentId:'2025-00021',examId:'DEMO-EXAM-005',questionId:'DEMO-EXAM-005-Q02',category:'Image or attachment',details:'The referenced diagram did not appear during the attempt.',status:'reviewed',createdAt:'2026-08-26T11:20:00+08:00',resolutionNote:'The attachment link is being checked.',resolvedAt:null},
      {id:'DEMO-REPORT-005',studentId:'2025-00036',examId:'DEMO-EXAM-020',questionId:'DEMO-EXAM-020-Q01',category:'Question content',details:'The network address in the question may contain a typographical error.',status:'reviewed',createdAt:'2026-08-26T08:40:00+08:00',resolutionNote:'Compared the item with the faculty question bank.',resolvedAt:null},
      {id:'DEMO-REPORT-006',studentId:'2025-00051',examId:'DEMO-EXAM-037',questionId:'DEMO-EXAM-037-Q03',category:'Missing choice',details:'The expected process step was not included among the choices.',status:'reviewed',createdAt:'2026-08-25T15:30:00+08:00',resolutionNote:'The available choices are under review.',resolvedAt:null},
      {id:'DEMO-REPORT-007',studentId:'2025-00002',examId:'DEMO-EXAM-005',questionId:'DEMO-EXAM-005-Q04',category:'Scoring concern',details:'My response matched the accepted wording but was marked incorrect.',status:'resolved',createdAt:'2026-08-24T16:05:00+08:00',resolutionNote:'The answer was reviewed and the score was corrected.',resolvedAt:'2026-08-25T10:00:00+08:00'},
      {id:'DEMO-REPORT-008',studentId:'2025-00066',examId:'DEMO-EXAM-039',questionId:'DEMO-EXAM-039-Q02',category:'Timer concern',details:'The page briefly froze while the timer continued counting.',status:'resolved',createdAt:'2026-08-24T11:35:00+08:00',resolutionNote:'Attempt logs were checked and additional time was granted.',resolvedAt:'2026-08-24T14:20:00+08:00'},
      {id:'DEMO-REPORT-009',studentId:'2025-00081',examId:'DEMO-ALWAYS-OPEN',questionId:'DEMO-ALWAYS-OPEN-Q06',category:'Accessibility',details:'The matching labels were difficult to identify using keyboard navigation.',status:'resolved',createdAt:'2026-08-23T13:10:00+08:00',resolutionNote:'Keyboard labels were added to the matching controls.',resolvedAt:'2026-08-24T09:05:00+08:00'},
      {id:'DEMO-REPORT-010',studentId:'2025-00036',examId:'DEMO-EXAM-004',questionId:'DEMO-EXAM-004-Q05',category:'Duplicate report',details:'This concern was already submitted for the same question.',status:'dismissed',createdAt:'2026-08-23T08:45:00+08:00',resolutionNote:'Dismissed because an earlier open report covers the same issue.',resolvedAt:null},
      {id:'DEMO-REPORT-011',studentId:'2025-00096',examId:'DEMO-EXAM-007',questionId:'DEMO-EXAM-007-Q04',category:'No issue found',details:'The question appeared blank for a moment after loading.',status:'dismissed',createdAt:'2026-08-22T17:25:00+08:00',resolutionNote:'The saved attempt and question content loaded normally during review.',resolvedAt:null},
      {id:'DEMO-REPORT-012',studentId:'2025-00111',examId:'DEMO-EXAM-020',questionId:'DEMO-EXAM-020-Q05',category:'Out of scope',details:'Request to change the examination schedule through a question report.',status:'dismissed',createdAt:'2026-08-22T09:50:00+08:00',resolutionNote:'Schedule requests must be sent through Faculty mail.',resolvedAt:null}
    ];
    const adminAnnouncements=[
      {id:'ANN-001',title:'Scheduled maintenance',message:'The examination portal will undergo a short maintenance check on Saturday at 7:00 PM.',audience:'all',createdAt:'2026-08-28T13:00:00+08:00'},
      {id:'ANN-002',title:'Faculty reminder',message:'Please verify examination schedules and section access before publishing.',audience:'faculty',createdAt:'2026-08-27T09:00:00+08:00'}
    ];
    const studentEmails=[{id:'DEMO-MAIL-001',studentId:'2025-00002',facultyId:'23-32534-345',subject:'CCS211-24 — Question about Skills Check',message:'May I clarify the feedback on question 4?',sentAt:'2026-08-28T15:42:00+08:00',read:false}];
    const studentNotifications=[{id:'DEMO-NOTICE-001',studentId:'2025-00002',reportId:'DEMO-REPORT-004',message:'Your scoring concern was resolved and the answer was reviewed.',createdAt:'2026-08-25T10:05:00+08:00',read:false}];
    Object.entries({faculty,students,subjects,sections,sectionSubjects,studentEnrollments,subjectAssignments,users,allotments:[],exams,questions,studentSubmissions,applicationAuditLog,questionReports,adminAnnouncements,studentEmails,studentNotifications}).forEach(([key,value])=>DB.write(key,value));
    localStorage.setItem('demoCurriculumVersion',String(this.version)); return true;
  }
};
