function releaseDateReached(value, now = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && now >= date;
}

function resultReleaseAllowed(mode, exam, submission, now = new Date()) {
  const policy = mode || 'immediate';
  if (policy === 'immediate') return true;
  if (policy === 'never') return false;
  if (policy === 'after-grading') return !!submission && isFullyMarked(submission);
  if (policy === 'after-deadline') return !!exam && now >= parseLocal(exam.date, exam.end || '23:59');
  if (policy === 'date') return releaseDateReached(exam?.resultReleaseAt, now);
  return false;
}

function resultVisibility(exam, submission, now = new Date()) {
  const legacyScore = exam?.showScore !== false;
  const scoreMode = exam?.scoreRelease || (legacyScore ? 'immediate' : 'never');
  const answerMode = exam?.answerRelease || (exam?.allowAnswerReview ? 'immediate' : 'never');
  return {
    showScore: resultReleaseAllowed(scoreMode, exam, submission, now),
    showSubmittedAnswers: exam?.showSubmittedAnswers ?? exam?.allowAnswerReview === true,
    showCorrectAnswers: resultReleaseAllowed(answerMode, exam, submission, now),
    showFeedback: exam?.showFeedback !== false
  };
}
