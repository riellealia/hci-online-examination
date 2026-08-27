/* ============================================================
   dates.js — time-zone-safe parsing, display, and durations.

   Exam schedules are stored as a local calendar date plus wall-clock
   times ("2026-09-01" + "14:00"), because that is what a lecturer means
   when they set a paper. This module is the only place that turns those
   strings into instants, so the interpretation never differs between
   the faculty view and the student view.
   ============================================================ */

/* "2026-09-01" + "14:00" -> Date in the viewer's own time zone.
   Returns null when either part is missing or malformed. */
function parseLocal(dateStr, timeStr) {
  if (!dateStr) return null;
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim());
  if (!d) return null;

  let hh = 0, mm = 0;
  if (timeStr) {
    const t = /^(\d{1,2}):(\d{2})/.exec(String(timeStr).trim());
    if (!t) return null;
    hh = Number(t[1]);
    mm = Number(t[2]);
    if (hh > 23 || mm > 59) return null;
  }

  // Constructed from parts rather than Date.parse, which treats a bare
  // "YYYY-MM-DD" as UTC and would shift the schedule for most of the world.
  const out = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), hh, mm, 0, 0);
  return isNaN(out.getTime()) ? null : out;
}

/* Milliseconds between two instants, never negative. */
function msBetween(from, to) {
  if (!(from instanceof Date) || !(to instanceof Date)) return 0;
  return Math.max(0, to.getTime() - from.getTime());
}

/* 3_930_000 -> "1h 5m 30s". Omits units that are zero from the left. */
function formatDuration(ms) {
  if (!isFinite(ms) || ms <= 0) return '0s';
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor(total / 3600) % 24;
  const m = Math.floor(total / 60) % 60;
  const s = total % 60;

  const parts = [];
  if (d) parts.push(d + 'd');
  if (d || h) parts.push(h + 'h');
  if (d || h || m) parts.push(m + 'm');
  parts.push(s + 's');
  return parts.join(' ');
}

/* Compact form for a timer chip: "1:05:30" or "05:30". */
function formatClock(ms) {
  if (!isFinite(ms) || ms <= 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor(total / 60) % 60;
  const s = total % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/* Minutes -> "1 hour 30 minutes", for describing an allowance in prose. */
function describeMinutes(mins) {
  const n = Number(mins);
  if (!isFinite(n) || n <= 0) return 'No limit';
  const h = Math.floor(n / 60);
  const m = Math.round(n % 60);
  const bits = [];
  if (h) bits.push(h + (h === 1 ? ' hour' : ' hours'));
  if (m) bits.push(m + (m === 1 ? ' minute' : ' minutes'));
  return bits.join(' ') || 'No limit';
}

/* A date shown in the viewer's own time zone, with the zone named so a
   student in a different region is not misled by a bare time. */
function formatDateTime(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return 'Not set';
  return date.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function localZoneName() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
  } catch (e) {
    return 'local time';
  }
}
