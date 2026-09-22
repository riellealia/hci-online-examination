'use strict';

const crypto = require('crypto');
const COUNTS = Object.freeze({ student: 3140, faculty: 280, coordinator: 28, dean: 5 });
const TARGET = Object.values(COUNTS).reduce((sum, count) => sum + count, 0);
const STUDENT_STATUSES = [
  ['active', 1600], ['deactivated', 260], ['archived', 300],
  ['graduated', 600], ['transferred', 380]
];
const FIRST = ['Andrea', 'Beatriz', 'Carlos', 'Diana', 'Elijah', 'Faith', 'Gabriel', 'Hannah', 'Isaac', 'Julia', 'Katrina', 'Lorenzo', 'Mika', 'Nathan', 'Olivia', 'Paolo', 'Queenie', 'Rafael', 'Sofia', 'Tristan', 'Uma', 'Vincent', 'Yna', 'Zachary'];
const LAST = ['Abad', 'Aguilar', 'Bautista', 'Cabrera', 'Castillo', 'Cruz', 'De Leon', 'Del Rosario', 'Diaz', 'Domingo', 'Flores', 'Garcia', 'Gomez', 'Herrera', 'Lim', 'Lopez', 'Mendoza', 'Navarro', 'Ocampo', 'Pascual', 'Ramos', 'Reyes', 'Santos', 'Torres', 'Villanueva', 'Yu'];
const HISTORY_ACTORS = ['admin', 'coordinator.demo', 'dean.demo'];
const title = value => value[0].toUpperCase() + value.slice(1);
const name = index => ({ first: FIRST[index % FIRST.length], last: LAST[Math.floor(index / FIRST.length) % LAST.length] });
const createdAt = (role, index) => `${role === 'student' ? 2022 + index % 5 : 2018 + index % 9}-06-01T08:00:00+08:00`;
const statusForStudent = index => { let offset = index; for (const [status, count] of STUDENT_STATUSES) { if (offset < count) return status; offset -= count; } throw new Error('Student status distribution is incomplete.'); };
const statusForStaff = (role, index) => role === 'faculty' ? index < 240 ? 'active' : index < 260 ? 'deactivated' : 'archived'
  : role === 'coordinator' ? index < 24 ? 'active' : index < 26 ? 'deactivated' : 'archived'
    : index < 4 ? 'active' : 'archived';
