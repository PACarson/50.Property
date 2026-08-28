/**
 * ═══════════════════════════════════════════════════════════════════════
 * ONE-TIME MIGRATION / ONBOARDING UTILITY — NOT PART OF THE RUNTIME
 * ARCHITECTURE. Delete this file once Phase 11's DefectItem onboarding
 * is verified complete. Do not add this to 00_File_Map.js as a
 * permanent component.
 *
 * Purpose: batch-import the real Est8 Seputeh A-19-11 Defect Report
 * into DefectItem, so you don't hand-enter each one through the Mobile
 * Console or Sidebar UI.
 *
 * ⚠ STATUS (2026-08-26): the initial batch import this file was built
 * for has ALREADY completed — CC confirmed Dry Run and Real Import
 * both succeeded on the real GAS project. This file is kept per CC's
 * 2026-08-26 governance decision, for any further incremental Defect
 * Report items that surface later — not because the original import is
 * still pending. Nothing in this file was re-run as part of the
 * 2026-08-26 ADR-P19 schema consolidation (ItemID/OriginalReference
 * merge, Category enum fix); that was a separate, one-time structural
 * migration (see ONETIME_Phase11_DefectItemSchemaConsolidationMigration.js)
 * that touched only the SHAPE of already-imported rows, never
 * re-imported or re-validated which defects exist.
 *
 * ─── Durable cross-run duplicate protection (the core design question) ───
 * addDefectItem already has a clientRequestId idempotency mechanism
 * (same pattern as 910/911/912), but it's backed by CacheService with a
 * 1-hour TTL — 912_ObligationEngine.js's own comment calls that "the
 * right-sized tool" for retry-on-network-glitch, not for a batch job
 * that might be paused and resumed hours or days later. Relying on it
 * alone would risk exactly this: Run #1 imports 100 of 145 rows,
 * network drops, Run #2 happens 24+ hours later — the CacheService
 * entries from Run #1 are long expired, so nothing would stop those
 * same 100 rows from being inserted a second time as brand-new
 * DefectItems. That's not a hypothetical: a duplicated real defect
 * would fork everything downstream that references it (Timeline,
 * Daily Check, Owner Verification), so this file does NOT rely on
 * CacheService for cross-run protection.
 *
 * Instead: every source row must carry a stable ItemID (the item
 * number as shown in the Developer App, e.g. "88" — CC reads it off
 * that app and keys it in manually; no automated extraction exists or
 * is implied). ★ ADR-P19 (2026-08-26): ItemID is now the file's SOLE
 * dedup key. Until 2026-08-26 this file used a separate
 * OriginalReference staging column as the dedup key (ADR-P18,
 * 2026-08-24), with ItemID as a merely-optional pass-through field —
 * CC merged the two into ItemID alone after real-world use showed
 * keeping them separate was redundant (see ADR-P19 for the full
 * rationale and ONETIME_Phase11_DefectItemSchemaConsolidationMigration.js
 * for the migration that merged them on the real, already-populated
 * DefectItems sheet).
 * Before importing a row, this file reads the REAL, CURRENT DefectItem sheet
 * (via the existing listDefectItemsForCase — no schema change) and
 * builds ItemID -> DefectID for everything already there.
 * A row is only ever imported if its ItemID is NOT already
 * in that map. This is a plain Sheet-state check, not a cache lookup —
 * it doesn't degrade with time, doesn't care how long between runs,
 * and doesn't care what order rows appear in the staging sheet (the
 * key is the ItemID VALUE, never row position — see
 * phase11_validateStagingRow_, rowIndex is only ever used for a
 * human-readable "also used on row N" message, never as part of the
 * dedup decision itself). clientRequestId is still passed to
 * addDefectItem on every real call too, as a cheap second layer for
 * the narrow case of two runs within the same hour — but it is not
 * what this file depends on for correctness.
 *
 * If a future Defect Report genuinely has no per-item numbering: don't
 * fall back to a text fingerprint (hash of Location+Category+
 * Description) — that's fragile, because fixing a typo in a
 * Description between runs would silently change the fingerprint and
 * break dedup. Better to assign your own sequential reference (e.g.
 * "DR-001", "DR-002"...) while transcribing into the staging sheet —
 * it doesn't need to match anything in the original document, it only
 * needs to be stable within Property OS's own import process, which a
 * self-assigned number achieves just as well as one printed in a PDF.
 *
 * ─── Other constraints this file honors (CC, 2026-08-22) ────────────────
 *   - No new Domain Engine. No change to 918's Truth Layer contract —
 *     901_PropertySchema.js and 918_DefectEngine.js are untouched by
 *     this file.
 *   - Every accepted row still goes through the real addDefectItem
 *     Command (see phase11_runDefectImport below) — this file never
 *     writes to the DefectItem sheet directly. addDefectItem's own
 *     validation, withDefectEngineLock_, Timeline entry ("Defect
 *     added: ..."), and DEFECT_ITEM_ADDED Event publish all still
 *     happen exactly as they do for a single manual entry. Expect
 *     140+ new Timeline entries after a full import — that's correct,
 *     not a bug.
 *   - No lock nesting: this file never wraps calls in its own
 *     LockService lock — addDefectItem already acquires/releases its
 *     own per call (Constitution §5 forbids nested lock acquisition,
 *     see 918's withDefectEngineLock_ comment).
 *   - Dry-run before real writes, zero DefectItem writes either way.
 *   - Every row's outcome is one of exactly 5 states, never conflated:
 *       READY / WOULD_IMPORT  — dry-run only, row is clean, would be imported
 *       IMPORTED               — real-run only, addDefectItem succeeded
 *       INVALID                — required field missing, or bad Category/Priority
 *       DUPLICATE_IN_SOURCE     — same ItemID used twice in the
 *                                 staging sheet itself (a data-entry mistake
 *                                 in the source, reported even if the
 *                                 first occurrence already succeeded)
 *       ALREADY_IMPORTED        — ItemID already exists as a real
 *                                 DefectItem for this Case (from a prior run)
 *       FAILED                  — real-run only: row was valid and new, but
 *                                 the actual addDefectItem() call threw
 *   - Row cap exists to bound how much one execution attempts, not
 *     because 140+ rows is itself a problem — see maxRowsPerRun below.
 *     If the confirmed source has more valid rows than the cap, dry-run
 *     says so explicitly up front rather than you discovering it
 *     reactively after a capped run stops partway.
 *
 * How to use:
 *   1. Run phase11_setupDefectImportStagingSheet() once. It creates a
 *      "DefectImportStaging" tab with headers + 2 example rows.
 *   2. Replace the example rows with the real Defect Report data (one
 *      row per defect: ItemID / Location / Category / SubCategory /
 *      Description / Remark / Priority — SubCategory and Remark are
 *      optional, leave blank if the source report doesn't have them.
 *      ★ ItemID is REQUIRED as of ADR-P19 — it is the sole dedup key now).
 *   3. Run phase11_dryRunDefectImport(). Read the ValidationResult
 *      column on every row (position may shift if columns are added
 *      again — see phase11_colIndex_) and the Logger summary
 *      (total / would-import / invalid / duplicate-in-source /
 *      already-imported, and how many runs the cap will require).
 *   4. Fix anything flagged, re-run the dry-run until INVALID and
 *      DUPLICATE_IN_SOURCE are both zero.
 *   5. Only then run phase11_runDefectImport(). Check the ImportResult
 *      column + Logger output (View > Logs, or the Executions panel).
 *   6. If it stops partway (GAS execution time limit, or the
 *      maxRowsPerRun cap), just run phase11_runDefectImport() again —
 *      ALREADY_IMPORTED rows are skipped automatically via the durable
 *      check above, it picks up where it left off regardless of how
 *      much time has passed.
 * ═══════════════════════════════════════════════════════════════════════
 */

