/* ============================================================
   Shared grading conversion
   ------------------------------------------------------------
   Raw exam marks are converted twice before a student sees them:

     1. Transmuted percentage — (score / total * 50) + 50.
        A blank paper floors at 50 and half the raw marks already
        reaches the passing grade of 75.

     2. College rating — the 1.00-5.00 scale, 1.00 highest,
        3.00 passing, 4.00 and 5.00 failed.

   Both faculty and student pages use this file so a mark can never
   be displayed two different ways.
   ============================================================ */

/* Raw marks -> transmuted percentage. */
function transmutedPercent(score, total) {
  if (!total || total <= 0) return 50;          // nothing to score against
  const pct = (score / total) * 50 + 50;
  return Math.max(50, Math.min(100, pct));      // clamp to the 50-100 range
}

/* Transmuted percentage -> college rating.
   Banded on the rounded whole percentage, so 87.5 is treated as 88. */
function collegeRating(percent) {
  const p = Math.round(percent);
  if (p >= 97) return { rating: '1.00', passed: true,  remark: 'Excellent' };
  if (p >= 94) return { rating: '1.25', passed: true,  remark: 'Very good' };
  if (p >= 91) return { rating: '1.50', passed: true,  remark: 'Very good' };
  if (p >= 88) return { rating: '1.75', passed: true,  remark: 'Good' };
  if (p >= 85) return { rating: '2.00', passed: true,  remark: 'Good' };
  if (p >= 82) return { rating: '2.25', passed: true,  remark: 'Satisfactory' };
  if (p >= 79) return { rating: '2.50', passed: true,  remark: 'Satisfactory' };
  if (p >= 76) return { rating: '2.75', passed: true,  remark: 'Fair' };
  if (p >= 75) return { rating: '3.00', passed: true,  remark: 'Passing' };
  if (p >= 70) return { rating: '4.00', passed: false, remark: 'Failed' };
  return             { rating: '5.00', passed: false, remark: 'Failed' };
}

/* Convenience: raw marks -> everything needed for display. */
function gradeFor(score, total) {
  const percent = transmutedPercent(score, total);
  const r = collegeRating(percent);
  return {
    score,
    total,
    percent,
    percentText: percent.toFixed(percent % 1 === 0 ? 0 : 2),
    rating: r.rating,
    passed: r.passed,
    remark: r.remark
  };
}

/* A submission is only final once every written answer has been marked. */
function isFullyMarked(submission) {
  return (submission.answers || [])
    .every(a => !a.needsManualGrading || a.awarded !== null);
}

/* Marks actually awarded so far across auto-marked and hand-marked answers. */
function marksAwarded(submission) {
  return (submission.answers || []).reduce((t, a) => t + (a.awarded || 0), 0);
}
