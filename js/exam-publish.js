function validateExamForPublish(exam, questions) {
  const errors = [];
  if (!exam?.title || !exam?.subjectCode || !exam?.date || !exam?.start || !exam?.end) errors.push('Complete the exam title, subject, date, and availability window.');
  if (exam?.end && exam?.start && exam.end <= exam.start) errors.push('End time must be later than start time.');
  const list = (questions || []).filter(question => question.examId === exam?.id);
  if (!list.length) errors.push('Add at least one question.');
  list.forEach((q, index) => {
    const label = `Question ${index + 1}`;
    if (!String(q.text || '').trim()) errors.push(`${label} has no prompt.`);
    if (!Number.isFinite(Number(q.points)) || Number(q.points) < 1) errors.push(`${label} needs valid points.`);
    if (isChoiceQuestion(q) && (!Array.isArray(q.options) || q.options.length < 2 || q.options.filter(o=>o.isCorrect).length !== 1)) errors.push(`${label} needs exactly one correct answer.`);
    if (q.type === 'number' && !Number.isFinite(Number(q.acceptedValue))) errors.push(`${label} needs an accepted numeric value.`);
    if (q.type === 'fillblank' && (!q.text.includes('___') || !String(q.expectedAnswer || '').trim())) errors.push(`${label} needs a blank marker and answer key.`);
    if (['matching','imagedrag'].includes(q.type) && (!Array.isArray(q.pairs) || q.pairs.length < 2 || q.pairs.some(p=>!p.left || !p.right))) errors.push(`${label} needs at least two complete pairs.`);
    if (q.type === 'imagedrag' && safeQuestionUrl(q.imageUrl, 'image').error) errors.push(`${label} needs a valid image.`);
    if (q.imageUrl && !String(q.imageAlt || '').trim()) errors.push(`${label} needs image alternative text.`);
  });
  return { valid:errors.length === 0, errors, questionCount:list.length,
    totalPoints:list.reduce((sum,q)=>sum+(Number(q.points)||0),0) };
}
