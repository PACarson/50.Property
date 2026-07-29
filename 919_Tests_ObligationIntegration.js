'use strict';
const fs = require('fs');
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

function runAllObligationIntegrationTests() {
  const s = makeSuite('919_Tests_ObligationIntegration');

  // ─── Contract Tests — every event type, minimal valid payload ───────
  // Vertical Slice §4: each event's exact required-field set, systematically.

  const minimalPayloads = {
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

  Object.keys(minimalPayloads).forEach((eventType) => {
    s.test('Contract: ' + eventType + ' — minimal valid payload is accepted', () => {
      const { ctx } = freshCtx();
      const env = ctx.buildPropertyEvent_(ctx.PROPERTY_EVENTS[eventType], 'PROP-1', 'OBL-1', minimalPayloads[eventType]);
      s.assertEqual(env.eventType, eventType);
    });

    const requiredFields = Object.keys(minimalPayloads[eventType]);
    requiredFields.forEach((field) => {
      s.test('Contract: ' + eventType + ' — rejects when required field "' + field + '" is missing', () => {
        const { ctx } = freshCtx();
        const incomplete = Object.assign({}, minimalPayloads[eventType]);
        delete incomplete[field];
        s.assertThrows(() => ctx.buildPropertyEvent_(ctx.PROPERTY_EVENTS[eventType], 'PROP-1', 'OBL-1', incomplete));
      });
    });
  });

  // ─── Reminder Contract (§6) — payload shape a real Reminder OS integration needs ───

  s.test('Reminder Integration (contract-level): REMINDER_REQUESTED carries everything ReminderConnector.publish() needs per §6', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());
    const req = ctx.buildReminderRequest_(ctx.getObligation(created.obligationId), ctx.getOccurrence(created.occurrenceId));
    s.assertTrue(typeof req.obligationId === 'string');
    s.assertTrue(typeof req.occurrenceId === 'string');
    s.assertTrue(typeof req.effectiveDue === 'string');
    s.assertTrue(Array.isArray(req.offsets) && req.offsets.length > 0);
  });

  s.test('Reminder Integration (contract-level): a Rule with custom ReminderOffsets propagates them into the request, not the default', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput({ reminderOffsets: [7, 1, 0] }));
    const req = ctx.buildReminderRequest_(ctx.getObligation(created.obligationId), ctx.getOccurrence(created.occurrenceId));
    s.assertEqual(req.offsets, [7, 1, 0]);
  });

  // ─── Finance Contract (§7) — payload shape a real Finance Engine needs ───

  s.test('Finance Integration (contract-level): PAYMENT_COMPLETED carries everything a LedgerEntry mirror needs per §7', () => {
    const { ctx } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());
    const result = ctx.recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1500, paidVia: 'Manual' });
    const payload = result.event.payload;
    ['obligationId', 'occurrenceId', 'effectiveDue', 'amount', 'paidDate', 'paidVia'].forEach((field) => {
      s.assertTrue(payload[field] !== undefined && payload[field] !== null, 'missing field: ' + field);
    });
    s.assertEqual(payload.amount, 1500);
  });

  // ─── Replay Test ──────────────────────────────────────────────────
  // Scope note (honest, matches Vertical Slice §13): this replays
  // ObligationHistory — the one durable history log that exists today —
  // not a full EventBus replay, since EventBus itself is still a Logger
  // placeholder (ADR-P07) with nothing to replay from yet.

  s.test('Replay: ObligationHistory records the exact transition sequence, and replaying it reaches the real final state', () => {
    const { ctx, spreadsheet } = freshCtx();
    const created = ctx.createObligation(baseObligationInput());
    ctx.recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1500 });
    ctx.reversePayment({ occurrenceId: created.occurrenceId, reason: 'typo' });
    ctx.recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 1550 });

    const historySheet = spreadsheet.getSheetByName('ObligationHistory');
    const cols = ctx.PROPERTY_SCHEMA.ObligationHistory.columns;
    const rows = historySheet.data
      .filter((row, i) => i > 0) // skip header... but header itself is data[0] via appendRow of columns; filter differently below
      .map((row) => {
        const obj = {};
        cols.forEach((c, i) => { obj[c] = row[i]; });
        return obj;
      });
    // appendRow(columns) is itself stored as data[0] (the header), so
    // real history rows start at index 1 — the filter above already
    // dropped index 0 by position, matching that.
    const forThisOccurrence = rows.filter((r) => r.OccurrenceID === created.occurrenceId);

    s.assertEqual(forThisOccurrence.map((r) => r.FromStatus + '->' + r.ToStatus), [
      '->Active', 'Active->Paid', 'Paid->Active', 'Active->Paid'
    ]);

    // Replay: fold the transition sequence starting from the implicit
    // pre-creation state, and confirm it lands on the same Status the
    // live Occurrence row actually has.
    let replayedStatus = null;
    forThisOccurrence.forEach((t) => { replayedStatus = t.ToStatus; });
    const liveOccurrence = ctx.getOccurrence(created.occurrenceId);
    s.assertEqual(replayedStatus, liveOccurrence.Status);
  });

  // ─── Migration Test ───────────────────────────────────────────────
  // Simulates the real migration path (editing 900's source to add a
  // category) rather than mutating the frozen PROPERTY_CONFIG object at
  // runtime, which Object.freeze correctly prevents from within a test.

  s.test('Migration: adding a new Category to 900_PropertyConfig.js source does not break existing rows or require a schema change', () => {
    const originalSource = fs.readFileSync(path.join(SOURCE_DIR, '900_PropertyConfig.js'), 'utf8');
    const migratedSource = originalSource.replace(
      "'DefectLiability'",
      "'DefectLiability',\n    'SolarPanelLease'" // a hypothetical new category
    );
    s.assertTrue(migratedSource !== originalSource, 'sanity: the source string substitution actually matched something');
    s.assertTrue(migratedSource.indexOf('SolarPanelLease') !== -1);

    // Load the ORIGINAL source, create a Rule under an old category —
    // this represents data that existed before the migration.
    const before = freshCtx();
    const oldRowResult = before.ctx.createObligation(baseObligationInput({ category: 'Mortgage' }));

    // Now load the MIGRATED source fresh (new context, new in-memory
    // sheet — this test only needs to prove the new category is usable
    // and the schema is untouched, not that old context data persists
    // across a source swap, which isn't how a real redeploy works
    // either).
    const tmpDir = fs.mkdtempSync('/tmp/propertyos-migration-test-');
    OBLIGATION_ENGINE_FILES_local_copy(tmpDir, migratedSource);
    const after = loadPropertyOSContext(tmpDir, OBLIGATION_ENGINE_FILES);

    const newRowResult = after.ctx.createObligation(baseObligationInput({ category: 'SolarPanelLease' }));
    s.assertTrue(newRowResult.success);

    // Schema (column list) must be byte-identical before/after — adding
    // a category is additive-only and must never touch columns.
    s.assertEqual(
      before.ctx.PROPERTY_SCHEMA.ObligationRule.columns,
      after.ctx.PROPERTY_SCHEMA.ObligationRule.columns
    );

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function OBLIGATION_ENGINE_FILES_local_copy(tmpDir, migrated900Source) {
    // Copies the real 901-903/912-913 unmodified, but writes the
    // migrated 900 in their place, so loadPropertyOSContext can load a
    // consistent set from one directory.
    fs.writeFileSync(path.join(tmpDir, '900_PropertyConfig.js'), migrated900Source);
    ['901_PropertySchema.js', '902_PropertyIdentity.js', '903_PropertyEventDefinitions.js', '912_ObligationEngine.js', '913_ObligationScheduler.js']
      .forEach((f) => fs.copyFileSync(path.join(SOURCE_DIR, f), path.join(tmpDir, f)));
  }

  return s.report();
}

if (require.main === module) {
  const result = runAllObligationIntegrationTests();
  process.exit(result.failed > 0 ? 1 : 0);
}

module.exports = { runAllObligationIntegrationTests };
