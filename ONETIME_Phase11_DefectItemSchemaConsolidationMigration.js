/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — ONETIME_Phase11_DefectItemSchemaConsolidationMigration.js
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ONE-TIME MIGRATION UTILITY (ADR-P19, 2026-08-26). Transforms the REAL
 * DefectItems sheet from its post-ADR-P18, pre-consolidation 20-column
 * layout (ItemID AND OriginalReference as separate columns) to the new
 * 19-column layout in 901_PropertySchema.js's
 * PROPERTY_SCHEMA.DefectItem.columns, where ItemID alone carries both
 * roles (external reference + durable Importer dedup key) and
 * OriginalReference no longer exists as a column.
 *
 * ⚠ UNLIKE the ADR-P18 reorder migration
 * (ONETIME_Phase11_DefectItemSchemaReorderMigration.js), which ran
 * against a sheet that was empty or smoke-test-data-only, THIS
 * migration runs AFTER the real Defect Report has already been fully
 * imported — CC confirmed both Dry Run and Real Import succeeded on
 * the real GAS project (2026-08-26). The real DefectItems sheet this
 * migration touches has LIVE, real defect data in it. Two additional
 * preflight checks exist BECAUSE of that, on top of the structural
 * header check the ADR-P18 migration already had:
 *
 *   1. ItemID / OriginalReference VALUE conflict check — for every
 *      existing row, if BOTH columns are non-empty AND their values
 *      DIFFER, this is a genuine data question CC must resolve by
 *      hand (which one is right?). Per CC's explicit instruction, this
 *      migration does NOT pick one automatically. ANY such conflict
 *      aborts the ENTIRE migration before a single cell is written;
 *      every conflicting row is listed in the thrown error (DefectID,
 *      both values) so CC can resolve them directly in the real sheet
 *      and re-run.
 *   2. Category enum check — for every existing row, if its Category
 *      value is not in the CURRENT PROPERTY_CONFIG.DEFECT_CATEGORIES
 *      (the new, ADR-P19 fixed 15-value list), this migration also
 *      refuses to guess a conversion — per CC's explicit instruction —
 *      and aborts the ENTIRE migration before any write, listing every
 *      offending row (DefectID, Category value).
 *
 * Both checks run to completion over every row (not stop-at-first-
 * problem), so a single re-run after CC fixes everything by hand has
 * the best chance of succeeding — you get the FULL list of what's
 * wrong in one shot, not one problem discovered per failed re-run.
 *
 * Zero relationship to WHICH defects exist or their Description /
 * Location / Priority / Status / etc. — this migration never adds,
 * removes, or reinterprets a defect, never re-runs Dry Run or Real
 * Import, and never touches any field other than merging ItemID /
 * OriginalReference into ItemID and dropping the OriginalReference
 * column. See ADR-P19 (00_ADR_Log.js) for full rationale.
 *
 * HOW TO USE:
 *   1. Deploy this file alongside the rest of this session's changes
 *      (900/901/918/922/ONETIME_Phase11_DefectImporter) to the real GAS
 *      project — but do NOT yet run anything else that touches
 *      DefectItems (Mobile Console, addDefectItem, the Importer, etc.)
 *      until step 2 below has completed successfully. Every one of
 *      those goes through ensureSheetSchema_, which will throw "Schema
 *      drift detected" until this migration has run.
 *   2. Run phase11_migrateDefectItemSchemaConsolidation() once,
 *      manually, from the Apps Script editor. Read the Logger output.
 *      - If it logs MIGRATION SUCCESS: done. Every pre-existing field
 *        was verified identical (by name) between old and new, and
 *        every ItemID was confirmed correctly merged: safe to use the
 *        Mobile Console / Importer / everything else again.
 *      - If it throws in a PREFLIGHT section listing CONFLICTS or
 *        INVALID CATEGORIES: nothing was touched. Resolve every listed
 *        row by hand directly in the real sheet (pick the correct
 *        ItemID, or pick/assign a valid Category), then re-run. Do not
 *        re-run blindly hoping it resolves itself.
 *      - If it throws in POST-WRITE VERIFICATION: the write itself
 *        landed but a field-level check afterward didn't match — treat
 *        as a live-data emergency, do not keep using the sheet,
 *        inspect manually before doing anything else. (No case that
 *        produces this has been observed in local testing — this is a
 *        defensive backstop, not an expected path.)
 *   3. Once logged as MIGRATION SUCCESS, this file has done its job.
 *      Per the project's usual convention for ONETIME_ utilities, it
 *      can be deleted once you're comfortable it won't be needed again
 *      — no urgency; it is idempotent-safe (see ALREADY_MIGRATED below)
 *      and does nothing destructive if run again by mistake.
 * ═══════════════════════════════════════════════════════════════════════
 */