var PHASE11_IMPORT_CONFIG = Object.freeze({
  stagingSheetName: 'DefectImportStaging',
  // null = use PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID. Only override this
  // if you deliberately need to import against a different Case.
  caseId: null,
  // Conservative cap so one execution comfortably stays under GAS's
  // ~6-minute limit (each addDefectItem call does a real lock
  // acquire/release + Sheets read/write + flush). This bounds a single
  // execution — it does not auto-chain into further runs; re-running
  // is always an explicit, separate action you take.
  maxRowsPerRun: 50
});

// Added ItemID/SubCategory/Remark 2026-08-24 (Phase 11 Pre-Import Gate
// schema migration, CC decision Option B). ★ ADR-P19 (2026-08-26):
// OriginalReference column REMOVED — ItemID is now the sole dedup key
// (previously OriginalReference alone; see file header). ValidationResult/
// ImportResult stay last, same as before. Unlike 901_PropertySchema.js's
// DefectItem sheet, THIS array has no real-sheet drift constraint — this
// staging sheet is created fresh every time by
// phase11_setupDefectImportStagingSheet() (throws if it already
// exists), never migrated — so column order here is free to change.
var PHASE11_STAGING_COLUMNS = Object.freeze([
  'ItemID', 'Location', 'Category', 'SubCategory',
  'Description', 'Remark', 'Priority',
  'ValidationResult', 'ImportResult'
]);

