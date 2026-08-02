'use strict';
const path = require('path');
const { loadPropertyOSContext, OBLIGATION_ENGINE_FILES } = require('../shim/GasShim');
const { makeSuite } = require('../shim/TestKit');

const SOURCE_DIR = path.join(__dirname, '..', '..', 'property-os');

function freshCtx() {
  return loadPropertyOSContext(SOURCE_DIR, OBLIGATION_ENGINE_FILES);
}

function isoDaysFromToday(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function baseObligationInput(overrides) {
  return Object.assign({
    propertyId: 'PROP-test-1', category: 'Mortgage', payee: 'Test Bank',
    amount: 1500, frequencyType: 'Monthly', dueAnchor: isoDaysFromToday(10)
  }, overrides || {});
}

/**
 * Proposed by CC (2026-07-29) as three platform-level verification
 * categories that should eventually apply to every Domain OS, not just
 * Property OS. Currently adopted locally (see 00_ADR_Log.js ADR-P10) —
 * NOT yet promoted into UEF itself, which requires a second independent
 * project's evidence per its own D7/D8 precedent (see UEF v1.5's
 * Candidate Patterns table for the tracked proposal).
 */
function runAllPlatformVerificationTests() {
  const s = makeSuite('999_Tests_PlatformVerification');

  // ─── 1. Replay Verification ─────────────────────────────────────────
  // "Replay 后 State 与 Current State 一致" — already substantially
  // covered by 919's Replay Test (same mechanism); restated here under
  // its own name per CC's proposed category, with one addition: replay
  // across a LONGER, messier sequence than 919 used.

  s.test('Replay: a long, messy sequence (create, pay, reverse, pay, then roll two more cycles) still replays to the true final state', () => {
    const { ctx, spreadsheet } = freshCtx();
    const created = ctx.createObligation(baseObligationInput({ dueAnchor: '2026-01-31', frequencyType: 'Monthly' }));
    ctx.recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1500 });
    ctx.reversePayment({ occurrenceId: created.occurrenceId, reason: 'typo' });
    const paid2 = ctx.recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1550 });
    const paid3 = ctx.recordPayment({ occurrenceId: paid2.nextOccurrenceId, paidAmount: 1550 });

    const historySheet = spreadsheet.getSheetByName('ObligationHistory');
    const cols = ctx.PROPERTY_SCHEMA.ObligationHistory.columns;
    const allHistory = historySheet.data.slice(1).map((row) => {
      const obj = {}; cols.forEach((c, i) => { obj[c] = row[i]; }); return obj;
    });

    // Replay: for EVERY Occurrence that appears in history, fold its own
    // transitions in order and confirm the replayed final status matches
    // the live row — not just the one Occurrence 919 already checked.
    const occurrenceIds = [...new Set(allHistory.map((h) => h.OccurrenceID))];
    occurrenceIds.forEach((occId) => {
      const transitions = allHistory.filter((h) => h.OccurrenceID === occId);
      const replayedStatus = transitions[transitions.length - 1].ToStatus;
      const liveStatus = ctx.getOccurrence(occId).Status;
      s.assertEqual(replayedStatus, liveStatus, 'replay mismatch for ' + occId);
    });

    s.assertEqual(occurrenceIds.length, 3, 'expected exactly 3 distinct Occurrences across this sequence (original + 2 rolled cycles)');
  });

  // ─── 2. Migration Verification ──────────────────────────────────────
  // "真实验证 Migration，而非仅有 Plan" — 919_Tests_ObligationIntegration.js
  // already does this for adding a Category (edits real 900 source,
  // reloads, proves it works — not just a written plan). Restated here
  // under its own name; the honest limit is the same one noted there:
  // this can edit and reload SOURCE FILES, but can't simulate a real
  // `clasp push`/redeploy cycle against an actual Apps Script project
  // from this environment. That half is CC's to run for real.

  s.test('Migration: this category is satisfied by the existing source-editing migration test, not duplicated here', () => {
    // Intentionally a pointer, not a duplicate — see 919's "Migration:
    // adding a new Category..." test for the actual verification.
    s.assertTrue(true, 'see 919_Tests_ObligationIntegration.js for the real migration test');
  });

  // ─── 3. Failure Recovery Verification ───────────────────────────────
  // Lock / Retry / Partial Failure / Duplicate Command. This is the one
  // genuinely new territory — nothing before this checked what happens
  // when a Command fails PART WAY THROUGH, not just cleanly rejects.

  s.test('Retry: calling recordPayment twice (simulating a caller retrying after a lost response) does not double-process', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());
    const first = ctx.recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1500 });
    const retried = ctx.recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1500 });
    s.assertTrue(!first.alreadyPaid && retried.alreadyPaid, 'the retry must be recognized as already-done, not reprocessed');
  });

  s.test('Duplicate Command WITHOUT a ClientRequestID: createObligation has no dedup — this is documented current behavior, not a bug', () => {
    const { ctx, spreadsheet } = freshCtx();
    const input = baseObligationInput(); // no clientRequestId supplied
    ctx.createObligation(input);
    ctx.createObligation(input);
    const ruleSheet = spreadsheet.getSheetByName('ObligationRules');
    s.assertEqual(ruleSheet.getLastRow(), 3, 'header + 2 separate Rules — dedup is opt-in via clientRequestId, not automatic; this test exists so that ever changing that is a deliberate decision, not a silent regression');
  });

  s.test('★ FINDING — Partial Failure: if appendObligationHistory_ throws mid-recordPayment, the Occurrence is left Paid with NO matching History row', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());

    const originalAppendHistory = ctx.appendObligationHistory_;
    ctx.appendObligationHistory_ = function () {
      throw new Error('INJECTED FAULT — simulates a transient Sheets API failure between the Truth write and the History write');
    };

    let threw = false;
    try {
      ctx.recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1500 });
    } catch (e) {
      threw = true;
    }
    ctx.appendObligationHistory_ = originalAppendHistory; // restore before inspecting

    s.assertTrue(threw, 'the injected fault should propagate as a thrown error to the caller');

    const occ = ctx.getOccurrence(created.occurrenceId);
    // This assertion documents the CURRENT real behavior — Google
    // Sheets has no real multi-statement transaction, so 912's Commands
    // are NOT actually atomic across their several writes, despite the
    // Vertical Slice's Error Strategy (§11) describing an "all-or-
    // nothing" aspiration. This test exists specifically to make that
    // gap visible and testable, not to assert it's fine.
    s.assertEqual(occ.Status, 'Paid', 'CONFIRMED GAP: Truth Layer write (Occurrence -> Paid) already committed before the failing History append — no rollback occurs');
  });

  s.test('★ FINDING — the same Partial Failure gap exists if publishPropertyEvent_ (not just History) throws after the Truth write', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());

    const originalPublish = ctx.publishPropertyEvent_;
    ctx.publishPropertyEvent_ = function () {
      throw new Error('INJECTED FAULT — simulates the Adapter itself failing after Truth + History already succeeded');
    };

    let threw = false;
    try {
      ctx.recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1500 });
    } catch (e) {
      threw = true;
    }
    ctx.publishPropertyEvent_ = originalPublish;

    s.assertTrue(threw);
    const occ = ctx.getOccurrence(created.occurrenceId);
    s.assertEqual(occ.Status, 'Paid', 'CONFIRMED GAP: Truth + History already committed before the failing event publish — the payment is recorded but nothing downstream (913, future 914) ever learns about it');
  });

  s.test('Lock: withObligationLock_ still releases the lock even when the wrapped function throws (no permanent deadlock from one failure)', () => {
    const { ctx } = freshCtx();
    let released = false;
    const fakeLock = {
      tryLock: () => true,
      releaseLock: () => { released = true; }
    };
    const originalGetScriptLock = ctx.LockService.getScriptLock;
    ctx.LockService.getScriptLock = () => fakeLock;

    try {
      ctx.withObligationLock_(() => { throw new Error('boom'); });
    } catch (e) { /* expected */ }

    ctx.LockService.getScriptLock = originalGetScriptLock;
    s.assertTrue(released, 'the lock must be released in a finally block even when the wrapped Command throws');
  });

  return s.report();
}

if (require.main === module) {
  const result = runAllPlatformVerificationTests();
  process.exit(result.failed > 0 ? 1 : 0);
}

module.exports = { runAllPlatformVerificationTests };
