/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 992_Tests_PureLogic.js
 * GAS-native tests — pure functions only, ZERO Sheet writes.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Unlike 991/993, this file never touches SpreadsheetApp for writes, so
 * it does NOT need assertRunningInTestSpreadsheet_ — there's nothing
 * here that could pollute a real spreadsheet. Safe to run from any
 * project state. (It still needs 900-903/912-913/990 present in the
 * same project, for the functions themselves.)
 *
 * Consolidates what used to be split across the Node-only sandbox's
 * 900_Tests_Foundation.js and parts of 912/919_Tests_*.js — that
 * directory has been removed from this project (see 00_Project_State.js
 * changelog). Every pure-logic assertion that suite made is either here
 * or in 993/994; nothing was silently dropped.
 *
 * Run runAllPureLogicTests() directly from the Script Editor.
 * ═══════════════════════════════════════════════════════════════════════
 */

function runAllPureLogicTests() {
  var s = makeGasTestSuite_('992_Tests_PureLogic');

  // ─── Identity ────────────────────────────────────────────────────

  s.test('generateObligationId_ produces OBL-<ts36>-<rand4> shape', function () {
    var id = generateObligationId_();
    s.assertTrue(/^OBL-[0-9a-z]+-[0-9a-z]{4}$/.test(id), 'got: ' + id);
  });

  s.test('generateOccurrenceId_ / generateHistoryId_ use their own prefixes', function () {
    s.assertTrue(generateOccurrenceId_().indexOf('OCC-') === 0);
    s.assertTrue(generateHistoryId_().indexOf('HIST-') === 0);
  });

  s.test('two IDs generated back-to-back are not equal', function () {
    s.assertTrue(generateObligationId_() !== generateObligationId_());
  });

  s.test('assertIdPrefix_ accepts a matching prefix and rejects a mismatch', function () {
    assertIdPrefix_('PROP-abc-1234', 'PROP'); // must not throw
    s.assertThrows(function () { assertIdPrefix_('OCC-abc-1234', 'PROP'); }, 'INVALID_ID_FORMAT');
  });

  // ─── Date utilities ──────────────────────────────────────────────

  s.test('toIsoDate_ / parseIsoDate_ round-trip a calendar date exactly', function () {
    s.assertEqual(toIsoDate_(parseIsoDate_('2026-07-19')), '2026-07-19');
  });

  s.test('parseIsoDate_ does not shift the day (local-midnight parse, not UTC)', function () {
    var d = parseIsoDate_('2026-01-01');
    s.assertEqual(d.getFullYear(), 2026);
    s.assertEqual(d.getMonth(), 0);
    s.assertEqual(d.getDate(), 1);
  });

  s.test('coerceToIsoDateString_ passes a string through, and converts a Date back to yyyy-MM-dd', function () {
    s.assertEqual(coerceToIsoDateString_('2026-03-15'), '2026-03-15');
    s.assertEqual(coerceToIsoDateString_(new Date(2026, 2, 15)), '2026-03-15');
  });

  // ─── Frequency date math (913) ───────────────────────────────────

  s.test('addFrequencyToDate_ Weekly adds exactly 7 days', function () {
    s.assertEqual(toIsoDate_(addFrequencyToDate_(parseIsoDate_('2026-07-01'), 'Weekly')), '2026-07-08');
  });

  s.test('addFrequencyToDate_ Monthly clamps Jan 31 to Feb 28 in a non-leap year', function () {
    s.assertEqual(toIsoDate_(addFrequencyToDate_(parseIsoDate_('2026-01-31'), 'Monthly')), '2026-02-28');
  });

  s.test('addFrequencyToDate_ Monthly clamps Jan 31 to Feb 29 in a leap year', function () {
    s.assertEqual(toIsoDate_(addFrequencyToDate_(parseIsoDate_('2028-01-31'), 'Monthly')), '2028-02-29');
  });

  s.test('addFrequencyToDate_ Quarterly/HalfYearly/Yearly add the right number of months', function () {
    s.assertEqual(toIsoDate_(addFrequencyToDate_(parseIsoDate_('2026-01-15'), 'Quarterly')), '2026-04-15');
    s.assertEqual(toIsoDate_(addFrequencyToDate_(parseIsoDate_('2026-01-15'), 'HalfYearly')), '2026-07-15');
    s.assertEqual(toIsoDate_(addFrequencyToDate_(parseIsoDate_('2026-01-15'), 'Yearly')), '2027-01-15');
  });

  s.test('addFrequencyToDate_ Custom adds the given number of days; rejects a non-positive/missing value', function () {
    s.assertEqual(toIsoDate_(addFrequencyToDate_(parseIsoDate_('2026-07-01'), 'Custom', 45)), '2026-08-15');
    s.assertThrows(function () { addFrequencyToDate_(parseIsoDate_('2026-07-01'), 'Custom'); }, 'INVALID_FREQUENCY');
  });

  s.test('addFrequencyToDate_ throws INVALID_FREQUENCY for an unknown type', function () {
    s.assertThrows(function () { addFrequencyToDate_(parseIsoDate_('2026-07-01'), 'Fortnightly'); }, 'INVALID_FREQUENCY');
  });

  // ─── Overdue — Derived State (913) ───────────────────────────────

  s.test('isOccurrenceOverdue_: Active + past due + no grace = true', function () {
    var d = new Date(); d.setDate(d.getDate() - 5);
    s.assertTrue(isOccurrenceOverdue_({ Status: 'Active', EffectiveDue: toIsoDate_(d) }, { GraceDays: 0 }));
  });

  s.test('isOccurrenceOverdue_: still inside the grace period = false', function () {
    var d = new Date(); d.setDate(d.getDate() - 2);
    s.assertTrue(!isOccurrenceOverdue_({ Status: 'Active', EffectiveDue: toIsoDate_(d) }, { GraceDays: 5 }));
  });

  s.test('isOccurrenceOverdue_: Paid is never overdue regardless of date', function () {
    var d = new Date(); d.setDate(d.getDate() - 100);
    s.assertTrue(!isOccurrenceOverdue_({ Status: 'Paid', EffectiveDue: toIsoDate_(d) }, { GraceDays: 0 }));
  });

  // ─── State Machine guards, directly ──────────────────────────────

  s.test('assertRuleTransition_ forbids Cancelled -> Active', function () {
    s.assertThrows(function () { assertRuleTransition_('Cancelled', 'Active'); }, 'FORBIDDEN_TRANSITION');
  });

  s.test('assertOccurrenceTransition_ forbids Paid -> Cancelled via the generic path', function () {
    s.assertThrows(function () { assertOccurrenceTransition_('Paid', 'Cancelled'); }, 'FORBIDDEN_TRANSITION');
  });

  // ─── Event Contract (903) — every event type, minimal valid payload ───

  var minimalPayloads = {
    OBLIGATION_CREATED: { obligationId: 'OBL-1', propertyId: 'PROP-1', category: 'Mortgage' },
    OBLIGATION_UPDATED: { obligationId: 'OBL-1', changedFields: { Payee: 'X' } },
    OBLIGATION_CANCELLED: { obligationId: 'OBL-1', reason: 'sold' },
    OBLIGATION_PAUSED: { obligationId: 'OBL-1' },
    OBLIGATION_RESUMED: { obligationId: 'OBL-1' },
    PAYMENT_COMPLETED: { obligationId: 'OBL-1', occurrenceId: 'OCC-1', effectiveDue: '2026-07-19', amount: 100, paidDate: '2026-07-19', paidVia: 'Manual' },
    PAYMENT_REVERSED: { obligationId: 'OBL-1', occurrenceId: 'OCC-1', originalEventId: 'OCC-1:2026-07-19', reversedAmount: 100, reason: 'error' },
    REMINDER_REQUESTED: { obligationId: 'OBL-1', occurrenceId: 'OCC-1', effectiveDue: '2026-07-19', offsets: [30, 14, 7, 3, 1, 0, -1, -3, -7] },
    UTILITY_BILL_RECEIVED: { source: 'ManualInput', rawAmount: 100, rawDueDate: '2026-07-19', category: 'Electricity' }
  };

  Object.keys(minimalPayloads).forEach(function (eventType) {
    s.test('Contract: ' + eventType + ' — minimal valid payload accepted', function () {
      var env = buildPropertyEvent_(PROPERTY_EVENTS[eventType], 'PROP-1', 'OBL-1', minimalPayloads[eventType]);
      s.assertEqual(env.eventType, eventType);
    });

    Object.keys(minimalPayloads[eventType]).forEach(function (field) {
      s.test('Contract: ' + eventType + ' — rejects when required field "' + field + '" is missing', function () {
        var incomplete = {};
        Object.keys(minimalPayloads[eventType]).forEach(function (k) {
          if (k !== field) incomplete[k] = minimalPayloads[eventType][k];
        });
        s.assertThrows(function () { buildPropertyEvent_(PROPERTY_EVENTS[eventType], 'PROP-1', 'OBL-1', incomplete); });
      });
    });
  });

  s.test('publishPropertyEvent_ (the ADR-P07 Adapter) logs a placeholder and still returns a valid envelope', function () {
    var env = publishPropertyEvent_(PROPERTY_EVENTS.OBLIGATION_CREATED, 'PROP-1', 'OBL-1', {
      obligationId: 'OBL-1', propertyId: 'PROP-1', category: 'Mortgage'
    });
    s.assertEqual(env.eventType, 'OBLIGATION_CREATED');
  });

  return s.report();
}
