/* Reusable approval state machine. Dashboard forms are intentionally separate:
   this module owns authorization, transitions, history, audit, and notices. */
const ApprovalService = (() => {
  const statuses = Object.freeze(['pending', 'approved', 'rejected', 'cancelled', 'withdrawn']);
  const types = Object.freeze({
    'professor-assignment': { submit: 'coordinator', review: 'dean' },
    'student-overload': { submit: ['coordinator', 'admin'], review: 'dean' },
    'faculty-student-enrollment': { submit: 'faculty', review: 'dean' },
    'role-assignment': { submit: ['coordinator', 'admin'], review: 'dean' },
    // Faculty Coordinator → Dean: enroll a Student within their normal load,
    // or give a Professor a class beyond their normal load (up to the maximum).
    'student-enrollment': { submit: 'coordinator', review: 'dean' },
    'professor-overload': { submit: 'coordinator', review: 'dean' },
    // Faculty Coordinator → Dean: a new Section is created only once approved.
    'section-create': { submit: ['coordinator', 'faculty'], review: 'dean' },
    'section-archive': { submit: ['coordinator', 'faculty'], review: 'dean' }
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
    notices([{ userId, message }], requestId);
  }
  function notices(recipients, requestId) {
    const items = DB.read('notifications', []);
    const entries = recipients.filter(item => item.userId).map(item => ({
      id: `NTF-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      requestId, read: false, createdAt: now(), ...item
    }));
    if (!entries.length) return;
    items.unshift(...entries);
    DB.write('notifications', items);
  }
  function noticeRole(roleName, message, requestId) {
    const recipients = DB.read('users', []).filter(user => role(user.role) === roleName && PermissionService.active({ username: user.username, role: user.role }));
    recipients.forEach(user => notice(user.username, message, requestId));
  }
  function audit(action, request, details = {}, actingUser = null, result = 'success') {
    if (typeof AuditLog !== 'undefined') AuditLog.record(action, 'approval-request', request.id, details, actingUser, { category: 'approval', result, academicPeriod: request.academicPeriod });
  }
  function submit(input, suppliedActor = null) {
    const actingUser = actor(suppliedActor), config = types[input?.type];
    if (!config) fail('Unsupported approval request type.');
    const submitRoles=Array.isArray(config.submit)?config.submit:[config.submit];
    if (!PermissionService.active(actingUser) || !submitRoles.includes(role(actingUser.role))) fail('This role cannot submit that request.', 'PERMISSION_DENIED');
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
    const records = read();
    const duplicate=records.find(item => item.type === request.type && item.targetId === request.targetId && item.status === 'pending');
    if (duplicate) { audit('deny-submit', duplicate, { reason: 'A pending request already exists for this target.', attemptedBy: actingUser.username }, actingUser, 'denied'); fail('A pending request already exists for this target.', 'DUPLICATE_PENDING'); }
    records.push(request); save(records);
    audit('submit', request, { type: request.type, targetType: request.targetType, targetId: request.targetId }, actingUser);
    if (input.reviewerId) notice(input.reviewerId, `New ${request.type} request awaiting review.`, request.id);
    else noticeRole(config.review, `New ${request.type} request awaiting review.`, request.id);
    return clone(request);
  }
  function decide(requestId, decision, remarks = '', suppliedActor = null) {
    if (!['approved', 'rejected'].includes(decision)) fail('Decision must be approved or rejected.');
    const actingUser = actor(suppliedActor), records = read(), request = records.find(item => item.id === requestId);
    if (!request) fail('Approval request was not found.', 'NOT_FOUND');
    if (request.status !== 'pending') { audit('deny-review', request, { reason: 'Request is no longer pending.', attemptedDecision: decision }, actingUser, 'denied'); fail('Only pending requests can be reviewed.', 'INVALID_TRANSITION'); }
    const config = types[request.type];
    if (!config || role(actingUser?.role) !== config.review) { audit('deny-review', request, { reason: 'Reviewer role is not authorized.', attemptedDecision: decision }, actingUser, 'denied'); fail('This role cannot review the request.', 'PERMISSION_DENIED'); }
    try { PermissionService.require(`approval.${request.type}.review`, { actor: actingUser }); }
    catch (error) { audit('deny-review', request, { reason: error.message, attemptedDecision: decision }, actingUser, 'denied'); throw error; }
    if (actingUser.username === request.requesterId) { audit('deny-review', request, { reason: 'Self-approval is not allowed.', attemptedDecision: decision }, actingUser, 'denied'); fail('A requester cannot approve or reject their own request.', 'SELF_APPROVAL'); }
    if (decision === 'rejected' && !remarks.trim()) { audit('deny-review', request, { reason: 'Rejection remarks are required.', attemptedDecision: decision }, actingUser, 'denied'); fail('Reviewer remarks are required when rejecting a request.'); }
    if (decision === 'approved' && applyHandlers.has(request.type)) {
      try { applyHandlers.get(request.type)(clone(request.proposedChange), clone(request), actingUser); }
      catch (error) { audit('apply-failed', request, { reason: error.message, code: error.code || 'APPLY_FAILED' }, actingUser, 'failed'); throw error; }
    }
    const changedAt = now(); request.status = decision; request.reviewerId = actingUser.username;
    request.reviewerRole = role(actingUser.role); request.reviewerRemarks = remarks.trim(); request.decisionAt = changedAt;
    request.history.push({ status: decision, at: changedAt, actorId: actingUser.username, actorRole: role(actingUser.role), remarks: remarks.trim() });
    save(records); audit(decision === 'approved' ? 'approve' : 'reject', request, { remarks: remarks.trim() }, actingUser);
    const change = request.proposedChange || {};
    const requestName = request.type.replace(/-/g, ' ');
    const title = `Request ${decision}`;
    const recipients = [{ userId: request.requesterId, title, message: `The Dean ${decision} your ${requestName} request.` }];
    if (decision === 'approved') {
      const professorId = ['professor-assignment', 'professor-overload'].includes(request.type) ? change.facultyId
        : request.type === 'role-assignment' && DB.read('faculty', []).some(person => person.id === change.username) ? change.username : '';
      if (professorId && professorId !== request.requesterId) recipients.push({
        userId: professorId, title: `Approved ${requestName}`,
        message: `The Dean approved a ${requestName} request for you${change.subjectCode && change.subjectCode !== '*' ? ` in ${change.subjectCode}` : ''}.`
      });
    }
    if (request.type === 'faculty-student-enrollment' && change.studentId && change.studentId !== request.requesterId) {
      recipients.push({ userId: change.studentId, message: `Your ${change.subjectCode} enrollment ${change.action} request was ${decision}.` });
    }
    notices(recipients, request.id);
    return clone(request);
  }
  function closeOwn(requestId, nextStatus, remarks = '', suppliedActor = null) {
    if (!['withdrawn', 'cancelled'].includes(nextStatus)) fail('Unsupported request transition.');
    const actingUser = actor(suppliedActor), records = read(), request = records.find(item => item.id === requestId);
    if (!request) fail('Approval request was not found.', 'NOT_FOUND');
    if (request.status !== 'pending') { audit('deny-close', request, { reason: 'Request is no longer pending.', attemptedStatus: nextStatus }, actingUser, 'denied'); fail('Only pending requests can be closed.', 'INVALID_TRANSITION'); }
    const isRequester = actingUser?.username === request.requesterId;
    if (nextStatus === 'withdrawn' && !isRequester) { audit('deny-withdraw', request, { reason: 'Only the requester may withdraw this request.' }, actingUser, 'denied'); fail('Only the requester may withdraw this request.', 'PERMISSION_DENIED'); }
    if (nextStatus === 'cancelled' && role(actingUser?.role) !== 'admin') { audit('deny-cancel', request, { reason: 'Only an Administrator may cancel requests.' }, actingUser, 'denied'); fail('Only an Administrator may cancel this request.', 'PERMISSION_DENIED'); }
    if (nextStatus === 'withdrawn') PermissionService.require('approval.own.withdraw', { actor: actingUser });
    if (nextStatus === 'cancelled') PermissionService.require('approval.any.cancel', { actor: actingUser });
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
    if (actingRole === 'dean') return filterRecords(filters).filter(item => item.reviewerRole === 'dean');
    if (['coordinator', 'faculty'].includes(actingRole)) return filterRecords(filters).filter(item => item.requesterId === actingUser.username);
    return [];
  }
  function query(filters = {}, suppliedActor = null) { return queryFor(suppliedActor, filters); }
  function registerApplyHandler(type, handler) { if (!types[type] || typeof handler !== 'function') fail('Invalid approval apply handler.'); applyHandlers.set(type, handler); }
  return { statuses, types, submit, approve: (id, remarks, actor) => decide(id, 'approved', remarks, actor), reject: (id, remarks, actor) => decide(id, 'rejected', remarks, actor), withdraw: (id, remarks, actor) => closeOwn(id, 'withdrawn', remarks, actor), cancel: (id, remarks, actor) => closeOwn(id, 'cancelled', remarks, actor), query, queryFor, registerApplyHandler };
})();

if (typeof window !== 'undefined') window.ApprovalService = ApprovalService;