// Looks up a column's 0-indexed position from PHASE11_STAGING_COLUMNS
// itself, so ValidationResult/ImportResult's real sheet position is
// always derived from the single source of truth above, never a
// separate hardcoded number that could silently drift out of sync the
// next time a column is inserted (exactly the class of bug this
// migration would otherwise risk introducing at the two getRange(...)
// call sites in phase11_dryRunDefectImport / phase11_runDefectImport).
function phase11_colIndex_(columnName) {
  var idx = PHASE11_STAGING_COLUMNS.indexOf(columnName);
  if (idx === -1) {
    throw new Error('phase11_colIndex_: "' + columnName + '" is not in PHASE11_STAGING_COLUMNS.');
  }
  return idx;
}

function phase11_resolveCaseId_() {
  return PHASE11_IMPORT_CONFIG.caseId || PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID;
}

function phase11_setupDefectImportStagingSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(PHASE11_IMPORT_CONFIG.stagingSheetName);
  if (sheet) {
    throw new Error(
      'Sheet "' + PHASE11_IMPORT_CONFIG.stagingSheetName + '" already exists — ' +
      'not touching it in case it already has real data in it. Delete it manually ' +
      'first if you really want a clean reset.'
    );
  }
  sheet = ss.insertSheet(PHASE11_IMPORT_CONFIG.stagingSheetName);
  sheet.getRange(1, 1, 1, PHASE11_STAGING_COLUMNS.length).setValues([PHASE11_STAGING_COLUMNS]);
  sheet.getRange(1, 1, 1, PHASE11_STAGING_COLUMNS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  // ItemID is a plain-text-prone-to-autoformat column (e.g. "1E2" style
  // references, or leading zeros) — format proactively. Same fix as
  // ensureSheetSchema_ applies to real dateColumns, just manual here
  // since this sheet isn't part of PROPERTY_SCHEMA.
  sheet.getRange(2, 1, 998, 1).setNumberFormat('@');

  // Column order: ItemID, Location, Category, SubCategory, Description,
  // Remark, Priority, ValidationResult(blank), ImportResult(blank).
  // ★ ADR-P19 (2026-08-26): ItemID is now REQUIRED (sole dedup key,
  // OriginalReference removed) — unlike SubCategory/Remark, which stay
  // optional. EXAMPLE-1 shows a normal filled row; EXAMPLE-2 shows the
  // columns in use AND an intentionally-bad Category so dry-run
  // demonstrably flags it.
  var exampleRows = [
    ['EXAMPLE-1', 'Master Bathroom', 'Wall', '', 'DELETE THIS ROW — example of a normal row', '', 'High', '', ''],
    ['EXAMPLE-2', 'Living Room', 'BadCategoryXYZ', 'Skirting', 'DELETE THIS ROW — example dry-run should flag (bad Category)', 'Sample remark text', 'Medium', '', '']
  ];
  sheet.getRange(2, 1, exampleRows.length, PHASE11_STAGING_COLUMNS.length).setValues(exampleRows);
  sheet.autoResizeColumns(1, PHASE11_STAGING_COLUMNS.length);

  Logger.log(
    'Created "' + PHASE11_IMPORT_CONFIG.stagingSheetName + '" with headers + 2 example rows. ' +
    'Replace the example rows with the real Defect Report data, then run phase11_dryRunDefectImport().'
  );
}

