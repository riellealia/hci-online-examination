/* ============================================================
   exam-timing.js — the formal timing model.

   Four concepts are kept deliberately separate, per the requirements:

     visibility          when the listing can be seen
     availability window when an attempt may start or continue
     attempt duration    time allowed after starting
     effective end       whichever comes first — the availability
                         deadline, or start-time + attempt duration

   Pure module: no DOM, no storage. Everything takes an explicit `now`
   so the rules can be tested without waiting for real time to pass.
   ============================================================ */

/* Availability window for an exam, as instants. */
function examWindowOf(exam) {
  if (!exam) return { opens: null, closes: null };
  const opens = parseLocal(exam.date, exam.start || '00:00');
  const closes = parseLocal(exam.date, exam.end || '23:59');
  return { opens, closes };
}

/* When must THIS attempt stop?
   The earlier of the availability deadline and the attempt-duration
   deadline. Returns { at, reason } where reason names which one bit. */
function effectiveEnd(exam, attemptStartedAt, now = new Date()) {
  const { closes } = examWindowOf(exam);
  const mins = Number(exam && exam.durationMinutes);
  const hasDuration = isFinite(mins) && mins > 0;

  let durationEnd = null;
  if (hasDuration && attemptStartedAt instanceof Date) {
    durationEnd = new Date(attemptStartedAt.getTime() + mins * 60000);
  }

  if (durationEnd && closes) {
    return durationEnd <= closes
      ? { at: durationEnd, reason: 'duration' }
      : { at: closes, reason: 'deadline' };
  }
  if (durationEnd) return { at: durationEnd, reason: 'duration' };
  if (closes) return { at: closes, reason: 'deadline' };
  return { at: null, reason: 'none' };
}

/* Overall state of an exam for one student.
   `submitted` and `attemptStartedAt` describe that student's attempt. */
function examState(exam, { now = new Date(), submitted = false, attemptStartedAt = null } = {}) {
  if (!exam) return { state: 'unknown', canStart: false, reason: 'This exam is unavailable.' };

  const { opens, closes } = examWindowOf(exam);

  if (submitted) {
    return { state: 'submitted', canStart: false, opens, closes,
             reason: 'You have already submitted this examination.' };
  }

  // A schedule that will not parse should not silently lock everyone out.
  if (!opens || !closes) {
    return { state: 'open', canStart: true, opens, closes, reason: '' };
  }

  if (now < opens) {
    return {
      state: 'upcoming', canStart: false, opens, closes,
      reason: `This examination opens on ${formatDateTime(opens)}.`,
      untilOpen: msBetween(now, opens)
    };
  }

  if (now > closes) {
    return {
      state: 'closed', canStart: false, opens, closes,
      reason: `This examination closed on ${formatDateTime(closes)}.`
    };
  }

  const end = effectiveEnd(exam, attemptStartedAt || now, now);
  return {
    state: 'open', canStart: true, opens, closes,
    effectiveEnd: end.at, endReason: end.reason,
    remaining: end.at ? msBetween(now, end.at) : Infinity,
    reason: ''
  };
}

/* How much time is left in the current attempt, and what that limit means.
   `label` is shown beside the timer so a student knows whether they are
   racing their own allowance or the overall deadline. */
function timeRemaining(exam, attemptStartedAt, now = new Date()) {
  const end = effectiveEnd(exam, attemptStartedAt, now);
  if (!end.at) {
    return { ms: Infinity, label: 'No time limit', reason: 'none', expired: false };
  }
  const ms = msBetween(now, end.at);
  return {
    ms,
    at: end.at,
    reason: end.reason,
    label: end.reason === 'duration' ? 'Time left in your attempt'
                                     : 'Time until the exam closes',
    expired: ms <= 0
  };
}

/* Warning thresholds, in minutes, largest first. */
const WARN_AT_MINUTES = [10, 5, 1];

/* Which threshold has just been crossed, given the previous reading?
   Returns the threshold in minutes, or null. Used so a warning fires once. */
function thresholdCrossed(prevMs, nowMs) {
  if (!isFinite(prevMs) || !isFinite(nowMs)) return null;
  for (const mins of WARN_AT_MINUTES) {
    const edge = mins * 60000;
    if (prevMs > edge && nowMs <= edge) return mins;
  }
  return null;
}

/* Everything a student should be told before starting. Values the
   prototype does not model yet are reported as such rather than invented. */
function examBriefing(exam, { questions = [], faculty = null, subject = null,
                              submitted = false, attemptsUsed = 0, now = new Date() } = {}) {
  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 5), 0);
  const state = examState(exam, { now, submitted });
  const { opens, closes } = examWindowOf(exam);
  const pass = Number(exam && exam.passingPercent);

  return {
    title: exam.title || 'Examination',
    subjectCode: exam.subjectCode || '',
    subjectName: subject ? subject.name : '',
    facultyName: faculty ? `${faculty.first} ${faculty.last}` : 'Your instructor',
    instructions: exam.desc || 'No additional instructions were provided.',
    materials: exam.materials || 'No materials permitted unless your instructor says otherwise.',
    questionCount: questions.length,
    totalPoints,
    passingPercent: isFinite(pass) && pass > 0 ? pass : 75,
    opens, closes,
    durationMinutes: Number(exam.durationMinutes) || 0,
    durationText: describeMinutes(exam.durationMinutes),
    attemptsAllowed: Math.max(1,Number(exam.maxAttempts)||1),
    attemptsUsed: Number(attemptsUsed)||0,
    navigationPolicy: exam.questionLayout === 'all'
      ? 'All questions are shown on one page.'
      : exam.navigationMode === 'forward'
        ? 'One question per page. Forward-only: you cannot return to earlier questions.'
        : exam.navigationMode === 'sequential'
          ? 'One question per page. Questions unlock in order; unlocked questions may be reviewed.'
          : 'One question per page with free navigation.',
    reviewPolicy: 'Your multiple-choice score is shown immediately. Written answers are marked by your instructor.',
    state: state.state,
    canStart: state.canStart,
    blockedReason: state.reason,
    zone: localZoneName()
  };
}
