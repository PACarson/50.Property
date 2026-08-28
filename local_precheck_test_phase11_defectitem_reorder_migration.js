'use strict';
/**
 * Local precheck test — ONETIME_Phase11_DefectItemSchemaReorderMigration.js
 * (ADR-P18, 2026-08-24).
 *
 * Simulates the REAL DefectItems sheet's pre-migration state by hand
 * (bypassing all Property OS domain functions — raw Sheet API only,
 * mirroring exactly what the real, already-deployed sheet looks like
 * today: old 17-column header, written by the OLD code, before this
 * session's schema changes ever touched it), then runs
 * phase11_migrateDefectItemSchemaReorder() against it and verifies the
 * result field-by-field.
 *
 * Run with: node local_precheck_test_phase11_defectitem_reorder_migration.js
 *
 * ⚠ STATUS NOTE (added 2026-08-26, ADR-P19 Schema Consolidation —
 * found during that session's impact analysis, reported to CC, kept
 * exactly as-is per CC's explicit instruction not to touch this file):
 * phase11_migrateDefectItemSchemaReorder() reads its NEW_COLUMNS
 * target LIVE from PROPERTY_SCHEMA.DefectItem.columns (not a frozen
 * snapshot) — correct at the time this test was written, when 901 was
 * at the ADR-P18 20-column schema. As of ADR-P19 (2026-08-26), 901 has
 * moved FURTHER, to the 19-column consolidated schema (OriginalReference
 * removed). Loaded into a fresh vm context today, this migration
 * function now sees that 19-column schema as its "NEW_COLUMNS", which
 * this test's own hardcoded NEW_COLUMNS constant below (still 20
 * columns, matching what actually happened for real on 2026-08-24) no
 * longer matches — so re-running this file in the CURRENT codebase
 * will fail Case 1's header check and throw inside Case 2's
 * verification (field mismatches on the now-nonexistent
 * OriginalReference column).
 *
 * This is a property of running an already-completed, one-time
 * migration's test in a codebase that has since moved two ADRs past
 * what it was built for — NOT a live production risk: the real
 * DefectItems sheet already went through this exact migration for
 * real on 2026-08-24 (CC-confirmed MIGRATION SUCCESS) and is not in
 * the 17-column pre-ADR-P18 state this test fabricates, so this
 * function's own preflight (checks the real header against a
 * HARDCODED 17-column OLD_COLUMNS snapshot, immune to 901's live
 * state) would correctly refuse to touch it with a clear "PREFLIGHT
 * FAILED" error and zero writes, exactly like it's designed to. The
 * assertions below remain a truthful historical record of what was
 * verified when ADR-P18 was current; they are intentionally left
 * unmodified.
 */
const { loadPropertyOSContext } = require('./GasShim.js');
const vm = require('vm');

const FILES = [
  '900_PropertyConfig.js', '901_PropertySchema.js', '902_PropertyIdentity.js',
  '903_PropertyEventDefinitions.js', '910_PropertyAssetEngine.js', '918_DefectEngine.js',
  'ONETIME_Phase11_DefectItemSchemaReorderMigration.js'
];

var pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('ok  :', label); }
  else { fail++; console.log('FAIL:', label); }
}

function fresh() { return loadPropertyOSContext(__dirname, FILES).ctx; }
function run(ctx, code) { return vm.runInContext(code, ctx); }

var OLD_COLUMNS = [
  'DefectID', 'CaseID', 'OriginalReference', 'Category', 'Location',
  'Description', 'Priority', 'Status', 'DeveloperStatus',
  'OwnerVerificationStatus', 'SubmittedAt', 'RectificationStartDate',
  'DeveloperClaimedCompletedDate', 'OwnerVerifiedDate', 'ClosedDate',
  'CreatedAt', 'UpdatedAt'
];
var NEW_COLUMNS = ['DefectID', 'CaseID', 'ItemID', 'OriginalReference', 'Category',
  'SubCategory', 'Description', 'Remark', 'Location', 'Priority', 'Status',
  'DeveloperStatus', 'OwnerVerificationStatus', 'SubmittedAt', 'RectificationStartDate',
  'DeveloperClaimedCompletedDate', 'OwnerVerifiedDate', 'ClosedDate', 'CreatedAt', 'UpdatedAt'];

