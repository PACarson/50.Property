/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — ONETIME_Phase11_DefectItemSchemaReorderMigration.js
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ONE-TIME MIGRATION UTILITY (ADR-P18, 2026-08-24). Transforms the REAL
 * DefectItems sheet from its pre-migration 17-column layout to the new
 * 20-column, reordered layout in 901_PropertySchema.js's
 * PROPERTY_SCHEMA.DefectItem.columns.
 *
 * WHY THIS FILE EXISTS AT ALL (as opposed to just running the updated
 * code and letting ensureSheetSchema_ sort it out): ensureSheetSchema_
 * only knows how to (a) create a brand-new sheet from scratch, or (b)
 * confirm an existing header matches exactly. It has no concept of
 * "the header changed AND there's existing data that needs to move
 * with it" — see its own docstring ("must be resolved via Migration
 * Strategy, not auto-corrected"). This file IS that Migration Strategy
 * for this specific change. Every existing row is read keyed by its
 * OLD column NAME and written back at its NEW column position — never
 * by raw array position — so a reorder (not just an append) cannot
 * silently shuffle a value into the wrong field.
 *
 * OLD_COLUMNS below is a deliberately separate, hardcoded snapshot of
 * the pre-migration schema — NOT read from PROPERTY_SCHEMA.DefectItem,
 * because by the time this file is deployed, 901_PropertySchema.js
 * already reflects the NEW schema. This function's job is specifically
 * to bridge from that old, no-longer-in-the-codebase shape to the new
 * one; it needs its own private record of what "old" meant.
 *
 * HOW TO USE:
 *   1. Deploy this file alongside the rest of this session's changes
 *      (901/918/ONETIME_Phase11_DefectImporter/GasShim) to the real GAS
 *      project — but do NOT yet run anything else that touches
 *      DefectItems (Mobile Console, addDefectItem, the Importer, etc.)
 *      until step 2 below has completed successfully. Every one of
 *      those goes through ensureSheetSchema_, which will throw "Schema
 *      drift detected" until this migration has run.
 *   2. Run phase11_migrateDefectItemSchemaReorder() once, manually,
 *      from the Apps Script editor. Read the Logger output.
 *      - If it logs MIGRATION SUCCESS: done. Every pre-existing field
 *        was verified identical (by name) between old and new: safe
 *        to use the Mobile Console / Importer / everything else again.
 *      - If it throws before writing anything (PREFLIGHT section):
 *        nothing was touched. Read the error — it will show exactly
 *        what header it found vs. what it expected. Resolve manually,
 *        do not re-run blindly.
 *      - If it throws AFTER writing (POST-WRITE VERIFICATION section):
 *        this means the write itself landed but a field-level check
 *        afterwards didn't match — treat as a live-data emergency, do
 *        not keep using the sheet, inspect manually before doing
 *        anything else. (No case that produces this has been observed
 *        in local testing — this is a defensive backstop, not an
 *        expected path.)
 *   3. Once logged as MIGRATION SUCCESS, this file has done its job.
 *      Per the project's usual convention for ONETIME_ utilities (see
 *      ONETIME_Phase11_DefectImporter.js's own header), it can be
 *      deleted once you're comfortable it won't be needed again — but
 *      there is no urgency; it is idempotent-safe (see
 *      ALREADY_MIGRATED below) and does nothing destructive if run
 *      again by mistake.
 *
 * Zero relationship to real Defect data import — this only touches
 * the SHAPE of the table (header + repositioning any pre-existing
 * rows' cells), never adds, removes, or reinterprets a defect. If the
 * real DefectItems sheet currently has zero data rows (e.g. because
 * Phase 5/6 smoke-test data was already cleared and real import
 * hasn't started), this migration is just a header rewrite — the
 * remap logic still runs, it just has zero rows to move.
 */

// Pre-migration schema snapshot — see file header for why this is not
// read from PROPERTY_SCHEMA.DefectItem.
var PHASE11_DEFECTITEM_OLD_COLUMNS = Object.freeze([
  'DefectID', 'CaseID', 'OriginalReference', 'Category', 'Location',
  'Description', 'Priority', 'Status', 'DeveloperStatus',
  'OwnerVerificationStatus', 'SubmittedAt', 'RectificationStartDate',
  'DeveloperClaimedCompletedDate', 'OwnerVerifiedDate', 'ClosedDate',
  'CreatedAt', 'UpdatedAt'
]);

/**
 * Migrates the real DefectItems sheet from PHASE11_DEFECTITEM_OLD_COLUMNS
 * to the current PROPERTY_SCHEMA.DefectItem.columns (new order). See
 * file header for full usage. Returns a human-readable summary string
 * on success; throws on any precondition failure or verification
 * failure (never partially applies silently).
 */
function phase11_migrateDefectItemSchemaReorder() {
  var NEW_COLUMNS = PROPERTY_SCHEMA.DefectItem.columns.slice();
  var OLD_COLUMNS = PHASE11_DEFECTITEM_OLD_COLUMNS.slice();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS);
  if (!sheet) {
    throw new Error(
      'phase11_migrateDefectItemSchemaReorder: sheet "' +
      PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS + '" does not exist. ' +
      'Nothing to migrate — if this is genuinely a brand-new setup with ' +
      'no prior DefectItems sheet at all, just call ' +
      'initDefectEngineSchema_() instead, which will create it fresh ' +
      'already in the new column order. Zero writes performed.'
    );
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow === 0 || lastCol === 0) {
    throw new Error(
      'phase11_migrateDefectItemSchemaReorder: sheet exists but is ' +
      'completely empty (no header row at all). Refusing to guess — ' +
      'this is not the "normal old 17-column header" state this ' +
      'function expects. Zero writes performed.'
    );
  }

  // ────────────────────────── PREFLIGHT ──────────────────────────
  var currentHeader = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  var headerMatchesNewAlready =
    NEW_COLUMNS.length === currentHeader.length &&
    NEW_COLUMNS.every(function (col, i) { return currentHeader[i] === col; });
  if (headerMatchesNewAlready) {
    var msg = 'ALREADY_MIGRATED — header already matches the new ' +
      NEW_COLUMNS.length + '-column schema exactly. Nothing to do. Zero writes performed.';
    Logger.log(msg);
    return msg;
  }

  var headerMatchesOld =
    OLD_COLUMNS.length === currentHeader.length &&
    OLD_COLUMNS.every(function (col, i) { return currentHeader[i] === col; });
  if (!headerMatchesOld) {
    throw new Error(
      'phase11_migrateDefectItemSchemaReorder: PREFLIGHT FAILED. Real sheet header does not match ' +
      'the expected PRE-migration schema, and does not already match the new one either. ' +
      'Expected old: [' + OLD_COLUMNS.join(', ') + ']. ' +
      'Got: [' + currentHeader.join(', ') + ']. ' +
      'Refusing to guess how to remap an unrecognized layout. Resolve manually, then re-run. ' +
      'Zero writes performed.'
    );
  }

  if (lastCol > NEW_COLUMNS.length) {
    throw new Error(
      'phase11_migrateDefectItemSchemaReorder: PREFLIGHT FAILED. Real sheet currently reports ' +
      lastCol + ' columns, more than the ' + NEW_COLUMNS.length +
      ' the new schema expects. Investigate manually (stray data in a column beyond Q?) ' +
      'before proceeding. Zero writes performed.'
    );
  }

  var dataRowCount = lastRow - 1; // excluding header row
  var oldData = dataRowCount > 0
    ? sheet.getRange(2, 1, dataRowCount, OLD_COLUMNS.length).getValues()
    : [];

  Logger.log(
    'PREFLIGHT OK. Old header confirmed exact match to the expected ' +
    OLD_COLUMNS.length + '-column pre-migration schema. ' +
    dataRowCount + ' existing data row(s) found and read.'
  );

  // ─────────────────── BUILD NEW DATA (name-keyed remap) ───────────────────
  var newData = oldData.map(function (oldRow) {
    var asObject = {};
    OLD_COLUMNS.forEach(function (colName, i) { asObject[colName] = oldRow[i]; });
    return NEW_COLUMNS.map(function (colName) {
      // A column in NEW_COLUMNS with no counterpart in OLD_COLUMNS is
      // one of the three new fields — '' is the correct, intentional
      // value for every pre-existing row, not a bug.
      return Object.prototype.hasOwnProperty.call(asObject, colName) ? asObject[colName] : '';
    });
  });

  // ────────────────────────── EXECUTE ──────────────────────────
  // Date columns MUST be forced to plain-text format at their NEW
  // position BEFORE the values are written — same reasoning and same
  // pattern as ensureSheetSchema_'s own isNewSheet branch above (see
  // its docstring: "Without this, Sheets can silently reinterpret an
  // ISO date string... as a Date serial value on write"). That branch
  // only runs for a brand-new sheet, so it does nothing for the
  // already-existing DefectItems sheet this migration operates on —
  // this migration must do it explicitly itself, or every date field
  // silently becomes a Date object instead of the plain ISO string the
  // rest of Property OS expects (caught by this migration's own local
  // test suite before ever reaching the real sheet).
  var dateColumns = PROPERTY_SCHEMA.DefectItem.dateColumns;
  dateColumns.forEach(function (colName) {
    var colIndex = NEW_COLUMNS.indexOf(colName) + 1;
    if (colIndex > 0) {
      sheet.getRange(1, colIndex, 1000, 1).setNumberFormat('@');
    }
  });

  sheet.getRange(1, 1, 1, NEW_COLUMNS.length).setValues([NEW_COLUMNS]);
  if (newData.length > 0) {
    sheet.getRange(2, 1, newData.length, NEW_COLUMNS.length).setValues(newData);
  }

  // ────────────────────── POST-WRITE VERIFICATION ──────────────────────
  var postHeader = sheet.getRange(1, 1, 1, NEW_COLUMNS.length).getValues()[0];
  var postHeaderOk = NEW_COLUMNS.every(function (col, i) { return postHeader[i] === col; });
  if (!postHeaderOk) {
    throw new Error(
      'phase11_migrateDefectItemSchemaReorder: POST-WRITE VERIFICATION FAILED — header does not ' +
      'read back correctly after the write. Do not use this sheet. Manual inspection required ' +
      'immediately. Expected: [' + NEW_COLUMNS.join(', ') + ']. Got: [' + postHeader.join(', ') + '].'
    );
  }

  var postDataRowCount = sheet.getLastRow() - 1;
  if (postDataRowCount !== dataRowCount) {
    throw new Error(
      'phase11_migrateDefectItemSchemaReorder: POST-WRITE VERIFICATION FAILED — row count changed ' +
      '(' + dataRowCount + ' -> ' + postDataRowCount + '). Do not use this sheet. Manual inspection required immediately.'
    );
  }

  var mismatches = [];
  if (postDataRowCount > 0) {
    var postData = sheet.getRange(2, 1, postDataRowCount, NEW_COLUMNS.length).getValues();
    for (var r = 0; r < postDataRowCount; r++) {
      var oldRowObj = {};
      OLD_COLUMNS.forEach(function (colName, i) { oldRowObj[colName] = oldData[r][i]; });
      var newRowObj = {};
      NEW_COLUMNS.forEach(function (colName, i) { newRowObj[colName] = postData[r][i]; });
      OLD_COLUMNS.forEach(function (colName) {
        if (String(oldRowObj[colName]) !== String(newRowObj[colName])) {
          mismatches.push(
            'Row ' + (r + 2) + ', column "' + colName + '": was "' +
            oldRowObj[colName] + '", now "' + newRowObj[colName] + '"'
          );
        }
      });
    }
  }
  if (mismatches.length > 0) {
    throw new Error(
      'phase11_migrateDefectItemSchemaReorder: POST-WRITE VERIFICATION FAILED — ' +
      mismatches.length + ' field mismatch(es) between old and new data. Do not use this ' +
      'sheet. Manual inspection required immediately.\n' + mismatches.join('\n')
    );
  }

  var summary =
    'MIGRATION SUCCESS. ' + dataRowCount + ' existing data row(s) migrated from the old ' +
    OLD_COLUMNS.length + '-column layout to the new ' + NEW_COLUMNS.length +
    '-column layout. Every pre-existing field verified identical (by name, not position) ' +
    'between old and new for all ' + dataRowCount + ' row(s). New fields (ItemID, ' +
    'SubCategory, Remark) correctly blank on every pre-existing row. Safe to use ' +
    'DefectItems (Mobile Console, addDefectItem/updateDefectItem, the Importer) again.';
  Logger.log(summary);
  return summary;
}
