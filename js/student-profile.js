/* Builds the read-only Admin student profile without coupling it to CRUD UI. */
const StudentProfileService = {
  build(student, data) {
    const subjectCodes = SectionService.subjectCodesForStudent(student, data.allotments, data.sectionSubjects);
    const enrollments = (data.studentEnrollments || (typeof DB !== 'undefined' ? DB.read('studentEnrollments', []) : []))
      .filter(item => item.studentId === student.id);
    const offerings = SectionService.offerings(data.sectionSubjects);
    const subjectRows = subjectCodes.map(code => {
      const subject = data.subjects.find(item => item.code === code);
      const direct = data.allotments.find(item => item.studentId === student.id && item.subjectCode === code);
      const assignment = data.subjectAssignments.find(item => item.subjectCode === code);
      const enrolledSections = enrollments.filter(item => item.subjectCode === code).map(item => item.sectionId).filter(Boolean);
      const directSections = direct?.sectionId ? [direct.sectionId] : [];
      const inheritedSections = (student.sections || []).filter(sectionId => offerings.some(offer => offer.sectionId === sectionId && offer.subjectCode === code));
      const sections = [...new Set(enrolledSections.length ? enrolledSections : directSections.length ? directSections : inheritedSections)];
      const offeringFacultyIds = offerings.filter(offer => offer.subjectCode === code && sections.includes(offer.sectionId)).map(offer => offer.facultyId).filter(Boolean);
      const facultyIds = [...new Set(offeringFacultyIds.length ? offeringFacultyIds : direct ? [direct.facultyId] : (assignment?.facultyIds || (assignment?.facultyId ? [assignment.facultyId] : [])))];
      const professors = facultyIds.map(id => data.faculty.find(item => item.id === id)).filter(Boolean);
      return { code, name: subject?.name || 'Unknown subject', sections, professors };
    });
    const submissions = data.submissions.filter(item => item.studentId === student.id)
      .sort((a,b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
    const history = submissions.map(submission => {
      const exam = data.exams.find(item => item.id === submission.examId);
      const awarded = (submission.answers || []).reduce((sum,answer) => sum + (Number(answer.awarded) || 0), 0);
      const pending = (submission.answers || []).some(answer => answer.needsManualGrading && answer.awarded === null);
      const grade = pending ? null : gradeFor(awarded, Number(submission.total) || 0);
      return { submission, exam, awarded, pending, grade };
    });
    const finalGrades = history.filter(item => item.grade);
    const average = finalGrades.length ? finalGrades.reduce((sum,item) => sum + item.grade.percent, 0) / finalGrades.length : null;
    const actions = (data.audit || []).filter(entry => entry.actorId === student.id);
    const logins = actions.filter(entry => entry.action === 'login');
    return {
      student, subjectRows, history,
      sections: (student.sections || []).map(id => data.sections.find(section => section.id === id) || {id,name:id}),
      actions, logins,
      stats: { subjects: subjectRows.length, attempts: history.length, completed: finalGrades.length, pending: history.length-finalGrades.length, average }
    };
  }
};
