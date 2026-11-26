'use strict';

/* Seed realistic examination results for the demo Professor's subjects.

   For every subject the demo Professor teaches in the active academic period:
     - make sure there are five examinations (existing ones are kept; missing
       ones are added as past, published exams covering all of the subject's
       sections, with their own questions);
     - give every enrolled student a result for each of those exams:
       about 8% miss the exam, ~15% fail, ~62% pass and ~15% finish
       exceptionally (95–100%). Each student has a stable ability level, so
       strong students stay strong across exams.

   Re-running replaces only what this script generated (ids starting with
   DRX- for exams/questions and DRS- for submissions); genuine submissions are never touched.

   Usage:
     node scripts/seed-exam-results-demo.js            dry run (no writes)
     node scripts/seed-exam-results-demo.js --apply    write SQLite + Supabase
     node scripts/seed-exam-results-demo.js --fill-existing --apply
       Append varied demo results to Maria Reyes's existing closed exams.

   With Supabase configured in .env, --apply first backs up SQLite, pulls the
   latest Supabase data (as the server does on startup), then writes the new
   records to both SQLite and Supabase. */

const fs = require('fs');
const path = require('path');
const { openDatabase } = require('../server/database');
const { createSupabaseReplicatedStore } = require('../server/supabase-replica');

const ROOT = path.join(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const FILL_EXISTING = process.argv.includes('--fill-existing');
const EXAMS_PER_SUBJECT = 5;
// Short prefixes keep the browser's localStorage copy of the data small.
const EXAM_PREFIX = 'DRX-';
const SUBMISSION_PREFIX = 'DRS-';
const FIRST_NEW_EXAM_DATE = '2026-09-21';
const NEW_EXAM_LABELS = ['Diagnostic Quiz', 'Quiz 2', 'Long Quiz', 'Midterm Examination', 'Unit Test'];

function readEnvFile(filename) {
  try {
    return Object.fromEntries(fs.readFileSync(filename, 'utf8').split(/\r?\n/).map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => { const index = line.indexOf('='); return [line.slice(0, index).trim(), line.slice(index + 1).trim()]; }));
  } catch (_) { return {}; }
}
const env = { ...readEnvFile(path.join(ROOT, '.env')), ...process.env };
const DB_FILE = env.SQLITE_PATH || path.join(ROOT, 'data', 'neu-examination.sqlite');
const PROFESSOR_ID = process.argv.find(arg => arg.startsWith('--professor='))?.slice(12) || env.PROFESSOR_USERNAME || '23-32534-345';

