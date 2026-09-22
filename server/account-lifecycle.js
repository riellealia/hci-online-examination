'use strict';

const STATUS_BY_ACTION = { deactivate: 'Deactivated', reactivate: 'Active', archive: 'Archived', restore: 'Active', graduate: 'Graduated', transfer: 'Transferred' };
const REQUIRED_FROM = {
  deactivate: new Set(['Active']),
  reactivate: new Set(['Deactivated']),
  archive: new Set(['Active', 'Deactivated']),
  restore: new Set(['Archived', 'Graduated', 'Transferred']),
  graduate: new Set(['Active', 'Deactivated']),
  transfer: new Set(['Active', 'Deactivated'])
};
const REASON_REQUIRED = new Set(['archive', 'graduate', 'transfer']);
const STUDENT_ONLY = new Set(['graduate', 'transfer']);

const now = () => new Date().toISOString();
function bad(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
function admin(session) { if (!session || session.role !== 'admin') bad('Only an Administrator can change account status.', 403); }
function statusOf(user) { return user.lifecycleStatus || (user.disabled ? 'Deactivated' : 'Active'); }
function entityTypeFor(role) { return role === 'student' ? 'student-account' : ['faculty', 'professor'].includes(role) ? 'faculty-account' : 'account'; }
function withoutPassword(user) { const { password, ...rest } = user; return rest; }

function createAccountLifecycleService(store) {
  function audit(existing, session, action, user, previousValue, newValue, reason) {
    return [...existing, {
      id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: now(), actorId: session.username, actorRole: session.role,
      action, entityType: entityTypeFor(String(user.role || '').toLowerCase()), entityId: user.username,
      category: 'account/lifecycle', result: 'success', reason: String(reason || '').trim(),
      previousValue, newValue, details: {}
    }];
  }
  function changeStatus(username, action, reason, session) {
    admin(session);
    if (!Object.hasOwn(STATUS_BY_ACTION, action)) bad('Unknown account status action.');
    reason = String(reason || '').trim();
    if (REASON_REQUIRED.has(action) && !reason) bad(`A reason is required to ${action} an account.`);
    const users = store.read('users', []);
    if (!Array.isArray(users)) bad('Account records are unavailable.', 500);
    const index = users.findIndex(item => item.username === username);
    if (index < 0) bad('Account not found.', 404);
    const previous = users[index];
    const previousStatus = statusOf(previous);
    const userRole = String(previous.role || '').toLowerCase();
    if (STUDENT_ONLY.has(action) && userRole !== 'student') bad(`Only Student accounts can be marked ${STATUS_BY_ACTION[action].toLowerCase()}.`);
    if (!REQUIRED_FROM[action].has(previousStatus)) bad(`Cannot ${action} an account that is currently ${previousStatus}.`, 409);
    const newStatus = STATUS_BY_ACTION[action];
    const timestamp = now();
    const history = [...(previous.lifecycleHistory || []), { at: timestamp, actorId: session.username, actorRole: session.role, from: previousStatus, to: newStatus, reason }];
    const updated = { ...previous, lifecycleStatus: newStatus, disabled: newStatus !== 'Active', lifecycleHistory: history };
    const nextUsers = [...users];
    nextUsers[index] = updated;
    store.migrate({
      users: nextUsers,
      applicationAuditLog: audit(store.read('applicationAuditLog', []), session, action, previous, previousStatus, newStatus, reason)
    });
    return { account: withoutPassword(updated) };
  }
  return { changeStatus };
}

module.exports = { createAccountLifecycleService, STATUS_BY_ACTION, REQUIRED_FROM, REASON_REQUIRED, STUDENT_ONLY };