// Pre-migration schema snapshot — the REAL sheet's current header as of
// right before this migration, i.e. what PROPERTY_SCHEMA.DefectItem.
// columns was immediately after the ADR-P18 reorder migration and
// before this ADR-P19 consolidation. NOT read from
// PROPERTY_SCHEMA.DefectItem, because by the time this file is
// deployed, 901_PropertySchema.js already reflects the NEW
// (post-consolidation) schema — same reasoning as
// ONETIME_Phase11_DefectItemSchemaReorderMigration.js's own
// OLD_COLUMNS snapshot.
var PHASE11_CONSOLIDATION_OLD_COLUMNS = Object.freeze([
  'DefectID', 'CaseID', 'ItemID', 'OriginalReference', 'Category',
  'SubCategory', 'Description', 'Remark', 'Location', 'Priority',
  'Status', 'DeveloperStatus', 'OwnerVerificationStatus', 'SubmittedAt',
  'RectificationStartDate', 'DeveloperClaimedCompletedDate',
  'OwnerVerifiedDate', 'ClosedDate', 'CreatedAt', 'UpdatedAt'
]);

/**
 * Migrates the real DefectItems sheet from
 * PHASE11_CONSOLIDATION_OLD_COLUMNS (20 columns, ItemID and
 * OriginalReference both present) to the current
 * PROPERTY_SCHEMA.DefectItem.columns (19 columns, OriginalReference
 * merged into ItemID). See file header for full usage. Returns a
 * human-readable summary string on success; throws on any
 * precondition failure, business-rule conflict, or verification
 * failure (never partially applies silently — every throw path below
 * happens BEFORE any write except the two explicitly marked ones in
 * POST-WRITE VERIFICATION, which is a defensive backstop only).
 */
