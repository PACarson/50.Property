'use strict';
const path = require('path');
const { loadPropertyOSContext, FOUNDATION_FILES } = require('../shim/GasShim');
const { makeSuite } = require('../shim/TestKit');

const SOURCE_DIR = path.join(__dirname, '..', '..', 'property-os');

function runAllFoundationTests() {
  const s = makeSuite('900_Tests_Foundation');

  s.test('generateObligationId_ produces OBL-<ts36>-<rand4> shape', () => {
    const { ctx } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    const id = ctx.generateObligationId_();
    s.assertTrue(/^OBL-[0-9a-z]+-[0-9a-z]{4}$/.test(id), 'got: ' + id);
  });

  s.test('generateOccurrenceId_ / generateHistoryId_ use their own prefixes', () => {
    const { ctx } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    s.assertTrue(ctx.generateOccurrenceId_().indexOf('OCC-') === 0);
    s.assertTrue(ctx.generateHistoryId_().indexOf('HIST-') === 0);
  });

  s.test('two IDs generated back-to-back are not equal', () => {
    const { ctx } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    const a = ctx.generateObligationId_();
    const b = ctx.generateObligationId_();
    s.assertTrue(a !== b, 'expected distinct IDs, got ' + a + ' twice');
  });

  s.test('assertIdPrefix_ accepts a matching prefix', () => {
    const { ctx } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    ctx.assertIdPrefix_('PROP-abc-1234', 'PROP'); // must not throw
  });

  s.test('assertIdPrefix_ rejects a mismatched prefix with INVALID_ID_FORMAT', () => {
    const { ctx } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    s.assertThrows(() => ctx.assertIdPrefix_('OCC-abc-1234', 'PROP'), 'INVALID_ID_FORMAT');
  });

  s.test('toIsoDate_ / parseIsoDate_ round-trip a calendar date exactly', () => {
    const { ctx } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    const original = '2026-07-19';
    const roundTripped = ctx.toIsoDate_(ctx.parseIsoDate_(original));
    s.assertEqual(roundTripped, original);
  });

  s.test('parseIsoDate_ does not shift the day (local-midnight parse, not UTC)', () => {
    const { ctx } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    const d = ctx.parseIsoDate_('2026-01-01');
    s.assertEqual(d.getFullYear(), 2026);
    s.assertEqual(d.getMonth(), 0);
    s.assertEqual(d.getDate(), 1);
  });

  s.test('coerceToIsoDateString_ passes a string through unchanged', () => {
    const { ctx } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    s.assertEqual(ctx.coerceToIsoDateString_('2026-03-15'), '2026-03-15');
  });

  s.test('coerceToIsoDateString_ converts a Date object back to yyyy-MM-dd', () => {
    const { ctx } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    const d = new ctx.Date(2026, 2, 15); // March 15, 2026 (month is 0-indexed)
    s.assertEqual(ctx.coerceToIsoDateString_(d), '2026-03-15');
  });

  s.test('ensureSheetSchema_ creates a new sheet with the exact header row', () => {
    const { ctx, spreadsheet } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    ctx.initObligationSchema_();
    const sheet = spreadsheet.getSheetByName('ObligationRules');
    s.assertTrue(sheet !== null, 'ObligationRules sheet was not created');
    s.assertEqual(sheet.data[0], ctx.PROPERTY_SCHEMA.ObligationRule.columns);
  });

  s.test('ensureSheetSchema_ is idempotent — calling twice does not duplicate the header', () => {
    const { ctx, spreadsheet } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    ctx.initObligationSchema_();
    ctx.initObligationSchema_();
    const sheet = spreadsheet.getSheetByName('ObligationRules');
    s.assertEqual(sheet.data.length, 1, 'expected exactly one header row after two init calls');
  });

  s.test('ensureSheetSchema_ throws on schema drift (header mismatch)', () => {
    const { ctx, spreadsheet } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    const sheet = spreadsheet.insertSheet('ObligationRules');
    sheet.appendRow(['SomeOldColumn', 'AnotherOldColumn']);
    s.assertThrows(() => ctx.initObligationSchema_());
  });

  s.test('ensureSheetSchema_ freezes row 1 on a brand-new sheet', () => {
    const { ctx, spreadsheet } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    ctx.initObligationSchema_();
    const sheet = spreadsheet.getSheetByName('ObligationOccurrences');
    s.assertEqual(sheet.frozenRows, 1);
  });

  s.test('ensureSheetSchema_ freezes row 1 even on an already-existing sheet (retroactive fix)', () => {
    const { ctx, spreadsheet } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    const cols = ctx.PROPERTY_SCHEMA.ObligationHistory.columns;
    const sheet = spreadsheet.insertSheet('ObligationHistory');
    sheet.appendRow(cols); // pre-existing, correct header, never frozen
    s.assertEqual(sheet.frozenRows, 0, 'sanity: starts unfrozen');
    ctx.initObligationSchema_();
    s.assertEqual(sheet.frozenRows, 1, 'expected retroactive freeze on existing sheet');
  });

  s.test('BUG FIX — an unformatted date-like column silently becomes a Date on write (proves the bug is real in this shim)', () => {
    const { ctx, spreadsheet } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    const sheet = spreadsheet.insertSheet('UnformattedTestSheet');
    sheet.appendRow(['SomeDateCol']);
    sheet.getRange(2, 1, 1, 1).setValues([['2026-07-19']]); // no '@' format applied
    const readBack = sheet.getRange(2, 1, 1, 1).getValues()[0][0];
    s.assertTrue(readBack instanceof ctx.Date, 'expected the shim to reproduce the real Sheets bug here — got ' + typeof readBack);
  });

  s.test('BUG FIX — dateColumns protection keeps EffectiveDue a string after write+read', () => {
    const { ctx, spreadsheet } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    ctx.initObligationSchema_(); // applies '@' format to EffectiveDue etc.
    const sheet = spreadsheet.getSheetByName('ObligationOccurrences');
    const cols = ctx.PROPERTY_SCHEMA.ObligationOccurrence.columns;
    const effectiveDueCol = cols.indexOf('EffectiveDue') + 1; // 1-indexed
    sheet.appendRow(cols.map(() => '')); // row 2: blank placeholder row
    sheet.getRange(2, effectiveDueCol, 1, 1).setValues([['2026-07-19']]);
    const readBack = sheet.getRange(2, effectiveDueCol, 1, 1).getValues()[0][0];
    s.assertEqual(readBack, '2026-07-19', 'EffectiveDue must stay a string, not become a Date');
  });

  s.test('buildPropertyEvent_ throws when a required payload field is missing', () => {
    const { ctx } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    s.assertThrows(() => ctx.buildPropertyEvent_(
      ctx.PROPERTY_EVENTS.PAYMENT_COMPLETED, 'PROP-1', 'OBL-1', { obligationId: 'OBL-1' }
    ));
  });

  s.test('buildPropertyEvent_ succeeds and shapes the envelope correctly when complete', () => {
    const { ctx } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    const payload = {
      obligationId: 'OBL-1', occurrenceId: 'OCC-1', effectiveDue: '2026-07-19',
      amount: 100, paidDate: '2026-07-19', paidVia: 'Manual'
    };
    const env = ctx.buildPropertyEvent_(ctx.PROPERTY_EVENTS.PAYMENT_COMPLETED, 'PROP-1', 'OBL-1', payload);
    s.assertEqual(env.eventType, 'PAYMENT_COMPLETED');
    s.assertEqual(env.propertyId, 'PROP-1');
    s.assertEqual(env.payload, payload);
    s.assertTrue(typeof env.eventId === 'string' && env.eventId.length > 0);
    s.assertTrue(typeof env.occurredAt === 'string');
  });

  s.test('publishPropertyEvent_ (the ADR-P07 Adapter) logs a placeholder and still returns a valid envelope', () => {
    const { ctx, logs } = loadPropertyOSContext(SOURCE_DIR, FOUNDATION_FILES);
    const env = ctx.publishPropertyEvent_(ctx.PROPERTY_EVENTS.OBLIGATION_CREATED, 'PROP-1', 'OBL-1', {
      obligationId: 'OBL-1', propertyId: 'PROP-1', category: 'Mortgage'
    });
    s.assertTrue(logs.length === 1, 'expected exactly one Logger.log call');
    s.assertTrue(logs[0].indexOf('PropertyOS EventBus Adapter') !== -1);
    s.assertEqual(env.eventType, 'OBLIGATION_CREATED');
  });

  return s.report();
}

if (require.main === module) {
  const result = runAllFoundationTests();
  process.exit(result.failed > 0 ? 1 : 0);
}

module.exports = { runAllFoundationTests };
