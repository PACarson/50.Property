/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 991_Tests_ObligationEngine.js
 * GAS-native tests — real SpreadsheetApp, real LockService, real
 * CacheService, real Utilities.formatDate. No mocking.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Curated, not exhaustive: the Node sandbox (property-os-tests/, a
 * separate, non-GAS tool — see its own README) already covers every
 * pure-logic path (date math, state machine, ID format, event contract
 * shape) with 101 passing tests; none of that needs re-proving here.
 * This file exists specifically for what a simulation can only ever
 * approximate: does this actually work against real Google Sheets,
 * real LockService, real CacheService, right now.
 *
 * ⚠⚠⚠ SAFETY — READ BEFORE RUNNING ⚠⚠⚠
 * runAllObligationEngineTestsLive() calls real Commands (createObligation,
 * recordPayment, cancelObligation, reversePayment, ...) which write real
 * rows to whatever spreadsheet this script is bound to. It refuses to
 * run unless that spreadsheet's name contains "TEST" (see
 * assertRunningInTestSpreadsheet_ below) — but that guard only works if
 * you actually run this from a dedicated test spreadsheet/project in the
 * first place. Do not paste this into your production Property OS
 * project. Make a throwaway copy of the project, bind it to a new
 * spreadsheet named something like "Property OS TEST", and run it there.
 *
 * Depends on: 900-903, 912-913, and 990_TestKit.js already being in
 * this same project (GAS shares one global scope — no import needed).
 * ═══════════════════════════════════════════════════════════════════════
 */

var TEST_ID_PATTERN_ = /PROP-TEST-\d+-\d+/;

function assertRunningInTestSpreadsheet_() {
  var name = SpreadsheetApp.getActiveSpreadsheet().getName();
  if (name.toUpperCase().indexOf('TEST') === -1) {
    throw new Error(
      'SAFETY STOP: bound spreadsheet is "' + name + '" — no "TEST" in its name. ' +
      'This suite writes real rows via real Commands. Refusing to run against ' +
      'what might be production. Run from a dedicated test spreadsheet instead.'
    );
  }
}

var TEST_PROPERTY_NAME_TAG_ = 'TEST-';

/**
 * ★ Updated 2026-07-29 (910's Runtime landed): propertyExists_() is now
 * a REAL check against the Properties sheet (910_PropertyAssetEngine.js)
 * instead of the old permissive placeholder. Every test that calls
 * createObligation needs an Obligation's propertyId to actually exist,
 * or createObligation now correctly throws PROPERTY_NOT_FOUND — which
 * is the intended behavior, not a test bug to work around by faking an
 * ID. So this function's contract changed: it now actually creates a
 * real, findable Property (tagged via PropertyName, since generated
 * PropertyIDs don't carry a "TEST" marker of their own) and returns its
 * real PropertyID. Every existing call site (991/993/994) keeps working
 * unchanged — they just get a real ID now instead of a fake one.
 * @return {string} a real PropertyID backed by an actual Properties row
 */
function testPropertyId_() {
  var result = createProperty({
    propertyName: TEST_PROPERTY_NAME_TAG_ + new Date().getTime() + '-' + Math.floor(Math.random() * 1e6),
    addressLine1: '1 Test Street',
    addressCity: 'Test City',
    addressState: 'Test State',
    addressPostcode: '00000',
    addressCountry: 'Test Country',
    purchaseDate: '2020-01-01',
    purchasePrice: 500000,
    freeholdLeasehold: 'Freehold',
    propertyType: 'RESIDENTIAL_CONDO'
  });
  return result.propertyId;
}

/**
 * ★ Updated 2026-07-29: now starts from the Properties sheet instead of
 * pattern-matching ObligationRule's PropertyID column directly — real
 * PropertyIDs (generatePropertyId_) don't carry a "TEST" marker of
 * their own, so the tag lives on PropertyName instead (see
 * testPropertyId_ above). Cascades Properties -> ObligationRules ->
 * Occurrences -> History, deleting all four. Cleans up test debris from
 * ANY past run, not just the most recent one — there's no per-run tag
 * to match against once a new execution starts. Safe to call
 * repeatedly; a clean sheet with nothing matching is a no-op.
 */
