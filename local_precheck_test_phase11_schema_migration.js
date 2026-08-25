'use strict';
/**
 * Local precheck test — Phase 11 Pre-Import Gate schema migration
 * (ItemID / SubCategory / Remark), 2026-08-24. Covers ADR-P18's FINAL
 * schema (CC-specified reorder, not the earlier append-only draft).
 *
 * NOT one of the per-Engine numbered precheck files (911/918/922) —
 * this one specifically targets the cross-file migration: does the
 * new (reordered) schema round-trip through 901 -> 918 -> the real
 * DefectItem sheet, and does ONETIME_Phase11_DefectImporter.js's
 * staging logic still work correctly? The REAL sheet's own reorder
 * (existing-row remap) is covered separately by
 * local_precheck_test_phase11_defectitem_reorder_migration.js, since
 * that's a distinct piece of code
 * (ONETIME_Phase11_DefectItemSchemaReorderMigration.js). Existing
 * local_precheck_test_918.js / _922.js were re-run unmodified as a
 * regression check (144/37 checks, both still pass) — this file is
 * the NEW positive coverage for the fields those didn't know about.
 *
 * Run with: node local_precheck_test_phase11_schema_migration.js
 */
const { loadPropertyOSContext } = require('./GasShim.js');
const vm = require('vm');

const FILES = [
  '900_PropertyConfig.js', '901_PropertySchema.js', '902_PropertyIdentity.js',
  '903_PropertyEventDefinitions.js', '910_PropertyAssetEngine.js', '918_DefectEngine.js',
  'ONETIME_Phase11_DefectImporter.js'
];

var pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('ok  :', label); }
  else { fail++; console.log('FAIL:', label); }
}

function fresh() { return loadPropertyOSContext(__dirname, FILES).ctx; }
function run(ctx, code) { return vm.runInContext(code, ctx); }

function seedPropertyAndCase(ctx) {
  const propertyId = run(ctx, `
    createProperty({
      propertyName: 'Est8 Seputeh', developer: 'Eupe Corporation Berhad',
      addressLine1: 'A-19-11, Residensi Estetik 8, No 6, Jalan Syed Putra',
      addressCity: 'Kuala Lumpur', addressPostcode: '58000', addressCountry: 'Malaysia',
      purchaseDate: '2021-12-27', purchasePrice: 658000, freeholdLeasehold: 'Leasehold',
      propertyType: 'RESIDENTIAL_CONDO', developmentName: 'Est8 Seputeh', unitLabel: 'A-19-11'
    });
  `).propertyId;
  return run(ctx, `createPropertyCase({
    propertyId: '${propertyId}', caseType: 'DLP',
    originalSubmissionDate: '2026-08-13', originalSubmissionSource: 'Test harness',
    originalDefectCount: 2, managementOffice: 'Est8 JMC'
  });`).caseId;
}

console.log('═══ 901_PropertySchema.js: DefectItem.columns (final CC-specified order, ADR-P18) ═══');
{
  const ctx = fresh();
  const cols = run(ctx, 'PROPERTY_SCHEMA.DefectItem.columns.slice();');
  const EXPECTED = ['DefectID', 'CaseID', 'ItemID', 'OriginalReference', 'Category',
    'SubCategory', 'Description', 'Remark', 'Location', 'Priority', 'Status',
    'DeveloperStatus', 'OwnerVerificationStatus', 'SubmittedAt', 'RectificationStartDate',
    'DeveloperClaimedCompletedDate', 'OwnerVerifiedDate', 'ClosedDate', 'CreatedAt', 'UpdatedAt'];
  check('has 20 columns total (17 original + 3 new)', cols.length === 20);
  check('matches CC-specified order EXACTLY, position by position', JSON.stringify(cols) === JSON.stringify(EXPECTED));
  check('DefectID still column A (findRowIndexByFirstColumn_ depends on this)', cols[0] === 'DefectID');
  check('dateColumns unchanged (new fields are not dates)',
    JSON.stringify(run(ctx, 'PROPERTY_SCHEMA.DefectItem.dateColumns.slice();')) ===
    JSON.stringify(['SubmittedAt', 'RectificationStartDate', 'DeveloperClaimedCompletedDate',
      'OwnerVerifiedDate', 'ClosedDate', 'CreatedAt', 'UpdatedAt']));
}

console.log('═══ 918_DefectEngine.js: addDefectItem WITH new fields ═══');
{
  const ctx = fresh();
  const caseId = seedPropertyAndCase(ctx);
  const r = run(ctx, `addDefectItem({
    caseId: '${caseId}', description: 'Crack in wall', category: 'Structural',
    location: 'Living Room', priority: 'High', originalReference: '1',
    itemId: 'DR-001', subCategory: 'Hairline Crack', remark: 'Near window'
  });`);
  check('succeeds', r.success === true);
  check('ItemID stored on the returned object', r.defectItem.ItemID === 'DR-001');
  check('SubCategory stored on the returned object', r.defectItem.SubCategory === 'Hairline Crack');
  check('Remark stored on the returned object', r.defectItem.Remark === 'Near window');

  const reread = run(ctx, `getDefectItem('${r.defectId}');`);
  check('re-read from sheet: ItemID persisted', reread.ItemID === 'DR-001');
  check('re-read from sheet: SubCategory persisted', reread.SubCategory === 'Hairline Crack');
  check('re-read from sheet: Remark persisted', reread.Remark === 'Near window');
}