/* Deterministic pseudo-random numbers so re-runs produce the same data. */
function hash(text) {
  let h = 2166136261;
  for (const ch of String(text)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; // avalanche
  return (h >>> 0) / 4294967296;
}
const between = (seed, low, high) => low + hash(seed) * (high - low);
const addDays = (key, days) => { const date = new Date(`${key}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };
const minutes = value => { const [h, m] = String(value || '08:00').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const clock = total => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

/* Student ability: ~13% exceptional, ~67% steady, ~20% struggling. */
function outcomeFor(studentId, examId) {
  const tier = hash(`tier:${studentId}`), roll = hash(`roll:${studentId}:${examId}`), seed = `score:${studentId}:${examId}`;
  const struggling = tier >= 0.8, exceptional = tier < 0.13;
  if (roll < (struggling ? 0.15 : 0.07)) return { kind: 'missed' };
  const r = hash(`band:${studentId}:${examId}`);
  if (exceptional) return r < 0.8 ? { kind: 'exceptional', percent: between(seed, 98, 104) } : { kind: 'passed', percent: between(seed, 86, 94) };
  if (struggling) return r < 0.55 ? { kind: 'failed', percent: between(seed, 35, 65) } : { kind: 'passed', percent: between(seed, 74, 84) };
  if (r < 0.09) return { kind: 'failed', percent: between(seed, 50, 66) };
  if (r < 0.14) return { kind: 'exceptional', percent: between(seed, 98, 104) };
  return { kind: 'passed', percent: between(seed, 75, 92) };
}

/* Choose which questions are answered correctly so the score lands as close
   as possible to the target percentage. */
function pickCorrect(paper, targetPercent, seed) {
  const total = paper.reduce((sum, q) => sum + (Number(q.points) || 2), 0), target = Math.round(total * Math.min(100, targetPercent) / 100);
  const order = paper.map((q, i) => ({ q, i, k: hash(`${seed}:${i}`) })).sort((a, b) => (Number(b.q.points) || 2) - (Number(a.q.points) || 2) || a.k - b.k);
  const correct = new Set(); let score = 0;
  for (const { q, i } of order) { const p = Number(q.points) || 2; if (score + p <= target) { correct.add(i); score += p; } }
  return { correct, total };
}

/* Compact answers in the same shape the examination screen stores. */
function answerFor(question, isCorrect) {
  // needsManualGrading is omitted: every reader treats a missing flag as auto-marked.
  const points = Number(question.points) || 2, base = { questionId: question.id, awarded: isCorrect ? points : 0 };
  if (question.type === 'mcq' || question.type === 'truefalse') {
    const options = question.options || [], right = options.findIndex(option => option.isCorrect);
    const wrong = options.findIndex(option => !option.isCorrect);
    return { ...base, selectedIndex: isCorrect ? Math.max(0, right) : Math.max(0, wrong) };
  }
  if (question.type === 'number') return { ...base, response: isCorrect ? String(question.acceptedValue ?? '') : String(Number(question.acceptedValue || 0) + 2) };
  if (question.type === 'fillblank') return { ...base, response: isCorrect ? String(question.expectedAnswer || '') : 'unsure' };
  if (question.type === 'matching') { const n = (question.pairs || []).length; return { ...base, matches: (question.pairs || []).map((_, i) => isCorrect ? i : (i + 1) % Math.max(1, n)) }; }
  return { ...base, response: isCorrect ? 'A complete answer that applies the lesson concepts to a real example.' : 'A partial answer that restates the topic without applying it.' };
}

function newQuestions(examId, subjectName) {
  const mcq = [
    `Which statement best describes a core idea of ${subjectName}?`,
    `Which practice is most appropriate when applying ${subjectName} concepts?`,
    `Which example correctly illustrates a principle from ${subjectName}?`,
    `What is the most likely result of ignoring a key rule in ${subjectName}?`,
    `Which term from ${subjectName} matches the situation described in class?`
  ].map((text, i) => ({ id: `${examId}-Q${i + 1}`, examId, type: 'mcq', points: 3, text,
    options: [
      { text: 'The option that applies the lesson concept correctly', isCorrect: true },
      { text: 'An option that confuses two related concepts', isCorrect: false },
      { text: 'An option unrelated to the lesson', isCorrect: false },
      { text: 'None of the listed options', isCorrect: false }
    ] }));
  const tf = [
    `${subjectName} concepts can be applied to real-world problems.`,
    `In ${subjectName}, every rule applies the same way in every situation.`,
    `Reviewing feedback is part of improving in ${subjectName}.`
  ].map((text, i) => ({ id: `${examId}-Q${i + 6}`, examId, type: 'truefalse', points: 2, text,
    options: [{ text: 'True', isCorrect: i !== 1 }, { text: 'False', isCorrect: i === 1 }] }));
  return [...mcq, ...tf];
}

function fillExistingResults(store) {
  const faculty = store.read('faculty', []).find(person => person.id === PROFESSOR_ID);
  if (faculty?.first !== 'Maria' || faculty?.last !== 'Reyes') throw new Error('Expected the Maria Reyes demo professor account.');
  const period = store.read('academicPeriods', []).find(item => item.status === 'active');
  if (!period) throw new Error('No active academic period.');
  const inPeriod = item => (!item.academicPeriodId || item.academicPeriodId === period.id) &&
    (!item.periodStatus || item.periodStatus === 'active');
  const archived = new Set(store.read('sections', []).filter(section => section.status === 'archived').map(section => section.id));
  const offers = store.read('sectionSubjects', []).filter(row => inPeriod(row) && !archived.has(row.sectionId))
    .flatMap(row => (row.assignments || []).filter(inPeriod).map(offer => ({...offer, sectionId:row.sectionId})))
    .filter(offer => offer.facultyId === PROFESSOR_ID);
  const seats = store.read('studentEnrollments', []).filter(seat => seat.studentId !== (env.STUDENT_USERNAME || '2025-00002') &&
    inPeriod(seat) && !['dropped','withdrawn','cancelled','archived'].includes(String(seat.status || '').toLowerCase()));
  const questions = new Map();
  for (const question of store.read('questions', [])) {
    if (!questions.has(question.examId)) questions.set(question.examId, []);
    questions.get(question.examId).push(question);
  }
  const records = store.read('studentSubmissions', []);
  const seen = new Set(records.map(record => `${record.examId}|${record.studentId}`));
  const additions = [], report = {};
  const demoStudents = new Set();
  for (const exam of store.read('exams', [])) {
    if (exam.facultyId !== PROFESSOR_ID || !inPeriod(exam) || exam.status !== 'published' ||
        !exam.date || String(exam.id).startsWith('DEMO-CALENDAR-')) continue;
    const start = Date.parse(exam.datetime || `${exam.date}T${exam.start || '08:00'}:00+08:00`);
    const end = Date.parse(`${exam.endDate || exam.date}T${exam.end || '23:59'}:00+08:00`);
    if (!(start < end && end < Date.now())) continue;
    const paper = questions.get(exam.id) || [];
    if (!paper.length || paper.some(q => q.manualCheck || q.needsManualGrading ||
        !['mcq','truefalse','number','fillblank','matching'].includes(q.type))) continue;
    const eligible = offers.filter(offer => offer.subjectCode === exam.subjectCode &&
      (exam.offeringIds?.length ? exam.offeringIds.includes(offer.id) : !exam.sections?.length || exam.sections.includes(offer.sectionId)));
    if (!eligible.length) continue;
    const roster = new Set(seats.filter(seat => seat.subjectCode === exam.subjectCode && eligible.some(offer =>
      seat.offeringId ? seat.offeringId === offer.id : seat.sectionId === offer.sectionId)).map(seat => seat.studentId));
    for (const studentId of roster) {
      const key = `${exam.id}|${studentId}`;
      if (seen.has(key)) continue;
      const tier = hash(`participation:${studentId}`);
      const profile = tier < .08 ? 'no-attempt' : tier < .22 ? 'rare' : tier < .46 ? 'fluctuating' : tier < .66 ? 'high' : 'steady';
      const row = report[profile] ||= {added:0, skipped:0};
      if (profile === 'no-attempt' || hash(`attendance:${key}`) < (profile === 'rare' ? .80 : profile === 'fluctuating' ? .16 : .04)) {
        row.skipped++;
        continue;
      }
      const swing = hash(`swing:${key}`);
      const percent = profile === 'high' ? between(key, 92, 104) : profile === 'fluctuating' ?
        (swing < .45 ? between(key, 22, 48) : between(key, 80, 104)) : profile === 'rare' ? between(key, 28, 70) : between(key, 55, 87);
      const {correct,total} = pickCorrect(paper, percent, key);
      const answers = paper.map((question, index) => answerFor(question, correct.has(index)));
      const submittedAt = new Date(start + Math.floor((end - start) * between(`time:${key}`, .35, .9))).toISOString();
      additions.push({id:`DRS-VARIED-${exam.id}-${studentId}`, studentId, examId:exam.id, submittedAt,
        academicPeriodId:period.id, periodStatus:'active', status:'graded', total, answers,
        score:answers.reduce((sum, answer) => sum + answer.awarded, 0), demoSeed:'varied-exam-results'});
      seen.add(key); demoStudents.add(studentId); row.added++;
    }
  }
  console.log(JSON.stringify({newResults:additions.length,students:demoStudents.size,
    exams:new Set(additions.map(item => item.examId)).size,profiles:report}, null, 2));
  return {records, additions};
}

async function main() {
  const localStore = openDatabase(DB_FILE);
  const store = createSupabaseReplicatedStore(localStore, { url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY,
    relational: FILL_EXISTING && String(env.SUPABASE_RELATIONAL || 'true').toLowerCase() !== 'false' });
  const remote = store.status().enabled;
  try {
    if (FILL_EXISTING) {
      if (remote) await store.hydrate();
      const {records, additions} = fillExistingResults(store);
      if (!APPLY || !additions.length) return;
      store.migrate({studentSubmissions:[...records,...additions]});
      if (remote) {
        if (!await store.flush()) throw new Error(store.status().error || 'Supabase write failed.');
        await store.hydrate();
      }
      const saved = new Set(store.read('studentSubmissions', []).map(item => item.id));
      if (additions.some(item => !saved.has(item.id))) throw new Error('Some seeded results were not found on read-back.');
      console.log(`Verified ${additions.length} new results in ${remote ? 'Supabase' : 'SQLite'}.`);
      return;
    }
    if (APPLY) {
      const backupDir = path.join(ROOT, 'data', 'backups'); fs.mkdirSync(backupDir, { recursive: true });
      const backup = path.join(backupDir, `neu-examination-before-exam-results-seed-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
      localStore.raw.exec('PRAGMA wal_checkpoint(FULL)');
      localStore.raw.exec(`VACUUM INTO '${backup.replace(/\\/g, '/').replace(/'/g, "''")}'`);
      console.log(`SQLite backup: ${backup}`);
      if (remote) { const pulled = await store.hydrate(); console.log(`Pulled ${pulled.hydrated} collections from Supabase before seeding.`); }
    } else if (remote) console.log('Dry run reads local SQLite only; --apply pulls the latest Supabase data first.');

    const settings = store.read('systemSettings', {}) || {}, periodId = settings.currentAcademicPeriodId || '';
    const inPeriod = item => !item.academicPeriodId || item.academicPeriodId === periodId;
    const subjects = store.read('subjects', []), sectionSubjects = store.read('sectionSubjects', []), enrollments = store.read('studentEnrollments', []);
    const allExams = store.read('exams', []), allQuestions = store.read('questions', []), allSubmissions = store.read('studentSubmissions', []);

    // Remove what a previous run generated; keep everything else.
    const exams = allExams.filter(exam => !String(exam.id).startsWith(EXAM_PREFIX));
    const questions = allQuestions.filter(q => !String(q.examId).startsWith(EXAM_PREFIX));
    const submissions = allSubmissions.filter(sub => sub.demoSeed === 'varied-exam-results' || !String(sub.id).startsWith(SUBMISSION_PREFIX));
    const before = JSON.stringify({ e: allExams, q: allQuestions, s: allSubmissions }).length;

    const offerings = sectionSubjects.filter(inPeriod)
      .flatMap(section => (section.assignments || []).map(item => ({ ...item, sectionId: item.sectionId || section.sectionId })))
      .filter(item => item.facultyId === PROFESSOR_ID);
    if (!offerings.length) throw new Error(`No current-period offerings found for Professor ${PROFESSOR_ID}.`);
    const bySubject = new Map();
    offerings.forEach(item => bySubject.set(item.subjectCode, [...(bySubject.get(item.subjectCode) || []), item]));

    const summary = [], counts = { missed: 0, failed: 0, passed: 0, exceptional: 0, kept: 0 };
    let subjectIndex = 0;
    for (const [code, subjectOffers] of [...bySubject.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const subjectName = subjects.find(item => item.code === code)?.name || code;
      const offerIds = new Set(subjectOffers.map(item => item.id)), sectionIds = [...new Set(subjectOffers.map(item => item.sectionId))].sort();
      const roster = enrollments.filter(item => inPeriod(item) && offerIds.has(item.offeringId) && !['dropped', 'withdrawn', 'cancelled'].includes(String(item.status || '').toLowerCase()));
      const existing = exams.filter(exam => exam.facultyId === PROFESSOR_ID && exam.subjectCode === code && inPeriod(exam))
        .sort((a, b) => (a.date ? 0 : 1) - (b.date ? 0 : 1) || String(a.date || '').localeCompare(String(b.date || '')) || String(a.id).localeCompare(String(b.id)));
      const chosen = existing.slice(0, EXAMS_PER_SUBJECT), template = existing[0] || {};
      for (let slot = chosen.length, k = 0; slot < EXAMS_PER_SUBJECT; slot++, k++) {
        const id = `${EXAM_PREFIX}${code}-${slot + 1}`, date = addDays(FIRST_NEW_EXAM_DATE, k * 12 + subjectIndex);
        const exam = {
          ...template, id, facultyId: PROFESSOR_ID, subjectCode: code,
          title: `${subjectName} — ${NEW_EXAM_LABELS[slot]}`,
          desc: `${NEW_EXAM_LABELS[slot]} covering the lessons discussed so far in ${subjectName}.`,
          date, start: '08:00', end: '17:00', durationMinutes: 45, passingPercent: Number(template.passingPercent) || 70,
          status: 'published', scoreRelease: 'after-deadline', answerRelease: template.answerRelease || 'after-deadline',
          sections: sectionIds, offeringIds: [...offerIds], academicPeriodId: periodId || undefined
        };
        delete exam.resultReleaseAt; delete exam.dashboardAlwaysOpen;
        exams.push(exam); questions.push(...newQuestions(id, subjectName)); chosen.push(exam);
      }

      let added = 0;
      for (const exam of chosen) {
        const paper = questions.filter(q => q.examId === exam.id);
        if (!paper.length) continue;
        const takers = roster.filter(item => (exam.sections || []).includes(item.sectionId));
        for (const seat of takers) {
          if (submissions.some(sub => sub.examId === exam.id && sub.studentId === seat.studentId)) { counts.kept++; continue; }
          const outcome = outcomeFor(seat.studentId, exam.id);
          if (outcome.kind === 'missed') { counts.missed++; continue; }
          // Harder/easier exams and stronger/weaker sections make the class
          // lines differ; the final label follows the adjusted score.
          const adjusted = Math.max(20, Math.min(100, outcome.percent + between(`difficulty:${exam.id}`, -5, 4) + between(`section:${code}:${seat.sectionId}`, -3, 3)));
          const passing = Number(exam.passingPercent) || 70;
          counts[adjusted >= 95 ? 'exceptional' : adjusted >= passing ? 'passed' : 'failed']++;
          outcome.percent = adjusted;
          const { correct, total } = pickCorrect(paper, outcome.percent, `${seat.studentId}:${exam.id}`);
          const answers = paper.map((q, i) => answerFor(q, correct.has(i)));
          const day = exam.date || addDays('2026-09-15', Math.floor(hash(`day:${seat.studentId}:${exam.id}`) * 60));
          const start = minutes(exam.start), end = Math.max(start + 30, minutes(exam.end || '17:00'));
          const at = clock(Math.min(end - 5, start + 20 + Math.floor(hash(`time:${seat.studentId}:${exam.id}`) * Math.max(10, end - start - 30))));
          submissions.push({
            id: `${SUBMISSION_PREFIX}${exam.id}-${seat.studentId}`, studentId: seat.studentId, examId: exam.id,
            submittedAt: `${day}T${at}:00+08:00`, total, score: answers.reduce((sum, a) => sum + a.awarded, 0),
            status: 'graded', answers
          });
          added++;
        }
      }
      summary.push(`${code} (${subjectName}): ${roster.length} students, exams ${chosen.map(e => e.id).join(', ')}, ${added} new results`);
      subjectIndex++;
    }

    const after = JSON.stringify({ e: exams, q: questions, s: submissions }).length;
    console.log(`Professor ${PROFESSOR_ID} · period ${periodId || '(none)'}`);
    summary.forEach(line => console.log(`  ${line}`));
    console.log(`Outcomes: ${counts.passed} passed, ${counts.exceptional} exceptional, ${counts.failed} failed, ${counts.missed} missed; ${counts.kept} existing results kept.`);
    console.log(`Size of exams + questions + submissions: ${(before / 1e6).toFixed(2)} MB -> ${(after / 1e6).toFixed(2)} MB`);

    if (!APPLY) { console.log('Dry run only. Pass --apply to write.'); return; }
    store.migrate({ exams, questions, studentSubmissions: submissions });
    if (remote) { const ok = await store.flush(); if (!ok) throw new Error(`Supabase write failed: ${store.status().error}`); console.log('Written to SQLite and Supabase.'); }
    else console.log('Written to SQLite (Supabase not configured).');
  } finally { store.close(); }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