function demoHistory(id, index, status) {
  const day = String(2 + index % 19).padStart(2, '0'), hour = String(8 + index % 8).padStart(2, '0');
  const at = `2026-09-${day}T${hour}:15:00+08:00`;
  const actorId = HISTORY_ACTORS[index % HISTORY_ACTORS.length];
  return [{ at, actorId, from: 'Profile', to: 'Demo profile updated', reason: 'Seeded sample history', source: 'demo' },
    ...(status !== 'active' ? [{ at: `2026-09-${String(21 + index % 2).padStart(2, '0')}T10:30:00+08:00`, actorId: 'admin', from: 'Active', to: title(status), reason: 'Seeded sample lifecycle transition', source: 'demo' }] : [])];
}
function prepare(store) {
  const read = key => { const value = store.read(key, []); if (!Array.isArray(value)) throw new Error(`${key} must be an array.`); return value; };
  const users = read('users'), students = read('students'), faculty = read('faculty'), coordinators = read('coordinators');
  const sections = read('sections'), sectionSubjects = read('sectionSubjects'), studentEnrollments = read('studentEnrollments');
  const current = store.read('systemSettings', {}) || {}, periodId = current.currentAcademicPeriodId || '';
  const generated = users.filter(user => user.lifecycleDemoSeed === 'v1');
  if (generated.length) {
    if (generated.length !== TARGET) throw new Error(`Partial lifecycle demo seed found (${generated.length}/${TARGET}); no records changed.`);
    return { alreadyApplied: true, added: 0, total: users.length };
  }
  const known = new Set(users.map(item => item.username));
  const check = id => { if (known.has(id)) throw new Error(`Account ${id} already exists; no records changed.`); known.add(id); };
  const assigned = new Map(sections.map(section => [section.id, new Set(students.filter(item => (item.sections || []).includes(section.id)).map(item => item.id))]));
  const activeSections = sections.filter(section => section.id && (sectionSubjects.find(record => record.sectionId === section.id)?.assignments || []).length);
  if (!activeSections.length) throw new Error('No first-semester section offerings are available.');
  const remaining = activeSections.reduce((sum, section) => sum + Math.max(0, Number(section.capacity || 50) - assigned.get(section.id).size), 0);
  if (remaining < 1600) throw new Error(`Only ${remaining} section places remain; need 1,600. No records changed.`);
  const newUsers = [], newStudents = [], newFaculty = [], newCoordinators = [], newEnrollments = [];
  for (let index = 0; index < COUNTS.student; index++) {
    const id = `DEMO-ST-${String(index + 1).padStart(5, '0')}`; check(id);
    const status = statusForStudent(index), person = name(index), active = status === 'active';
    let section = null;
    if (active) {
      section = activeSections.filter(item => assigned.get(item.id).size < Number(item.capacity || 50))
        .sort((a, b) => assigned.get(a.id).size - assigned.get(b.id).size || a.id.localeCompare(b.id))[0];
      if (!section) throw new Error('Section capacity was exhausted before all active students were assigned.');
      assigned.get(section.id).add(id);
      const offerings = sectionSubjects.find(item => item.sectionId === section.id)?.assignments || [];
      offerings.forEach((offer, order) => newEnrollments.push({ id: `DEMO-LIFE-ENR-${id}-${order + 1}`, studentId: id, sectionId: section.id, offeringId: offer.id, subjectCode: offer.subjectCode, ...(periodId ? { academicPeriodId: periodId } : {}) }));
    }
    newStudents.push({ id, ...person, createdAt: createdAt('student', index), yearLevel: section?.yearLevel || (index % 4) + 1, sections: section ? [section.id] : [], lifecycleDemoSeed: 'v1' });
    newUsers.push({ username: id, password: crypto.randomBytes(24).toString('hex'), role: 'student', createdAt: createdAt('student', index), status, lifecycleStatus: title(status), disabled: !active, lifecycleHistory: demoHistory(id, index, status), lifecycleDemoSeed: 'v1' });
  }
  for (const role of ['faculty', 'coordinator', 'dean']) {
    for (let index = 0; index < COUNTS[role]; index++) {
      const id = `DEMO-${role === 'faculty' ? 'PROF' : role === 'coordinator' ? 'COORD' : 'DEAN'}-${String(index + 1).padStart(4, '0')}`; check(id);
      const status = statusForStaff(role, index), person = name(index + 5000 + (role === 'coordinator' ? 1000 : role === 'dean' ? 2000 : 0));
      newUsers.push({ username: id, password: crypto.randomBytes(24).toString('hex'), role, ...person, createdAt: createdAt(role, index), status, lifecycleStatus: title(status), disabled: status !== 'active', lifecycleHistory: demoHistory(id, index + 3200, status), lifecycleDemoSeed: 'v1' });
      const profile = { id, ...person, createdAt: createdAt(role, index), lifecycleDemoSeed: 'v1' };
      if (role === 'faculty') newFaculty.push(profile);
      if (role === 'coordinator') newCoordinators.push({ ...profile, username: id, role, status, college: 'College of Information and Computer Studies' });
    }
  }
  if (newUsers.length !== TARGET) throw new Error('Generated account count does not match the requested 3,453.');
  const existingWithHistory = users.map((user, index) => {
    if (Array.isArray(user.lifecycleHistory) && user.lifecycleHistory.length) return user;
    const status = user.disabled ? 'deactivated' : String(user.status || 'active').toLowerCase();
    return { ...user, lifecycleHistory: demoHistory(user.username, index + 7000, status) };
  });
  return { alreadyApplied: false, added: TARGET, total: users.length + TARGET,
    records: { users: [...existingWithHistory, ...newUsers], students: [...students, ...newStudents], faculty: [...faculty, ...newFaculty], coordinators: [...coordinators, ...newCoordinators], studentEnrollments: [...studentEnrollments, ...newEnrollments] },
    summary: { students: newStudents.length, professors: newFaculty.length, coordinators: newCoordinators.length, deans: COUNTS.dean, firstSemesterEnrollments: newEnrollments.length } };
}
module.exports = { prepare, COUNTS, TARGET };
