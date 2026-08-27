/* Pure helpers for the Faculty question catalogue. Page code owns rendering;
   this module owns filtering, totals, and safe copies. */
function questionCatalogueSummary(items) {
  const list = Array.isArray(items) ? items : [];
  return { count: list.length, points: list.reduce((sum, q) => sum + (Number(q.points) || 5), 0) };
}

function questionMatchesFilter(question, query = '', type = 'all') {
  const needle = String(query).trim().toLocaleLowerCase();
  return (type === 'all' || question.type === type)
    && (!needle || String(question.text || '').toLocaleLowerCase().includes(needle));
}

function duplicateQuestionRecord(question, id) {
  if (!question || !id) return null;
  return { ...JSON.parse(JSON.stringify(question)), id };
}
