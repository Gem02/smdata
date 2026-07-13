const test = require('node:test');
const assert = require('node:assert/strict');
const { isReferralEligible, calculateReferralCommission } = require('../utilities/referralCommission');

test('marks users within the 50-day window as eligible', () => {
  const user = { createdAt: new Date('2026-06-23T00:00:00.000Z') };
  const now = new Date('2026-08-12T00:00:00.000Z');

  assert.equal(isReferralEligible(user, now), true);
});

test('marks users outside the 50-day window as ineligible', () => {
  const user = { createdAt: new Date('2026-05-01T00:00:00.000Z') };
  const now = new Date('2026-08-10T00:00:00.000Z');

  assert.equal(isReferralEligible(user, now), false);
});

test('calculates a commission from the transaction amount', () => {
  assert.equal(calculateReferralCommission(1000), 50);
});