/**
 * Shared by dry-run and real-run so the two checks never quietly drift
 * apart. Purely read-only — never calls addDefectItem, never writes to
 * DefectItem. Re-validates against PROPERTY_CONFIG.DEFECT_CATEGORIES /
 * DEFECT_PRIORITIES directly (the same source of truth addDefectItem
 * itself uses), not a separate copy of the rules.
 *
 * rowIndex is used ONLY to build a human-readable "also used on row N"
 * message — never as part of the dedup key itself. The dedup key is
 * always itemId's VALUE (ADR-P19, 2026-08-26 — formerly
 * originalReference, see file header), so re-ordering rows in the
 * staging sheet between runs cannot change which rows get recognized
 * as already-imported.
 *
 * Returns status as exactly one of: 'INVALID', 'DUPLICATE_IN_SOURCE',
 * 'ALREADY_IMPORTED', 'READY' — checked in that priority order, so a
 * row with multiple issues is still classified by its single most
 * fundamental problem (e.g. a row missing ItemID is INVALID,
 * never DUPLICATE_IN_SOURCE, since there's nothing to compare).
 */
function phase11_validateStagingRow_(row, rowIndex, seenItemIdsInBatch, existingItemIdsInCase) {
  var itemId = String(row[phase11_colIndex_('ItemID')] || '').trim();
  var location = String(row[phase11_colIndex_('Location')] || '').trim();
  var category = String(row[phase11_colIndex_('Category')] || '').trim();
  var subCategory = String(row[phase11_colIndex_('SubCategory')] || '').trim();
  var description = String(row[phase11_colIndex_('Description')] || '').trim();
  var remark = String(row[phase11_colIndex_('Remark')] || '').trim();
  var priority = String(row[phase11_colIndex_('Priority')] || '').trim();

  var problems = [];
  var warnings = [];

  if (!description) problems.push('Description is required');
  if (!itemId) problems.push('ItemID is required (needed for de-dup — see file header, ADR-P19)');
  if (category && PROPERTY_CONFIG.DEFECT_CATEGORIES.indexOf(category) === -1) {
    problems.push('Unknown Category "' + category + '" — must be one of: ' + PROPERTY_CONFIG.DEFECT_CATEGORIES.join(', '));
  }
  if (!category) warnings.push('Category blank, will default to "Other"');
  if (priority && PROPERTY_CONFIG.DEFECT_PRIORITIES.indexOf(priority) === -1) {
    problems.push('Unknown Priority "' + priority + '" — must be one of: ' + PROPERTY_CONFIG.DEFECT_PRIORITIES.join(', '));
  }
  if (!priority) warnings.push('Priority blank, will default to "Medium"');
  // SubCategory/Remark are optional pass-through fields, added
  // 2026-08-24 — no requiredness check, no enum check (SubCategory has
  // no enum, see 901_PropertySchema.js), and not part of the dedup key.

  var result = {
    itemId: itemId, location: location,
    category: category, subCategory: subCategory, description: description,
    remark: remark, priority: priority,
    problems: problems, warnings: warnings
  };

  if (problems.length > 0) {
    result.status = 'INVALID';
    result.message = 'INVALID: ' + problems.join('; ');
    return result;
  }

  if (seenItemIdsInBatch[itemId]) {
    result.status = 'DUPLICATE_IN_SOURCE';
    result.message = 'DUPLICATE_IN_SOURCE: ItemID "' + itemId +
      '" also used on row ' + seenItemIdsInBatch[itemId] + ' of this staging sheet';
    return result;
  }
  seenItemIdsInBatch[itemId] = rowIndex;

  var existingDefectId = existingItemIdsInCase[itemId];
  if (existingDefectId) {
    result.status = 'ALREADY_IMPORTED';
    result.existingDefectId = existingDefectId;
    result.message = 'ALREADY_IMPORTED: ItemID "' + itemId + '" already exists as ' + existingDefectId;
    return result;
  }

  result.status = 'READY';
  result.message = 'READY' + (warnings.length ? (' (' + warnings.join('; ') + ')') : '');
  return result;
}

/** Read-only. Map of ItemID -> DefectID for everything already in this
 * Case (ADR-P19, 2026-08-26 — formerly keyed by OriginalReference). */
