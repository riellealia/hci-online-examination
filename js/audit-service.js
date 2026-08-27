/* Append-only operational audit trail. This is application data, separate from
   the Markdown development log in .plans/progress. */
const AuditLog = {
  record(action, entityType, entityId, details = {}, actor = null) {
    const session = actor || DB.read('currentUser', null) || { username: 'system', role: 'system' };
    const entries = DB.read('applicationAuditLog', []);
    entries.push({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      at: new Date().toISOString(), actorId: session.username || 'unknown',
      actorRole: session.role || 'unknown', action, entityType,
      entityId: String(entityId || ''), details
    });
    return DB.write('applicationAuditLog', entries);
  },
  read() { return DB.read('applicationAuditLog', []).slice().sort((a,b) => new Date(b.at)-new Date(a.at)); },
  eligibleStudents(exam, students, allotments, sectionSubjects) {
    return (students || []).filter(student => {
      const hasSubject = SectionService.subjectCodesForStudent(student, allotments, sectionSubjects).includes(exam.subjectCode);
      const sectionAllowed = !exam.sections?.length || exam.sections.some(id => (student.sections || []).includes(id));
      return hasSubject && sectionAllowed;
    });
  },
  participation(exam, students, allotments, sectionSubjects, submissions) {
    const eligible = this.eligibleStudents(exam, students, allotments, sectionSubjects);
    const takenIds = new Set((submissions || []).filter(item => item.examId === exam.id).map(item => item.studentId));
    return { taken: eligible.filter(student => takenIds.has(student.id)), notTaken: eligible.filter(student => !takenIds.has(student.id)) };
  }
};
