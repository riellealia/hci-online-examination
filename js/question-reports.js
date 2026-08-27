const QUESTION_REPORT_KEY = 'questionReports';

function readQuestionReports() {
  const reports = DB.read(QUESTION_REPORT_KEY, []);
  return Array.isArray(reports) ? reports : [];
}

function createQuestionReport({ studentId, examId, questionId, attemptId = null, category, details }) {
  if (!studentId || !examId || !questionId || !category || !String(details || '').trim()) return { ok:false, reason:'missing' };
  const reports = readQuestionReports();
  if (reports.some(r => r.studentId === studentId && r.examId === examId && r.questionId === questionId && r.status === 'open')) {
    return { ok:false, reason:'duplicate' };
  }
  const report = { id:`report_${Date.now()}_${reports.length}`, studentId, examId, questionId, attemptId,
    category, details:String(details).trim(), status:'open', createdAt:new Date().toISOString(), resolvedAt:null };
  reports.push(report);
  return DB.write(QUESTION_REPORT_KEY, reports) ? { ok:true, report } : { ok:false, reason:'storage' };
}

function reportsForExams(examIds) {
  const allowed = new Set(examIds || []);
  return readQuestionReports().filter(report => allowed.has(report.examId));
}

function setQuestionReportStatus(reportId, status) {
  if (!['open','reviewed','resolved','dismissed'].includes(status)) return false;
  const reports = readQuestionReports();
  const report = reports.find(item => item.id === reportId);
  if (!report) return false;
  report.status = status;
  report.resolvedAt = status === 'resolved' ? new Date().toISOString() : null;
  return DB.write(QUESTION_REPORT_KEY, reports);
}

function saveQuestionReportNote(reportId, note) {
  const reports = readQuestionReports();
  const report = reports.find(item => item.id === reportId);
  if (!report) return false;
  report.resolutionNote = String(note || '');
  report.noteUpdatedAt = new Date().toISOString();
  return DB.write(QUESTION_REPORT_KEY, reports);
}

function notifyReportStudent(reportId) {
  const report = readQuestionReports().find(item => item.id === reportId);
  if (!report) return false;
  const stored = DB.read('studentNotifications', []);
  const notifications = Array.isArray(stored) ? stored : [];
  notifications.push({ id:`notice_${Date.now()}_${notifications.length}`, studentId:report.studentId,
    reportId, message:report.resolutionNote || 'Your instructor updated a question report.',
    createdAt:new Date().toISOString(), read:false });
  return DB.write('studentNotifications', notifications);
}

function notificationsForStudent(studentId) {
  const stored = DB.read('studentNotifications', []);
  return (Array.isArray(stored) ? stored : []).filter(item => item.studentId === studentId);
}
