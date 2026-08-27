/* Question editor draft persistence.
   Drafts are deliberately separate from published/live questions so an
   incomplete option or temporarily missing answer cannot break an exam. */
const QUESTION_DRAFT_KEY = 'questionDrafts';

function questionDraftId(examId, questionId) {
  return `${examId || 'unknown'}::${questionId || 'new'}`;
}

function readQuestionDrafts() {
  const value = DB.read(QUESTION_DRAFT_KEY, {});
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function loadQuestionDraft(examId, questionId) {
  return readQuestionDrafts()[questionDraftId(examId, questionId)] || null;
}

function saveQuestionDraft(examId, questionId, draft) {
  if (!examId || !draft || typeof draft !== 'object') return false;
  const drafts = readQuestionDrafts();
  drafts[questionDraftId(examId, questionId)] = {
    ...draft,
    examId,
    questionId: questionId || null,
    updatedAt: new Date().toISOString()
  };
  return DB.write(QUESTION_DRAFT_KEY, drafts);
}

function clearQuestionDraft(examId, questionId) {
  const drafts = readQuestionDrafts();
  delete drafts[questionDraftId(examId, questionId)];
  return DB.write(QUESTION_DRAFT_KEY, drafts);
}