function phase11_migrateDefectItemSchemaConsolidation() {
  var NEW_COLUMNS = PROPERTY_SCHEMA.DefectItem.columns.slice();
  var OLD_COLUMNS = PHASE11_CONSOLIDATION_OLD_COLUMNS.slice();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(PROPERTY_CONFIG.SHEET_NAMES.DEFECT_ITEMS);
  if (!sheet) {
    throw new Error(
      'phase11_migrateDefectItemSchemaConsolidation: sheet "' +
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
      'phase11_migrateDefectItemSchemaConsolidation: sheet exists but is ' +
      'completely empty (no header row at all). Refusing to guess — ' +
      'this is not the "normal pre-consolidation 20-column header" state ' +
      'this function expects. Zero writes performed.'
    );
  }

  // ────────────────────── PREFLIGHT: STRUCTURE ──────────────────────
  // Check "already migrated" FIRST, and at a FIXED width (NEW_COLUMNS.
  // length), not by comparing lastCol's reported width — if this
  // function has already run once, the old 20th column was blanked to
  // '' (not removed from the underlying row array), so lastCol can
  // still report 20 even though every cell that matters reads as the
  // new 19-column layout. A width-based comparison would wrongly miss
  // that as "not yet migrated" and fall through to PREFLIGHT FAILED.
  var headerAtNewWidth = sheet.getRange(1, 1, 1, NEW_COLUMNS.length).getValues()[0];
  var headerMatchesNewAlready = NEW_COLUMNS.every(function (col, i) { return headerAtNewWidth[i] === col; });
  if (headerMatchesNewAlready) {
    var alreadyMsg = 'ALREADY_MIGRATED — header already matches the new ' +
      NEW_COLUMNS.length + '-column consolidated schema exactly. Nothing to do. Zero writes performed.';
    Logger.log(alreadyMsg);
    return alreadyMsg;
  }

  var currentHeader = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var headerMatchesOld =
    OLD_COLUMNS.length === currentHeader.length &&
    OLD_COLUMNS.every(function (col, i) { return currentHeader[i] === col; });
  if (!headerMatchesOld) {
    throw new Error(
      'phase11_migrateDefectItemSchemaConsolidation: PREFLIGHT FAILED. Real sheet header does not match ' +
      'the expected PRE-consolidation (post-ADR-P18) schema, and does not already match the new one either. ' +
      'Expected old: [' + OLD_COLUMNS.join(', ') + ']. ' +
      'Got: [' + currentHeader.join(', ') + ']. ' +
      'Refusing to guess how to remap an unrecognized layout. Resolve manually, then re-run. ' +
      'Zero writes performed.'
    );
  }

  if (lastCol > OLD_COLUMNS.length) {
    throw new Error(
      'phase11_migrateDefectItemSchemaConsolidation: PREFLIGHT FAILED. Real sheet currently reports ' +
      lastCol + ' columns, more than the ' + OLD_COLUMNS.length +
      ' the pre-consolidation schema expects. Investigate manually (stray data beyond the last column?) ' +
      'before proceeding. Zero writes performed.'
    );
  }

  var dataRowCount = lastRow - 1; // excluding header row
  var oldData = dataRowCount > 0
    ? sheet.getRange(2, 1, dataRowCount, OLD_COLUMNS.length).getValues()
    : [];

  Logger.log(
    'PREFLIGHT (structure) OK. Old header confirmed exact match to the expected ' +
    OLD_COLUMNS.length + '-column pre-consolidation schema. ' +
    dataRowCount + ' existing data row(s) found and read. Proceeding to business-rule preflight.'
  );

  // ──────────── PREFLIGHT: ITEMID / ORIGINALREFERENCE CONFLICTS ────────────
  var itemIdCol = OLD_COLUMNS.indexOf('ItemID');
  var originalReferenceCol = OLD_COLUMNS.indexOf('OriginalReference');
  var defectIdCol = OLD_COLUMNS.indexOf('DefectID');
  var categoryCol = OLD_COLUMNS.indexOf('Category');

  var conflicts = [];
  var mergedItemIds = []; // parallel to oldData — the resolved ItemID per row
  oldData.forEach(function (row, i) {
    var itemIdVal = String(row[itemIdCol] || '').trim();
    var originalReferenceVal = String(row[originalReferenceCol] || '').trim();
    if (itemIdVal && originalReferenceVal && itemIdVal !== originalReferenceVal) {
      conflicts.push(
        'Row ' + (i + 2) + ' (' + row[defectIdCol] + '): ItemID="' + itemIdVal +
        '" vs OriginalReference="' + originalReferenceVal + '" — DIFFERENT, cannot auto-resolve.'
      );
      mergedItemIds.push(null); // irrelevant — migration aborts before this is used
    } else {
      mergedItemIds.push(itemIdVal || originalReferenceVal || '');
    }
  });

  if (conflicts.length > 0) {
    throw new Error(
      'phase11_migrateDefectItemSchemaConsolidation: PREFLIGHT FAILED — ' +
      conflicts.length + ' row(s) have an ItemID/OriginalReference VALUE conflict. ' +
      'Per CC\'s instruction, this migration does NOT pick one automatically. ' +
      'Resolve each row by hand directly in the real DefectItems sheet (decide the ' +
      'correct ItemID value, e.g. by checking the Developer App), then re-run. ' +
      'Zero writes performed.\n' + conflicts.join('\n')
    );
  }

  // ──────────────────── PREFLIGHT: CATEGORY ENUM ────────────────────
  var invalidCategories = [];
  oldData.forEach(function (row, i) {
    var categoryVal = String(row[categoryCol] || '').trim();
    if (categoryVal && PROPERTY_CONFIG.DEFECT_CATEGORIES.indexOf(categoryVal) === -1) {
      invalidCategories.push(
        'Row ' + (i + 2) + ' (' + row[defectIdCol] + '): Category="' + categoryVal +
        '" is not in the new enum: [' + PROPERTY_CONFIG.DEFECT_CATEGORIES.join(', ') + ']'
      );
    }
  });

  if (invalidCategories.length > 0) {
    throw new Error(
      'phase11_migrateDefectItemSchemaConsolidation: PREFLIGHT FAILED — ' +
      invalidCategories.length + ' row(s) have a Category value outside the new ' +
      'ADR-P19 enum. Per CC\'s instruction, this migration does NOT silently convert. ' +
      'Resolve each row by hand directly in the real DefectItems sheet (pick the correct ' +
      'new-enum Category), then re-run. Zero writes performed.\n' + invalidCategories.join('\n')
    );
  }

  Logger.log(
    'PREFLIGHT (business rules) OK. Zero ItemID/OriginalReference conflicts, zero out-of-enum ' +
    'Category values across all ' + dataRowCount + ' row(s). Proceeding to write.'
  );

  // ─────────────── BUILD NEW DATA (name-keyed remap + merge) ───────────────
  var newData = oldData.map(function (oldRow, i) {
    var asObject = {};
    OLD_COLUMNS.forEach(function (colName, j) { asObject[colName] = oldRow[j]; });
    asObject.ItemID = mergedItemIds[i]; // overwrite with the resolved/merged value
    return NEW_COLUMNS.map(function (colName) {
      return Object.prototype.hasOwnProperty.call(asObject, colName) ? asObject[colName] : '';
    });
  });

  // ────────────────────────── EXECUTE ──────────────────────────
  // Date columns MUST be forced to plain-text format at their (possibly
  // shifted) NEW position BEFORE the values are written — same
  // reasoning and same pattern as
  // ONETIME_Phase11_DefectItemSchemaReorderMigration.js's own EXECUTE
  // step: without this, Sheets can silently reinterpret an ISO date
  // string as a Date serial value on write.
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

  // The old sheet had one more column than the new one (OriginalReference
  // removed) — setValues above only writes the first NEW_COLUMNS.length
  // columns, so the old 20th column's data would otherwise linger as a
  // stray, invisible-to-the-schema leftover. Blank it explicitly, header
  // row included, across every row that existed before this migration.
  if (lastCol > NEW_COLUMNS.length) {
    var extraCols = lastCol - NEW_COLUMNS.length;
    var blankBlock = [];
    for (var br = 0; br < lastRow; br++) {
      var blankRow = [];
      for (var bc = 0; bc < extraCols; bc++) blankRow.push('');
      blankBlock.push(blankRow);
    }
    sheet.getRange(1, NEW_COLUMNS.length + 1, lastRow, extraCols).setValues(blankBlock);
  }

  // ────────────────────── POST-WRITE VERIFICATION ──────────────────────
  var postHeader = sheet.getRange(1, 1, 1, NEW_COLUMNS.length).getValues()[0];
  var postHeaderOk = NEW_COLUMNS.every(function (col, i) { return postHeader[i] === col; });
  if (!postHeaderOk) {
    throw new Error(
      'phase11_migrateDefectItemSchemaConsolidation: POST-WRITE VERIFICATION FAILED — header does not ' +
      'read back correctly after the write. Do not use this sheet. Manual inspection required ' +
      'immediately. Expected: [' + NEW_COLUMNS.join(', ') + ']. Got: [' + postHeader.join(', ') + '].'
    );
  }

  var postDataRowCount = sheet.getLastRow() - 1;
  if (postDataRowCount !== dataRowCount) {
    throw new Error(
      'phase11_migrateDefectItemSchemaConsolidation: POST-WRITE VERIFICATION FAILED — row count changed ' +
      '(' + dataRowCount + ' -> ' + postDataRowCount + '). Do not use this sheet. Manual inspection required immediately.'
    );
  }

  var mismatches = [];
  var unchangedColumns = OLD_COLUMNS.filter(function (c) {
    return c !== 'OriginalReference' && c !== 'ItemID'; // these two are checked separately below
  });
  if (postDataRowCount > 0) {
    var postData = sheet.getRange(2, 1, postDataRowCount, NEW_COLUMNS.length).getValues();
    for (var r = 0; r < postDataRowCount; r++) {
      var oldRowObj = {};
      OLD_COLUMNS.forEach(function (colName, ci) { oldRowObj[colName] = oldData[r][ci]; });
      var newRowObj = {};
      NEW_COLUMNS.forEach(function (colName, ci) { newRowObj[colName] = postData[r][ci]; });

      // Every field EXCEPT ItemID/OriginalReference must be byte-identical.
      unchangedColumns.forEach(function (colName) {
        if (String(oldRowObj[colName]) !== String(newRowObj[colName])) {
          mismatches.push(
            'Row ' + (r + 2) + ', column "' + colName + '": was "' +
            oldRowObj[colName] + '", now "' + newRowObj[colName] + '"'
          );
        }
      });
      // ItemID specifically must equal the RESOLVED/merged value computed in preflight.
      if (String(newRowObj.ItemID) !== String(mergedItemIds[r])) {
        mismatches.push(
          'Row ' + (r + 2) + ', column "ItemID": expected merged value "' +
          mergedItemIds[r] + '", got "' + newRowObj.ItemID + '"'
        );
      }
    }
  }
  if (mismatches.length > 0) {
    throw new Error(
      'phase11_migrateDefectItemSchemaConsolidation: POST-WRITE VERIFICATION FAILED — ' +
      mismatches.length + ' field mismatch(es) between old and new data. Do not use this ' +
      'sheet. Manual inspection required immediately.\n' + mismatches.join('\n')
    );
  }

  var summary =
    'MIGRATION SUCCESS. ' + dataRowCount + ' existing data row(s) migrated from the old ' +
    OLD_COLUMNS.length + '-column layout to the new ' + NEW_COLUMNS.length +
    '-column layout. Every pre-existing field verified identical (by name, not position) ' +
    'between old and new for all ' + dataRowCount + ' row(s), except ItemID, which was ' +
    'verified equal to its correctly-merged value. Zero ItemID/OriginalReference conflicts ' +
    'and zero out-of-enum Category values were found during preflight. Safe to use ' +
    'DefectItems (Mobile Console, addDefectItem/updateDefectItem, the Importer) again. This ' +
    'migration did not add, remove, or re-validate which defects exist.';
  Logger.log(summary);
  return summary;
}
