/* Reusable approval state machine. Dashboard forms are intentionally separate:
   this module owns authorization, transitions, history, audit, and notices. */
const ApprovalService = (() => {
  const statuses = Object.freeze(['pending', 'approved', 'rejected', 'cancelled', 'withdrawn']);
  const types = Object.freeze({
    'professor-assignment': { submit: 'coordinator', review: 'dean' },
    'student-overload': { submit: 'coordinator', review: 'admin' }
  });
  const applyHandlers = new Map();
  const now = () => new Date().toISOString();
  const id = () => `APR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const actor = supplied => supplied || DB.read('currentUser', null);
  const role = value => PermissionService.normalizeRole(value);
  const read = () => DB.read('approvalRequests', []);
  const clone = value => JSON.parse(JSON.stringify(value));
  function fail(message, code = 'INVALID_APPROVAL') { const error = new Error(message); error.code = code; throw error; }
  function save(records) { if (!DB.write('approvalRequests', records)) fail('Approval request could not be saved.', 'SAVE_FAILED'); }
  function notice(userId, message, requestId) {
    if (!userId) return;
    const items = DB.read('notifications', []);
    items.unshift({ id: `NTF-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, userId, requestId, message, read: false, createdAt: now() });
    DB.write('notifications', items);
  }
  function audit(action, request, details = {}, actingUser = null, result = 'success') {
    if (typeof AuditLog !== 'undefined') AuditLog.record(action, 'approval-request', request.id, details, actingUser, { category: 'approval', result, academicPeriod: request.academicPeriod });
  }
  function submit(input, suppliedActor = null) {
    const actingUser = actor(suppliedActor), config = types[input?.type];
    if (!config) fail('Unsupported approval request type.');
    if (!PermissionService.active(actingUser) || role(actingUser.role) !== config.submit) fail('This role cannot submit that request.', 'PERMISSION_DENIED');
    PermissionService.require(`approval.${input.type}.submit`, { actor: actingUser });
    if (!input.targetType || !input.targetId || !input.reason?.trim()) fail('Target and reason are required.');
    if (!input.proposedChange || typeof input.proposedChange !== 'object' || Array.isArray(input.proposedChange)) fail('A proposed change object is required.');
    const createdAt = now(), request = {
      id: id(), type: input.type, requesterId: actingUser.username, requesterRole: role(actingUser.role),
      targetType: String(input.targetType), targetId: String(input.targetId),
      proposedChange: clone(input.proposedChange), reason: input.reason.trim(),
      academicPeriod: input.academicPeriod || '', status: 'pending', submittedAt: createdAt,
      reviewerId: '', reviewerRole: config.review, reviewerRemarks: '', decisionAt: '',
      history: [{ status: 'pending', at: createdAt, actorId: actingUser.username, actorRole: role(actingUser.role), remarks: input.reason.trim() }]
    };
    const records = read(); records.push(request); save(records);
    audit('submit', request, { type: request.type, targetType: request.targetType, targetId: request.targetId }, actingUser);
    notice(input.reviewerId || config.review, `New ${request.type} request awaiting review.`, request.id);
    return clone(request);
  }
  function decide(requestId, decision, remarks = '', suppliedActor = null) {
    if (!['approved', 'rejected'].includes(decision)) fail('Decision must be approved or rejected.');
    const actingUser = actor(suppliedActor), records = read(), request = records.find(item => item.id === requestId);
    if (!request) fail('Approval request was not found.', 'NOT_FOUND');
    if (request.status !== 'pending') fail('Only pending requests can be reviewed.', 'INVALID_TRANSITION');
    const config = types[request.type];
    if (!config || role(actingUser?.role) !== config.review) fail('This role cannot review the request.', 'PERMISSION_DENIED');
    PermissionService.require(`approval.${request.type}.review`, { actor: actingUser });
    if (actingUser.username === request.requesterId) fail('A requester cannot approve or reject their own request.', 'SELF_APPROVAL');
    if (decision === 'rejected' && !remarks.trim()) fail('Reviewer remarks are required when rejecting a request.');
    if (decision === 'approved' && applyHandlers.has(request.type)) applyHandlers.get(request.type)(clone(request.proposedChange), clone(request), actingUser);
    const changedAt = now(); request.status = decision; request.reviewerId = actingUser.username;
    request.reviewerRole = role(actingUser.role); request.reviewerRemarks = remarks.trim(); request.decisionAt = changedAt;
    request.history.push({ status: decision, at: changedAt, actorId: actingUser.username, actorRole: role(actingUser.role), remarks: remarks.trim() });
    save(records); audit(decision === 'approved' ? 'approve' : 'reject', request, { remarks: remarks.trim() }, actingUser);
    notice(request.requesterId, `Your ${request.type} request was ${decision}.`, request.id);
    return clone(request);
  }
  function closeOwn(requestId, nextStatus, remarks = '', suppliedActor = null) {
    if (!['withdrawn', 'cancelled'].includes(nextStatus)) fail('Unsupported request transition.');
    const actingUser = actor(suppliedActor), records = read(), request = records.find(item => item.id === requestId);
    if (!request) fail('Approval request was not found.', 'NOT_FOUND');
    if (request.status !== 'pending') fail('Only pending requests can be closed.', 'INVALID_TRANSITION');
    const isRequester = actingUser?.username === request.requesterId;
    if (nextStatus === 'withdrawn' && !isRequester) fail('Only the requester may withdraw this request.', 'PERMISSION_DENIED');
    if (nextStatus === 'cancelled' && role(actingUser?.role) !== 'admin') fail('Only an Administrator may cancel this request.', 'PERMISSION_DENIED');
    if (nextStatus === 'withdrawn') PermissionService.require('approval.own.withdraw', { actor: actingUser });
    const changedAt = now(); request.status = nextStatus;
    request.history.push({ status: nextStatus, at: changedAt, actorId: actingUser.username, actorRole: role(actingUser.role), remarks: remarks.trim() });
    save(records); audit(nextStatus === 'withdrawn' ? 'withdraw' : 'cancel', request, { remarks: remarks.trim() }, actingUser);
    notice(request.requesterId, `Your ${request.type} request was ${nextStatus}.`, request.id);
    return clone(request);
  }
  function filterRecords(filters = {}) {
    return read().filter(item => !filters.status || item.status === filters.status)
      .filter(item => !filters.type || item.type === filters.type)
      .filter(item => !filters.requesterId || item.requesterId === filters.requesterId)
      .filter(item => !filters.reviewerRole || item.reviewerRole === role(filters.reviewerRole))
      .map(clone).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }
  function queryFor(suppliedActor = null, filters = {}) {
    const actingUser = actor(suppliedActor);
    if (!PermissionService.active(actingUser)) return [];
    const actingRole = role(actingUser.role);
    if (actingRole === 'admin') return filterRecords(filters);
    if (actingRole === 'dean') return filterRecords(filters).filter(item => item.type === 'professor-assignment' && item.reviewerRole === 'dean');
    if (actingRole === 'coordinator') return filterRecords(filters).filter(item => item.requesterId === actingUser.username);
    return [];
  }
  function query(filters = {}, suppliedActor = null) { return queryFor(suppliedActor, filters); }
  function registerApplyHandler(type, handler) { if (!types[type] || typeof handler !== 'function') fail('Invalid approval apply handler.'); applyHandlers.set(type, handler); }
  return { statuses, types, submit, approve: (id, remarks, actor) => decide(id, 'approved', remarks, actor), reject: (id, remarks, actor) => decide(id, 'rejected', remarks, actor), withdraw: (id, remarks, actor) => closeOwn(id, 'withdrawn', remarks, actor), cancel: (id, remarks, actor) => closeOwn(id, 'cancelled', remarks, actor), query, queryFor, registerApplyHandler };
})();

if (typeof window !== 'undefined') window.ApprovalService = ApprovalService;