console.log('═══ 918_DefectEngine.js: addDefectItem WITHOUT new fields (backward compat) ═══');
{
  const ctx = fresh();
  const caseId = seedPropertyAndCase(ctx);
  const r = run(ctx, `addDefectItem({
    caseId: '${caseId}', description: 'Leaking tap', originalReference: '2'
  });`);
  check('succeeds without itemId/subCategory/remark', r.success === true);
  check('ItemID defaults to empty string', r.defectItem.ItemID === '');
  check('SubCategory defaults to empty string', r.defectItem.SubCategory === '');
  check('Remark defaults to empty string', r.defectItem.Remark === '');
}

console.log('═══ 918_DefectEngine.js: updateDefectItem can edit the new fields ═══');
{
  const ctx = fresh();
  const caseId = seedPropertyAndCase(ctx);
  const added = run(ctx, `addDefectItem({caseId: '${caseId}', description: 'Test', originalReference: '3'});`);
  const r = run(ctx, `updateDefectItem({
    defectId: '${added.defectId}',
    changedFields: { ItemID: 'DR-003', SubCategory: 'Sub A', Remark: 'Updated remark' }
  });`);
  check('updateDefectItem succeeds (fields not on the denylist)', r.success === true);
  const reread = run(ctx, `getDefectItem('${added.defectId}');`);
  check('ItemID updated', reread.ItemID === 'DR-003');
  check('SubCategory updated', reread.SubCategory === 'Sub A');
  check('Remark updated', reread.Remark === 'Updated remark');
}

console.log('═══ ONETIME_Phase11_DefectImporter.js: phase11_colIndex_ ═══');
{
  const ctx = fresh();
  check('OriginalReference at 0', run(ctx, "phase11_colIndex_('OriginalReference');") === 0);
  check('ItemID at 1', run(ctx, "phase11_colIndex_('ItemID');") === 1);
  check('ValidationResult at 8 (sheet column I)', run(ctx, "phase11_colIndex_('ValidationResult');") === 8);
  check('ImportResult at 9 (sheet column J)', run(ctx, "phase11_colIndex_('ImportResult');") === 9);
  let threw = false, msg = '';
  try { run(ctx, "phase11_colIndex_('NotARealColumn');"); }
  catch (e) { threw = true; msg = e.message; }
  check('unknown column name throws clearly', threw && /not in PHASE11_STAGING_COLUMNS/.test(msg));
}

console.log('═══ ONETIME_Phase11_DefectImporter.js: phase11_setupDefectImportStagingSheet example rows ═══');
{
  const ctx = fresh();
  run(ctx, 'phase11_setupDefectImportStagingSheet();');
  const rows = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DefectImportStaging')
      .getRange(2, 1, 2, PHASE11_STAGING_COLUMNS.length).getValues();
  `);
  check('both example rows have exactly 10 cells (matches new PHASE11_STAGING_COLUMNS length)',
    rows[0].length === 10 && rows[1].length === 10);
  check('example row 1 ItemID/SubCategory/Remark deliberately blank (shows optional)',
    rows[0][1] === '' && rows[0][4] === '' && rows[0][6] === '');
  check('example row 2 ItemID/SubCategory/Remark filled in (shows columns in use)',
    rows[1][1] !== '' && rows[1][4] !== '' && rows[1][6] !== '');
  const frozenRows = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DefectImportStaging').frozenRows;
  `);
  check('header row (row 1) is frozen — spotted missing on the real sheet 2026-08-24, added here', frozenRows === 1);
}

console.log('═══ ONETIME_Phase11_DefectImporter.js: staging row validation reads shifted positions correctly ═══');
{
  const ctx = fresh();
  // [OriginalReference, ItemID, Location, Category, SubCategory, Description, Remark, Priority, ValidationResult, ImportResult]
  const v = run(ctx, `phase11_validateStagingRow_(
    ['10', 'DR-010', 'Kitchen', 'Plumbing', 'Pipe Leak', 'Leaking under sink', 'Tenant reported smell', 'High', '', ''],
    2, {}, {}
  );`);
  check('status READY', v.status === 'READY');
  check('itemId parsed from the correct (new) column', v.itemId === 'DR-010');
  check('subCategory parsed from the correct (new) column', v.subCategory === 'Pipe Leak');
  check('remark parsed from the correct (new) column', v.remark === 'Tenant reported smell');
  check('description still parsed correctly despite shifted position', v.description === 'Leaking under sink');
  check('priority still parsed correctly despite shifted position', v.priority === 'High');

  const vBlank = run(ctx, `phase11_validateStagingRow_(
    ['11', '', 'Kitchen', 'Plumbing', '', 'Another leak', '', 'Medium', '', ''],
    3, {}, {}
  );`);
  check('blank ItemID/SubCategory/Remark still READY (all three optional)', vBlank.status === 'READY');

  const vInvalid = run(ctx, `phase11_validateStagingRow_(
    ['31', '', 'Bedroom 2', 'Electrical', '', '', '', 'Medium', '', ''],
    4, {}, {}
  );`);
  check('missing Description correctly still flagged INVALID at its new position (not a false pass)',
    vInvalid.status === 'INVALID' && /Description is required/.test(vInvalid.message));
}

