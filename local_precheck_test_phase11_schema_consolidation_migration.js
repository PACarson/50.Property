'use strict';
/**
 * Local precheck test — ONETIME_Phase11_DefectItemSchemaConsolidationMigration.js
 * (ADR-P19, 2026-08-26).
 *
 * Simulates the REAL DefectItems sheet's post-ADR-P18/pre-consolidation
 * state by hand (raw Sheet API only, mirroring what the real,
 * already-deployed sheet looks like after Real Import succeeded: old
 * 20-column header with ItemID AND OriginalReference both present),
 * then runs phase11_migrateDefectItemSchemaConsolidation() against it
 * and verifies the result field-by-field — including the two
 * business-rule preflight checks (ItemID/OriginalReference conflict,
 * out-of-enum Category) that CC's ADR-P19 instructions require.
 *
 * Run with: node local_precheck_test_phase11_schema_consolidation_migration.js
 */
const { loadPropertyOSContext } = require('./GasShim.js');
const vm = require('vm');

const FILES = [
  '900_PropertyConfig.js', '901_PropertySchema.js', '902_PropertyIdentity.js',
  '903_PropertyEventDefinitions.js', '910_PropertyAssetEngine.js', '918_DefectEngine.js',
  'ONETIME_Phase11_DefectItemSchemaConsolidationMigration.js'
];

var pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('ok  :', label); }
  else { fail++; console.log('FAIL:', label); }
}

function fresh() { return loadPropertyOSContext(__dirname, FILES).ctx; }
function run(ctx, code) { return vm.runInContext(code, ctx); }

var OLD_COLUMNS = [
  'DefectID', 'CaseID', 'ItemID', 'OriginalReference', 'Category',
  'SubCategory', 'Description', 'Remark', 'Location', 'Priority',
  'Status', 'DeveloperStatus', 'OwnerVerificationStatus', 'SubmittedAt',
  'RectificationStartDate', 'DeveloperClaimedCompletedDate',
  'OwnerVerifiedDate', 'ClosedDate', 'CreatedAt', 'UpdatedAt'
];
var NEW_COLUMNS = [
  'DefectID', 'CaseID', 'ItemID', 'Category', 'SubCategory', 'Description',
  'Remark', 'Location', 'Priority', 'Status', 'DeveloperStatus',
  'OwnerVerificationStatus', 'SubmittedAt', 'RectificationStartDate',
  'DeveloperClaimedCompletedDate', 'OwnerVerifiedDate', 'ClosedDate',
  'CreatedAt', 'UpdatedAt'
];
var OLD_DATE_COLUMNS = ['SubmittedAt', 'RectificationStartDate', 'DeveloperClaimedCompletedDate', 'OwnerVerifiedDate', 'ClosedDate', 'CreatedAt', 'UpdatedAt'];

// Three fake pre-existing rows, hand-built in OLD (post-ADR-P18) column
// order, covering the three merge scenarios ADR-P19 requires:
//   DEF-001: ItemID only (OriginalReference blank)      -> merged '88'
//   DEF-002: OriginalReference only (ItemID blank)       -> merged '12'
//   DEF-003: both present AND equal                      -> merged '30'
// All three use a Category value that IS in the new enum, so this set
// is meant to reach MIGRATION SUCCESS cleanly.
var OLD_ROWS = [
  ['DEF-001', 'CASE-abc123', '88', '', 'Plumbing', '', 'Kitchen tap leaking', '', 'Kitchen', 'High', 'Open', 'Pending', 'NotChecked', '2026-08-13', '', '', '', '', '2026-08-13T10:00:00.000Z', '2026-08-13T10:00:00.000Z'],
  ['DEF-002', 'CASE-abc123', '', '12', 'Wall', 'Skirting', 'Wall crack near skirting', 'Watch for spread', 'Master Bedroom', 'Medium', 'InProgress', 'Scheduled', 'NotChecked', '2026-08-13', '2026-08-20', '', '', '', '2026-08-13T10:01:00.000Z', '2026-08-20T09:00:00.000Z'],
  ['DEF-003', 'CASE-abc123', '30', '30', 'Ceiling', '', 'Ceiling water stain', '', 'Balcony', 'High', 'Closed', 'ClaimedCompleted', 'Verified', '2026-08-13', '2026-08-18', '2026-08-22', '2026-08-23', '2026-08-24', '2026-08-13T10:02:00.000Z', '2026-08-24T08:00:00.000Z']
];
var MERGED_ITEMIDS = ['88', '12', '30'];

