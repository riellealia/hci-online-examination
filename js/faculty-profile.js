const FacultyProfileService = {
  build(person, data) {
    const subjectCodes=data.subjectAssignments.filter(item=>(item.facultyIds||(item.facultyId?[item.facultyId]:[])).includes(person.id)).map(item=>item.subjectCode);
    const subjectRows=subjectCodes.map(code=>data.subjects.find(subject=>subject.code===code)||{code,name:'Unknown subject'});
    const ownOffers=SectionService.offeringsForFaculty(person.id,data.sectionSubjects,data.subjectAssignments);
    const enrollments=typeof DB==='undefined'?[]:DB.read('studentEnrollments',[]);
    const sectionRows=data.sections.filter(section=>ownOffers.some(offer=>offer.sectionId===section.id)).map(section=>{
      const codes=ownOffers.filter(offer=>offer.sectionId===section.id).map(offer=>offer.subjectCode);
      const studentIds=new Set(enrollments.filter(item=>item.sectionId===section.id&&codes.includes(item.subjectCode)).map(item=>item.studentId));
      const students=data.students.filter(student=>studentIds.has(student.id));
      const examIds=data.exams.filter(exam=>subjectCodes.includes(exam.subjectCode)&&(!exam.sections?.length||exam.sections.includes(section.id))).map(exam=>exam.id);
      const submissions=data.submissions.filter(item=>students.some(student=>student.id===item.studentId)&&examIds.includes(item.examId));
      const grades=submissions.map(item=>gradeFor((item.answers||[]).reduce((sum,answer)=>sum+(Number(answer.awarded)||0),0),Number(item.total)||0).percent);
      return {...section,codes,students,submissions,average:grades.length?grades.reduce((a,b)=>a+b,0)/grades.length:null};
    });
    const exams=data.exams.filter(exam=>exam.facultyId===person.id), actions=data.audit.filter(entry=>entry.actorId===person.id), logins=actions.filter(entry=>entry.action==='login');
    return {person,subjectRows,sectionRows,exams,actions,logins,stats:{subjects:subjectRows.length,sections:sectionRows.length,students:new Set(sectionRows.flatMap(row=>row.students.map(student=>student.id))).size,exams:exams.length}};
  }
};
