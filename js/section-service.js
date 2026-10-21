/* Shared section records and section-level subject inheritance. */
const SectionService = {
  normaliseId(value) { return String(value || '').trim().toUpperCase(); },
  detailsFromId(value) {
    const programs='BSCS|BSIT|BSIS|BSGAMEDEV|BSANIMATION',id=this.normaliseId(value),current=id.match(new RegExp(`^(\\d)(${programs})-(\\d+)$`)),legacy=id.match(new RegExp(`^(${programs})-(\\d)([A-Z])?$`));
    return current?{program:current[2],yearLevel:Number(current[1]),sectionNumber:Number(current[3])}:legacy?{program:legacy[1],yearLevel:Number(legacy[2]),sectionNumber:legacy[3]?legacy[3].charCodeAt(0)-64:1}:{program:'',yearLevel:null,sectionNumber:null};
  },
  migrate(sections, students) {
    const result = Array.isArray(sections) ? sections : [];
    result.forEach(section=>{const inferred=this.detailsFromId(section.id);section.program=section.program||inferred.program;section.yearLevel=Number(section.yearLevel)||inferred.yearLevel;section.sectionNumber=Number(section.sectionNumber)||inferred.sectionNumber;});
    const known = new Set(result.map(section => this.normaliseId(section.id)));
    (students || []).forEach(student => {
      student.sections = [...new Set((student.sections || []).map(value => this.normaliseId(value)).filter(Boolean))];
      student.sections.forEach(id => {
        if (!known.has(id)) { result.push({ id, name: id, ...this.detailsFromId(id) }); known.add(id); }
      });
    });
    return result;
  },
  subjectCodesForStudent(student, allotments, sectionSubjects) {
    const enrollments = typeof DB !== 'undefined' ? DB.read('studentEnrollments', []) : [];
    const enrolled = enrollments.filter(item => item.studentId === student.id).map(item => item.subjectCode);
    const direct = (allotments || []).filter(item => item.studentId === student.id).map(item => item.subjectCode);
    const memberships = new Set((student.sections || []).map(value => this.normaliseId(value)));
    const inherited = (sectionSubjects || [])
      .filter(item => memberships.has(this.normaliseId(item.sectionId)))
      .flatMap(item => Array.isArray(item.subjectCodes) ? item.subjectCodes : [item.subjectCode])
      .filter(Boolean);
    return [...new Set([...enrolled, ...direct, ...inherited])];
  },
  assignedCodes(sectionId, sectionSubjects) {
    const id = this.normaliseId(sectionId);
    const record = (sectionSubjects || []).find(item => this.normaliseId(item.sectionId) === id);
    return record ? [...new Set(record.assignments?.map(item=>item.subjectCode) || record.subjectCodes || (record.subjectCode ? [record.subjectCode] : []))] : [];
  },
  offerings(sectionSubjects) {
    return (sectionSubjects || []).flatMap(record => (record.assignments || (record.subjectCodes || []).map(subjectCode=>({subjectCode,facultyId:null}))).map(item=>({...item,id:item.id||`${record.sectionId}_${item.subjectCode}`,sectionId:record.sectionId,subjectCode:item.subjectCode,facultyId:item.facultyId||null,academicPeriodId:item.academicPeriodId||record.academicPeriodId||'',periodStatus:item.periodStatus||record.periodStatus||''})));
  },
  currentAcademicContext() {
    if(typeof DB==='undefined')return{periodId:'',term:'first',schoolYear:'',active:true};
    const settings=DB.read('systemSettings',{})||{},periods=DB.read('academicPeriods',[])||[],period=periods.find(item=>item.status==='active')||periods.find(item=>item.id===settings.currentAcademicPeriodId),label=String(period?.term||settings.semester||'First Semester').toLowerCase(),term=label.includes('second')?'second':label.includes('summer')?'summer':label.includes('special')?'special':'first';
    return{periodId:period?.id||settings.currentAcademicPeriodId||'',term,schoolYear:period?.schoolYear||settings.schoolYear||'',active:periods.length?period?.status==='active':settings.academicPeriodStatus!=='closed'};
  },
  assignmentOfferings(sectionSubjects, sections, curricula) {
    const context=this.currentAcademicContext();if(!context.active)return[];
    const sectionRows=sections||(typeof DB!=='undefined'?DB.read('sections',[]):[]),curriculum=curricula||(typeof DB!=='undefined'?DB.read('curricula',[]):[]);
    return this.offerings(sectionSubjects).filter(offer=>{
      if(offer.periodStatus&&offer.periodStatus!=='active')return false;
      if(context.periodId&&offer.academicPeriodId&&offer.academicPeriodId!==context.periodId)return false;
      const stored=sectionRows.find(item=>this.normaliseId(item.id)===this.normaliseId(offer.sectionId))||{},section={...this.detailsFromId(offer.sectionId),...stored},scoped=curriculum.filter(item=>item.program===section.program&&Number(item.yearLevel)===Number(section.yearLevel)&&item.status!=='archived'&&item.removed!==true);
      return !scoped.length||scoped.some(item=>item.subjectCode===offer.subjectCode&&item.term===context.term);
    });
  },
  offeringFor(sectionId, subjectCode, sectionSubjects) {
    return this.offerings(sectionSubjects).find(item=>item.sectionId===sectionId&&item.subjectCode===subjectCode)||null;
  },
  offeringsForFaculty(facultyId, sectionSubjects, subjectAssignments) {
    return this.assignmentOfferings(sectionSubjects).filter(offer => {
      if (offer.facultyId) return offer.facultyId === facultyId;
      const legacy=(subjectAssignments||[]).find(item=>item.subjectCode===offer.subjectCode);
      return (legacy?.facultyIds || (legacy?.facultyId?[legacy.facultyId]:[])).includes(facultyId);
    });
  },
  enrollmentsForStudent(studentId) {
    return typeof DB === 'undefined' ? [] : DB.read('studentEnrollments', []).filter(item=>item.studentId===studentId);
  }
};