console.log('═══ ONETIME_Phase11_DefectImporter.js: dedup key is still OriginalReference only ═══');
{
  const ctx = fresh();
  const caseId = seedPropertyAndCase(ctx);
  run(ctx, `addDefectItem({caseId: '${caseId}', description: 'Existing', originalReference: '20', itemId: 'OLD-ID'});`);
  const existingRefs = run(ctx, `phase11_loadExistingReferences_('${caseId}');`);
  check('phase11_loadExistingReferences_ still keyed by OriginalReference', '20' in existingRefs);

  const v = run(ctx, `phase11_validateStagingRow_(
    ['20', 'BRAND-NEW-ITEMID', 'Somewhere', 'Other', '', 'Different description text', '', 'Low', '', ''],
    2, {}, phase11_loadExistingReferences_('${caseId}')
  );`);
  check('same OriginalReference + DIFFERENT ItemID -> still ALREADY_IMPORTED (ItemID plays no role in dedup)',
    v.status === 'ALREADY_IMPORTED');
}

console.log('═══ ONETIME_Phase11_DefectImporter.js: end-to-end dry-run + real-run against a fake staging sheet ═══');
{
  const ctx = fresh();
  const caseId = seedPropertyAndCase(ctx);
  // Re-assign the var binding to a NEW frozen object with our test
  // caseId -- does not mutate the original frozen PHASE11_IMPORT_CONFIG,
  // just points this context's copy at the Case we just created.
  run(ctx, `PHASE11_IMPORT_CONFIG = Object.freeze(Object.assign({}, PHASE11_IMPORT_CONFIG, {caseId: '${caseId}'}));`);
  run(ctx, 'phase11_setupDefectImportStagingSheet();');
  run(ctx, `
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DefectImportStaging');
    sheet.getRange(2, 1, 2, PHASE11_STAGING_COLUMNS.length).setValues([
      ['30', 'DR-030', 'Balcony', 'Waterproofing', 'Ponding', 'Water pools after rain', 'Worse after storms', 'High', '', ''],
      ['31', '', 'Bedroom 2', 'Electrical', '', '', '', 'Medium', '', '']
    ]);
  `);

  const dryRunSummary = run(ctx, 'phase11_dryRunDefectImport();');
  check('dry run summary: 1 would_import, 1 invalid',
    /would_import: 1/.test(dryRunSummary) && /invalid: 1/.test(dryRunSummary));

  const validationCol = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DefectImportStaging')
      .getRange(2, phase11_colIndex_('ValidationResult') + 1, 2, 1).getValues().map(function(r){return r[0];});
  `);
  check('ValidationResult landed in its NEW column position (I, not the old F)',
    /^READY/.test(validationCol[0]) && /^INVALID/.test(validationCol[1]));

  const oldColumnF = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DefectImportStaging')
      .getRange(2, 6, 1, 1).getValues()[0][0];
  `);
  check('old hardcoded column-F position now holds Description data, not a validation result',
    oldColumnF === 'Water pools after rain');

  const runSummary = run(ctx, 'phase11_runDefectImport();');
  check('real run summary: 1 imported, 1 invalid', /imported: 1/.test(runSummary) && /invalid: 1/.test(runSummary));

  const imported = run(ctx, `listDefectItemsForCase('${caseId}').filter(function(d){return d.OriginalReference === '30';})[0];`);
  check('imported row carries ItemID through to the real DefectItem sheet', imported.ItemID === 'DR-030');
  check('imported row carries SubCategory through', imported.SubCategory === 'Ponding');
  check('imported row carries Remark through', imported.Remark === 'Worse after storms');

  const importResultCol = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DefectImportStaging')
      .getRange(2, phase11_colIndex_('ImportResult') + 1, 1, 1).getValues()[0][0];
  `);
  check('ImportResult landed in its NEW column position (J, not the old G)', /^IMPORTED/.test(importResultCol));

  const rerunSummary = run(ctx, 'phase11_runDefectImport();');
  check('re-running treats row 30 as ALREADY_IMPORTED, not a duplicate insert',
    /already_imported: 1/.test(rerunSummary));
  const countAfterRerun = run(ctx,
    `listDefectItemsForCase('${caseId}').filter(function(d){return d.OriginalReference === '30';}).length;`);
  check('exactly ONE real DefectItem exists for OriginalReference 30 after two runs (durable dedup intact)',
    countAfterRerun === 1);
}

console.log('\n════════════════════════════════════════════════════════════');
console.log(fail === 0 ? 'ALL ' + pass + ' CHECKS PASSED (0 failures)' : pass + ' passed, ' + fail + ' FAILED');
process.exit(fail === 0 ? 0 : 1);
