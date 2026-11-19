import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRequest } from '../server/validators/request.js';

function run(request) {
  let result = null;
  const res = { status(code) { result = { status: code }; return this; }, json(payload) { result.payload = payload; return result; } };
  let nextCalled = false;
  validateRequest(request, res, () => { nextCalled = true; });
  return { result, nextCalled };
}

test('payment request validation rejects non-positive and malformed amounts', () => {
  const invalid = run({ method: 'POST', path: '/conversations/1/orders', body: { amount: '0', description: 'x' }, query: {} });
  assert.equal(invalid.nextCalled, false);
  assert.equal(invalid.result.status, 400);
  const valid = run({ method: 'POST', path: '/conversations/1/orders', body: { amount: '10.50', description: 'Phone repair' }, query: {} });
  assert.equal(valid.nextCalled, true);
});

test('admin resolution validation does not accept arbitrary actions', () => {
  const result = run({ method: 'POST', path: '/admin/orders/1/resolve', body: { action: 'release', note: 'Release after evidence review' }, query: {} });
  assert.equal(result.nextCalled, true);
  const bad = run({ method: 'POST', path: '/admin/orders/1/resolve', body: { action: 'delete', note: 'no' }, query: {} });
  assert.equal(bad.result.status, 400);
});
