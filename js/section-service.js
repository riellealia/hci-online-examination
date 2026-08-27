/* Shared section records and section-level subject inheritance. */
const SectionService = {
  normaliseId(value) { return String(value || '').trim().toUpperCase(); },
  detailsFromId(value) {
    const id=this.normaliseId(value),current=id.match(/^(\d)(BSCS|BSIT|BSIS)-(\d+)$/),legacy=id.match(/^(BSCS|BSIT|BSIS)-(\d)([A-Z])?$/);
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
    return (sectionSubjects || []).flatMap(record => (record.assignments || (record.subjectCodes || []).map(subjectCode=>({subjectCode,facultyId:null}))).map(item=>({id:item.id||`${record.sectionId}_${item.subjectCode}`,sectionId:record.sectionId,subjectCode:item.subjectCode,facultyId:item.facultyId||null})));
  },
  offeringFor(sectionId, subjectCode, sectionSubjects) {
    return this.offerings(sectionSubjects).find(item=>item.sectionId===sectionId&&item.subjectCode===subjectCode)||null;
  },
  offeringsForFaculty(facultyId, sectionSubjects, subjectAssignments) {
    return this.offerings(sectionSubjects).filter(offer => {
      if (offer.facultyId) return offer.facultyId === facultyId;
      const legacy=(subjectAssignments||[]).find(item=>item.subjectCode===offer.subjectCode);
      return (legacy?.facultyIds || (legacy?.facultyId?[legacy.facultyId]:[])).includes(facultyId);
    });
  },
  enrollmentsForStudent(studentId) {
    return typeof DB === 'undefined' ? [] : DB.read('studentEnrollments', []).filter(item=>item.studentId===studentId);
  }
};
