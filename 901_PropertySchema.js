/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 901_PropertySchema.js
 * Foundation Layer — Schema
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Governs: ObligationEngine_VerticalSlice.md §2 (Truth Layer Schema)
 * Session 1, Part A (Foundation) — file 2 of 4.
 *
 * Only the three Obligation tables are defined here — they are the only
 * entities whose schema has passed Architecture Review. Other entities
 * (Property, Loan, Document, ...) are added when their own Phase begins.
 *
 * Depends on: 900_PropertyConfig.js
 * ═══════════════════════════════════════════════════════════════════════
 */

var PROPERTY_SCHEMA = Object.freeze({

  ObligationRule: Object.freeze({
    sheetName: PROPERTY_CONFIG.SHEET_NAMES.OBLIGATION_RULES,
    columns: Object.freeze([
      'ObligationID',        // string PK, OBL-...
      'PropertyID',          // string FK -> Properties (Phase 1 Asset Engine)
      'LoanID',               // string FK, optional (Category = Mortgage)
      'LeaseID',              // string FK, optional (Category = RentalCollection)
      'Category',             // enum, PROPERTY_CONFIG.OBLIGATION_CATEGORIES
      'Payee',                 // string
      'Amount',                // number
      'Currency',              // string, ISO 4217
      'FrequencyType',        // enum, PROPERTY_CONFIG.FREQUENCY_TYPES
      'CustomIntervalDays',   // number, required iff FrequencyType = 'Custom'
      'DueAnchor',             // ISO date string (yyyy-MM-dd)
      'ReminderOffsets',      // JSON string, e.g. "[30,14,7,3,1,0,-1,-3,-7]"
      'AutoGenerate',          // boolean
      'GraceDays',             // number, default 0
      'EndDate',               // ISO date string, optional (-> Completed)
      'Status',                // enum, PROPERTY_CONFIG.OBLIGATION_RULE_STATUSES
      'CreatedAt',             // ISO datetime string
      'UpdatedAt'              // ISO datetime string
    ]),
    // Forced to plain-text format on sheet creation (see ensureSheetSchema_)
    // so Sheets never silently reinterprets an ISO string as a Date serial.
    dateColumns: Object.freeze(['DueAnchor', 'EndDate', 'CreatedAt', 'UpdatedAt'])
  }),

  ObligationOccurrence: Object.freeze({
    sheetName: PROPERTY_CONFIG.SHEET_NAMES.OBLIGATION_OCCURRENCES,
    columns: Object.freeze([
      'OccurrenceID',    // string PK, OCC-...
      'ObligationID',    // string FK -> ObligationRule
      'EffectiveDue',    // ISO date string — idempotency key with ObligationID
      'Amount',          // number, snapshot at creation time
      'Currency',        // string
      'Status',          // enum, PROPERTY_CONFIG.OBLIGATION_OCCURRENCE_STATUSES
      'PaidDate',        // ISO date string, optional
      'PaidAmount',      // number, optional
      'PaidVia',         // enum, PROPERTY_CONFIG.PAID_VIA_OPTIONS, optional
      'Evidence',        // string, DocumentID, optional
      'ReversedAt',      // ISO datetime string, optional (ADR-P06)
      'ReversalReason',  // string, optional (ADR-P06)
      'CreatedAt',
      'UpdatedAt'
    ]),
    // EffectiveDue is the idempotency key (with ObligationID) — it MUST
    // stay a plain string on read, or the equality check in
    // findOccurrenceByRuleAndDue_ silently breaks.
    dateColumns: Object.freeze(
      ['EffectiveDue', 'PaidDate', 'ReversedAt', 'CreatedAt', 'UpdatedAt']
    )
  }),

  // Append-only. No function anywhere in Property OS should UPDATE or
  // DELETE a row in this sheet — see Constitution P10 / ADR-P06.
  ObligationHistory: Object.freeze({
    sheetName: PROPERTY_CONFIG.SHEET_NAMES.OBLIGATION_HISTORY,
    columns: Object.freeze([
      'HistoryID',     // string PK, HIST-...
      'OccurrenceID',  // string FK -> ObligationOccurrence
      'FromStatus',
      'ToStatus',
      'ChangedAt',     // ISO datetime string
      'TriggeredBy',   // Command or Event name
      'Note'           // string, optional
    ]),
    dateColumns: Object.freeze(['ChangedAt'])
  }),

  // 910_PropertyAssetEngine. Field list + Address VO decision:
  // PropertyAssetEngine_VerticalSlice.md §2 (Review Approval 2026-07-19).
  Property: Object.freeze({
    sheetName: PROPERTY_CONFIG.SHEET_NAMES.PROPERTIES,
    columns: Object.freeze([
      'PropertyID',        // string PK, PROP-...
      'PropertyName',
      'Developer',
      // Structured Address VO (Review Approval 2026-07-19) — six
      // columns, not one flat string. formattedAddress is NOT a column
      // here — it's derived on read via formatAddress_(), never stored.
      'AddressLine1',
      'AddressLine2',
      'AddressCity',
      'AddressState',
      'AddressPostcode',
      'AddressCountry',
      'GPS',                // 'lat,lng' string; not a GeoPoint VO (§3)
      'PurchaseDate',
      'PurchasePrice',
      'CurrentValue',        // defaults to PurchasePrice if omitted (§1)
      'LoanID',              // FK, format-checked only — 915 doesn't exist yet
      'BuiltUp',
      'LandSize',
      'FreeholdLeasehold',
      'Parking',
      'StoreRoom',
      'CompletionDate',
      'VPDate',
      'DefectExpiry',
      'Status',              // Active / Sold (§6)
      'SoldDate',             // set only via MarkPropertySold
      'SoldPrice',            // set only via MarkPropertySold
      'Owner',
      'PropertyType',         // UPPER_SNAKE_CASE — see PROPERTY_CONFIG note
      'CreatedAt',
      'UpdatedAt'
    ]),
    dateColumns: Object.freeze([
      'PurchaseDate', 'CompletionDate', 'VPDate', 'DefectExpiry',
      'SoldDate', 'CreatedAt', 'UpdatedAt'
    ])
  })

});


