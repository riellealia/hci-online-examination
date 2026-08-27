/* ============================================================
   attempt.js — an in-progress exam attempt.

   Owns the answers, flags, position and start time of an attempt, and
   persists them so a refresh, a crash or a closed tab does not destroy
   work a student has already done.

   The golden rule here: never erase a saved answer because rendering or
   persistence failed. Reads fall back to an empty attempt; writes report
   failure and leave what was already stored alone.
   ============================================================ */

const ATTEMPT_KEY = 'examAttempts';

function attemptId(studentId, examId) {
  return `${studentId}::${examId}`;
}

function allAttempts() {
  const raw = DB.read(ATTEMPT_KEY, {});
  return (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
}

/* A blank attempt. `answers` is keyed by question id so reordering or
   editing the paper cannot shift a student's answers onto other questions. */
function blankAttempt(studentId, examId) {
  return {
    studentId,
    examId,
    answers: {},        // { questionId: { type, selectedIndex, response } }
    flags: [],          // [ questionId ]
    currentIndex: 0,
    maxVisited: 0,
    startedAt: null,
    updatedAt: null
  };
}

function loadAttempt(studentId, examId) {
  const stored = allAttempts()[attemptId(studentId, examId)];
  if (!stored || typeof stored !== 'object') return blankAttempt(studentId, examId);

  // Repair rather than discard: a partially corrupted attempt should still
  // give the student back whatever survived.
  return {
    ...blankAttempt(studentId, examId),
    ...stored,
    answers: (stored.answers && typeof stored.answers === 'object') ? stored.answers : {},
    flags: Array.isArray(stored.flags) ? stored.flags : [],
    currentIndex: Number.isInteger(stored.currentIndex) ? stored.currentIndex : 0,
    maxVisited: Number.isInteger(stored.maxVisited) ? stored.maxVisited : 0
  };
}

function saveAttempt(attempt) {
  if (!attempt || !attempt.studentId || !attempt.examId) return false;
  const all = allAttempts();
  all[attemptId(attempt.studentId, attempt.examId)] = {
    ...attempt,
    updatedAt: new Date().toISOString()
  };
  return DB.write(ATTEMPT_KEY, all);
}

function clearAttempt(studentId, examId) {
  const all = allAttempts();
  delete all[attemptId(studentId, examId)];
  return DB.write(ATTEMPT_KEY, all);
}

/* An attempt worth offering to resume: started, and with something in it. */
function resumableAttempt(studentId, examId) {
  const a = loadAttempt(studentId, examId);
  if (!a.startedAt) return null;
  const answered = Object.keys(a.answers).length;
  if (answered === 0 && a.flags.length === 0 && a.currentIndex === 0) return null;
  return a;
}

/* ---- Answer helpers ---- */

function setAnswer(attempt, question, value) {
  if (!attempt || !question) return attempt;
  if (question.type === 'matching' || question.type === 'imagedrag') {
    attempt.answers[question.id] = { type: question.type, matches: Array.isArray(value) ? value : [] };
  } else if (question.type === 'mcq' || question.type === 'truefalse') {
    attempt.answers[question.id] = { type: question.type, selectedIndex: value };
  } else {
    attempt.answers[question.id] = { type: question.type || 'short', response: value };
  }
  return attempt;
}

function getAnswer(attempt, questionId) {
  return (attempt && attempt.answers && attempt.answers[questionId]) || null;
}

function isAnswered(attempt, question) {
  const a = getAnswer(attempt, question.id);
  if (!a) return false;
  if (a.type === 'mcq' || a.type === 'truefalse') return Number.isInteger(a.selectedIndex);
  if (a.type === 'matching' || a.type === 'imagedrag') return Array.isArray(a.matches) && a.matches.length === (question.pairs || []).length
    && a.matches.every(Number.isInteger);
  return typeof a.response === 'string' && a.response.trim() !== '';
}

/* ---- Flags ---- */

function isFlagged(attempt, questionId) {
  return !!attempt && Array.isArray(attempt.flags) && attempt.flags.includes(questionId);
}

function toggleFlag(attempt, questionId) {
  if (!attempt) return false;
  const i = attempt.flags.indexOf(questionId);
  if (i === -1) { attempt.flags.push(questionId); return true; }
  attempt.flags.splice(i, 1);
  return false;
}

/* ---- Progress ---- */

function attemptProgress(attempt, questions) {
  const answered = questions.filter(q => isAnswered(attempt, q)).length;
  return {
    answered,
    total: questions.length,
    unanswered: questions.length - answered,
    flagged: questions.filter(q => isFlagged(attempt, q.id)).length
  };
}

/* The state of each question, for the navigator. Every cell carries a word
   as well as a colour, so meaning never depends on hue alone. */
function questionStates(attempt, questions, currentIndex) {
  return questions.map((q, i) => {
    const answered = isAnswered(attempt, q);
    const flagged = isFlagged(attempt, q.id);
    return {
      index: i,
      id: q.id,
      current: i === currentIndex,
      answered,
      flagged,
      label: `Question ${i + 1}`,
      status: flagged ? (answered ? 'Answered, flagged' : 'Flagged')
                      : (answered ? 'Answered' : 'Not answered')
    };
  });
}