function phase11_loadExistingItemIds_(caseId) {
  var existing = listDefectItemsForCase(caseId);
  var map = {};
  existing.forEach(function (d) {
    if (d.ItemID) map[d.ItemID] = d.DefectID;
  });
  return map;
}

function phase11_readStagingRows_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PHASE11_IMPORT_CONFIG.stagingSheetName);
  if (!sheet) {
    throw new Error(
      'No "' + PHASE11_IMPORT_CONFIG.stagingSheetName + '" sheet found. ' +
      'Run phase11_setupDefectImportStagingSheet() first.'
    );
  }
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { sheet: sheet, rows: [] };
  var values = sheet.getRange(2, 1, lastRow - 1, PHASE11_STAGING_COLUMNS.length).getValues();
  return { sheet: sheet, rows: values };
}

/**
 * Validates every staging row against the REAL, current DefectItem
 * sheet state. Writes one of INVALID / DUPLICATE_IN_SOURCE /
 * ALREADY_IMPORTED / READY to the ValidationResult column per row
 * (see phase11_colIndex_ for its real position). Never calls
 * addDefectItem, never writes to DefectItem — zero Truth-layer writes,
 * guaranteed by construction (this function never references
 * addDefectItem at all).
 */
function phase11_dryRunDefectImport() {
  var caseId = phase11_resolveCaseId_();
  var propertyCase = getPropertyCase(caseId);
  if (!propertyCase) {
    throw new Error('No PropertyCase found for caseId ' + caseId + ' — check PHASE11_IMPORT_CONFIG / PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID.');
  }

  var staging = phase11_readStagingRows_();
  var existingItemIds = phase11_loadExistingItemIds_(caseId);
  var seenItemIdsInBatch = {};

  var counts = { READY: 0, INVALID: 0, DUPLICATE_IN_SOURCE: 0, ALREADY_IMPORTED: 0 };
  var results = staging.rows.map(function (row, i) {
    var v = phase11_validateStagingRow_(row, i + 2, seenItemIdsInBatch, existingItemIds);
    counts[v.status]++;
    return [v.message];
  });

  if (results.length > 0) {
    // 1-indexed Sheets column, derived from PHASE11_STAGING_COLUMNS —
    // was hardcoded "6" (column F) before the 2026-08-24 migration
    // added 3 columns ahead of ValidationResult; now column I.
    staging.sheet.getRange(2, phase11_colIndex_('ValidationResult') + 1, results.length, 1).setValues(results);
  }

  var runsNeeded = Math.ceil(counts.READY / PHASE11_IMPORT_CONFIG.maxRowsPerRun) || 0;
  var capWarning = counts.READY > PHASE11_IMPORT_CONFIG.maxRowsPerRun
    ? (' NOTE: ' + counts.READY + ' would-import rows exceeds maxRowsPerRun=' +
       PHASE11_IMPORT_CONFIG.maxRowsPerRun + ' — a full import will take ' + runsNeeded +
       ' separate calls to phase11_runDefectImport(), each one an explicit action you take, ' +
       'nothing auto-chains.')
    : '';

  var summary = 'DRY RUN -- total: ' + staging.rows.length +
    ' | would_import: ' + counts.READY +
    ' | invalid: ' + counts.INVALID +
    ' | duplicate_in_source: ' + counts.DUPLICATE_IN_SOURCE +
    ' | already_imported: ' + counts.ALREADY_IMPORTED +
    '. Zero writes to DefectItem.' + capWarning + ' Check the ValidationResult column for details.';
  Logger.log(summary);
  return summary;
}

/**
 * The real import. Every READY row goes through the real addDefectItem
 * Command — this function does not append to the DefectItem sheet
 * itself anywhere (grep this file for "appendRow" and you will only
 * find calls against the staging sheet, never DefectItem).
 */
