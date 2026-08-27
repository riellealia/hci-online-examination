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
