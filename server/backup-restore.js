'use strict';

const ALLOWED = new Set([
  'users', 'faculty', 'students', 'subjects', 'curricula', 'academicPeriods',
  'sections', 'sectionSubjects', 'studentEnrollments', 'subjectAssignments',
  'allotments', 'exams', 'questions', 'studentSubmissions', 'approvalRequests',
  'notifications', 'applicationAuditLog', 'questionReports',
  'adminAnnouncements', 'studentEmails', 'studentNotifications',
  'subjectWorkspaceContent', 'systemSettings'
]);
const ARRAY_COLLECTIONS = new Set([...ALLOWED].filter(key => key !== 'systemSettings'));
const PERIOD_COLLECTIONS = new Set([
  'sectionSubjects', 'studentEnrollments', 'subjectAssignments', 'exams',
  'questions', 'studentSubmissions', 'approvalRequests'
]);
const PERIOD_STATUSES = new Set(['draft', 'active', 'closed', 'archived']);

function bad(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
function plainObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }

function validateBackup(backup) {
  if (!plainObject(backup) || backup.format !== 'neu-online-examination-backup' || backup.version !== 1 || !plainObject(backup.records)) bad('That file is not a supported Online Examination backup.');
  const entries = Object.entries(backup.records);
  if (!entries.length) bad('The backup does not contain any records.');
  for (const [key, value] of entries) {
    if (!ALLOWED.has(key)) bad(`The backup contains an unsupported collection: ${key}.`);
    if (ARRAY_COLLECTIONS.has(key) && !Array.isArray(value)) bad(`${key} must be an array in the backup.`);
    if (key === 'systemSettings' && !plainObject(value)) bad('systemSettings must be an object in the backup.');
  }
  const periods = backup.records.academicPeriods;
  if (periods !== undefined) {
    if (!backup.records.systemSettings) bad('A period backup must include systemSettings.');
    const ids = new Set();
    for (const period of periods) {
      if (!plainObject(period) || !period.id || ids.has(period.id) || !PERIOD_STATUSES.has(period.status)) bad('The backup contains an invalid or duplicate academic period.');
      ids.add(period.id);
    }
    const active = periods.filter(period => period.status === 'active');
    if (active.length > 1) bad('A backup cannot contain more than one active academic period.');
    const currentId = backup.records.systemSettings.currentAcademicPeriodId || null;
    if ((active[0]?.id || null) !== currentId) bad('The backup current-period setting does not match its active academic period.');
    for (const key of PERIOD_COLLECTIONS) {
      const records = backup.records[key];
      if (!records) continue;
      for (const record of records) {
        if (record.academicPeriodId && !ids.has(record.academicPeriodId)) bad(`${key} references an academic period that is not present in the backup.`);
        const period = periods.find(item => item.id === record.academicPeriodId);
        if (period && record.periodStatus && record.periodStatus !== period.status) bad(`${key} has a period status that does not match its academic period.`);
      }
    }
  }
  return Object.fromEntries(entries);
}

function createBackupRestoreService(store) {
  function restore(backup, session) {
    if (!session || session.role !== 'admin') bad('Only an Administrator can restore a backup.', 403);
    const records = validateBackup(backup);
    const audit = Array.isArray(records.applicationAuditLog) ? [...records.applicationAuditLog] : [...(store.read('applicationAuditLog', []) || [])];
    audit.push({
      id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(), actorId: session.username, actorRole: session.role,
      action: 'restore', entityType: 'backup', entityId: 'system',
      category: 'maintenance', result: 'success', reason: 'Protected backup restore',
      previousValue: null, newValue: null,
      details: { createdAt: backup.createdAt || '', collections: Object.keys(records).length }
    });
    records.applicationAuditLog = audit;
    store.migrate(records);
    return { ok: true, restoredCollections: Object.keys(records).length, createdAt: backup.createdAt || '' };
  }
  return { restore };
}

module.exports = { createBackupRestoreService, validateBackup, ALLOWED };