function phase11_runDefectImport() {
  var caseId = phase11_resolveCaseId_();
  var propertyCase = getPropertyCase(caseId);
  if (!propertyCase) {
    throw new Error('No PropertyCase found for caseId ' + caseId + ' — check PHASE11_IMPORT_CONFIG / PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID.');
  }

  var staging = phase11_readStagingRows_();
  var existingItemIds = phase11_loadExistingItemIds_(caseId);
  var seenItemIdsInBatch = {};

  var byStatus = { IMPORTED: [], FAILED: [], INVALID: [], DUPLICATE_IN_SOURCE: [], ALREADY_IMPORTED: [] };
  var processedThisRun = 0;
  var resultColumn = [];

  for (var i = 0; i < staging.rows.length; i++) {
    var row = staging.rows[i];
    var rowNum = i + 2;
    var v = phase11_validateStagingRow_(row, rowNum, seenItemIdsInBatch, existingItemIds);

    if (v.status === 'INVALID') {
      resultColumn.push([v.message]);
      byStatus.INVALID.push({ row: rowNum, itemId: v.itemId, reason: v.problems.join('; ') });
      continue;
    }
    if (v.status === 'DUPLICATE_IN_SOURCE') {
      resultColumn.push([v.message]);
      byStatus.DUPLICATE_IN_SOURCE.push({ row: rowNum, itemId: v.itemId });
      continue;
    }
    if (v.status === 'ALREADY_IMPORTED') {
      resultColumn.push([v.message]);
      byStatus.ALREADY_IMPORTED.push({ row: rowNum, itemId: v.itemId, existingDefectId: v.existingDefectId });
      continue;
    }
    // v.status === 'READY' from here on
    if (processedThisRun >= PHASE11_IMPORT_CONFIG.maxRowsPerRun) {
      resultColumn.push(['NOT ATTEMPTED THIS RUN -- cap reached, run again to continue']);
      continue;
    }

    try {
      var result = addDefectItem({
        caseId: caseId,
        description: v.description,
        category: v.category,
        location: v.location,
        priority: v.priority,
        itemId: v.itemId,
        subCategory: v.subCategory,
        remark: v.remark,
        clientRequestId: 'phase11-import-' + caseId + '-' + v.itemId
      });
      resultColumn.push(['IMPORTED: ' + result.defectId]);
      byStatus.IMPORTED.push({ row: rowNum, itemId: v.itemId, defectId: result.defectId });
      existingItemIds[v.itemId] = result.defectId;
      processedThisRun++;
    } catch (e) {
      var msg = 'FAILED: ' + (e.message || e);
      resultColumn.push([msg]);
      byStatus.FAILED.push({ row: rowNum, itemId: v.itemId, reason: e.message || String(e) });
    }
  }

  if (resultColumn.length > 0) {
    // Was hardcoded "7" (column G) before the migration; now column J
    // — same phase11_colIndex_ derivation as the dry-run write above.
    staging.sheet.getRange(2, phase11_colIndex_('ImportResult') + 1, resultColumn.length, 1).setValues(resultColumn);
  }

  var totalHandled = byStatus.IMPORTED.length + byStatus.FAILED.length + byStatus.INVALID.length +
    byStatus.DUPLICATE_IN_SOURCE.length + byStatus.ALREADY_IMPORTED.length;
  var notYetAttempted = staging.rows.length - totalHandled;

  var summary = 'IMPORT RUN -- imported: ' + byStatus.IMPORTED.length +
    ' | failed: ' + byStatus.FAILED.length +
    ' | invalid: ' + byStatus.INVALID.length +
    ' | duplicate_in_source: ' + byStatus.DUPLICATE_IN_SOURCE.length +
    ' | already_imported: ' + byStatus.ALREADY_IMPORTED.length +
    (notYetAttempted > 0 ? (' | not_yet_attempted: ' + notYetAttempted + ' (cap reached -- run again to continue)') : ' | all rows processed');
  Logger.log(summary);
  Logger.log('IMPORTED: ' + JSON.stringify(byStatus.IMPORTED));
  if (byStatus.FAILED.length) Logger.log('FAILED: ' + JSON.stringify(byStatus.FAILED));
  if (byStatus.INVALID.length) Logger.log('INVALID: ' + JSON.stringify(byStatus.INVALID));
  if (byStatus.DUPLICATE_IN_SOURCE.length) Logger.log('DUPLICATE_IN_SOURCE: ' + JSON.stringify(byStatus.DUPLICATE_IN_SOURCE));
  if (byStatus.ALREADY_IMPORTED.length) Logger.log('ALREADY_IMPORTED: ' + JSON.stringify(byStatus.ALREADY_IMPORTED));
  return summary;
}
