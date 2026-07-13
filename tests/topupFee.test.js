const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateTopupFee } = require('../utilities/topupFee');

test('applies 1.5% topup fee capped at 50 naira', () => {
  assert.equal(calculateTopupFee(1000), 15);
  assert.equal(calculateTopupFee(5000), 50);
  assert.equal(calculateTopupFee(10000), 50);
  assert.equal(calculateTopupFee(0), 0);
  assert.equal(calculateTopupFee(-10), 0);
});