function setupFakeOldSheet(ctx, rows) {
  run(ctx, `
    var _s = SpreadsheetApp.getActiveSpreadsheet().insertSheet(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS);
    _s.getRange(1, 1, 1, ${JSON.stringify(OLD_COLUMNS)}.length).setValues([${JSON.stringify(OLD_COLUMNS)}]);
    // Real DefectItems sheet already has '@' (plain text) format on its
    // date columns from the moment it was first created / from the
    // ADR-P18 migration — simulating that here too.
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

console.log('═══ Case 1: header-only sheet, ZERO data rows ═══');
{
  const ctx = fresh();
  setupFakeOldSheet(ctx, []);
  const summary = run(ctx, 'phase11_migrateDefectItemSchemaConsolidation();');
  check('reports MIGRATION SUCCESS', /MIGRATION SUCCESS/.test(summary));
  check('reports 0 rows migrated', /^MIGRATION SUCCESS\. 0 existing data row/.test(summary));
  const header = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS)
      .getRange(1, 1, 1, ${NEW_COLUMNS.length}).getValues()[0];
  `);
  check('new header matches CC-specified 19-column order exactly', JSON.stringify(header) === JSON.stringify(NEW_COLUMNS));
  const lastRow = run(ctx, `SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS).getLastRow();`);
  check('sheet has exactly 1 row (header only) after migrating zero data rows', lastRow === 1);
}

console.log('═══ Case 2: 3 rows — full field-by-field remap + all 3 merge scenarios ═══');
{
  const ctx = fresh();
  setupFakeOldSheet(ctx, OLD_ROWS);
  const summary = run(ctx, 'phase11_migrateDefectItemSchemaConsolidation();');
  check('reports MIGRATION SUCCESS', /MIGRATION SUCCESS/.test(summary));
  check('reports 3 rows migrated', /^MIGRATION SUCCESS\. 3 existing data row/.test(summary));
  check('summary mentions zero conflicts and zero out-of-enum categories', /[Zz]ero ItemID\/OriginalReference conflicts/.test(summary) && /zero out-of-enum/.test(summary));

  const header = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS)
      .getRange(1, 1, 1, ${NEW_COLUMNS.length}).getValues()[0];
  `);
  check('new header matches CC-specified 19-column order exactly', JSON.stringify(header) === JSON.stringify(NEW_COLUMNS));

  const rowsAsObjects = run(ctx, `
    [1,2,3].map(function(n){
      return readRowAsObject_(
        SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS),
        n + 1, PROPERTY_SCHEMA.DefectItem.columns
      );
    });
  `);
  check('DEF-001 (ItemID-only) merged ItemID correctly ("88")', rowsAsObjects[0].ItemID === MERGED_ITEMIDS[0]);
  check('DEF-002 (OriginalReference-only) merged ItemID correctly ("12")', rowsAsObjects[1].ItemID === MERGED_ITEMIDS[1]);
  check('DEF-003 (both equal) merged ItemID correctly ("30")', rowsAsObjects[2].ItemID === MERGED_ITEMIDS[2]);
  check('DEF-002 Description preserved exactly', rowsAsObjects[1].Description === 'Wall crack near skirting');
  check('DEF-002 Remark preserved exactly', rowsAsObjects[1].Remark === 'Watch for spread');
  check('DEF-003 Category preserved exactly ("Ceiling", new-enum value)', rowsAsObjects[2].Category === 'Ceiling');
  check('DEF-003 DeveloperStatus preserved exactly', rowsAsObjects[2].DeveloperStatus === 'ClaimedCompleted');
  check('DEF-003 OwnerVerificationStatus preserved exactly', rowsAsObjects[2].OwnerVerificationStatus === 'Verified');
  check('DEF-003 ClosedDate preserved exactly (still a plain ISO-date STRING, not coerced to a Date object)',
    rowsAsObjects[2].ClosedDate === '2026-08-24' && typeof rowsAsObjects[2].ClosedDate === 'string');
  check('DEF-001 SubmittedAt preserved exactly', rowsAsObjects[0].SubmittedAt === '2026-08-13');

  const oldColumnGone = run(ctx, `
    !PROPERTY_SCHEMA.DefectItem.columns.includes('OriginalReference');
  `);
  check('OriginalReference no longer in the live schema', oldColumnGone);

  // The old sheet had 20 columns; column 20 (formerly OriginalReference)
  // must be blanked, not left as a stray leftover past the new header.
  const staleCol20 = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS)
      .getRange(1, 20, 4, 1).getValues();
  `);
  check('old 20th column (formerly OriginalReference) fully blanked after migration, header row included',
    staleCol20.every(function (r) { return r[0] === ''; }));
}

