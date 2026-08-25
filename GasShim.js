'use strict';
/**
 * GasShim — a minimal, faithful-enough mock of the Google Apps Script
 * globals Property OS's Foundation/Runtime code touches, so that code
 * can run for real under plain Node (no live GAS project required).
 *
 * Faithful on purpose in one specific way: FakeRange.setValues()
 * reproduces real Sheets' behavior of silently coercing an ISO-date-
 * shaped string into a Date value when the target cell isn't formatted
 * as plain text ('@'). This is what lets 900_Tests_Foundation.js
 * actually verify the dateColumns fix works, rather than just asserting
 * it exists in the source.
 *
 * NOT modeled (out of scope for what 900-903/912-913 actually use):
 * formulas, multiple sheets tabs beyond getSheetByName/insertSheet,
 * formatting other than plain-text, any UI-facing behavior.
 */

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

class FakeRange {
  constructor(sheet, row, col, numRows, numCols) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }

  getValues() {
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const rowIdx = this.row - 1 + r;
      const existingRow = this.sheet.data[rowIdx];
      const rowArr = [];
      for (let c = 0; c < this.numCols; c++) {
        const colIdx = this.col - 1 + c;
        rowArr.push(existingRow && existingRow[colIdx] !== undefined ? existingRow[colIdx] : '');
      }
      out.push(rowArr);
    }
    return out;
  }

  setValues(values) {
    for (let r = 0; r < values.length; r++) {
      const rowIdx = this.row - 1 + r;
      while (this.sheet.data.length <= rowIdx) this.sheet.data.push([]);
      for (let c = 0; c < values[r].length; c++) {
        const colIdx = this.col - 1 + c;
        let val = values[r][c];
        const rowFormats = this.sheet._formats[rowIdx];
        const fmt = rowFormats ? rowFormats[colIdx] : undefined;
        // Faithful simulation of real Sheets: an unformatted cell
        // silently coerces an ISO-date-shaped string to a Date.
        if (fmt !== '@' && typeof val === 'string' && ISO_DATE_RE.test(val)) {
          const parts = val.split('-');
          val = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        }
        this.sheet.data[rowIdx][colIdx] = val;
      }
    }
    return this;
  }

  setNumberFormat(fmt) {
    for (let r = 0; r < this.numRows; r++) {
      const rowIdx = this.row - 1 + r;
      this.sheet._formats[rowIdx] = this.sheet._formats[rowIdx] || {};
      for (let c = 0; c < this.numCols; c++) {
        const colIdx = this.col - 1 + c;
        this.sheet._formats[rowIdx][colIdx] = fmt;
      }
    }
    return this;
  }

  // Cosmetic only in real Sheets (bold text) — no effect on any value
  // Property OS logic reads back, so a no-op is faithful here, same
  // reasoning as SpreadsheetApp.flush() above.
  setFontWeight(_weight) {
    return this;
  }
}

class FakeSheet {
  constructor(name) {
    this.name = name;
    this.data = [];       // array of row-arrays, 0-indexed internally
    this._formats = {};   // sparse: rowIdx -> { colIdx: fmt }
    this.frozenRows = 0;
  }
  appendRow(rowArray) {
    this.data.push(rowArray.slice());
    return this;
  }
  getRange(row, col, numRows, numCols) {
    return new FakeRange(this, row, col, numRows, numCols);
  }
  getLastRow() {
    return this.data.length;
  }
  // No existing Property OS code needed this before — every other
  // reader always trusts its OWN schema's columns.length rather than
  // asking the sheet how wide it currently is. The reorder migration
  // (ONETIME_Phase11_DefectItemSchemaReorderMigration.js) is the first
  // exception: it must discover the REAL sheet's current width during
  // its own preflight, precisely because it can no longer assume the
  // real sheet already matches this codebase's schema. Real Sheets'
  // getLastColumn() reflects the widest row in the sheet, header
  // included — Math.max over every stored row's length mirrors that.
  getLastColumn() {
    return this.data.reduce((max, row) => Math.max(max, row.length), 0);
  }
  setFrozenRows(n) {
    this.frozenRows = n;
    return this;
  }
  // Cosmetic only in real Sheets (column pixel width) — no effect on
  // any value Property OS logic reads back.
  autoResizeColumns(_startColumn, _numColumns) {
    return this;
  }
}

class FakeSpreadsheet {
  constructor() {
    this.sheetsByName = {};
  }
  getSheetByName(name) {
    return this.sheetsByName[name] || null;
  }
  insertSheet(name) {
    const s = new FakeSheet(name);
    this.sheetsByName[name] = s;
    return s;
  }
}

function makeLockService() {
  return {
    getScriptLock() {
      return {
        tryLock: () => true,
        waitLock: () => true,
        releaseLock: () => {}
      };
    }
  };
}

function makeCacheService() {
  const store = new Map();
  return {
    getScriptCache() {
      return {
        get: (key) => (store.has(key) ? store.get(key) : null),
        put: (key, value) => { store.set(key, value); }
      };
    }
  };
}

const Utilities = {
  formatDate(date, timeZone, format) {
    if (format !== 'yyyy-MM-dd') {
      throw new Error('FakeUtilities.formatDate: unsupported format "' + format + '" (extend the shim if 912/913 starts using another one)');
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
};

const Session = { getScriptTimeZone: () => 'Asia/Kuala_Lumpur' };

function makeLogger(captured) {
  return { log: (msg) => { captured.push(msg); } };
}

/**
 * Builds one fresh, isolated Property OS runtime context: its own fake
 * spreadsheet, its own cache, its own Logger capture buffer — nothing
 * shared across calls, so tests can't leak state into each other.
 *
 * @param {string} sourceDir absolute path to the directory containing
 *   900_PropertyConfig.js etc.
 * @param {string[]} files filenames to load, in order
 * @return {{ctx: Object, spreadsheet: FakeSpreadsheet, logs: string[]}}
 */
function loadPropertyOSContext(sourceDir, files) {
  const spreadsheet = new FakeSpreadsheet();
  const logs = [];
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet, flush: () => {} },
    LockService: makeLockService(),
    CacheService: makeCacheService(),
    Utilities,
    Session,
    Logger: makeLogger(logs),
    JSON, Math, Date, Object, Array, String, Number, Error,
    console
  };
  vm.createContext(ctx);
  for (const file of files) {
    const code = fs.readFileSync(path.join(sourceDir, file), 'utf8');
    new vm.Script(code, { filename: file }).runInContext(ctx);
  }
  return { ctx, spreadsheet, logs };
}

const FOUNDATION_FILES = [
  '900_PropertyConfig.js',
  '901_PropertySchema.js',
  '902_PropertyIdentity.js',
  '903_PropertyEventDefinitions.js'
];

const OBLIGATION_ENGINE_FILES = FOUNDATION_FILES.concat([
  '912_ObligationEngine.js',
  '913_ObligationScheduler.js'
]);

module.exports = {
  loadPropertyOSContext,
  FOUNDATION_FILES,
  OBLIGATION_ENGINE_FILES,
  FakeSpreadsheet,
  ISO_DATE_RE
};
