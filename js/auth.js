/* ============================================================
   Shared session + storage layer
   ------------------------------------------------------------
   Every dashboard page loads this BEFORE its own script. It is the
   single place that decides who is logged in and which page they are
   allowed to open (the "logic gate" from the project plan).
   ============================================================ */

/* DB lives in storage.js, which every page loads before this file. It is the
   single owner of localStorage access and reports read/write failures. */

/* Returns the logged-in user, or null if there is no valid session. */
function getSession() {
  const user = DB.read('currentUser', null);
  if (!user || !user.username || !user.role) return null;
  return user;
}

/* Gate a page to a single role.
   Returns the session on success. On failure it redirects and returns null —
   callers MUST stop executing, e.g.:

       const session = requireRole('admin');
       if (!session) throw new Error('Not authorised — redirecting.');
*/
function requireRole(role) {
  const session = getSession();

  // Not logged in at all.
  if (!session) {
    window.location.replace('index.html');
    return null;
  }

  // Logged in, but as the wrong role — a student cannot open the admin page.
  if (session.role !== role) {
    window.location.replace('index.html');
    return null;
  }

  const access = DB.read('systemSettings', {});
  const roleAllowed = role === 'faculty' ? access.allowFacultyLogin !== false
    : role === 'student' ? access.allowStudentLogin !== false : true;
  if (role !== 'admin' && (access.maintenance || !roleAllowed)) {
    DB.write('accessNotice', access.maintenance
      ? (access.maintenanceMessage || 'The portal is currently under maintenance.')
      : `${role === 'faculty' ? 'Faculty' : 'Student'} access is currently paused by the administrator.`);
    DB.remove('currentUser');
    window.location.replace('index.html');
    return null;
  }

  const now = Date.now();
  const timeout = Math.max(15, Number(access.sessionTimeoutMinutes) || 120) * 60000;
  if (role !== 'admin' && session.lastActivityAt && now - session.lastActivityAt > timeout) {
    DB.write('accessNotice', 'Your session expired. Please log in again.');
    DB.remove('currentUser');
    window.location.replace('index.html');
    return null;
  }
  if (!session.lastActivityAt) {
    session.lastActivityAt = now;
    DB.write('currentUser', session);
  }

  // The account must still exist. Without this, deleting a user in the admin
  // panel would leave their already-open session working indefinitely.
  const users = DB.read('users', []);
  const stillValid = users.some(
    u => u.username === session.username && u.role === role
  );
  if (!stillValid) {
    localStorage.removeItem('currentUser');
    window.location.replace('index.html');
    return null;
  }

  return session;
}

/* Ends the session properly. Previously admin and faculty only redirected,
   which left currentUser in storage and the session effectively still open. */
function logout() {
  localStorage.removeItem('currentUser');
  window.location.replace('index.html');
}

// Keep the inactivity timer current without coupling individual pages to the
// access-rule implementation.
let lastSessionTouch = 0;
function touchSession() {
  const now = Date.now();
  if (now - lastSessionTouch < 30000) return;
  const session = getSession();
  if (!session) return;
  session.lastActivityAt = now;
  DB.write('currentUser', session);
  lastSessionTouch = now;
}
['click','keydown','pointerdown'].forEach(type =>
  window.addEventListener(type, touchSession, { passive: true }));