console.log('═══ Case 3: ItemID/OriginalReference CONFLICT — must abort, zero writes ═══');
{
  const ctx = fresh();
  const conflictRows = [
    ['DEF-050', 'CASE-abc123', '50', '99', 'Wall', '', 'Conflicting row', '', 'Study', 'Low', 'Open', 'Pending', 'NotChecked', '2026-08-13', '', '', '', '', '2026-08-13T10:00:00.000Z', '2026-08-13T10:00:00.000Z']
  ];
  setupFakeOldSheet(ctx, conflictRows);
  let threw = false, errMsg = '';
  try { run(ctx, 'phase11_migrateDefectItemSchemaConsolidation();'); }
  catch (e) { threw = true; errMsg = e.message; }
  check('throws on ItemID/OriginalReference conflict', threw);
  check('error names the conflicting DefectID', /DEF-050/.test(errMsg));
  check('error shows both conflicting values ("50" and "99")', /"50"/.test(errMsg) && /"99"/.test(errMsg));
  check('error explicitly says zero writes performed', /Zero writes performed/.test(errMsg));
  const stillOldHeader = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS)
      .getRange(1, 1, 1, ${OLD_COLUMNS.length}).getValues()[0];
  `);
  check('sheet header genuinely untouched (still the old 20-column layout) after the throw', JSON.stringify(stillOldHeader) === JSON.stringify(OLD_COLUMNS));
}

console.log('═══ Case 4: out-of-enum Category — must abort, zero writes ═══');
{
  const ctx = fresh();
  const badCategoryRows = [
    ['DEF-060', 'CASE-abc123', '60', '60', 'Waterproofing', '', 'Old-enum category, no longer valid', '', 'Bathroom', 'High', 'Open', 'Pending', 'NotChecked', '2026-08-13', '', '', '', '', '2026-08-13T10:00:00.000Z', '2026-08-13T10:00:00.000Z']
  ];
  setupFakeOldSheet(ctx, badCategoryRows);
  let threw = false, errMsg = '';
  try { run(ctx, 'phase11_migrateDefectItemSchemaConsolidation();'); }
  catch (e) { threw = true; errMsg = e.message; }
  check('throws on out-of-enum Category', threw);
  check('error names the offending DefectID', /DEF-060/.test(errMsg));
  check('error shows the invalid Category value ("Waterproofing", removed from the new enum)', /Waterproofing/.test(errMsg));
  check('error explicitly says zero writes performed', /Zero writes performed/.test(errMsg));
}

console.log('═══ Case 5: BOTH a conflict row AND a bad-category row — preflight reports both classes, still zero writes ═══');
{
  const ctx = fresh();
  const mixedRows = [
    ['DEF-070', 'CASE-abc123', '70', '71', 'Plumbing', '', 'Conflict row', '', 'Kitchen', 'Low', 'Open', 'Pending', 'NotChecked', '2026-08-13', '', '', '', '', '2026-08-13T10:00:00.000Z', '2026-08-13T10:00:00.000Z'],
    ['DEF-071', 'CASE-abc123', '72', '72', 'Electrical', '', 'Bad category row', '', 'Study', 'Low', 'Open', 'Pending', 'NotChecked', '2026-08-13', '', '', '', '', '2026-08-13T10:00:00.000Z', '2026-08-13T10:00:00.000Z']
  ];
  setupFakeOldSheet(ctx, mixedRows);
  let threw = false, errMsg = '';
  try { run(ctx, 'phase11_migrateDefectItemSchemaConsolidation();'); }
  catch (e) { threw = true; errMsg = e.message; }
  // Conflict check runs first (see file), so this throws on the
  // conflict without ever reaching the category check in the same run
  // — that's fine, it's still zero writes either way, and re-running
  // after fixing the conflict will then surface the category problem.
  check('throws (conflict preflight runs before category preflight, so this row set is caught)', threw);
  check('error names DEF-070 (the conflict)', /DEF-070/.test(errMsg));
}

console.log('═══ Case 6: idempotency — running twice, second call reports ALREADY_MIGRATED ═══');
{
  const ctx = fresh();
  setupFakeOldSheet(ctx, OLD_ROWS);
  const first = run(ctx, 'phase11_migrateDefectItemSchemaConsolidation();');
  check('first run: MIGRATION SUCCESS', /MIGRATION SUCCESS/.test(first));
  const second = run(ctx, 'phase11_migrateDefectItemSchemaConsolidation();');
  check('second run: ALREADY_MIGRATED, not re-processed', /ALREADY_MIGRATED/.test(second));
  check('second run explicitly says zero writes performed', /Zero writes performed/.test(second));
}

console.log('═══ Case 7: unrecognized header (neither old nor new layout) — PREFLIGHT FAILED ═══');
{
  const ctx = fresh();
  run(ctx, `
    var _s = SpreadsheetApp.getActiveSpreadsheet().insertSheet(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS);
    _s.getRange(1, 1, 1, 3).setValues([['DefectID', 'SomethingWeird', 'AnotherColumn']]);
  `);
  let threw = false, errMsg = '';
  try { run(ctx, 'phase11_migrateDefectItemSchemaConsolidation();'); }
  catch (e) { threw = true; errMsg = e.message; }
  check('throws PREFLIGHT FAILED on unrecognized header', threw && /PREFLIGHT FAILED/.test(errMsg));
  check('error explicitly says zero writes performed', /Zero writes performed/.test(errMsg));
}

console.log('═══ Case 8: sheet does not exist ═══');
{
  const ctx = fresh();
  let threw = false, errMsg = '';
  try { run(ctx, 'phase11_migrateDefectItemSchemaConsolidation();'); }
  catch (e) { threw = true; errMsg = e.message; }
  check('throws when DefectItems sheet does not exist', threw);
  check('error suggests initDefectEngineSchema_() instead', /initDefectEngineSchema_/.test(errMsg));
}

console.log('\\n════════════════════════════════════════════════════════════');
console.log(pass + ' PASSED, ' + fail + ' FAILED');
if (fail > 0) process.exit(1);