/**
 * Ensures a sheet exists with the correct header row. Idempotent — safe
 * to call on every cold start. Never touches existing data rows, and
 * deliberately refuses to "fix" a mismatched header automatically: a
 * silent rewrite could desync existing row data from a changed column
 * order. A real mismatch must be resolved via Migration Strategy
 * (ObligationEngine_VerticalSlice.md §12), not auto-corrected.
 *
 * On first creation, columns listed in dateColumns are forced to plain
 * text format ('@'). Without this, Sheets can silently reinterpret an
 * ISO date string like "2026-07-19" as a Date serial value on write,
 * which would break string-equality idempotency checks such as
 * (ObligationID, EffectiveDue) in findOccurrenceByRuleAndDue_.
 *
 * Every call also freezes row 1 (header), whether the sheet is new or
 * already existed — cheap and idempotent, so existing sheets pick this
 * up automatically the next time anything calls this function.
 *
 * @param {string} sheetName
 * @param {string[]} columns
 * @param {string[]} [dateColumns] column names to force to plain text
 * @return {GoogleAppsScript.Spreadsheet.Sheet}
 */
function ensureSheetSchema_(sheetName, columns, dateColumns) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  var isNewSheet = !sheet;

  if (isNewSheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(columns);
  } else {
    var existingHeader = sheet.getRange(1, 1, 1, columns.length).getValues()[0];
    var headerMatches = columns.every(function (col, i) {
      return existingHeader[i] === col;
    });
    if (!headerMatches) {
      throw new Error(
        'Schema drift detected on sheet "' + sheetName + '". Expected ' +
        'header: [' + columns.join(', ') + ']. Got: [' + existingHeader.join(', ') +
        ']. Resolve via Migration Strategy — do not auto-correct.'
      );
    }
  }

  if (isNewSheet && dateColumns && dateColumns.length > 0) {
    dateColumns.forEach(function (colName) {
      var colIndex = columns.indexOf(colName) + 1;
      if (colIndex > 0) {
        // Format header row + 1000 data rows as plain text. 1000 is a
        // generous ceiling for a personal system; revisit only if a
        // single Obligation table genuinely needs more rows than that.
        sheet.getRange(1, colIndex, 1000, 1).setNumberFormat('@');
      }
    });
  }

  // Every Property OS sheet keeps its header row visible while
  // scrolling. Unconditional (not gated on isNewSheet) and safe to
  // call every time: setFrozenRows(1) is idempotent and touches no
  // data, so it also retroactively fixes any sheet that was created
  // before this existed — including the three Obligation sheets
  // already created via a live initObligationSchema_() run before this
  // fix landed. They pick it up automatically the next time this
  // function runs, no manual step needed beyond that.
  sheet.setFrozenRows(1);

  return sheet;
}

/**
 * Initializes all Obligation-related sheets. Call once at project setup,
 * and defensively at the start of any 912/913 entry point so a fresh
 * spreadsheet self-heals its structure without a separate manual step.
 */
