'use strict';

const path = require('path');
const { openDatabase } = require('../server/database');
const { createAcademicPeriodService } = require('../server/academic-periods');

const filename = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'neu-examination.sqlite');
const store = openDatabase(filename);
const periods = createAcademicPeriodService(store);
const actor = { username: 'system', role: 'admin' };
const drafts = [
  { schoolYear: '2026-2027', term: 'Second Semester', startDate: '2027-01-04', endDate: '2027-05-31' },
  { schoolYear: '2026-2027', term: 'Summer', startDate: '2027-06-03', endDate: '2027-07-30' }
];
const mistakenDrafts = new Map([
  ['First Semester', ['2027-08-07', '2027-12-31']],
  ['Second Semester', ['2028-01-04', '2028-05-31']],
  ['Summer', ['2028-06-03', '2028-07-30']]
]);

function audit(action, period, previousValue, reason) {
  return {
    id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(), actorId: 'system', actorRole: 'system',
    action, entityType: 'academic-period', entityId: period.id,
    category: 'academic setup', result: 'success', reason,
    previousValue, newValue: action === 'remove-mistaken-draft' ? null : period,
    academicPeriod: period.id, details: {}
  };
}

try {
  const existing = periods.list();
  const current = existing.find(item => item.schoolYear === '2026-2027' && item.term === 'First Semester');
  if (!current || current.status !== 'active') throw new Error('Expected the current 2026-2027 First Semester to be active. No dates were changed.');
  if (current.startDate !== '2026-08-07' || current.endDate !== '2026-12-31') {
    if (current.startDate !== '2026-08-01' || current.endDate !== '2027-05-31') throw new Error('The active First Semester dates have changed unexpectedly. No dates were changed.');
  }
  for (const draft of drafts) {
    const match = existing.find(item => item.schoolYear === draft.schoolYear && item.term === draft.term);
    if (match && (match.status !== 'draft' || match.startDate !== draft.startDate || match.endDate !== draft.endDate)) throw new Error(`Existing ${draft.term} differs from the requested draft. No dates were changed.`);
  }
  const misplaced = existing.filter(item => item.schoolYear === '2027-2028' && mistakenDrafts.has(item.term));
  for (const item of misplaced) {
    const [startDate, endDate] = mistakenDrafts.get(item.term);
    if (item.status !== 'draft' || item.createdBy !== 'system' || item.history?.[0]?.reason !== 'Seeded upcoming academic-year draft' || item.startDate !== startDate || item.endDate !== endDate) throw new Error(`2027-2028 ${item.term} is not the draft previously seeded by this script. No dates were changed.`);
  }
  const changedCurrent = current.startDate !== '2026-08-07' || current.endDate !== '2026-12-31';
  if (changedCurrent || misplaced.length) {
    const at = new Date().toISOString();
    const corrected = changedCurrent ? { ...current, startDate: '2026-08-07', endDate: '2026-12-31', history: [...(current.history || []), { status: 'active', at, actorId: 'system', actorRole: 'system', reason: 'Corrected First Semester dates for school year 2026-2027' }] } : current;
    const kept = existing.filter(item => !misplaced.includes(item)).map(item => item.id === current.id ? corrected : item);
    const auditLog = store.read('applicationAuditLog', []);
    store.migrate({ academicPeriods: kept, applicationAuditLog: [...auditLog, ...(changedCurrent ? [audit('correct-dates', corrected, current, 'Corrected First Semester dates for school year 2026-2027')] : []), ...misplaced.map(item => audit('remove-mistaken-draft', item, item, 'Removed draft seeded for the wrong school year'))] });
    if (changedCurrent) console.log('Corrected active 2026-2027 First Semester: 2026-08-07–2026-12-31.');
    if (misplaced.length) console.log(`Removed ${misplaced.length} mistakenly seeded 2027-2028 drafts; correction retained in audit history.`);
  }
  for (const draft of drafts) {
    const existing = periods.list().find(item => item.schoolYear === draft.schoolYear && item.term === draft.term);
    if (existing) {
      console.log(`Skipped ${draft.term}: already ${existing.status}.`);
      continue;
    }
    const created = periods.create({ ...draft, reason: 'Seeded upcoming academic-year draft' }, actor);
    console.log(`Created ${created.schoolYear} ${created.term}: ${created.startDate}–${created.endDate}.`);
  }
} finally {
  store.close();
}
