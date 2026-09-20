/* Central authorization policy. UI code may use can(), but mutations should
   call require() so hiding a control is never the only protection. */
const PermissionService = (() => {
  const grants = Object.freeze({
    admin: ['*'],
    dean: [
      'dashboard.dean.view', 'personnel.view', 'personnel.professor.manage',
      'personnel.coordinator.manage', 'profile.faculty.view',
      'profile.coordinator.view', 'approval.professor-assignment.review',
      'approval.student-overload.review',
      'audit.college.view', 'statistics.college.view'
    ],
    coordinator: [
      'dashboard.coordinator.view', 'offering.manage', 'schedule.manage',
      'enrollment.manage', 'load.view', 'profile.faculty.view',
      'profile.student.view', 'approval.professor-assignment.submit',
      'approval.student-overload.submit', 'approval.own.withdraw',
      'audit.own.view'
    ],
    faculty: [
      'dashboard.faculty.view', 'exam.own.manage', 'grade.own.manage',
      'profile.student.assigned.view', 'audit.own.view'
    ],
    student: [
      'dashboard.student.view', 'exam.eligible.take', 'result.own.view',
      'profile.student.shared.view'
    ]
  });

  const normalizeRole = role => String(role || '').trim().toLowerCase()
    .replace(/[\s_-]+/g, '')
    .replace('administrator', 'admin')
    .replace('collegedean', 'dean')
    .replace('facultycoordinator', 'coordinator')
    .replace('professor', 'faculty');

  function session(actor) { return actor || DB.read('currentUser', null); }
  function accountFor(actor) {
    if (!actor || actor.role === 'system') return null;
    return DB.read('users', []).find(user => user.username === actor.username);
  }
  function active(actor) {
    if (!actor || !actor.username || !actor.role) return false;
    if (actor.role === 'system') return true;
    const account = accountFor(actor);
    const status = String(account?.status || 'active').toLowerCase();
    return !!account && normalizeRole(account.role) === normalizeRole(actor.role)
      && account.disabled !== true
      && !['deactivated', 'archived', 'graduated', 'transferred'].includes(status);
  }
  function roleAllows(role, permission) {
    const allowed = grants[normalizeRole(role)] || [];
    return allowed.includes('*') || allowed.includes(permission);
  }
  function can(permission, context = {}) {
    const actor = session(context.actor);
    if (!active(actor) || !roleAllows(actor.role, permission)) return false;
    if (permission.endsWith('.own.view') && context.ownerId && actor.username !== context.ownerId) return false;
    if (permission.includes('.own.manage') && context.ownerId && actor.username !== context.ownerId) return false;
    return true;
  }
  function requirePermission(permission, context = {}) {
    if (can(permission, context)) return true;
    const error = new Error(`Permission denied: ${permission}`);
    error.code = 'PERMISSION_DENIED';
    error.permission = permission;
    throw error;
  }
  function permissionsFor(role) { return [...(grants[normalizeRole(role)] || [])]; }
  return { can, require: requirePermission, active, permissionsFor, normalizeRole, grants };
})();

if (typeof window !== 'undefined') window.PermissionService = PermissionService;
