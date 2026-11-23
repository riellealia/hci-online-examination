const assert = require('assert');
const {load,SEED}=require('./harness');

const seed = SEED();
const studentPage = load('student.html', { ...seed, currentUser:{ username:'S1', role:'student' } });
assert.strictEqual(typeof studentPage.w.PermissionService.profileAccessFor, 'function', 'profile access helper is exposed');

const studentAccess = studentPage.w.PermissionService.profileAccessFor('student', { viewerId:'S1', ownerId:'S1' });
assert.strictEqual(studentAccess.tabs.join('|'), 'overview', 'student sees only the public overview tab');
assert.ok(!studentAccess.tabs.includes('grades') && !studentAccess.tabs.includes('login'), 'student cannot see private grading or login tabs');
assert.ok(studentAccess.actions.length === 0 || !studentAccess.actions.some(action => ['edit','deactivate','grade'].includes(action)), 'student does not get privileged profile actions');

const facultyAccess = studentPage.w.PermissionService.profileAccessFor('faculty', { viewerId:'F1', ownerId:'S1' });
assert.ok(facultyAccess.tabs.includes('overview'), 'faculty can view overview');
assert.ok(facultyAccess.tabs.includes('grades'), 'faculty can view grades');
assert.ok(!facultyAccess.tabs.includes('login'), 'faculty cannot view the login tab');

studentPage.w.RoleProfileViewer.openStudent('S1', { viewerRole:'student', viewerId:'S1' });
assert.ok(!studentPage.d.querySelector('.role-profile-tabs'), 'student profile viewer hides tab controls for non-permitted roles');
studentPage.w.RoleProfileViewer.close();

const adminPage = load('admin.html', { ...seed, currentUser:{ username:'admin', role:'admin' } });
const adminAccess = adminPage.w.PermissionService.profileAccessFor('admin', { viewerId:'admin', ownerId:'S1' });
assert.ok(adminAccess.tabs.includes('login'), 'admin still sees the sensitive login tab');
assert.ok(adminAccess.actions.includes('edit'), 'admin keeps edit actions enabled');

console.log('profile permissions test passed');
