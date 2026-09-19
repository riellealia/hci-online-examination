/* Append-only operational audit trail. This is application data, separate from
   the Markdown development log in .plans/progress. */
const AuditLog = {
  record(action, entityType, entityId, details = {}, actor = null, metadata = {}) {
    const session = actor || DB.read('currentUser', null) || { username: 'system', role: 'system' };
    const entries = DB.read('applicationAuditLog', []);
    const entry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      at: new Date().toISOString(), actorId: session.username || 'unknown',
      actorRole: session.role || 'unknown', action, entityType,
      entityId: String(entityId || ''), category: metadata.category || details.category || 'system',
      previousValue: metadata.previousValue === undefined ? null : metadata.previousValue,
      newValue: metadata.newValue === undefined ? null : metadata.newValue,
      result: metadata.result || 'success', reason: metadata.reason || details.reason || '',
      academicPeriod: metadata.academicPeriod || details.academicPeriod || '', details
    };
    entries.push(entry);
    return DB.write('applicationAuditLog', entries) ? entry : false;
  },
  read() { return DB.read('applicationAuditLog', []).slice().sort((a,b) => new Date(b.at)-new Date(a.at)); },
  query(filters = {}) {
    const text=String(filters.text||'').toLowerCase();
    return this.read().filter(item=>!filters.actorId||item.actorId===filters.actorId)
      .filter(item=>!filters.actorRole||item.actorRole===filters.actorRole)
      .filter(item=>!filters.category||item.category===filters.category)
      .filter(item=>!filters.action||item.action===filters.action)
      .filter(item=>!filters.entityType||item.entityType===filters.entityType)
      .filter(item=>!filters.result||item.result===filters.result)
      .filter(item=>!filters.from||new Date(item.at)>=new Date(filters.from))
      .filter(item=>!filters.to||new Date(item.at)<=new Date(filters.to))
      .filter(item=>!text||JSON.stringify(item).toLowerCase().includes(text));
  },
  queryFor(actor = null, filters = {}) {
    const session=actor||DB.read('currentUser',null);
    if(typeof PermissionService!=='undefined'&&!PermissionService.active(session))return[];
    const role=typeof PermissionService!=='undefined'?PermissionService.normalizeRole(session?.role):String(session?.role||'').toLowerCase();
    const entries=this.query(filters);
    if(role==='admin')return entries;
    if(role==='dean')return entries.filter(item=>['personnel','approval','assignment/enrollment','schedule/load','examination/grading','academic setup'].includes(item.category));
    if(role==='coordinator')return entries.filter(item=>item.actorId===session.username||item.details?.requesterId===session.username);
    if(role==='faculty')return entries.filter(item=>item.actorId===session.username);
    return[];
  },
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
