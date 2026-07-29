'use strict';
const path = require('path');
const { loadPropertyOSContext, OBLIGATION_ENGINE_FILES } = require('../shim/GasShim');
const { makeSuite } = require('../shim/TestKit');

const SOURCE_DIR = path.join(__dirname, '..', '..', 'property-os');

function freshCtx() {
  return loadPropertyOSContext(SOURCE_DIR, OBLIGATION_ENGINE_FILES);
}

// Relative-to-real-today helpers so date-dependent tests stay valid no
// matter what day this actually runs on.
function isoDaysFromToday(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function baseObligationInput(overrides) {
  return Object.assign({
    propertyId: 'PROP-test-1',
    category: 'Mortgage',
    payee: 'Test Bank',
    amount: 1500,
    frequencyType: 'Monthly',
    dueAnchor: isoDaysFromToday(10) // due 10 days from now, unless overridden
  }, overrides || {});
}

function runAllObligationEngineTests() {
  const s = makeSuite('912_Tests_ObligationEngine');

  // ─── createObligation ───────────────────────────────────────────────

  s.test('createObligation rejects an unknown category', () => {
    const { ctx } = freshCtx();
    s.assertThrows(() => ctx.createObligation(baseObligationInput({ category: 'NotARealCategory' })), 'INVALID_CATEGORY');
  });

  s.test('createObligation rejects an unknown frequency type', () => {
    const { ctx } = freshCtx();
    s.assertThrows(() => ctx.createObligation(baseObligationInput({ frequencyType: 'Fortnightly' })), 'INVALID_FREQUENCY');
  });

  s.test('createObligation rejects Custom frequency without a positive customIntervalDays', () => {
    const { ctx } = freshCtx();
    s.assertThrows(() => ctx.createObligation(baseObligationInput({ frequencyType: 'Custom' })), 'INVALID_FREQUENCY');
  });

  s.test('createObligation rejects a non-positive amount', () => {
    const { ctx } = freshCtx();
    s.assertThrows(() => ctx.createObligation(baseObligationInput({ amount: 0 })), 'INVALID_INPUT');
  });

  s.test('createObligation rejects a malformed propertyId', () => {
    const { ctx } = freshCtx();
    s.assertThrows(() => ctx.createObligation(baseObligationInput({ propertyId: 'NOTPROP-1' })));
  });

  s.test('createObligation succeeds and creates both the Rule and its first Occurrence', () => {
    const { ctx, spreadsheet } = freshCtx();
    const result = ctx.createObligation(baseObligationInput());
    s.assertTrue(result.success);
    s.assertTrue(result.obligationId.indexOf('OBL-') === 0);
    s.assertTrue(result.occurrenceId.indexOf('OCC-') === 0);

    const ruleSheet = spreadsheet.getSheetByName('ObligationRules');
    s.assertEqual(ruleSheet.getLastRow(), 2, 'expected header + 1 rule row');

    const occ = ctx.getOccurrence(result.occurrenceId);
    s.assertEqual(occ.EffectiveDue, isoDaysFromToday(10));
    s.assertEqual(occ.Status, 'Active');
  });

  s.test('createObligation with a ClientRequestID is idempotent — second call does not create a second Rule', () => {
    const { ctx, spreadsheet } = freshCtx();
    const input = baseObligationInput({ clientRequestId: 'client-req-abc' });
    const first = ctx.createObligation(input);
    const second = ctx.createObligation(input);
    s.assertEqual(first.obligationId, second.obligationId);
    const ruleSheet = spreadsheet.getSheetByName('ObligationRules');
    s.assertEqual(ruleSheet.getLastRow(), 2, 'expected still only header + 1 rule row after a duplicate request');
  });

  // ─── updateObligation ───────────────────────────────────────────────

  s.test('updateObligation rejects changing Status via changedFields', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());
    s.assertThrows(() => ctx.updateObligation({
      obligationId: created.obligationId,
      changedFields: { Status: 'Cancelled' }
    }), 'INVALID_INPUT');
  });

  s.test('updateObligation rejects updating a Cancelled Rule', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());
    ctx.cancelObligation({ obligationId: created.obligationId });
    s.assertThrows(() => ctx.updateObligation({
      obligationId: created.obligationId,
      changedFields: { Payee: 'New Payee' }
    }), 'OBLIGATION_IMMUTABLE');
  });

  s.test('updateObligation successfully changes a field', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());
    ctx.updateObligation({ obligationId: created.obligationId, changedFields: { Payee: 'New Bank Name' } });
    const rule = ctx.getObligation(created.obligationId);
    s.assertEqual(rule.Payee, 'New Bank Name');
  });

  // ─── recordPayment ──────────────────────────────────────────────────

  s.test('recordPayment rejects an unknown occurrenceId', () => {
    const { ctx } = freshCtx();
    s.assertThrows(() => ctx.recordPayment({ occurrenceId: 'OCC-does-not-exist' }), 'OCCURRENCE_NOT_FOUND');
  });

  s.test('recordPayment rejects paying against a Cancelled Obligation', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());
    ctx.cancelObligation({ obligationId: created.obligationId });
    s.assertThrows(() => ctx.recordPayment({ occurrenceId: created.occurrenceId }), 'OBLIGATION_CANCELLED');
  });

  s.test('recordPayment succeeds: transitions Active to Paid and records payment fields', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());
    const result = ctx.recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1500, paidVia: 'Manual' });
    s.assertTrue(result.success);
    s.assertTrue(!result.alreadyPaid);
    const occ = ctx.getOccurrence(created.occurrenceId);
    s.assertEqual(occ.Status, 'Paid');
    s.assertEqual(occ.PaidAmount, 1500);
    s.assertEqual(occ.PaidVia, 'Manual');
  });

  s.test('recordPayment is idempotent — paying an already-Paid Occurrence returns alreadyPaid, does not error', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());
    ctx.recordPayment({ occurrenceId: created.occurrenceId });
    const second = ctx.recordPayment({ occurrenceId: created.occurrenceId });
    s.assertTrue(second.success);
    s.assertTrue(second.alreadyPaid);
  });

  s.test('recordPayment on an Active(AutoGenerate) obligation creates the next Occurrence one Monthly cycle later', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput({ dueAnchor: '2026-01-31', frequencyType: 'Monthly' }));
    const result = ctx.recordPayment({ occurrenceId: created.occurrenceId });
    s.assertTrue(result.nextOccurrenceId !== null, 'expected a next Occurrence to be scheduled');
    const nextOcc = ctx.getOccurrence(result.nextOccurrenceId);
    // Jan 31 + 1 month must clamp to Feb 28 (2026 is not a leap year), not overflow into March.
    s.assertEqual(nextOcc.EffectiveDue, '2026-02-28');
  });

  s.test('recordPayment on a Suspended obligation still succeeds, but schedules no next Occurrence', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());
    ctx.pauseObligation({ obligationId: created.obligationId });
    const result = ctx.recordPayment({ occurrenceId: created.occurrenceId });
    s.assertTrue(result.success);
    s.assertTrue(result.nextOccurrenceId === null, 'a Suspended Rule must not roll forward to a new cycle');
  });

  s.test('recordPayment respects AutoGenerate=false — no next Occurrence is created', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput({ autoGenerate: false }));
    const result = ctx.recordPayment({ occurrenceId: created.occurrenceId });
    s.assertTrue(result.nextOccurrenceId === null);
  });

  s.test('recordPayment past a Rule EndDate transitions the Rule to Completed instead of scheduling a next Occurrence', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput({
      dueAnchor: '2026-06-15', frequencyType: 'Monthly', endDate: '2026-07-01'
    }));
    ctx.recordPayment({ occurrenceId: created.occurrenceId }); // next cycle (Jul 15) is past EndDate (Jul 1)
    const rule = ctx.getObligation(created.obligationId);
    s.assertEqual(rule.Status, 'Completed');
  });

  // ─── cancel / pause / resume ────────────────────────────────────────

  s.test('cancelObligation twice: second call rejects with ALREADY_CANCELLED', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());
    ctx.cancelObligation({ obligationId: created.obligationId });
    s.assertThrows(() => ctx.cancelObligation({ obligationId: created.obligationId }), 'ALREADY_CANCELLED');
  });

  s.test('pauseObligation then pauseObligation again rejects with ALREADY_PAUSED', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());
    ctx.pauseObligation({ obligationId: created.obligationId });
    s.assertThrows(() => ctx.pauseObligation({ obligationId: created.obligationId }), 'ALREADY_PAUSED');
  });

  s.test('resumeObligation on a non-Suspended Rule rejects with NOT_PAUSED', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());
    s.assertThrows(() => ctx.resumeObligation({ obligationId: created.obligationId }), 'NOT_PAUSED');
  });

  s.test('pause then resume returns the Rule to Active', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());
    ctx.pauseObligation({ obligationId: created.obligationId });
    ctx.resumeObligation({ obligationId: created.obligationId });
    const rule = ctx.getObligation(created.obligationId);
    s.assertEqual(rule.Status, 'Active');
  });

  // ─── reversePayment (ADR-P06) ───────────────────────────────────────

  s.test('reversePayment rejects an Occurrence that is not Paid', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());
    s.assertThrows(() => ctx.reversePayment({ occurrenceId: created.occurrenceId }), 'OCCURRENCE_NOT_PAID');
  });

  s.test('reversePayment moves Paid back to Active and records the reversal', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());
    ctx.recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1500 });
    const rev = ctx.reversePayment({ occurrenceId: created.occurrenceId, reason: 'wrong amount' });
    s.assertTrue(rev.success);
    s.assertEqual(rev.reversedAmount, 1500);
    const occ = ctx.getOccurrence(created.occurrenceId);
    s.assertEqual(occ.Status, 'Active');
    s.assertTrue(!!occ.ReversedAt);
    s.assertEqual(occ.ReversalReason, 'wrong amount');
  });

  s.test('re-paying after a reversal clears ReversedAt (State Machine\'s sole Paid-exit path stays clean for the next cycle)', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());
    ctx.recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1500 });
    ctx.reversePayment({ occurrenceId: created.occurrenceId, reason: 'wrong amount' });
    ctx.recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1550 });
    const occ = ctx.getOccurrence(created.occurrenceId);
    s.assertEqual(occ.Status, 'Paid');
    s.assertEqual(occ.PaidAmount, 1550);
    s.assertEqual(occ.ReversedAt, '', 'ReversedAt must be cleared on successful repayment');
  });

  // ─── State Machine guards, directly ─────────────────────────────────

  s.test('assertRuleTransition_ forbids Cancelled -> Active', () => {
    const { ctx } = freshCtx();
    s.assertThrows(() => ctx.assertRuleTransition_('Cancelled', 'Active'), 'FORBIDDEN_TRANSITION');
  });

  s.test('assertOccurrenceTransition_ forbids Paid -> Cancelled via the generic path (ReversePayment is the only Paid exit)', () => {
    const { ctx } = freshCtx();
    s.assertThrows(() => ctx.assertOccurrenceTransition_('Paid', 'Cancelled'), 'FORBIDDEN_TRANSITION');
  });

  // ─── Frequency date math (913) ──────────────────────────────────────

  s.test('addFrequencyToDate_ Weekly adds exactly 7 days', () => {
    const { ctx } = freshCtx();
    const result = ctx.addFrequencyToDate_(ctx.parseIsoDate_('2026-07-01'), 'Weekly');
    s.assertEqual(ctx.toIsoDate_(result), '2026-07-08');
  });

  s.test('addFrequencyToDate_ Monthly clamps Jan 31 to Feb 28 in a non-leap year', () => {
    const { ctx } = freshCtx();
    const result = ctx.addFrequencyToDate_(ctx.parseIsoDate_('2026-01-31'), 'Monthly');
    s.assertEqual(ctx.toIsoDate_(result), '2026-02-28');
  });

  s.test('addFrequencyToDate_ Monthly clamps Jan 31 to Feb 29 in a leap year', () => {
    const { ctx } = freshCtx();
    const result = ctx.addFrequencyToDate_(ctx.parseIsoDate_('2028-01-31'), 'Monthly');
    s.assertEqual(ctx.toIsoDate_(result), '2028-02-29');
  });

  s.test('addFrequencyToDate_ Quarterly/HalfYearly/Yearly add the right number of months', () => {
    const { ctx } = freshCtx();
    s.assertEqual(ctx.toIsoDate_(ctx.addFrequencyToDate_(ctx.parseIsoDate_('2026-01-15'), 'Quarterly')), '2026-04-15');
    s.assertEqual(ctx.toIsoDate_(ctx.addFrequencyToDate_(ctx.parseIsoDate_('2026-01-15'), 'HalfYearly')), '2026-07-15');
    s.assertEqual(ctx.toIsoDate_(ctx.addFrequencyToDate_(ctx.parseIsoDate_('2026-01-15'), 'Yearly')), '2027-01-15');
  });

  s.test('addFrequencyToDate_ Custom adds the given number of days', () => {
    const { ctx } = freshCtx();
    const result = ctx.addFrequencyToDate_(ctx.parseIsoDate_('2026-07-01'), 'Custom', 45);
    s.assertEqual(ctx.toIsoDate_(result), '2026-08-15');
  });

  s.test('addFrequencyToDate_ throws INVALID_FREQUENCY for an unknown type', () => {
    const { ctx } = freshCtx();
    s.assertThrows(() => ctx.addFrequencyToDate_(ctx.parseIsoDate_('2026-07-01'), 'Fortnightly'), 'INVALID_FREQUENCY');
  });

  // ─── Overdue — Derived State (913) ──────────────────────────────────

  s.test('isOccurrenceOverdue_ is true for an Active occurrence past its due date with no grace period', () => {
    const { ctx } = freshCtx();
    const occ = { Status: 'Active', EffectiveDue: isoDaysFromToday(-5) };
    const rule = { GraceDays: 0 };
    s.assertTrue(ctx.isOccurrenceOverdue_(occ, rule));
  });

  s.test('isOccurrenceOverdue_ is false while still inside the grace period', () => {
    const { ctx } = freshCtx();
    const occ = { Status: 'Active', EffectiveDue: isoDaysFromToday(-2) };
    const rule = { GraceDays: 5 };
    s.assertTrue(!ctx.isOccurrenceOverdue_(occ, rule));
  });

  s.test('isOccurrenceOverdue_ is false for a Paid occurrence regardless of date', () => {
    const { ctx } = freshCtx();
    const occ = { Status: 'Paid', EffectiveDue: isoDaysFromToday(-100) };
    s.assertTrue(!ctx.isOccurrenceOverdue_(occ, { GraceDays: 0 }));
  });

  // ─── AI Query Contract (§8) ─────────────────────────────────────────

  s.test('queryUpcomingPayments returns an empty result set against an empty sheet', () => {
    const { ctx } = freshCtx();
    ctx.initObligationSchema_();
    const result = ctx.queryUpcomingPayments({});
    s.assertEqual(result.results, []);
    s.assertEqual(result.kind, 'authoritative');
  });

  s.test('queryUpcomingPayments filters by date range', () => {
    const { ctx } = freshCtx();
    ctx.createObligation(baseObligationInput({ dueAnchor: isoDaysFromToday(5) }));
    ctx.createObligation(baseObligationInput({ dueAnchor: isoDaysFromToday(60) }));
    const result = ctx.queryUpcomingPayments({ from: isoDaysFromToday(0), to: isoDaysFromToday(30) });
    s.assertEqual(result.results.length, 1);
  });

  s.test('queryUpcomingPayments filters by propertyId', () => {
    const { ctx } = freshCtx();
    ctx.createObligation(baseObligationInput({ propertyId: 'PROP-aaa' }));
    ctx.createObligation(baseObligationInput({ propertyId: 'PROP-bbb' }));
    const result = ctx.queryUpcomingPayments({ propertyId: 'PROP-aaa' });
    s.assertEqual(result.results.length, 1);
  });

  s.test('queryOverdue finds a genuinely overdue occurrence and excludes a paid one', () => {
    const { ctx } = freshCtx();
    const overdueOne = ctx.createObligation(baseObligationInput({ dueAnchor: isoDaysFromToday(-10) }));
    const paidOne = ctx.createObligation(baseObligationInput({ dueAnchor: isoDaysFromToday(-10) }));
    ctx.recordPayment({ occurrenceId: paidOne.occurrenceId });
    const result = ctx.queryOverdue({});
    s.assertEqual(result.results.length, 1);
    s.assertEqual(result.results[0].OccurrenceID, overdueOne.occurrenceId);
  });

  return s.report();
}

if (require.main === module) {
  const result = runAllObligationEngineTests();
  process.exit(result.failed > 0 ? 1 : 0);
}

module.exports = { runAllObligationEngineTests };