// Three fake pre-existing rows, hand-built in OLD column order, standing
// in for whatever is really in CC's DefectItems sheet right now (very
// possibly zero rows, since Phase 5/6 test data was cleared and real
// import hasn't run — case 1 below covers that zero-row scenario
// separately; these three are for thorough field-by-field coverage).
var OLD_ROWS = [
  ['DEF-001', 'CASE-abc123', '5', 'Structural', 'Master Bedroom', 'Ceiling crack near AC vent', 'High', 'Open', 'Pending', 'NotChecked', '2026-08-13', '', '', '', '', '2026-08-13T10:00:00.000Z', '2026-08-13T10:00:00.000Z'],
  ['DEF-002', 'CASE-abc123', '12', 'Plumbing', 'Kitchen', 'Sink tap leaking', 'Medium', 'InProgress', 'Scheduled', 'NotChecked', '2026-08-13', '2026-08-20', '', '', '', '2026-08-13T10:01:00.000Z', '2026-08-20T09:00:00.000Z'],
  ['DEF-003', 'CASE-abc123', '30', 'Waterproofing', 'Balcony', 'Water pooling after rain', 'High', 'Closed', 'ClaimedCompleted', 'Verified', '2026-08-13', '2026-08-18', '2026-08-22', '2026-08-23', '2026-08-24', '2026-08-13T10:02:00.000Z', '2026-08-24T08:00:00.000Z']
];

var OLD_DATE_COLUMNS = ['SubmittedAt', 'RectificationStartDate', 'DeveloperClaimedCompletedDate', 'OwnerVerifiedDate', 'ClosedDate', 'CreatedAt', 'UpdatedAt'];

function setupFakeOldSheet(ctx, rows) {
  run(ctx, `
    var _s = SpreadsheetApp.getActiveSpreadsheet().insertSheet(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS);
    _s.getRange(1, 1, 1, ${JSON.stringify(OLD_COLUMNS)}.length).setValues([${JSON.stringify(OLD_COLUMNS)}]);
    // Real DefectItems sheet already has '@' (plain text) format on its
    // date columns -- ensureSheetSchema_ applies this the moment the
    // sheet is first created (see its docstring). Simulating that here
    // too, so this fake "before" state matches what the real sheet
    // actually looks like, not an unformatted approximation of it.
    ${JSON.stringify(OLD_DATE_COLUMNS)}.forEach(function (colName) {
      var colIndex = ${JSON.stringify(OLD_COLUMNS)}.indexOf(colName) + 1;
      if (colIndex > 0) _s.getRange(1, colIndex, 1000, 1).setNumberFormat('@');
    });
  `);
  if (rows.length > 0) {
    run(ctx, `
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS)
        .getRange(2, 1, ${rows.length}, ${OLD_COLUMNS.length}).setValues(${JSON.stringify(rows)});
    `);
  }
}

