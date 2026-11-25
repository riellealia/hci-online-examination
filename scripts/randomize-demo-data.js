'use strict';
/* Makes the demo roster look like a real college instead of a grid of identical
   numbers: section sizes vary by program, year level (attrition) and section,
   some students are irregular (missing one or two subjects), Professors carry
   different loads (new Professors are hired to absorb the rest), and generated
   placeholder names are replaced with varied ones.

   Works against Supabase: pulls the latest data first, writes the result back,
   and waits for every change to reach Supabase. Without Supabase credentials it
   only changes the local SQLite cache.

   Never touched: anyone with real activity (submissions, emails, reports,
   content views, inbox, role assignments, approvals), the documented demo
   accounts, Maria Reyes' 19 offerings, and offerings that already have exams.

   Env: DRY_RUN=1 prints the summary without writing. SEED=<n> repeats a run. */
const fs = require('fs');
const path = require('path');
const { openDatabase } = require('../server/database');
const { createSupabaseReplicatedStore } = require('../server/supabase-replica');

const ROOT = path.join(__dirname, '..');
function readEnvFile(file) { try { return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#') && l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })); } catch { return {}; } }
const env = { ...readEnvFile(path.join(ROOT, '.env')), ...process.env };
const DB_FILE = env.SQLITE_PATH || path.join(ROOT, 'data', 'neu-examination.sqlite');
const DRY = /^(1|true|yes)$/i.test(env.DRY_RUN || '');
const SEED = Number(env.SEED) || Math.floor(Math.random() * 2 ** 31);

// Seeded PRNG so a run can be reproduced with SEED=...
let s = SEED >>> 0;
const rand = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = list => list[Math.floor(rand() * list.length)];
const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += rand(); return (u - 3) / Math.sqrt(0.5); }; // ~N(0,1)
const shuffle = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const weighted = table => { let r = rand() * table.reduce((n, [, w]) => n + w, 0); for (const [v, w] of table) if ((r -= w) < 0) return v; return table[table.length - 1][0]; };

const LAST = ['Abad','Aguilar','Alcantara','Alvarez','Andrada','Aquino','Arceo','Austria','Bacani','Baltazar','Bautista','Belmonte','Bernal','Buenaventura','Cabanatan','Cajucom','Calderon','Castillo','Castro','Chua','Concepcion','Corpuz','Cruz','Cuenca','Dalisay','David','De Guzman','De la Paz','De los Reyes','Del Rosario','Delos Santos','Diaz','Dimaculangan','Domingo','Dizon','Enriquez','Espiritu','Esguerra','Fajardo','Fernandez','Flores','Francisco','Gabriel','Galang','Garcia','Gatchalian','Gonzales','Gomez','Guevarra','Gutierrez','Hernandez','Ilagan','Jimenez','Lacson','Lagman','Lim','Lopez','Lualhati','Macaraeg','Magbanua','Magno','Malabanan','Manalastas','Manalo','Mangubat','Marasigan','Medina','Mendoza','Miranda','Morales','Nacpil','Navarro','Nepomuceno','Ong','Ortiz','Pangilinan','Panganiban','Perez','Policarpio','Quiambao','Quisumbing','Ramirez','Ramos','Reyes','Rivera','Robles','Rodriguez','Roxas','Salvador','Sanchez','Santiago','Santos','Sarmiento','Serrano','Sison','Soriano','Sy','Tan','Tiongson','Torres','Tuazon','Valenzuela','Vasquez','Villanueva','Villareal','Yambao','Yu','Zamora'];
const FIRST = ['Aaliyah','Adrian','Aira','Alexa','Allen','Althea','Andrei','Angelo','Angelica','Anika','Arvin','Bea','Bianca','Carl','Carmela','Cedric','Charles','Christine','Clarisse','Daniel','Danica','Darren','Denise','Dominic','Elaine','Elijah','Erika','Ethan','Francine','Gabriel','Gian','Hannah','Ian','Isabel','Jace','Jairus','Jamie','Janelle','Jasper','Jericho','Jessa','John Paul','Joshua','Julia','Justine','Kate','Kayla','Kenneth','Kevin','Kim','Kristine','Kyle','Lance','Lea','Louise','Lyka','Marco','Mariel','Mark','Matthew','Mikaela','Miguel','Nathan','Nicole','Noah','Patricia','Paolo','Pia','Rafael','Raven','Renz','Rhea','Rica','Ryan','Samantha','Sean','Shaira','Sofia','Stephanie','Trisha','Tristan','Vince','Yna','Zach','Zoe'];
const PROF_FIRST = ['Amelia','Antonio','Arnel','Carmelita','Cecilia','Danilo','Editha','Eduardo','Elmer','Erlinda','Felipe','Florante','Gemma','Gerardo','Imelda','Jocelyn','Jonathan','Leonora','Lorna','Manuel','Marites','Melchor','Noel','Ofelia','Perla','Reynaldo','Rodel','Rosario','Rowena','Teodoro','Virgilio','Wilma'];
const passwordName = value => String(value).toLowerCase().replace(/\s+/g, '');

(async () => {
  const local = openDatabase(DB_FILE);
  const store = createSupabaseReplicatedStore(local, { url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY, relational: String(env.SUPABASE_RELATIONAL || 'true').toLowerCase() !== 'false' });
  const hydration = await store.hydrate();
  console.log(`Supabase: ${hydration.enabled ? `pulled ${hydration.hydrated} collections` : 'not configured (local SQLite only)'} · seed ${SEED}`);
  if (!DRY) {
    const dir = path.join(ROOT, 'data', 'backups'); fs.mkdirSync(dir, { recursive: true });
    const target = path.join(dir, `neu-examination.pre-randomize-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
    local.raw.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`); console.log(`Backup: ${target}`);
  }

  const all = store.all(), read = key => Array.isArray(all[key]) ? all[key] : [];
  const sections = read('sections'), records = read('sectionSubjects').map(r => ({ ...r, assignments: (r.assignments || []).map(a => ({ ...a })) }));
  let students = read('students').map(x => ({ ...x })), users = read('users').map(x => ({ ...x })), faculty = read('faculty').map(x => ({ ...x }));
  const oldEnrollments = read('studentEnrollments'), exams = read('exams');

  // Anyone mentioned outside the roster tables has real activity: keep them exactly as they are.
  const rosterKeys = new Set(['students', 'users', 'studentEnrollments', 'faculty', 'sectionSubjects', 'subjectAssignments', 'exams', 'applicationAuditLog']);
  const mentioned = new Set();
  for (const [key, value] of Object.entries(all)) if (!rosterKeys.has(key)) for (const m of JSON.stringify(value).match(/\b\d{4}-\d{5}\b|\b\d\d-\d{5}-\d{3}\b/g) || []) mentioned.add(m);
  const fixedIds = new Set([env.STUDENT_USERNAME || '2025-00002', env.PROFESSOR_USERNAME || '23-32534-345']);
  const protectedStudent = id => fixedIds.has(id) || mentioned.has(id);

  /* ---------- students per section ---------- */
  const programWeight = { BSIT: 1.2, BSCS: 1.0, BSGAMEDEV: 0.85, BSANIMATION: 0.78, BSIS: 0.68 };
  const yearWeight = { 1: 1.0, 2: 0.86, 3: 0.75, 4: 0.66 };
  const sectionWeight = { 1: 1.06, 2: 0.98, 3: 0.84 };
  const yearOf = new Map(sections.map(x => [x.id, Number(x.yearLevel) || Number(String(x.id)[0]) || 1]));
  const bySection = new Map(sections.map(x => [x.id, []])); students.forEach(st => { const sec = (st.sections || [])[0]; if (bySection.has(sec)) bySection.get(sec).push(st); });
  const taken = new Set(students.map(x => x.id)), removed = new Set(), added = [];
  const newStudentId = year => { let id; do id = `${2027 - year}-${String(between(1000, 99999)).padStart(5, '0')}`; while (taken.has(id)); taken.add(id); return id; };
  const usedNames = new Set(students.map(x => `${x.last}|${x.first}`));
  const randomName = () => { let n; do n = { last: pick(LAST), first: pick(FIRST), middle: rand() < 0.88 ? String.fromCharCode(65 + Math.floor(rand() * 26)) : '' }; while (usedNames.has(`${n.last}|${n.first}`)); usedNames.add(`${n.last}|${n.first}`); return n; };

  for (const section of sections) {
    const roster = bySection.get(section.id), cap = Number(section.capacity) || 50, keep = roster.filter(x => protectedStudent(x.id)).length;
    const base = 40 * (programWeight[section.program] || 0.9) * (yearWeight[yearOf.get(section.id)] || 0.8) * (sectionWeight[Number(section.sectionNumber)] || 0.9);
    const target = Math.max(keep, Math.min(cap, Math.max(12, Math.round(base * (1 + 0.16 * gauss())))));
    for (const st of shuffle(roster.filter(x => !protectedStudent(x.id))).slice(0, Math.max(0, roster.length - target))) removed.add(st.id);
    for (let i = roster.length; i < target; i++) { const st = { id: newStudentId(yearOf.get(section.id)), ...randomName(), sections: [section.id] }; added.push(st); }
  }
  // Replace generated placeholder names ("Aaron A." etc.) on the untouched students.
  let renamed = 0;
  students = students.filter(x => !removed.has(x.id)).map(st => {
    if (protectedStudent(st.id) || !/^[A-Za-z]+ [A-Z]\.$/.test(st.first || '')) return st;
    usedNames.delete(`${st.last}|${st.first}`); renamed++; return { ...st, ...randomName() };
  });
  students.push(...added);
  const studentById = new Map(students.map(x => [x.id, x]));

  /* ---------- enrollments (some students irregular) ---------- */
  const offersBySection = new Map(records.map(r => [r.sectionId, r.assignments]));
  const enrollments = oldEnrollments.filter(e => studentById.has(e.studentId) && protectedStudent(e.studentId));
  let irregular = 0;
  for (const st of students) {
    if (protectedStudent(st.id)) continue;
    const sec = st.sections[0]; let offers = offersBySection.get(sec) || [];
    if (offers.length > 3 && rand() < 0.07) { irregular++; const drop = new Set(shuffle(offers).slice(0, rand() < 0.7 ? 1 : 2).map(o => o.id)); offers = offers.filter(o => !drop.has(o.id)); }
    offers.forEach((o, i) => enrollments.push({ id: `ENR-${st.id}-${i + 1}`, studentId: st.id, offeringId: o.id, subjectCode: o.subjectCode, sectionId: sec }));
  }

  /* ---------- users ---------- */
  users = users.filter(u => !(u.role === 'student' && removed.has(u.username))).map(u => {
    const st = u.role === 'student' && studentById.get(u.username);
    return st && !protectedStudent(st.id) ? { ...u, password: passwordName(st.last) + yearOf.get(st.sections[0]) } : u;
  });
  const knownUsers = new Set(users.map(u => u.username));
  for (const st of added) if (!knownUsers.has(st.id)) users.push({ username: st.id, password: passwordName(st.last) + yearOf.get(st.sections[0]), role: 'student', status: 'active' });

  /* ---------- professor loads ---------- */
  const offers = records.flatMap(r => r.assignments.map(a => ({ a, sectionId: r.sectionId })));
  const reyesId = env.PROFESSOR_USERNAME || '23-32534-345';
  const locked = ({ a, sectionId }) => a.facultyId === reyesId || exams.some(e => e.facultyId === a.facultyId && e.subjectCode === a.subjectCode && (!Array.isArray(e.sections) || !e.sections.length || e.sections.includes(sectionId)));
  const loadTable = [[2, 10], [3, 16], [4, 24], [5, 26], [6, 24]];
  const released = [];
  for (const prof of faculty) {
    if (prof.id === reyesId) continue;
    const mine = offers.filter(o => o.a.facultyId === prof.id), target = weighted(loadTable);
    const free = shuffle(mine.filter(o => !locked(o)));
    for (const o of free.slice(0, Math.max(0, mine.length - target))) { o.a.facultyId = ''; released.push(o); }
  }
  const mins = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + m; };
  const clash = (x, y) => { const p = x.a.schedule, q = y.a.schedule; if (!p || !q) return false; return (p.days || []).some(d => (q.days || []).includes(d)) && mins(p.start) < mins(q.end) && mins(q.start) < mins(p.end); };
  const facultyIds = new Set(faculty.map(f => f.id)), hires = [];
  const newFacultyId = () => { let id; do id = `${between(10, 24)}-${between(10000, 99999)}-${String(between(100, 999))}`; while (facultyIds.has(id)); facultyIds.add(id); return id; };
  let queue = shuffle(released);
  while (queue.length) {
    const prof = { id: newFacultyId(), last: pick(LAST), first: pick(PROF_FIRST) }, target = weighted(loadTable), mine = [];
    queue = queue.filter(o => { if (mine.length < target && !mine.some(m => clash(m, o))) { o.a.facultyId = prof.id; mine.push(o); return false; } return true; });
    if (!mine.length) throw new Error('Could not place a released offering without a schedule clash.');
    faculty.push(prof); hires.push(prof);
    const year = yearOf.get(mine[0].sectionId) || 1;
    if (!knownUsers.has(prof.id)) users.push({ username: prof.id, password: passwordName(prof.last) + year, role: 'faculty', status: 'active' });
  }
  const subjectAssignments = read('subjectAssignments').map(r => ({ ...r, facultyIds: [...new Set(offers.filter(o => o.a.subjectCode === r.subjectCode).map(o => o.a.facultyId))] }));

  /* ---------- summary ---------- */
  const sizes = sections.map(x => students.filter(st => st.sections[0] === x.id).length);
  const perYear = [1, 2, 3, 4].map(y => students.filter(st => yearOf.get(st.sections[0]) === y).length);
  const perOffer = new Map(); enrollments.forEach(e => perOffer.set(e.offeringId, (perOffer.get(e.offeringId) || 0) + 1));
  const loads = new Map(); offers.forEach(o => loads.set(o.a.facultyId, (loads.get(o.a.facultyId) || 0) + 1));
  const hist = values => Object.entries(values.reduce((m, v) => (m[v] = (m[v] || 0) + 1, m), {})).map(([k, n]) => `${k}×${n}`).join(' ');
  console.log(JSON.stringify({
    students: `${read('students').length} → ${students.length} (+${added.length} new, −${removed.size} removed, ${renamed} renamed, ${irregular} irregular)`,
    perYear: Object.fromEntries(perYear.map((n, i) => [`Year ${i + 1}`, n])),
    perProgram: Object.fromEntries(Object.keys(programWeight).map(p => [p, students.filter(st => st.sections[0]?.includes(p + '-')).length])),
    sectionSize: { min: Math.min(...sizes), max: Math.max(...sizes), sample: sizes.slice(0, 12).join(', ') },
    studentsPerOffering: { min: Math.min(...perOffer.values()), max: Math.max(...perOffer.values()), distinct: new Set(perOffer.values()).size },
    professors: `${read('faculty').length} → ${faculty.length} (+${hires.length} hired)`,
    professorLoads: hist([...loads].filter(([id]) => id !== reyesId).map(([, n]) => n)),
    enrollments: `${oldEnrollments.length} → ${enrollments.length}`
  }, null, 2));

  if (DRY) { console.log('DRY_RUN: nothing written.'); store.close(); return; }
  store.migrate({ students, users, faculty, studentEnrollments: enrollments, sectionSubjects: records, subjectAssignments });
  console.log('Writing to Supabase…');
  const ok = await store.flush(); const status = store.status();
  console.log(ok ? 'Done: Supabase and the local cache are updated.' : `Supabase write failed: ${status.lastError || 'see status'}`, status.enabled ? '' : '(Supabase not configured)');
  store.close(); if (!ok) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