function cleanupTestData_() {
  assertRunningInTestSpreadsheet_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var propSheet = ss.getSheetByName(PROPERTY_CONFIG.SHEET_NAMES.PROPERTIES);
  var ruleSheet = ss.getSheetByName('ObligationRules');
  var occSheet = ss.getSheetByName('ObligationOccurrences');
  var histSheet = ss.getSheetByName('ObligationHistory');

  var testPropertyIds = {};
  var testObligationIds = {};
  var testOccurrenceIds = {};

  if (propSheet) {
    var propCols = PROPERTY_SCHEMA.Property.columns;
    var propNameCol = propCols.indexOf('PropertyName');
    var propIdColOwn = propCols.indexOf('PropertyID');
    var lastRow0 = propSheet.getLastRow();
    if (lastRow0 >= 2) {
      var data0 = propSheet.getRange(2, 1, lastRow0 - 1, propCols.length).getValues();
      for (var m = data0.length - 1; m >= 0; m--) {
        if (String(data0[m][propNameCol]).indexOf(TEST_PROPERTY_NAME_TAG_) === 0) {
          testPropertyIds[data0[m][propIdColOwn]] = true;
          propSheet.deleteRow(m + 2);
        }
      }
    }
  }

  if (ruleSheet) {
    var ruleCols = PROPERTY_SCHEMA.ObligationRule.columns;
    var propIdCol = ruleCols.indexOf('PropertyID');
    var obligIdCol = ruleCols.indexOf('ObligationID');
    var lastRow = ruleSheet.getLastRow();
    if (lastRow >= 2) {
      var data = ruleSheet.getRange(2, 1, lastRow - 1, ruleCols.length).getValues();
      for (var i = data.length - 1; i >= 0; i--) {
        if (testPropertyIds[data[i][propIdCol]] || TEST_ID_PATTERN_.test(String(data[i][propIdCol]))) {
          testObligationIds[data[i][obligIdCol]] = true;
          ruleSheet.deleteRow(i + 2);
        }
      }
    }
  }

  if (occSheet) {

    var occCols = PROPERTY_SCHEMA.ObligationOccurrence.columns;
    var occObligIdCol = occCols.indexOf('ObligationID');
    var occIdCol = occCols.indexOf('OccurrenceID');
    var lastRow2 = occSheet.getLastRow();
    if (lastRow2 >= 2) {
      var data2 = occSheet.getRange(2, 1, lastRow2 - 1, occCols.length).getValues();
      for (var j = data2.length - 1; j >= 0; j--) {
        if (testObligationIds[data2[j][occObligIdCol]]) {
          testOccurrenceIds[data2[j][occIdCol]] = true;
          occSheet.deleteRow(j + 2);
        }
      }
    }
  }

  if (histSheet) {
    var histCols = PROPERTY_SCHEMA.ObligationHistory.columns;
    var histOccIdCol = histCols.indexOf('OccurrenceID');
    var lastRow3 = histSheet.getLastRow();
    if (lastRow3 >= 2) {
      var data3 = histSheet.getRange(2, 1, lastRow3 - 1, histCols.length).getValues();
      for (var k = data3.length - 1; k >= 0; k--) {
        if (testOccurrenceIds[data3[k][histOccIdCol]]) {
          histSheet.deleteRow(k + 2);
        }
      }
    }
  }

  Logger.log('cleanupTestData_: removed ' + Object.keys(testPropertyIds).length + ' test Propert(y/ies), ' +
    Object.keys(testObligationIds).length + ' test Rule(s), ' +
    Object.keys(testOccurrenceIds).length + ' test Occurrence(s), and their History rows.');
}

