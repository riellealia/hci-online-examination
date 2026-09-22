'use strict';

const ACTIVE_COLLECTIONS = [
  'sectionSubjects', 'studentEnrollments', 'subjectAssignments', 'exams',
  'questions', 'studentSubmissions', 'approvalRequests'
];
const TERMS = new Set(['First Semester', 'Second Semester', 'Summer', 'Special Term']);
const STATUSES = new Set(['draft', 'active', 'closed', 'archived']);

const now = () => new Date().toISOString();
const slug = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
const actorId = session => session.username;
function bad(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
function admin(session) { if (!session || session.role !== 'admin') bad('Only an Administrator can manage academic periods.', 403); }
function validDate(value, label, optional = false) {
  if (optional && !value) return '';
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) bad(`${label} must be a valid date.`);
  return value;
}
function validateRange(start, end, label) { if (start && end && start > end) bad(`${label} start date must not be after its end date.`); }
function normalizeInput(input) {
  const schoolYear = String(input.schoolYear || '').trim(), term = String(input.term || '').trim();
  if (!/^\d{4}-\d{4}$/.test(schoolYear)) bad('School year must use YYYY-YYYY format.');
  const [first, second] = schoolYear.split('-').map(Number);
  if (second !== first + 1) bad('School year must cover two consecutive years.');
  if (!TERMS.has(term)) bad('Term must be First Semester, Second Semester, Summer, or Special Term.');
  const startDate = validDate(input.startDate, 'Start date');
  const endDate = validDate(input.endDate, 'End date');
  const enrollmentStart = validDate(input.enrollmentStart, 'Enrollment start date', true);
  const enrollmentEnd = validDate(input.enrollmentEnd, 'Enrollment end date', true);
  validateRange(startDate, endDate, 'Academic period');
  validateRange(enrollmentStart, enrollmentEnd, 'Enrollment');
  if (enrollmentStart && enrollmentEnd && (enrollmentStart > endDate || enrollmentEnd < startDate)) bad('Enrollment dates must overlap the academic period.');
  return { schoolYear, term, startDate, endDate, enrollmentStart, enrollmentEnd };
}
function audit(existing, session, action, period, previousValue, reason, details = {}) {
  return [...existing, {
    id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: now(), actorId: actorId(session), actorRole: session.role,
    action, entityType: 'academic-period', entityId: period.id,
    category: 'academic setup', result: 'success', reason: String(reason || '').trim(),
    previousValue: previousValue || null, newValue: period,
    academicPeriod: period.id, details
  }];
}
function initialFromSettings(store) {
  const existing = store.read('academicPeriods', []);
  if (Array.isArray(existing) && existing.length) return existing;
  const settings = store.read('systemSettings', {}) || {};
  const schoolYear = /^\d{4}-\d{4}$/.test(settings.schoolYear || '') ? settings.schoolYear : '2026-2027';
  const term = TERMS.has(settings.semester) ? settings.semester : 'First Semester';
  const timestamp = now();
  const period = {
    id: `AY-${slug(schoolYear)}-${slug(term)}`, schoolYear, term,
    startDate: settings.periodStartDate || `${schoolYear.slice(0, 4)}-08-01`,
    endDate: settings.periodEndDate || `${schoolYear.slice(5)}-05-31`,
    enrollmentStart: '', enrollmentEnd: '', status: 'active',
    createdAt: timestamp, createdBy: 'system', activatedAt: timestamp,
    activatedBy: 'system', history: [{ status: 'active', at: timestamp, actorId: 'system', actorRole: 'system', reason: 'Initial academic period' }]
  };
  store.migrate({ academicPeriods: [period], systemSettings: { ...settings, schoolYear, semester: term, currentAcademicPeriodId: period.id, academicPeriodStatus: 'active' } });
  return [period];
}
function belongs(record, periodId, currentId, examIds) {
  if (record?.academicPeriodId) return record.academicPeriodId === periodId;
  if (record?.examId && examIds.has(record.examId)) return true;
  return periodId === currentId;
}
function currentPeriod(store) {
  const periods = initialFromSettings(store);
  return periods.find(item => item.status === 'active') || null;
}
function identity(key, item, periodId) {
  if (key === 'sectionSubjects') return item.sectionId || item.id ? `section:${item.sectionId || item.id}:${periodId || ''}` : '';
  if (key === 'subjectAssignments') return item.subjectCode || item.id ? `subject:${item.subjectCode || item.id}:${periodId || ''}` : '';
  return String(item.id || '');
}
function normalizeOperationalWrite(store, key, next) {
  if (!ACTIVE_COLLECTIONS.includes(key)) return next;
  if (!Array.isArray(next)) bad(`${key} must be an array.`);
  const current = currentPeriod(store), existing = store.read(key, []);
  if (!Array.isArray(existing)) bad(`${key} is not an array in storage.`, 409);
  const periods = new Map(initialFromSettings(store).map(item => [item.id, item]));
  const old = new Map();
  for (const item of existing) {
    const periodId = item.academicPeriodId || current?.id || '';
    const id = identity(key, item, periodId);
    if (!id) bad(`${key} contains a record without an identity.`, 409);
    if (old.has(id)) bad(`${key} contains duplicate stored record identities.`, 409);
    old.set(id, item);
  }
  const seen = new Set();
  const normalized = next.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) bad(`${key} contains an invalid record.`);
    const periodId = item.academicPeriodId || current?.id || '';
    const id = identity(key, item, periodId), prior = old.get(id);
    if (!id || seen.has(id)) bad(`${key} contains a missing or duplicate record identity.`, 409);
    seen.add(id);
    if (prior) {
      const priorPeriod = periods.get(prior.academicPeriodId);
      if ((prior.periodStatus === 'closed' || prior.periodStatus === 'archived' || ['closed', 'archived'].includes(priorPeriod?.status)) && JSON.stringify(prior) !== JSON.stringify(item)) bad(`Historical ${key} records cannot be changed.`, 409);
      if (prior.academicPeriodId !== item.academicPeriodId) bad(`${key} records cannot be moved between academic periods.`, 409);
      if (prior.periodStatus !== item.periodStatus) bad(`${key} period status can only change through rollover.`, 409);
      if (JSON.stringify(prior) !== JSON.stringify(item) && !current) bad(`No active academic period is available for ${key} changes.`, 409);
      return item;
    }
    if (!current) bad(`No active academic period is available for new ${key} records.`, 409);
    if (item.academicPeriodId && item.academicPeriodId !== current.id) bad(`New ${key} records must belong to the active academic period.`, 409);
    if (item.periodStatus && item.periodStatus !== 'active') bad(`New ${key} records must be active.`, 409);
    return { ...item, academicPeriodId: current.id, periodStatus: 'active' };
  });
  for (const [id, item] of old) {
    const priorPeriod = periods.get(item.academicPeriodId);
    if ((item.periodStatus === 'closed' || item.periodStatus === 'archived' || ['closed', 'archived'].includes(priorPeriod?.status)) && !seen.has(id)) bad(`Historical ${key} records cannot be removed.`, 409);
  }
  return normalized;
}
function validateSettingsWrite(store, next) {
  if (!next || typeof next !== 'object' || Array.isArray(next)) bad('System settings must be an object.');
  const previous = store.read('systemSettings', {}) || {};
  for (const field of ['schoolYear', 'semester', 'currentAcademicPeriodId', 'academicPeriodStatus']) {
    if (next[field] !== previous[field]) bad(`Change ${field} through the academic-period workflow.`, 409);
  }
  return next;
}
function impact(store, id) {
  const periods = initialFromSettings(store), period = periods.find(item => item.id === id);
  if (!period) bad('Academic period not found.', 404);
  const settings = store.read('systemSettings', {}) || {}, currentId = settings.currentAcademicPeriodId || periods.find(item => item.status === 'active')?.id;
  const exams = store.read('exams', []), examIds = new Set(exams.filter(item => belongs(item, id, currentId, new Set())).map(item => item.id));
  const counts = {}, matching = {};
  for (const key of ACTIVE_COLLECTIONS) {
    const records = Array.isArray(store.read(key, [])) ? store.read(key, []) : [];
    matching[key] = records.filter(item => belongs(item, id, currentId, examIds));
    counts[key] = matching[key].length;
  }
  const pendingApprovals = matching.approvalRequests.filter(item => item.status === 'pending').length;
  const pendingGrading = matching.studentSubmissions.filter(item =>
    !item.gradedAt && !['graded', 'released'].includes(String(item.status || '').toLowerCase())
    && (item.status === 'pending-grading' || (Array.isArray(item.answers) && item.answers.some(answer => answer.needsManualGrading && answer.awarded == null)))
  ).length;
  return { period, counts, warnings: { pendingApprovals, pendingGrading }, canClose: period.status === 'active' };
}
function createService(store) {
  function list() { return initialFromSettings(store); }
  function create(input, session) {
    admin(session); const fields = normalizeInput(input), periods = list();
    if (periods.some(item => item.schoolYear === fields.schoolYear && item.term === fields.term)) bad('That academic period already exists.', 409);
    const timestamp = now(), period = { id: `AY-${slug(fields.schoolYear)}-${slug(fields.term)}`, ...fields, status: 'draft', createdAt: timestamp, createdBy: actorId(session), history: [{ status: 'draft', at: timestamp, actorId: actorId(session), actorRole: session.role, reason: String(input.reason || 'Academic period created') }] };
    store.migrate({ academicPeriods: [...periods, period], applicationAuditLog: audit(store.read('applicationAuditLog', []), session, 'create', period, null, input.reason) });
    return period;
  }
  function activate(id, session, reason) {
    admin(session); const periods = list(), index = periods.findIndex(item => item.id === id);
    if (index < 0) bad('Academic period not found.', 404);
    if (periods[index].status !== 'draft') bad('Only a draft academic period can be activated.', 409);
    if (periods.some(item => item.status === 'active')) bad('Close the current active academic period before activating another one.', 409);
    const previous = periods[index], timestamp = now();
    const period = { ...previous, status: 'active', activatedAt: timestamp, activatedBy: actorId(session), history: [...(previous.history || []), { status: 'active', at: timestamp, actorId: actorId(session), actorRole: session.role, reason: String(reason || 'Academic period activated') }] };
    periods[index] = period;
    const settings = store.read('systemSettings', {}) || {};
    store.migrate({ academicPeriods: periods, systemSettings: { ...settings, schoolYear: period.schoolYear, semester: period.term, currentAcademicPeriodId: period.id, academicPeriodStatus: 'active' }, applicationAuditLog: audit(store.read('applicationAuditLog', []), session, 'activate', period, previous, reason) });
    return period;
  }
  function transition(id, status, reason, session) {
    admin(session); reason = String(reason || '').trim(); if (!reason) bad(`A reason is required to ${status === 'closed' ? 'close' : 'archive'} an academic period.`);
    const periods = list(), index = periods.findIndex(item => item.id === id);
    if (index < 0) bad('Academic period not found.', 404);
    const required = status === 'closed' ? 'active' : 'closed';
    if (periods[index].status !== required) bad(`Only a ${required} academic period can be ${status}.`, 409);
    const previous = periods[index], timestamp = now(), report = impact(store, id);
    const period = { ...previous, status, [`${status}At`]: timestamp, [`${status}By`]: actorId(session), [`${status}Reason`]: reason, impactSummary: report.counts, history: [...(previous.history || []), { status, at: timestamp, actorId: actorId(session), actorRole: session.role, reason }] };
    periods[index] = period;
    const settings = store.read('systemSettings', {}) || {}, currentId = settings.currentAcademicPeriodId || id;
    const exams = store.read('exams', []), examIds = new Set(exams.filter(item => belongs(item, id, currentId, new Set())).map(item => item.id));
    const records = { academicPeriods: periods };
    for (const key of ACTIVE_COLLECTIONS) {
      const values = store.read(key, []);
      if (Array.isArray(values)) records[key] = values.map(item => belongs(item, id, currentId, examIds) ? { ...item, academicPeriodId: id, periodStatus: status, archivedAt: timestamp } : item);
    }
    records.systemSettings = { ...settings, currentAcademicPeriodId: status === 'closed' ? null : settings.currentAcademicPeriodId, academicPeriodStatus: status === 'closed' ? 'closed' : settings.academicPeriodStatus };
    records.applicationAuditLog = audit(store.read('applicationAuditLog', []), session, status === 'closed' ? 'close' : 'archive', period, previous, reason, { impact: report.counts, warnings: report.warnings });
    store.migrate(records);
    return { period, impact: report };
  }
  function recordsForPeriod(key, id) {
    const periods = list(), settings = store.read('systemSettings', {}) || {}, currentId = settings.currentAcademicPeriodId || periods.find(item => item.status === 'active')?.id;
    const exams = store.read('exams', []), examIds = new Set(exams.filter(item => belongs(item, id, currentId, new Set())).map(item => item.id));
    const records = store.read(key, []); return Array.isArray(records) ? records.filter(item => belongs(item, id, currentId, examIds)) : [];
  }
  function activeRecords(key) { const period = list().find(item => item.status === 'active'); return period ? recordsForPeriod(key, period.id).filter(item => item.periodStatus !== 'closed' && item.periodStatus !== 'archived') : []; }
  return { list, create, activate, close: (id, reason, session) => transition(id, 'closed', reason, session), archive: (id, reason, session) => transition(id, 'archived', reason, session), impact: id => impact(store, id), recordsForPeriod, activeRecords };
}

module.exports = { createAcademicPeriodService: createService, initialFromSettings, normalizeOperationalWrite, validateSettingsWrite, TERMS, STATUSES, ACTIVE_COLLECTIONS };
