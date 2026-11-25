/* Central authorization policy. UI code may use can(), but mutations should
   call require() so hiding a control is never the only protection. */
const PermissionService = (() => {
  const grants = Object.freeze({
    admin: ['*'],
    dean: [
      'dashboard.dean.view', 'personnel.view', 'personnel.professor.manage',
      'personnel.coordinator.manage', 'profile.faculty.view',
      'profile.coordinator.view', 'approval.professor-assignment.review',
      'approval.student-overload.review', 'approval.faculty-student-enrollment.review',
      'audit.college.view', 'statistics.college.view', 'approval.role-assignment.review', 'role.assign',
      'approval.student-enrollment.review', 'approval.professor-overload.review'
    ],
    coordinator: [
      'dashboard.coordinator.view', 'offering.manage', 'schedule.manage',
      'enrollment.view', 'load.view', 'profile.faculty.view',
      'profile.student.view', 'approval.professor-assignment.submit',
      'approval.student-overload.submit', 'approval.own.withdraw',
      'audit.own.view', 'approval.role-assignment.submit',
      'approval.student-enrollment.submit', 'approval.professor-overload.submit'
    ],
    faculty: [
      'dashboard.faculty.view', 'exam.own.manage', 'grade.own.manage',
      'profile.student.assigned.view', 'approval.faculty-student-enrollment.submit',
      'approval.own.withdraw', 'audit.own.view'
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
      && account.permissionsDisabled !== true
      && !['deactivated', 'archived', 'graduated', 'transferred'].includes(status);
  }
  function roleAllows(role, permission) {
    const normalized = normalizeRole(role), allowed = grants[normalized] || [];
    if (allowed.includes('*')) return true;
    const baseline = allowed.includes(permission);
    const override = typeof DB !== 'undefined' ? DB.read('systemSettings', {})?.permissionOverrides?.[normalized]?.[permission] : undefined;
    return override === undefined ? baseline : baseline && override !== false;
  }
  /* Custom permission roles (systemSettings.permissionRoles) narrow a base role for
     their members: a permission switched off in the member's role is denied. They
     can never add a permission the base role does not already have. */
  function customRoleOf(actor) {
    if (!actor?.username || typeof DB === 'undefined') return null;
    const roles = DB.read('systemSettings', {})?.permissionRoles || [];
    return roles.find(r => (r.members || []).includes(actor.username) && normalizeRole(r.baseRole) === normalizeRole(actor.role)) || null;
  }
  /* Administrator rules (Accounts & Permissions → Roles): every role the person
     holds votes Deny / Default / Allow; Allow wins. Rules live in the
     pagePermissions record, which every role can read. Older switches in
     systemSettings still turn a permission off when no role votes. */
  function rulesAllow(actor, permission) {
    const normalized = normalizeRole(actor.role);
    const legacyOff = (typeof DB !== 'undefined' && DB.read('systemSettings', {})?.permissionOverrides?.[normalized]?.[permission] === false)
      || customRoleOf(actor)?.permissions?.[permission] === false;
    const PP = typeof PagePermissions !== 'undefined' ? PagePermissions : (typeof window !== 'undefined' ? window.PagePermissions : null);
    if (!PP || typeof DB === 'undefined') return !legacyOff;
    const doc = DB.read('pagePermissions', {}) || {};
    return PP.decide(doc, { role: normalized, username: actor.username, assignments: DB.read('roleAssignments', []) || [] }, permission, !legacyOff);
  }
  function can(permission, context = {}) {
    const actor = session(context.actor);
    if (!active(actor)) return false;
    const base = grants[normalizeRole(actor.role)] || [];
    if (base.includes('*')) return true;
    if (!base.includes(permission) || !rulesAllow(actor, permission)) return false;
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
  function permissionsFor(role, options = {}) {
    const normalized=normalizeRole(role), baseline=[...(grants[normalized]||[])];
    if(options.baselineOnly||baseline.includes('*')||typeof DB==='undefined')return baseline;
    const overrides=DB.read('systemSettings',{})?.permissionOverrides?.[normalized]||{};
    return baseline.filter(permission=>overrides[permission]!==false);
  }
  return { can, require: requirePermission, active, permissionsFor, normalizeRole, grants, customRoleOf, roleAllows };
})();

if (typeof window !== 'undefined') window.PermissionService = PermissionService;
