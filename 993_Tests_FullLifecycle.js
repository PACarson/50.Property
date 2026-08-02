/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 993_Tests_FullLifecycle.js
 * GAS-native tests — real SpreadsheetApp. Every Command's validation,
 * success, and idempotency paths; full Active→Paid→Active→Paid cycles;
 * cancel/pause/resume; queries. This is the GAS-native replacement for
 * what used to be split across the Node-only sandbox's
 * 912_Tests_ObligationEngine.js and 919_Tests_ObligationIntegration.js
 * — that directory has been removed from this project.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠ Same safety requirement as 991: run only from a spreadsheet whose
 * name contains "TEST" (enforced by assertRunningInTestSpreadsheet_,
 * defined in 991 — same project, same global scope, no import needed).
 *
 * Run runAllFullLifecycleTests() directly from the Script Editor.
 * Call cleanupTestData_() (also in 991) afterward if you want the test
 * sheet tidy — safe to leave the rows too, they're all tagged
 * PROP-TEST-... and ignored by anything that isn't this suite.
 * ═══════════════════════════════════════════════════════════════════════
 */

function baseObligationInput_(overrides) {
  var due = new Date();
  due.setDate(due.getDate() + 10);
  var input = {
    propertyId: testPropertyId_(),
    category: 'Mortgage',
    payee: 'Test Bank',
    amount: 1500,
    frequencyType: 'Monthly',
    dueAnchor: toIsoDate_(due)
  };
  for (var k in (overrides || {})) input[k] = overrides[k];
  return input;
}

