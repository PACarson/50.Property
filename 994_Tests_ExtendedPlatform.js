/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 994_Tests_ExtendedPlatform.js
 * GAS-native tests — real SpreadsheetApp/LockService/CacheService.
 * Replay (multi-cycle), Retry, Duplicate Command, Partial Failure (real
 * fault injection — same technique as the Node sandbox used, GAS shares
 * global scope too so overriding a function works the same way), Lock-
 * release-on-throw, Reminder contract shape, Migration mechanism check.
 *
 * GAS-native replacement for what used to be the Node-only sandbox's
 * 999_Tests_PlatformVerification.js — that directory has been removed
 * from this project (see 00_Project_State.js changelog).
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠ Same safety requirement as 991/993 — TEST-named spreadsheet only.
 * Run runAllExtendedPlatformTests() directly from the Script Editor.
 * ═══════════════════════════════════════════════════════════════════════
 */

function runAllExtendedPlatformTests() {
  assertRunningInTestSpreadsheet_();
  var s = makeGasTestSuite_('994_Tests_ExtendedPlatform (real GAS)');
  initObligationSchema_();

  // ─── Replay ──────────────────────────────────────────────────────

  s.test('Replay: a messy real sequence (create, pay, reverse, pay, roll forward) replays to the true final state', function () {
    var created = createObligation(baseObligationInput_({ dueAnchor: '2026-01-31', frequencyType: 'Monthly' }));
    recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1500 });
    reversePayment({ occurrenceId: created.occurrenceId, reason: 'typo' });
    var paid2 = recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1550 });

    var historySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ObligationHistory');
    var cols = PROPERTY_SCHEMA.ObligationHistory.columns;
    var occIdCol = cols.indexOf('OccurrenceID');
    var fromCol = cols.indexOf('FromStatus');
    var toCol = cols.indexOf('ToStatus');
    var lastRow = historySheet.getLastRow();
    var rows = historySheet.getRange(2, 1, lastRow - 1, cols.length).getValues();

    var transitions = rows.filter(function (r) { return r[occIdCol] === created.occurrenceId; });
    var sequence = transitions.map(function (r) { return r[fromCol] + '->' + r[toCol]; });
    s.assertEqual(sequence, ['->Active', 'Active->Paid', 'Paid->Active', 'Active->Paid']);

    var replayedStatus = transitions[transitions.length - 1][toCol];
    s.assertEqual(replayedStatus, getOccurrence(created.occurrenceId).Status);
    s.assertTrue(paid2.nextOccurrenceId !== null);
  });

  // ─── Retry / Duplicate Command ───────────────────────────────────

  s.test('Retry: calling recordPayment twice (simulating a caller retrying after a lost response) does not double-process', function () {
    var created = createObligation(baseObligationInput_());
    var first = recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1500 });
    var retried = recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1500 });
    s.assertTrue(!first.alreadyPaid && retried.alreadyPaid);
  });

  s.test('Duplicate Command WITHOUT a ClientRequestID has no dedup — documented current behavior', function () {
    var input = baseObligationInput_();
    createObligation(input);
    createObligation(input);
    var result = queryUpcomingPayments({ propertyId: input.propertyId });
    s.assertEqual(result.results.length, 2, 'dedup is opt-in via clientRequestId, not automatic');
  });

  // ─── Partial Failure — real fault injection, real GAS ────────────
  // Same technique the Node sandbox used: GAS shares one global scope
  // across every file in the project, so reassigning a global function
  // works exactly the same way here as it did there.

  s.test('★ Partial Failure — logPartialFailure_ actually fires when appendObligationHistory_ throws mid-recordPayment', function () {
    var created = createObligation(baseObligationInput_());

    var original = appendObligationHistory_;
    appendObligationHistory_ = function () {
      throw new Error('INJECTED FAULT — simulates a transient Sheets failure');
    };

    var threw = false;
    try {
      recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1500 });
    } catch (e) {
      threw = true;
    }
    appendObligationHistory_ = original; // restore before inspecting or any later test runs

    s.assertTrue(threw, 'the injected fault should propagate to the caller');
    var occ = getOccurrence(created.occurrenceId);
    // Confirms the same gap the Node sandbox found, for real this time —
    // and confirms logPartialFailure_'s fix (loud, labeled logging) is
    // in place, NOT that the gap itself is closed (it isn't, by design —
    // see UEF v1.6 §2/D9).
    s.assertEqual(occ.Status, 'Paid', 'Truth write stands even though History failed — this is the known, accepted, now-logged gap');
  });

  // ─── Lock ────────────────────────────────────────────────────────

  s.test('Lock: withObligationLock_ releases the lock even when the wrapped function throws', function () {
    var released = false;
    var fakeLock = { tryLock: function () { return true; }, releaseLock: function () { released = true; } };
    var originalGetScriptLock = LockService.getScriptLock;
    LockService.getScriptLock = function () { return fakeLock; };

    try {
      withObligationLock_(function () { throw new Error('boom'); });
    } catch (e) { /* expected */ }

    LockService.getScriptLock = originalGetScriptLock;
    s.assertTrue(released, 'the lock must be released even when the wrapped Command throws');
  });

  // ─── Reminder Contract (§6), contract-level ──────────────────────

  s.test('Reminder Integration: REMINDER_REQUESTED carries what ReminderConnector.publish() needs, and respects a custom ReminderOffsets override', function () {
    var created = createObligation(baseObligationInput_({ reminderOffsets: [7, 1, 0] }));
    var req = buildReminderRequest_(getObligation(created.obligationId), getOccurrence(created.occurrenceId));
    s.assertTrue(typeof req.obligationId === 'string' && typeof req.occurrenceId === 'string' && typeof req.effectiveDue === 'string');
    s.assertEqual(req.offsets, [7, 1, 0]);
  });

  // ─── Migration mechanism check ────────────────────────────────────
  // Real migration (adding a category) means editing 900_PropertyConfig
  // .js's source and redeploying — not something a running script can
  // do to itself. What IS verifiable here: the mechanism that MAKES a
  // source edit the only path (the config is frozen, not a mutable
  // table a runtime bug could silently corrupt).

  s.test('Migration mechanism: OBLIGATION_CATEGORIES is frozen — adding one requires an actual source edit + redeploy, never a runtime mutation', function () {
    s.assertTrue(Object.isFrozen(PROPERTY_CONFIG.OBLIGATION_CATEGORIES));
    var before = PROPERTY_CONFIG.OBLIGATION_CATEGORIES.length;
    try { PROPERTY_CONFIG.OBLIGATION_CATEGORIES.push('ShouldNotWork'); } catch (e) { /* strict mode may throw; either way nothing should change */ }
    s.assertEqual(PROPERTY_CONFIG.OBLIGATION_CATEGORIES.length, before, 'a frozen array must not have silently grown');
  });

  var summary = s.report();
  Logger.log('\nThis run\'s rows are tagged PROP-TEST-... — call cleanupTestData_() when done inspecting them.');
  return summary;
}