function initObligationSchema_() {
  ensureSheetSchema_(
    PROPERTY_SCHEMA.ObligationRule.sheetName,
    PROPERTY_SCHEMA.ObligationRule.columns,
    PROPERTY_SCHEMA.ObligationRule.dateColumns
  );
  ensureSheetSchema_(
    PROPERTY_SCHEMA.ObligationOccurrence.sheetName,
    PROPERTY_SCHEMA.ObligationOccurrence.columns,
    PROPERTY_SCHEMA.ObligationOccurrence.dateColumns
  );
  ensureSheetSchema_(
    PROPERTY_SCHEMA.ObligationHistory.sheetName,
    PROPERTY_SCHEMA.ObligationHistory.columns,
    PROPERTY_SCHEMA.ObligationHistory.dateColumns
  );
}

/**
 * Initializes the Properties sheet. Call once at project setup, and
 * defensively at the start of any 910 entry point — same self-healing
 * pattern as initObligationSchema_().
 */
function initPropertySchema_() {
  ensureSheetSchema_(
    PROPERTY_SCHEMA.Property.sheetName,
    PROPERTY_SCHEMA.Property.columns,
    PROPERTY_SCHEMA.Property.dateColumns
  );
}


/**
 * ═══════════════════════════════════════════════════════════════════════
 * Shared Truth Layer access utilities
 * ═══════════════════════════════════════════════════════════════════════
 * Generic row I/O and date handling used by every Engine that reads or
 * writes a Property OS sheet. Kept here (Foundation/Schema) rather than
 * duplicated per-Engine, since they're about how ANY Engine talks to its
 * Sheet-backed Truth Layer, not Obligation-specific business logic.
 */

/**
 * Constructs a coded error. Every Command across Property OS should
 * throw via this (not a bare `new Error(...)`) so callers (Telegram
 * handler, future UI, tests) can branch on `.code` instead of parsing
 * message strings.
 * @param {string} code
 * @param {string} [message]
 * @return {Error}
 */
function propertyError_(code, message) {
  var err = new Error(message || code);
  err.code = code;
  return err;
}

function toIsoDate_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function toIsoDateTime_(date) {
  return date.toISOString();
}

/**
 * Parses a 'yyyy-MM-dd' string as a LOCAL calendar date (midnight in the
 * script's timezone), not via `new Date(str)` — the latter parses as
 * UTC midnight, which is a well-known source of off-by-one-day bugs
 * once a timezone offset is involved. Property OS's due-date math must
 * never be off by a day.
 * @param {string} isoDateStr 'yyyy-MM-dd'
 * @return {Date}
 */
function parseIsoDate_(isoDateStr) {
  var parts = String(isoDateStr).split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

/**
 * Normalizes a value read back from a Sheet cell to a 'yyyy-MM-dd'
 * string, regardless of whether Sheets handed it back as a string (the
 * expected case, given the plain-text formatting in ensureSheetSchema_)
 * or, defensively, as a Date object (belt-and-suspenders in case that
 * formatting was ever bypassed, e.g. by a manual edit in the Sheets UI).
 * @param {*} value
 * @return {string}
 */
function coerceToIsoDateString_(value) {
  if (value instanceof Date) {
    return toIsoDate_(value);
  }
  return String(value);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number} rowIndex 1-indexed sheet row
 * @param {string[]} columns
 * @return {Object}
 */
function readRowAsObject_(sheet, rowIndex, columns) {
  var values = sheet.getRange(rowIndex, 1, 1, columns.length).getValues()[0];
  var obj = {};
  columns.forEach(function (col, i) {
    obj[col] = values[i];
  });
  return obj;
}

/**
 * @param {Object} obj
 * @param {string[]} columns
 * @return {Array}
 */
function objectToRowArray_(obj, columns) {
  return columns.map(function (col) {
    return (col in obj && obj[col] !== undefined && obj[col] !== null) ? obj[col] : '';
  });
}

/**
 * Linear scan for the row whose first column matches idValue. O(n) —
 * fine at personal-project scale (tens to low hundreds of rows per
 * table); revisit only if that assumption stops holding.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} idValue
 * @return {number} 1-indexed row number, or -1 if not found
 */
function findRowIndexByFirstColumn_(sheet, idValue) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === idValue) {
      return i + 2;
    }
  }
  return -1;
}

/**
 * Read-modify-write for a single row: reads the current row, overlays
 * fieldUpdates onto it, writes the merged result back in one call.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number} rowIndex 1-indexed sheet row
 * @param {string[]} columns
 * @param {Object} fieldUpdates
 * @return {Object} the merged row object that was written
 */
function updateRowFields_(sheet, rowIndex, columns, fieldUpdates) {
  var current = readRowAsObject_(sheet, rowIndex, columns);
  Object.keys(fieldUpdates).forEach(function (key) {
    current[key] = fieldUpdates[key];
  });
  sheet.getRange(rowIndex, 1, 1, columns.length).setValues([objectToRowArray_(current, columns)]);
  return current;
}
