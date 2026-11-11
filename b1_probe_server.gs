// Built 2026-11-10 against the candidate tree S1+S2+S3: 945 sha256 b27d3e0292dfc7202636da22f6c26848c81bfd984d8920d190548ac496220e7c; 912 sha256 cc36243a3ced41bbb0533d7f46e97441b5578fc778dc360b45f3c40bec3c7100; 946 sha256 1026be1160d358ac77be881982de0d590acd71f278147f8d0b3e501924909526.
/**
 * b1_probe_server.gs — B1 real-environment verification probe, SERVER side (Apps Script).
 *
 * READ ONLY: it never calls setValue / setValues / appendRow / deleteRow, never takes a lock, never writes to
 * PropertiesService or CacheService and creates no trigger. It reads sheet values and function source text.
 *
 * USE ON THE TEST COPY ONLY. Paste this file into the TEST COPY's bound script project as a NEW file
 * (for example b1_probe_server.gs). Do not paste it into the production project. Delete the file afterwards.
 *
 * Run from the Apps Script editor (select the function in the toolbar drop-down, press Run; the first run asks you to
 * authorize). The result is written to the Execution log and also returned:
 *   b1ProbeInfo()       time zones, the Malaysia date, which version of 912/946 is in this project (fingerprints),
 *                       which spreadsheet/script this is (names and the last 6 characters of the ids).
 *   b1ProbeSnapshot()   a SHA-256 of every sheet's values. Run it before and after a step: the checksums are equal
 *                       if and only if nothing was written (this is how "rejected, nothing written" is proven).
 *   b1ProbeReadBack()   the last rows of the Occurrences sheet: for OccurrenceID, Status, EffectiveDue, PaidDate,
 *                       PaidAmount the display text, the JavaScript type of the value (string / number / Date) and
 *                       the cell number format. Run it after a payment to see what the sheet really stores.
 *
 * Fingerprints: SHA-256 of each function's source text (Function.prototype.toString) compared with the candidate files
 * this kit was built from (S1 + S2 applied to 912, S2 applied to 946). A mismatch is a lead, not a verdict.
 *
 * This file was exercised only against stand-ins in Node (see the runbook, appendix B). It has NOT been run in real
 * Apps Script. If it errors, paste the error text back.
 */
var B1_PROBE_VERSION_ = 'b1-server-probe-1';
var B1_PROBE_EXPECTED_ = {
  "912:recordPayment": {
    "s2": "02d28dc92d5666901619bd8daaa07c2c1b96eb0955d44e2440a9ae0799abfab9",
    "before": "d76bb42f7a21179b304125c6e4a5ebb52af3bb6aab9501a1153089f49923f9e3"
  },
  "912:parsePositiveAmount_": {
    "s2": "3aff9ee6c52b33459d08234a7afa772a55d15ac2daa5b31430bb2f86d76b0ecb"
  },
  "912:isRealIsoDate_": {
    "s2": "f09b1269dee87bd5b1ff4bd06c1a1f42bbff4ad92103a21aa2844d86ad6eb53a"
  },
  "912:malaysiaTodayIso_": {
    "s2": "3d60a56e5bac4172328d789e7552b8d0cf188e27d89d2c95979ee071323c2f66"
  },
  "946:console_recordPayment": {
    "s2": "ab3cf30d50f882867d3ca08e335dcaa6f5825741f48525c27b6f3592a82f4ce8",
    "before": "7c5223268fec58aa22a35aba24a55ded8e9d0d9e0e47ec4906831cf420062117"
  }
};

function b1Sha256_(str) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(str), Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) { var b = bytes[i]; if (b < 0) b += 256; hex += ('0' + b.toString(16)).slice(-2); }
  return hex;
}

function b1Try_(fn) {
  try { return fn(); } catch (e) { return 'ERROR: ' + (e && e.message ? e.message : String(e)); }
}

function b1Tail_(s) {
  s = String(s || ''); return s.length > 6 ? '...' + s.slice(-6) : s;
}

function b1Functions_() {
  return {
    '912:recordPayment': typeof recordPayment === 'function' ? recordPayment : null,
    '912:parsePositiveAmount_': typeof parsePositiveAmount_ === 'function' ? parsePositiveAmount_ : null,
    '912:isRealIsoDate_': typeof isRealIsoDate_ === 'function' ? isRealIsoDate_ : null,
    '912:malaysiaTodayIso_': typeof malaysiaTodayIso_ === 'function' ? malaysiaTodayIso_ : null,
    '946:console_recordPayment': typeof console_recordPayment === 'function' ? console_recordPayment : null
  };
}

function b1Fingerprints_() {
  var fns = b1Functions_(), out = {};
  for (var name in fns) {
    if (!Object.prototype.hasOwnProperty.call(fns, name)) continue;
    var f = fns[name], rec = { present: f !== null };
    if (f !== null) {
      var src = b1Try_(function () { return Function.prototype.toString.call(f); });
      rec.sha256 = b1Sha256_(src); rec.length = String(src).length;
      var e = B1_PROBE_EXPECTED_[name] || {};
      rec.matches = rec.sha256 === e.s2 ? 's2' : (e.before && rec.sha256 === e.before ? 'before_s2' : 'UNKNOWN');
    }
    out[name] = rec;
  }
  return out;
}