function runAllObligationEngineTestsLive() {
  assertRunningInTestSpreadsheet_();
  var s = makeGasTestSuite_('991_Tests_ObligationEngine (LIVE — real GAS, real Sheets)');

  initObligationSchema_(); // idempotent; this run itself is a live test of the real path

  s.test('ensureSheetSchema_ actually created all three sheets', function () {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ['ObligationRules', 'ObligationOccurrences', 'ObligationHistory'].forEach(function (name) {
      s.assertTrue(ss.getSheetByName(name) !== null, name + ' was not created');
    });
  });

  s.test('ensureSheetSchema_ actually froze row 1 on all three sheets', function () {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ['ObligationRules', 'ObligationOccurrences', 'ObligationHistory'].forEach(function (name) {
      s.assertEqual(ss.getSheetByName(name).getFrozenRows(), 1, name + ' header is not actually frozen');
    });
  });

  s.test('BUG FIX, against real Sheets: EffectiveDue survives write+read as a string, not a Date', function () {
    var created = createObligation({
      propertyId: testPropertyId_(), category: 'Mortgage', payee: 'Test Bank',
      amount: 1500, frequencyType: 'Monthly', dueAnchor: '2026-08-15'
    });
    var occ = getOccurrence(created.occurrenceId);
    s.assertTrue(typeof occ.EffectiveDue === 'string', 'expected a string, got ' + typeof occ.EffectiveDue);
    s.assertEqual(occ.EffectiveDue, '2026-08-15');
  });

  s.test('createObligation -> recordPayment end-to-end against real Sheets rolls to the correct real next Occurrence', function () {
    var created = createObligation({
      propertyId: testPropertyId_(), category: 'Electricity', payee: 'TNB',
      amount: 250, frequencyType: 'Monthly', dueAnchor: '2026-01-31'
    });
    var result = recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 250 });
    s.assertTrue(result.nextOccurrenceId !== null);
    var nextOcc = getOccurrence(result.nextOccurrenceId);
    s.assertEqual(nextOcc.EffectiveDue, '2026-02-28', 'month-end clamp must hold against real Sheets too');
  });

  s.test('real LockService does not block normal, non-contended execution', function () {
    // If real LockService behaved unexpectedly in this context, this
    // would surface as a thrown LOCK_TIMEOUT — the point is letting
    // that happen for real rather than assuming a mock's "always
    // succeeds" behavior generalizes.
    var created = createObligation({
      propertyId: testPropertyId_(), category: 'Water', payee: 'Air Selangor',
      amount: 80, frequencyType: 'Monthly', dueAnchor: '2026-09-01'
    });
    s.assertTrue(created.success);
  });

  s.test('real CacheService: ClientRequestID idempotency holds, not just in the Node mock', function () {
    var propertyId = testPropertyId_();
    var clientRequestId = 'TEST-idem-' + new Date().getTime();
    var input = {
      propertyId: propertyId, category: 'Insurance', payee: 'Test Insurer',
      amount: 500, frequencyType: 'Yearly', dueAnchor: '2027-01-01',
      clientRequestId: clientRequestId
    };
    var first = createObligation(input);
    var second = createObligation(input);
    s.assertEqual(first.obligationId, second.obligationId, 'real CacheService should have returned the cached result');
  });

  s.test('State Machine still rejects a forbidden transition against real Sheets', function () {
    var created = createObligation({
      propertyId: testPropertyId_(), category: 'Assessment', payee: 'Local Council',
      amount: 300, frequencyType: 'HalfYearly', dueAnchor: '2026-12-01'
    });
    cancelObligation({ obligationId: created.obligationId });
    s.assertThrows(function () {
      recordPayment({ occurrenceId: created.occurrenceId });
    }, 'OBLIGATION_CANCELLED');
  });

  s.test('reversePayment against real Sheets: Paid -> Active, and a real repayment clears ReversedAt', function () {
    var created = createObligation({
      propertyId: testPropertyId_(), category: 'Subscription', payee: 'Test Vendor',
      amount: 20, frequencyType: 'Monthly', dueAnchor: '2026-08-01'
    });
    recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 20 });
    reversePayment({ occurrenceId: created.occurrenceId, reason: 'test reversal' });
    recordPayment({ occurrenceId: created.occurrenceId, paidAmount: 22 });
    var occ = getOccurrence(created.occurrenceId);
    s.assertEqual(occ.Status, 'Paid');
    s.assertEqual(occ.PaidAmount, 22);
    s.assertEqual(occ.ReversedAt, '');
  });

  s.test('queryOverdue against real Sheets excludes a Paid occurrence', function () {
    var propertyId = testPropertyId_();
    var paidOne = createObligation({
      propertyId: propertyId, category: 'PestControl', payee: 'Test Pest Co',
      amount: 60, frequencyType: 'Quarterly', dueAnchor: '2025-01-01' // long past due
    });
    recordPayment({ occurrenceId: paidOne.occurrenceId });
    var result = queryOverdue({ propertyId: propertyId });
    var stillListed = result.results.some(function (r) { return r.OccurrenceID === paidOne.occurrenceId; });
    s.assertTrue(!stillListed, 'a Paid occurrence must not appear in queryOverdue, even against real Sheets');
  });

  var summary = s.report();
  Logger.log('\nThis run\'s rows are tagged PROP-TEST-... — call cleanupTestData_() when done inspecting them.');
  return summary;
}