function runAllFullLifecycleTests() {
  assertRunningInTestSpreadsheet_();
  var s = makeGasTestSuite_('993_Tests_FullLifecycle (real GAS, real Sheets)');
  initObligationSchema_();

  // ─── createObligation ────────────────────────────────────────────

  s.test('createObligation rejects an unknown category', function () {
    s.assertThrows(function () { createObligation(baseObligationInput_({ category: 'NotARealCategory' })); }, 'INVALID_CATEGORY');
  });

  s.test('createObligation rejects an unknown frequency type', function () {
    s.assertThrows(function () { createObligation(baseObligationInput_({ frequencyType: 'Fortnightly' })); }, 'INVALID_FREQUENCY');
  });

  s.test('createObligation rejects Custom frequency without a positive customIntervalDays', function () {
    s.assertThrows(function () { createObligation(baseObligationInput_({ frequencyType: 'Custom' })); }, 'INVALID_FREQUENCY');
  });

  s.test('createObligation rejects a non-positive amount', function () {
    s.assertThrows(function () { createObligation(baseObligationInput_({ amount: 0 })); }, 'INVALID_INPUT');
  });

  s.test('createObligation rejects a malformed propertyId', function () {
    s.assertThrows(function () { createObligation(baseObligationInput_({ propertyId: 'NOTPROP-1' })); });
  });

  s.test('createObligation succeeds: creates the Rule and its first Occurrence with the right EffectiveDue', function () {
    var input = baseObligationInput_();
    var result = createObligation(input);
    s.assertTrue(result.success);
    s.assertTrue(result.obligationId.indexOf('OBL-') === 0);
    var occ = getOccurrence(result.occurrenceId);
    s.assertEqual(occ.EffectiveDue, input.dueAnchor);
    s.assertEqual(occ.Status, 'Active');
  });

  s.test('createObligation with a ClientRequestID is idempotent', function () {
    var input = baseObligationInput_({ clientRequestId: 'TEST-idem-' + new Date().getTime() });
    var first = createObligation(input);
    var second = createObligation(input);
    s.assertEqual(first.obligationId, second.obligationId);
  });

  // ─── updateObligation ────────────────────────────────────────────

  s.test('updateObligation rejects changing Status via changedFields', function () {
    var created = createObligation(baseObligationInput_());
    s.assertThrows(function () {
      updateObligation({ obligationId: created.obligationId, changedFields: { Status: 'Cancelled' } });
    }, 'INVALID_INPUT');
  });

  s.test('updateObligation rejects updating a Cancelled Rule', function () {
    var created = createObligation(baseObligationInput_());
    cancelObligation({ obligationId: created.obligationId });
    s.assertThrows(function () {
      updateObligation({ obligationId: created.obligationId, changedFields: { Payee: 'New Payee' } });
    }, 'OBLIGATION_IMMUTABLE');
  });

  s.test('updateObligation successfully changes a field', function () {
    var created = createObligation(baseObligationInput_());
    updateObligation({ obligationId: created.obligationId, changedFields: { Payee: 'New Bank Name' } });
    s.assertEqual(getObligation(created.obligationId).Payee, 'New Bank Name');
  });

  // ─── recordPayment ───────────────────────────────────────────────

  s.test('recordPayment rejects an unknown occurrenceId', function () {
    s.assertThrows(function () { recordPayment({ occurrenceId: 'OCC-does-not-exist' }); }, 'OCCURRENCE_NOT_FOUND');
  });

  s.test('recordPayment rejects paying against a Cancelled Obligation', function () {
    var created = createObligation(baseObligationInput_());
    cancelObligation({ obligationId: created.obligationId });
    s.assertThrows(function () { recordPayment({ occurrenceId: created.occurrenceId }); }, 'OBLIGATION_CANCELLED');
  });

  s.test('recordPayment succeeds: Active -> Paid, payment fields recorded', function () {
    var created = createObligation(baseObligationInput_());
    var result = recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1500, paidVia: 'Manual' });
    s.assertTrue(result.success && !result.alreadyPaid);
    var occ = getOccurrence(created.occurrenceId);
    s.assertEqual(occ.Status, 'Paid');
    s.assertEqual(occ.PaidAmount, 1500);
  });

  s.test('recordPayment is idempotent — paying an already-Paid Occurrence returns alreadyPaid', function () {
    var created = createObligation(baseObligationInput_());
    recordPayment({ occurrenceId: created.occurrenceId });
    var second = recordPayment({ occurrenceId: created.occurrenceId });
    s.assertTrue(second.alreadyPaid);
  });

  s.test('recordPayment on Active(AutoGenerate) rolls to the next Occurrence, Monthly month-end clamp holds', function () {
    var created = createObligation(baseObligationInput_({ dueAnchor: '2026-01-31', frequencyType: 'Monthly' }));
    var result = recordPayment({ occurrenceId: created.occurrenceId });
    s.assertTrue(result.nextOccurrenceId !== null);
    s.assertEqual(getOccurrence(result.nextOccurrenceId).EffectiveDue, '2026-02-28');
  });

  s.test('recordPayment on a Suspended obligation succeeds but schedules no next Occurrence', function () {
    var created = createObligation(baseObligationInput_());
    pauseObligation({ obligationId: created.obligationId });
    var result = recordPayment({ occurrenceId: created.occurrenceId });
    s.assertTrue(result.success && result.nextOccurrenceId === null);
  });

  s.test('recordPayment respects AutoGenerate=false', function () {
    var created = createObligation(baseObligationInput_({ autoGenerate: false }));
    var result = recordPayment({ occurrenceId: created.occurrenceId });
    s.assertTrue(result.nextOccurrenceId === null);
  });

  s.test('recordPayment past a Rule EndDate transitions the Rule to Completed', function () {
    var created = createObligation(baseObligationInput_({
      dueAnchor: '2026-06-15', frequencyType: 'Monthly', endDate: '2026-07-01'
    }));
    recordPayment({ occurrenceId: created.occurrenceId });
    s.assertEqual(getObligation(created.obligationId).Status, 'Completed');
  });

  // ─── cancel / pause / resume ─────────────────────────────────────

  s.test('cancelObligation twice rejects the second call with ALREADY_CANCELLED', function () {
    var created = createObligation(baseObligationInput_());
    cancelObligation({ obligationId: created.obligationId });
    s.assertThrows(function () { cancelObligation({ obligationId: created.obligationId }); }, 'ALREADY_CANCELLED');
  });

  s.test('pauseObligation twice rejects the second call with ALREADY_PAUSED', function () {
    var created = createObligation(baseObligationInput_());
    pauseObligation({ obligationId: created.obligationId });
    s.assertThrows(function () { pauseObligation({ obligationId: created.obligationId }); }, 'ALREADY_PAUSED');
  });

  s.test('resumeObligation on a non-Suspended Rule rejects with NOT_PAUSED', function () {
    var created = createObligation(baseObligationInput_());
    s.assertThrows(function () { resumeObligation({ obligationId: created.obligationId }); }, 'NOT_PAUSED');
  });

  s.test('pause then resume returns the Rule to Active', function () {
    var created = createObligation(baseObligationInput_());
    pauseObligation({ obligationId: created.obligationId });
    resumeObligation({ obligationId: created.obligationId });
    s.assertEqual(getObligation(created.obligationId).Status, 'Active');
  });

  // ─── reversePayment (ADR-P06) ────────────────────────────────────

  s.test('reversePayment rejects an Occurrence that is not Paid', function () {
    var created = createObligation(baseObligationInput_());
    s.assertThrows(function () { reversePayment({ occurrenceId: created.occurrenceId }); }, 'OCCURRENCE_NOT_PAID');
  });

  s.test('reversePayment moves Paid back to Active and records the reversal', function () {
    var created = createObligation(baseObligationInput_());
    recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1500 });
    var rev = reversePayment({ occurrenceId: created.occurrenceId, reason: 'wrong amount' });
    s.assertEqual(rev.reversedAmount, 1500);
    var occ = getOccurrence(created.occurrenceId);
    s.assertEqual(occ.Status, 'Active');
    s.assertTrue(!!occ.ReversedAt);
  });

  s.test('re-paying after a reversal clears ReversedAt', function () {
    var created = createObligation(baseObligationInput_());
    recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1500 });
    reversePayment({ occurrenceId: created.occurrenceId, reason: 'wrong amount' });
    recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1550 });
    var occ = getOccurrence(created.occurrenceId);
    s.assertEqual(occ.Status, 'Paid');
    s.assertEqual(occ.PaidAmount, 1550);
    s.assertEqual(occ.ReversedAt, '');
  });

  // ─── AI Query Contract (§8) ──────────────────────────────────────

  s.test('queryUpcomingPayments filters by date range', function () {
    var pid = testPropertyId_();
    var near = new Date(); near.setDate(near.getDate() + 5);
    var far = new Date(); far.setDate(far.getDate() + 60);
    createObligation(baseObligationInput_({ propertyId: pid, dueAnchor: toIsoDate_(near) }));
    createObligation(baseObligationInput_({ propertyId: pid, dueAnchor: toIsoDate_(far) }));
    var from = new Date(); var to = new Date(); to.setDate(to.getDate() + 30);
    var result = queryUpcomingPayments({ propertyId: pid, from: toIsoDate_(from), to: toIsoDate_(to) });
    s.assertEqual(result.results.length, 1);
  });

  s.test('queryOverdue finds a genuinely overdue occurrence and excludes a paid one', function () {
    var pid = testPropertyId_();
    var overdueOne = createObligation(baseObligationInput_({ propertyId: pid, dueAnchor: '2025-01-01' }));
    var paidOne = createObligation(baseObligationInput_({ propertyId: pid, dueAnchor: '2025-01-01' }));
    recordPayment({ occurrenceId: paidOne.occurrenceId });
    var result = queryOverdue({ propertyId: pid });
    var ids = result.results.map(function (r) { return r.OccurrenceID; });
    s.assertTrue(ids.indexOf(overdueOne.occurrenceId) !== -1);
    s.assertTrue(ids.indexOf(paidOne.occurrenceId) === -1);
  });

  var summary = s.report();
  Logger.log('\nThis run\'s rows are tagged PROP-TEST-... — call cleanupTestData_() when done inspecting them.');
  return summary;
}
