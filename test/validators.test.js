import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMoneyNaira, validateMessage, validateReview, validateText } from '../server/validators/input.js';

test('money parsing keeps whole-naira input precise to kobo', () => {
  assert.deepEqual(parseMoneyNaira('1250.50'), { naira: 1250.5, kobo: 125050 });
  assert.match(parseMoneyNaira('1.999').error, /2 decimal/);
  assert.match(parseMoneyNaira('-1').error, /positive/);
});

test('message validation rejects empty and oversized content', () => {
  assert.equal(validateMessage({ body: '', imageUrl: '' }), 'Write a message or attach a photo.');
  assert.match(validateMessage({ body: 'x'.repeat(4001) }), /no more than 4000/);
  assert.equal(validateMessage({ body: 'Payment secured' }), null);
});

test('review validation enforces rating range and URL protocol', () => {
  assert.match(validateReview({ rating: 6 }), /1 to 5/);
  assert.match(validateReview({ rating: 5, photoUrl: 'javascript:alert(1)' }), /invalid/);
  assert.equal(validateReview({ rating: 5, comment: 'Good work' }), null);
});

test('text validation rejects control characters', () => {
  assert.match(validateText('hello\u0000world', 'Message'), /invalid/);
});
