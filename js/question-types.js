/* Shared question-type rules. Keep delivery and authoring from inventing
   different meanings for the same stored question. */
function isChoiceQuestion(question) {
  return !!question && (question.type === 'mcq' || question.type === 'truefalse');
}

function questionTypeLabel(type) {
  return type === 'mcq' ? 'Multiple choice'
       : type === 'truefalse' ? 'True or false'
       : type === 'number' ? 'Number selector'
       : type === 'fillblank' ? 'Complete the underline'
       : type === 'matching' ? 'Match A to B'
       : type === 'imagedrag' ? 'Image placement'
       : type === 'essay' ? 'Paragraph answer'
       : 'Written answer';
}

function trueFalseOptions(correctValue) {
  const correct = String(correctValue || 'true').toLowerCase();
  return [
    { text: 'True', isCorrect: correct === 'true' },
    { text: 'False', isCorrect: correct === 'false' }
  ];
}

function numericAnswerIsCorrect(response, acceptedValue, tolerance = 0) {
  if (response === '' || response === null || response === undefined) return false;
  const actual = Number(response);
  const expected = Number(acceptedValue);
  const allowed = Number(tolerance || 0);
  if (![actual, expected, allowed].every(Number.isFinite) || allowed < 0) return false;
  return Math.abs(actual - expected) <= allowed + Number.EPSILON;
}

function normalizeTextAnswer(value, rules = {}) {
  let text = String(value ?? '');
  if (!rules.whitespaceSensitive) text = text.trim().replace(/\s+/g, ' ');
  if (!rules.symbolSensitive) text = text.replace(/[^\p{L}\p{N}\s]/gu, '');
  if (!rules.caseSensitive) text = text.toLocaleLowerCase();
  return text;
}

function textAnswerIsCorrect(response, expected, rules = {}) {
  if (String(response ?? '').trim() === '' || String(expected ?? '').trim() === '') return false;
  return normalizeTextAnswer(response, rules) === normalizeTextAnswer(expected, rules);
}

function matchingAnswerIsCorrect(selections, pairs) {
  return Array.isArray(selections) && Array.isArray(pairs) && pairs.length >= 2
    && selections.length === pairs.length
    && selections.every((selected, index) => Number(selected) === index);
}
