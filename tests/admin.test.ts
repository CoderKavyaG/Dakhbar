import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adminRouteStatus, decideAdminAccess, isAdmin } from '../src/lib/admin-access';

const user = { id: 'user_1', emailAddresses: [{ emailAddress: 'codecraftkavya@gmail.com', verification: { status: 'verified' } }] };

test('admin authorization fails closed and only accepts the allowlisted verified email', () => {
  assert.equal(isAdmin(null, { email: 'codecraftkavya@gmail.com' }), false);
  assert.equal(isAdmin(user, {}), false);
  assert.equal(isAdmin(user, { email: 'CODECRAFTKAVYA@gmail.com' }), true);
  assert.equal(isAdmin(user, { email: 'someone@example.com' }), false);
  assert.equal(isAdmin({ ...user, emailAddresses: [{ emailAddress: 'codecraftkavya@gmail.com', verification: { status: 'unverified' } }] }, { email: 'codecraftkavya@gmail.com' }), false);
});

test('a configured user ID takes precedence, preventing a second allowlisted identity', () => {
  assert.equal(isAdmin(user, { userId: 'user_1' }), true);
  assert.equal(isAdmin(user, { userId: 'user_2', email: 'codecraftkavya@gmail.com' }), false);
});

test('admin route returns 200 only for the allowlisted identity and redirects everyone else', () => {
  const allowlist = { email: 'codecraftkavya@gmail.com' };
  assert.equal(adminRouteStatus(decideAdminAccess(user.id, user, allowlist)), 200);
  assert.equal(adminRouteStatus(decideAdminAccess(null, null, allowlist)), 307);
  assert.equal(adminRouteStatus(decideAdminAccess('user_2', { id: 'user_2', emailAddresses: [{ emailAddress: 'other@example.com', verification: { status: 'verified' } }] }, allowlist)), 307);
});