console.log('═══ Case 1: header-only sheet, ZERO data rows (most likely real-world state today) ═══');
{
  const ctx = fresh();
  setupFakeOldSheet(ctx, []);
  const summary = run(ctx, 'phase11_migrateDefectItemSchemaReorder();');
  check('reports MIGRATION SUCCESS', /MIGRATION SUCCESS/.test(summary));
  check('reports 0 rows migrated', /^MIGRATION SUCCESS\. 0 existing data row/.test(summary));
  const header = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS)
      .getRange(1, 1, 1, ${NEW_COLUMNS.length}).getValues()[0];
  `);
  check('new header matches CC-specified order exactly', JSON.stringify(header) === JSON.stringify(NEW_COLUMNS));
  const lastRow = run(ctx, `SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS).getLastRow();`);
  check('sheet has exactly 1 row (header only) after migrating zero data rows', lastRow === 1);
}

console.log('═══ Case 2: 3 pre-existing rows — full field-by-field remap proof ═══');
{
  const ctx = fresh();
  setupFakeOldSheet(ctx, OLD_ROWS);
  const summary = run(ctx, 'phase11_migrateDefectItemSchemaReorder();');
  check('reports MIGRATION SUCCESS', /MIGRATION SUCCESS/.test(summary));
  check('reports 3 rows migrated', /^MIGRATION SUCCESS\. 3 existing data row/.test(summary));

  const header = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS)
      .getRange(1, 1, 1, ${NEW_COLUMNS.length}).getValues()[0];
  `);
  check('new header matches CC-specified order exactly', JSON.stringify(header) === JSON.stringify(NEW_COLUMNS));

  const lastRow = run(ctx, `SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS).getLastRow();`);
  check('row count unchanged: 1 header + 3 data = 4', lastRow === 4);

  const newRows = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS)
      .getRange(2, 1, 3, ${NEW_COLUMNS.length}).getValues();
  `);

  // Field-by-field proof: every OLD field, read back at its NEW
  // position by name, must equal what was originally written at its
  // OLD position — for ALL 17 pre-existing fields on ALL 3 rows, not a
  // sample.
  let allFieldsMatch = true;
  const mismatchDetails = [];
  for (let r = 0; r < 3; r++) {
    const oldObj = {};
    OLD_COLUMNS.forEach((col, i) => { oldObj[col] = OLD_ROWS[r][i]; });
    const newObj = {};
    NEW_COLUMNS.forEach((col, i) => { newObj[col] = newRows[r][i]; });
    OLD_COLUMNS.forEach((col) => {
      if (String(oldObj[col]) !== String(newObj[col])) {
        allFieldsMatch = false;
        mismatchDetails.push(`row ${r}, ${col}: "${oldObj[col]}" -> "${newObj[col]}"`);
      }
    });
  }
  check('ALL 17 pre-existing fields, ALL 3 rows, identical old vs new (by name)', allFieldsMatch);
  if (!allFieldsMatch) console.log('    mismatches:', mismatchDetails.join('; '));

  // New fields specifically blank on every migrated row.
  const newFieldsBlank = newRows.every(row => {
    const obj = {};
    NEW_COLUMNS.forEach((col, i) => { obj[col] = row[i]; });
    return obj.ItemID === '' && obj.SubCategory === '' && obj.Remark === '';
  });
  check('ItemID/SubCategory/Remark blank on all 3 migrated rows (correct — old data never had them)', newFieldsBlank);

  // Spot-check specific values landed at their new, correct positions.
  const row3AsObj = {};
  NEW_COLUMNS.forEach((col, i) => { row3AsObj[col] = newRows[2][i]; });
  check('row 3 (closed defect) OriginalReference correctly at its new position', row3AsObj.OriginalReference === '30');
  check('row 3 Category correctly at its new position', row3AsObj.Category === 'Waterproofing');
  check('row 3 ClosedDate correctly at its new position', row3AsObj.ClosedDate === '2026-08-24');
  check('row 3 DefectID still at column A', row3AsObj.DefectID === 'DEF-003');

  console.log('  --- end-to-end: normal 918 functions against the migrated data ---');
  const viaGetDefectItem = run(ctx, `getDefectItem('DEF-002');`);
  check('getDefectItem still finds a migrated row by its DefectID', viaGetDefectItem !== null && viaGetDefectItem.DefectID === 'DEF-002');
  check('getDefectItem: migrated OriginalReference readable', viaGetDefectItem.OriginalReference === '12');
  check('getDefectItem: migrated field via 918 shows blank ItemID (untouched by migration)', viaGetDefectItem.ItemID === '');

  const viaList = run(ctx, `listDefectItemsForCase('CASE-abc123');`);
  check('listDefectItemsForCase returns all 3 migrated rows', viaList.length === 3);

  const updateResult = run(ctx, `updateDefectItem({defectId: 'DEF-002', changedFields: {ItemID: 'DR-012'}});`);
  check('updateDefectItem works normally on migrated data (writes ItemID for the first time)', updateResult.success === true);
  const reread = run(ctx, `getDefectItem('DEF-002');`);
  check('the new ItemID value persisted correctly after update', reread.ItemID === 'DR-012');
  check('updating ItemID did not disturb neighboring migrated fields (OriginalReference still 12)', reread.OriginalReference === '12');
  check('updating ItemID did not disturb neighboring migrated fields (Description still original text)', reread.Description === 'Sink tap leaking');
}

console.log('═══ Case 3: idempotency — running the migration a second time ═══');
{
  const ctx = fresh();
  setupFakeOldSheet(ctx, OLD_ROWS);
  run(ctx, 'phase11_migrateDefectItemSchemaReorder();'); // first run
  const beforeSecondRun = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS)
      .getRange(1, 1, 4, ${NEW_COLUMNS.length}).getValues();
  `);
  const summary2 = run(ctx, 'phase11_migrateDefectItemSchemaReorder();'); // second run
  check('second run reports ALREADY_MIGRATED', /ALREADY_MIGRATED/.test(summary2));
  const afterSecondRun = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS)
      .getRange(1, 1, 4, ${NEW_COLUMNS.length}).getValues();
  `);
  check('sheet content byte-identical before and after the second (no-op) run', JSON.stringify(beforeSecondRun) === JSON.stringify(afterSecondRun));
}

console.log('═══ Case 4: preflight abort — header matches neither old nor new schema ═══');
{
  const ctx = fresh();
  // A header that's neither the known old shape nor the new one --
  // e.g. imagine someone had manually added just ONE of the three new
  // columns by hand at some point. Migration must refuse to guess.
  const weirdHeader = OLD_COLUMNS.concat(['ItemID']);
  run(ctx, `
    var _s = SpreadsheetApp.getActiveSpreadsheet().insertSheet(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS);
    _s.getRange(1, 1, 1, ${JSON.stringify(weirdHeader)}.length).setValues([${JSON.stringify(weirdHeader)}]);
    ${JSON.stringify(OLD_DATE_COLUMNS)}.forEach(function (colName) {
      var colIndex = ${JSON.stringify(OLD_COLUMNS)}.indexOf(colName) + 1;
      if (colIndex > 0) _s.getRange(1, colIndex, 1000, 1).setNumberFormat('@');
    });
    _s.getRange(2, 1, 1, ${OLD_COLUMNS.length}).setValues([${JSON.stringify(OLD_ROWS[0])}]);
  `);
  let threw = false, errMsg = '';
  try { run(ctx, 'phase11_migrateDefectItemSchemaReorder();'); }
  catch (e) { threw = true; errMsg = e.message; }
  check('throws rather than guessing at an unrecognized header', threw);
  check('error message clearly says PREFLIGHT FAILED', /PREFLIGHT FAILED/.test(errMsg));
  check('error message shows both what it expected and what it found', /Expected old:/.test(errMsg) && /Got:/.test(errMsg));

  const stillIntact = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS)
      .getRange(1, 1, 2, ${weirdHeader.length}).getValues();
  `);
  check('zero writes performed on abort — header row still the untouched weird one', JSON.stringify(stillIntact[0]) === JSON.stringify(weirdHeader));
  check('zero writes performed on abort — the one data row still untouched', JSON.stringify(stillIntact[1].slice(0, OLD_COLUMNS.length)) === JSON.stringify(OLD_ROWS[0]));
}

console.log('═══ Case 5: sheet does not exist at all ═══');
{
  const ctx = fresh();
  let threw = false, errMsg = '';
  try { run(ctx, 'phase11_migrateDefectItemSchemaReorder();'); }
  catch (e) { threw = true; errMsg = e.message; }
  check('throws a clear error rather than crashing on a missing sheet', threw && /does not exist/.test(errMsg));
}

console.log('\n════════════════════════════════════════════════════════════');
console.log(fail === 0 ? 'ALL ' + pass + ' CHECKS PASSED (0 failures)' : pass + ' passed, ' + fail + ' FAILED');
process.exit(fail === 0 ? 0 : 1);
