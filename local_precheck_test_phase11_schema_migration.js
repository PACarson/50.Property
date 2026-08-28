'use strict';
/**
 * Local precheck test — Phase 11 Pre-Import Gate schema migration
 * (ItemID / SubCategory / Remark, ADR-P18, 2026-08-24) AND the
 * subsequent Schema Consolidation (ADR-P19, 2026-08-26: OriginalReference
 * merged into ItemID, Category redefined to a fixed 15-value enum).
 * This file covers the CURRENT, post-ADR-P19 final schema — updated
 * 2026-08-26, superseding its own original ADR-P18-only assertions
 * (see git history / prior version for what those looked like; this is
 * not a separate migration-mechanics test, that's covered by
 * local_precheck_test_phase11_schema_consolidation_migration.js).
 *
 * NOT one of the per-Engine numbered precheck files (911/918/922) —
 * this one specifically targets the cross-file contract: does the
 * current schema round-trip through 901 -> 918 -> the real DefectItem
 * sheet, and does ONETIME_Phase11_DefectImporter.js's staging logic
 * still work correctly with ItemID as the sole dedup key? The REAL
 * sheet's own structural migrations (existing-row remap) are covered
 * separately by local_precheck_test_phase11_defectitem_reorder_migration.js
 * (ADR-P18) and local_precheck_test_phase11_schema_consolidation_migration.js
 * (ADR-P19), since those are distinct pieces of code. Existing
 * local_precheck_test_918.js / _922.js were re-run as a regression
 * check (144/37 checks, both still pass after this same session's
 * Category-value and originalReference->itemId parameter fixes) — this
 * file is the positive coverage for the fields/behavior those don't
 * specifically target.
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

console.log('═══ 901_PropertySchema.js: DefectItem.columns (post-ADR-P19 consolidated order) ═══');
{
  const ctx = fresh();
  const cols = run(ctx, 'PROPERTY_SCHEMA.DefectItem.columns.slice();');
  const EXPECTED = ['DefectID', 'CaseID', 'ItemID', 'Category',
    'SubCategory', 'Description', 'Remark', 'Location', 'Priority', 'Status',
    'DeveloperStatus', 'OwnerVerificationStatus', 'SubmittedAt', 'RectificationStartDate',
    'DeveloperClaimedCompletedDate', 'OwnerVerifiedDate', 'ClosedDate', 'CreatedAt', 'UpdatedAt'];
  check('has 19 columns total (OriginalReference removed under ADR-P19)', cols.length === 19);
  check('matches CC-specified order EXACTLY, position by position', JSON.stringify(cols) === JSON.stringify(EXPECTED));
  check('DefectID still column A (findRowIndexByFirstColumn_ depends on this)', cols[0] === 'DefectID');
  check('OriginalReference no longer present anywhere in the schema', cols.indexOf('OriginalReference') === -1);
  check('dateColumns unchanged (new/merged fields are not dates)',
    JSON.stringify(run(ctx, 'PROPERTY_SCHEMA.DefectItem.dateColumns.slice();')) ===
    JSON.stringify(['SubmittedAt', 'RectificationStartDate', 'DeveloperClaimedCompletedDate',
      'OwnerVerifiedDate', 'ClosedDate', 'CreatedAt', 'UpdatedAt']));
}

console.log('═══ 900_PropertyConfig.js: DEFECT_CATEGORIES (ADR-P19 final fixed enum) ═══');
{
  const ctx = fresh();
  const cats = run(ctx, 'PROPERTY_CONFIG.DEFECT_CATEGORIES.slice();');
  const EXPECTED_CATS = ['Plumbing', 'Appliances', 'Carpentry', 'Ceiling', 'Wall',
    'Sanitary Fitting', 'Floor', 'Glass Panel', 'Door Panels', 'Ironmongery',
    'Door Frames', 'Hand Railing', 'A/C Ledge MS Railing', 'Window', 'Other'];
  check('has exactly 15 categories', cats.length === 15);
  check('matches CC-specified list EXACTLY, including spelling/order', JSON.stringify(cats) === JSON.stringify(EXPECTED_CATS));
  check('old-enum-only values are GONE (Structural/Waterproofing/Electrical/AirConditioning/Painting/Flooring/singular-Appliance)',
    ['Structural', 'Waterproofing', 'Electrical', 'AirConditioning', 'Painting', 'Flooring', 'Appliance']
      .every(function (old) { return cats.indexOf(old) === -1; }));
}

console.log('═══ 918_DefectEngine.js: addDefectItem WITH new fields, no OriginalReference param ═══');
{
  const ctx = fresh();
  const caseId = seedPropertyAndCase(ctx);
  const r = run(ctx, `addDefectItem({
    caseId: '${caseId}', description: 'Crack in wall', category: 'Wall',
    location: 'Living Room', priority: 'High',
    itemId: 'DR-001', subCategory: 'Hairline Crack', remark: 'Near window'
  });`);
  check('succeeds', r.success === true);
  check('ItemID stored on the returned object', r.defectItem.ItemID === 'DR-001');
  check('SubCategory stored on the returned object', r.defectItem.SubCategory === 'Hairline Crack');
  check('Remark stored on the returned object', r.defectItem.Remark === 'Near window');
  check('OriginalReference key does not exist on the returned object at all', !('OriginalReference' in r.defectItem));

  const reread = run(ctx, `getDefectItem('${r.defectId}');`);
  check('re-read from sheet: ItemID persisted', reread.ItemID === 'DR-001');
  check('re-read from sheet: SubCategory persisted', reread.SubCategory === 'Hairline Crack');
  check('re-read from sheet: Remark persisted', reread.Remark === 'Near window');

  // Even if a caller still passes the old parameter name (backward-
  // compat safety net for anything not yet updated), it must be a
  // silent no-op, never written anywhere -- ADR-P19 removed the field
  // entirely, addDefectItem no longer reads input.originalReference.
  const legacyCall = run(ctx, `addDefectItem({
    caseId: '${caseId}', description: 'Legacy caller still passing old param',
    itemId: 'DR-002', originalReference: 'should-be-ignored'
  });`);
  check('a caller still passing legacy originalReference does not error', legacyCall.success === true);
  check('...and it is silently ignored, not stored anywhere', !('OriginalReference' in legacyCall.defectItem));
  check('...ItemID from the SAME call is unaffected', legacyCall.defectItem.ItemID === 'DR-002');
}

console.log('═══ 918_DefectEngine.js: addDefectItem WITHOUT new fields (lenient defaults) ═══');
{
  const ctx = fresh();
  const caseId = seedPropertyAndCase(ctx);
  const r = run(ctx, `addDefectItem({
    caseId: '${caseId}', description: 'Leaking tap'
  });`);
  check('succeeds without itemId/subCategory/remark', r.success === true);
  check('ItemID defaults to empty string', r.defectItem.ItemID === '');
  check('SubCategory defaults to empty string', r.defectItem.SubCategory === '');
  check('Remark defaults to empty string', r.defectItem.Remark === '');
  check('Category defaults to Other (still in the new enum)', r.defectItem.Category === 'Other');
}

console.log('═══ 918_DefectEngine.js: updateDefectItem can edit ItemID/SubCategory/Remark; Category enum enforced ═══');
{
  const ctx = fresh();
  const caseId = seedPropertyAndCase(ctx);
  const added = run(ctx, `addDefectItem({caseId: '${caseId}', description: 'Test'});`);
  const r = run(ctx, `updateDefectItem({
    defectId: '${added.defectId}',
    changedFields: { ItemID: 'DR-003', SubCategory: 'Sub A', Remark: 'Updated remark' }
  });`);
  check('updateDefectItem succeeds (fields not on the denylist)', r.success === true);
  const reread = run(ctx, `getDefectItem('${added.defectId}');`);
  check('ItemID updated', reread.ItemID === 'DR-003');
  check('SubCategory updated', reread.SubCategory === 'Sub A');
  check('Remark updated', reread.Remark === 'Updated remark');

  let threw = false, msg = '';
  try { run(ctx, `updateDefectItem({defectId: '${added.defectId}', changedFields: { Category: 'Waterproofing' }});`); }
  catch (e) { threw = true; msg = e.message; }
  check('updateDefectItem rejects an old-enum-only Category value ("Waterproofing")', threw && /Unknown Category/.test(msg));
}

console.log('═══ ONETIME_Phase11_DefectImporter.js: phase11_colIndex_ (post-ADR-P19, 9 staging columns) ═══');
{
  const ctx = fresh();
  check('ItemID at 0 (now the FIRST staging column — OriginalReference removed)', run(ctx, "phase11_colIndex_('ItemID');") === 0);
  check('Location at 1', run(ctx, "phase11_colIndex_('Location');") === 1);
  check('Category at 2', run(ctx, "phase11_colIndex_('Category');") === 2);
  check('SubCategory at 3', run(ctx, "phase11_colIndex_('SubCategory');") === 3);
  check('Description at 4', run(ctx, "phase11_colIndex_('Description');") === 4);
  check('Remark at 5', run(ctx, "phase11_colIndex_('Remark');") === 5);
  check('Priority at 6', run(ctx, "phase11_colIndex_('Priority');") === 6);
  check('ValidationResult at 7 (sheet column H, was I before ADR-P19 removed a column)', run(ctx, "phase11_colIndex_('ValidationResult');") === 7);
  check('ImportResult at 8 (sheet column I, was J before ADR-P19)', run(ctx, "phase11_colIndex_('ImportResult');") === 8);
  check('OriginalReference is simply not a recognized staging column anymore', (function () {
    try { run(ctx, "phase11_colIndex_('OriginalReference');"); return false; }
    catch (e) { return /not in PHASE11_STAGING_COLUMNS/.test(e.message); }
  })());
  let threw = false, msg = '';
  try { run(ctx, "phase11_colIndex_('NotARealColumn');"); }
  catch (e) { threw = true; msg = e.message; }
  check('unknown column name throws clearly', threw && /not in PHASE11_STAGING_COLUMNS/.test(msg));
}

console.log('═══ ONETIME_Phase11_DefectImporter.js: phase11_setupDefectImportStagingSheet example rows (9 columns) ═══');
{
  const ctx = fresh();
  run(ctx, 'phase11_setupDefectImportStagingSheet();');
  const rows = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DefectImportStaging')
      .getRange(2, 1, 2, PHASE11_STAGING_COLUMNS.length).getValues();
  `);
  check('both example rows have exactly 9 cells (matches new PHASE11_STAGING_COLUMNS length, OriginalReference removed)',
    rows[0].length === 9 && rows[1].length === 9);
  check('example row 1 has a non-blank ItemID (ADR-P19: ItemID is now REQUIRED, unlike SubCategory/Remark)', rows[0][0] !== '');
  check('example row 1 SubCategory/Remark deliberately blank (still optional)',
    rows[0][3] === '' && rows[0][5] === '');
  check('example row 1 uses a valid new-enum Category ("Wall")', rows[0][2] === 'Wall');
  check('example row 2 SubCategory/Remark filled in (shows the columns in use)',
    rows[1][3] !== '' && rows[1][5] !== '');
  check('example row 2 deliberately has an invalid Category, for dry-run to flag ("BadCategoryXYZ")', rows[1][2] === 'BadCategoryXYZ');
  const frozenRows = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DefectImportStaging').frozenRows;
  `);
  check('header row (row 1) is frozen', frozenRows === 1);
}

console.log('═══ ONETIME_Phase11_DefectImporter.js: staging row validation reads correct (post-ADR-P19) positions ═══');
{
  const ctx = fresh();
  // [ItemID, Location, Category, SubCategory, Description, Remark, Priority, ValidationResult, ImportResult]
  const v = run(ctx, `phase11_validateStagingRow_(
    ['DR-010', 'Kitchen', 'Plumbing', 'Pipe Leak', 'Leaking under sink', 'Tenant reported smell', 'High', '', ''],
    2, {}, {}
  );`);
  check('status READY', v.status === 'READY');
  check('itemId parsed from the correct (now first) column', v.itemId === 'DR-010');
  check('subCategory parsed from the correct column', v.subCategory === 'Pipe Leak');
  check('remark parsed from the correct column', v.remark === 'Tenant reported smell');
  check('description parsed correctly', v.description === 'Leaking under sink');
  check('priority parsed correctly', v.priority === 'High');
  check('result object has no originalReference key at all', !('originalReference' in v));

  const vBlankOptionalOnly = run(ctx, `phase11_validateStagingRow_(
    ['DR-011', 'Kitchen', 'Plumbing', '', 'Another leak', '', 'Medium', '', ''],
    3, {}, {}
  );`);
  check('blank SubCategory/Remark (but valid ItemID) still READY — both stay optional', vBlankOptionalOnly.status === 'READY');

  const vBlankItemId = run(ctx, `phase11_validateStagingRow_(
    ['', 'Kitchen', 'Plumbing', '', 'Another leak', '', 'Medium', '', ''],
    4, {}, {}
  );`);
  check('★ ADR-P19: blank ItemID is now INVALID (it is the sole dedup key, no longer optional)',
    vBlankItemId.status === 'INVALID' && /ItemID is required/.test(vBlankItemId.message));

  const vInvalid = run(ctx, `phase11_validateStagingRow_(
    ['DR-012', 'Bedroom 2', 'Wall', '', '', '', 'Medium', '', ''],
    5, {}, {}
  );`);
  check('missing Description correctly flagged INVALID (valid ItemID present, so this isolates the Description check)',
    vInvalid.status === 'INVALID' && /Description is required/.test(vInvalid.message));

  const vBadCategory = run(ctx, `phase11_validateStagingRow_(
    ['DR-013', 'Bedroom 2', 'Waterproofing', '', 'Old-enum category', '', 'Medium', '', ''],
    6, {}, {}
  );`);
  check('old-enum-only Category ("Waterproofing") correctly rejected under the new enum',
    vBadCategory.status === 'INVALID' && /Unknown Category/.test(vBadCategory.message));
}

console.log('═══ ONETIME_Phase11_DefectImporter.js: ★ ADR-P19 — dedup key is now ItemID alone ═══');
{
  const ctx = fresh();
  const caseId = seedPropertyAndCase(ctx);
  run(ctx, `addDefectItem({caseId: '${caseId}', description: 'Existing', itemId: '20'});`);
  const existingItemIds = run(ctx, `phase11_loadExistingItemIds_('${caseId}');`);
  check('phase11_loadExistingItemIds_ keyed by ItemID', '20' in existingItemIds);

  const v = run(ctx, `phase11_validateStagingRow_(
    ['20', 'Completely different location', 'Other', '', 'Completely different description text', '', 'Low', '', ''],
    2, {}, phase11_loadExistingItemIds_('${caseId}')
  );`);
  check('same ItemID + totally different Location/Description/Category -> still ALREADY_IMPORTED (ItemID alone is the key)',
    v.status === 'ALREADY_IMPORTED');

  const vNew = run(ctx, `phase11_validateStagingRow_(
    ['21', 'Somewhere', 'Other', '', 'A genuinely new row', '', 'Low', '', ''],
    3, {}, phase11_loadExistingItemIds_('${caseId}')
  );`);
  check('a genuinely different ItemID is READY, not blocked by the unrelated existing row', vNew.status === 'READY');
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
      ['30', 'Balcony', 'Floor', 'Ponding', 'Water pools after rain', 'Worse after storms', 'High', '', ''],
      ['31', 'Bedroom 2', 'Wall', '', '', '', 'Medium', '', '']
    ]);
  `);

  const dryRunSummary = run(ctx, 'phase11_dryRunDefectImport();');
  check('dry run summary: 1 would_import, 1 invalid',
    /would_import: 1/.test(dryRunSummary) && /invalid: 1/.test(dryRunSummary));

  const validationCol = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DefectImportStaging')
      .getRange(2, phase11_colIndex_('ValidationResult') + 1, 2, 1).getValues().map(function(r){return r[0];});
  `);
  check('ValidationResult landed at its phase11_colIndex_-derived position (H), not a stale hardcoded one',
    /^READY/.test(validationCol[0]) && /^INVALID/.test(validationCol[1]));

  const runSummary = run(ctx, 'phase11_runDefectImport();');
  check('real run summary: 1 imported, 1 invalid', /imported: 1/.test(runSummary) && /invalid: 1/.test(runSummary));

  const imported = run(ctx, `listDefectItemsForCase('${caseId}').filter(function(d){return d.ItemID === '30';})[0];`);
  check('imported row carries ItemID through to the real DefectItem sheet', imported.ItemID === '30');
  check('imported row carries SubCategory through', imported.SubCategory === 'Ponding');
  check('imported row carries Remark through', imported.Remark === 'Worse after storms');
  check('imported row has no OriginalReference key at all', !('OriginalReference' in imported));

  const importResultCol = run(ctx, `
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DefectImportStaging')
      .getRange(2, phase11_colIndex_('ImportResult') + 1, 1, 1).getValues()[0][0];
  `);
  check('ImportResult landed at its phase11_colIndex_-derived position (I), not a stale hardcoded one', /^IMPORTED/.test(importResultCol));

  const rerunSummary = run(ctx, 'phase11_runDefectImport();');
  check('re-running treats ItemID 30 as ALREADY_IMPORTED, not a duplicate insert',
    /already_imported: 1/.test(rerunSummary));
  const countAfterRerun = run(ctx,
    `listDefectItemsForCase('${caseId}').filter(function(d){return d.ItemID === '30';}).length;`);
  check('exactly ONE real DefectItem exists for ItemID 30 after two runs (durable dedup intact)',
    countAfterRerun === 1);
}

console.log('\n════════════════════════════════════════════════════════════');
console.log(fail === 0 ? 'ALL ' + pass + ' CHECKS PASSED (0 failures)' : pass + ' passed, ' + fail + ' FAILED');
process.exit(fail === 0 ? 0 : 1);