function b1Classify_(fp) {
  var s1 = ['912:parsePositiveAmount_', '912:isRealIsoDate_', '912:malaysiaTodayIso_'];
  var s1ok = s1.every(function (n) { return fp[n].present && fp[n].matches === 's2'; });
  var s1missing = s1.every(function (n) { return !fp[n].present; });
  var rp = fp['912:recordPayment'].matches, cp = fp['946:console_recordPayment'].matches;
  if (s1ok && rp === 's2' && cp === 's2') return 'S2 (S1 + S2 applied to 912, S2 applied to 946)';
  if (s1ok && rp === 'before_s2' && cp === 'before_s2') return 'S1 only (S2 NOT applied)';
  if (s1missing && rp === 'before_s2' && cp === 'before_s2') return 'ORIGINAL 912 / 946 (no S1, no S2)';
  return 'UNKNOWN: compare the per-function results';
}

function b1ProbeInfo() {
  var now = new Date(), out = { probe: B1_PROBE_VERSION_, ranAtIso: now.toISOString() };
  var ss = b1Try_(function () { return SpreadsheetApp.getActiveSpreadsheet(); });
  var ssOk = ss && typeof ss === 'object';
  out.spreadsheetName = ssOk ? b1Try_(function () { return ss.getName(); }) : String(ss);
  out.spreadsheetIdTail = ssOk ? b1Try_(function () { return b1Tail_(ss.getId()); }) : null;
  out.sheetNames = ssOk ? b1Try_(function () { return ss.getSheets().map(function (s) { return s.getName(); }); }) : null;
  out.scriptIdTail = b1Try_(function () { return b1Tail_(ScriptApp.getScriptId()); });
  out.scriptTimeZone = b1Try_(function () { return Session.getScriptTimeZone(); });
  out.spreadsheetTimeZone = ssOk ? b1Try_(function () { return ss.getSpreadsheetTimeZone(); }) : null;
  out.jsDateToString = now.toString();
  out.nowInKualaLumpur = b1Try_(function () { return Utilities.formatDate(now, 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm:ss Z'); });
  out.nowInScriptTimeZone = b1Try_(function () { return Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss Z'); });
  out.klDate = b1Try_(function () { return Utilities.formatDate(now, 'Asia/Kuala_Lumpur', 'yyyy-MM-dd'); });
  out.scriptTimeZoneDate = b1Try_(function () { return Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'); });
  out.malaysiaTodayIso = typeof malaysiaTodayIso_ === 'function' ? b1Try_(function () { return malaysiaTodayIso_(Date.now()); }) : 'MISSING (S1 not applied?)';
  out.malaysiaTodayIsoEqualsKualaLumpurDate = out.malaysiaTodayIso === out.klDate;
  out.scriptTimeZoneDateEqualsKualaLumpurDate = out.scriptTimeZoneDate === out.klDate;
  var fp = b1Fingerprints_();
  out.deployedVersion = b1Classify_(fp);
  out.fingerprints = fp;
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

function b1ProbeSnapshot() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sheets = ss.getSheets(), rows = [], all = '';
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i], lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
    var values = (lastRow > 0 && lastCol > 0) ? sh.getRange(1, 1, lastRow, lastCol).getValues() : [];
    var digest = b1Sha256_(JSON.stringify(values));
    rows.push({ name: sh.getName(), lastRow: lastRow, lastColumn: lastCol, sha256: digest });
    all += sh.getName() + ':' + digest + '\n';
  }
  var out = { probe: B1_PROBE_VERSION_, takenAtIso: new Date().toISOString(), sheets: rows, overallSha256: b1Sha256_(all),
    note: 'Equal overallSha256 before and after a step means no sheet value changed. A sheet with a volatile formula (NOW, TODAY, RAND) can change by itself.' };
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

function b1ProbeReadBack(limit) {
  var n = limit || 5, out = { probe: B1_PROBE_VERSION_, takenAtIso: new Date().toISOString() };
  var occName = b1Try_(function () { return PROPERTY_SCHEMA.ObligationOccurrence.sheetName; });
  if (typeof occName !== 'string' || occName.indexOf('ERROR') === 0) occName = 'ObligationOccurrences';
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(occName);
  if (!sh) { out.error = 'sheet not found: ' + occName; Logger.log(JSON.stringify(out, null, 2)); return out; }
  var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  var header = lastRow > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  out.sheet = occName; out.dataRowCount = Math.max(0, lastRow - 1); out.header = header;
  out.headerMatchesSchema = b1Try_(function () { return JSON.stringify(PROPERTY_SCHEMA.ObligationOccurrence.columns) === JSON.stringify(header); });
  var wanted = ['OccurrenceID', 'Status', 'EffectiveDue', 'PaidDate', 'PaidAmount'], first = Math.max(2, lastRow - n + 1);
  out.rows = [];
  for (var r = first; r <= lastRow; r++) {
    var row = { rowNumber: r };
    for (var k = 0; k < wanted.length; k++) {
      var c = header.indexOf(wanted[k]) + 1;
      if (c < 1) { row[wanted[k]] = 'column not found'; continue; }
      var cell = sh.getRange(r, c), v = cell.getValue();
      row[wanted[k]] = { display: cell.getDisplayValue(), valueType: (v instanceof Date) ? 'Date' : typeof v, numberFormat: cell.getNumberFormat() };
    }
    out.rows.push(row);
  }
  var histName = b1Try_(function () { return PROPERTY_SCHEMA.ObligationHistory.sheetName; });
  if (typeof histName === 'string' && histName.indexOf('ERROR') !== 0) {
    var hs = ss.getSheetByName(histName);
    out.history = hs ? { sheet: histName, dataRowCount: Math.max(0, hs.getLastRow() - 1) } : { sheet: histName, error: 'sheet not found' };
  }
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}
