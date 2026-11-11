// local_precheck_test_B1_recordPayment.js
//
// B1 S2 CANDIDATE TEST — a NEW file. Not part of any repository yet, not applied anywhere.
// Specification: B1_implementation_plan_v2.md §2.1 (C2, C3), §4.1 (B1-1, B1-2), §6.2 (S-4, S-5, S-6, S-7).
// Approved by the S0 text of 2026-11-06 (D1, D2, D3, D4 conditional, D10 plan A, D11, D12); S2 started on "请继续S2".
//
// What it is: Node + GasShim (in-memory Sheets), the same technique as local_precheck_test_946_createObligation.js.
// NOT Apps Script, NOT a browser, NOT production. No real data is touched. The test only READS the source files.
//
// What it checks:
//   S-4  recordPayment: a PROVIDED amount that is not a finite number > 0 is rejected before anything is read or written.
//   S-5  recordPayment: blank date -> Malaysia day from an injected clock; malformed / unreal date -> rejected, nothing written.
//   S-6  console_recordPayment: blank / invalid raw amount -> rejected, the engine is NOT called (spy); valid -> number 42.5.
//   S-7  regression: idempotent second payment, existing error codes, partial-write behaviour are unchanged.
//   F    the REAL server responses classified by the S1 function interpretPayResponse_ (945) — only when S1 is present.
//   G    differential: with --base DIR (the tree BEFORE S2) the same valid-input scenarios give identical transcripts.
//
// Usage:  node local_precheck_test_B1_recordPayment.js [DIR] [--base BASEDIR]
//         DIR      the tree with S1 and S2 applied (needs GasShim.js and the 900-903, 910, 912, 913, 946 sources);
//                  default: env B1_SRC_DIR, else this file's own directory.
//         BASEDIR  the same tree WITHOUT S2 (S1-only or the original); enables group G. Default: env B1_BASE_DIR.
// Exit code 0 = every check passed, 1 = at least one failed.

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const crypto = require('crypto');

const argv = process.argv.slice(2);
var SRC = null, BASE = null;
for (var ai = 0; ai < argv.length; ai++) {
  if (argv[ai] === '--base') BASE = path.resolve(argv[++ai]);
  else if (argv[ai].indexOf('--') !== 0) SRC = path.resolve(argv[ai]);
}
SRC = SRC || path.resolve(process.env.B1_SRC_DIR || __dirname);
if (!BASE && process.env.B1_BASE_DIR) BASE = path.resolve(process.env.B1_BASE_DIR);

var pass = 0, fail = 0;
function check(label, cond, detail) {
  if (cond) { pass++; console.log('ok  :', label); }
  else { fail++; console.log('FAIL:', label, detail === undefined ? '' : '-> ' + detail); }
}
function section(t) { console.log('\n═══ ' + t + ' ═══'); }
function finish() {
  console.log('\n' + '═'.repeat(60));
  console.log(fail === 0 ? 'ALL ' + pass + ' CHECKS PASSED (0 failures)' : pass + ' passed, ' + fail + ' FAILED');
  process.exit(fail === 0 ? 0 : 1);
}
function show(v) {
  if (typeof v === 'string') return JSON.stringify(v.length > 24 ? v.slice(0, 21) + '...' : v);
  if (typeof v === 'number') return Object.is(v, -0) ? '-0' : String(v);
  if (typeof v === 'bigint') return String(v) + 'n';
  if (typeof v === 'symbol') return 'Symbol()';
  if (typeof v === 'function') return 'function';
  if (v === undefined) return 'undefined';
  if (v instanceof Date) return 'Date(' + v.getTime() + ')';
  try { return JSON.stringify(v); } catch (e) { return '[unprintable]'; }
}
function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function lcg(seed) { var s = seed >>> 0; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function extractFn(src, name) {          // top-level function: from "function NAME(" at column 0 to the next "\n}\n"
  const m = new RegExp('^function ' + name + '\\s*\\(', 'm').exec(src);
  if (!m) return null;
  const end = src.indexOf('\n}\n', m.index);
  return end === -1 ? null : src.slice(m.index, end + 2);
}

// Runs fn with Date.now and Math.random replaced (the shim hands the host's Date and Math to the code under test, so
// the replacement is visible to it). Always restored. IDs generated inside become reproducible.
function withFixed(nowMs, seed, fn) {
  const realNow = Date.now, realRandom = Math.random;
  Date.now = function () { return nowMs; };
  Math.random = lcg(seed);
  try { return fn(); } finally { Date.now = realNow; Math.random = realRandom; }
}

const FILES = ['900_PropertyConfig.js', '901_PropertySchema.js', '902_PropertyIdentity.js', '903_PropertyEventDefinitions.js',
  '910_PropertyAssetEngine.js', '912_ObligationEngine.js', '913_ObligationScheduler.js', '946_OperatorConsoleServer.js'];

function fresh(dir) {
  const shim = require(path.join(dir, 'GasShim.js'));
  const loaded = shim.loadPropertyOSContext(dir, FILES);
  const ctx = loaded.ctx, ss = loaded.spreadsheet, logs = loaded.logs;
  const run = function (code) { return vm.runInContext(code, ctx); };
  const t = { ctx: ctx, run: run, logs: logs, ss: ss };
  t.rows = function (schema) {
    const sh = ss.getSheetByName(run('PROPERTY_SCHEMA.' + schema + '.sheetName'));
    if (!sh) return [];
    const cols = run('PROPERTY_SCHEMA.' + schema + '.columns');
    return sh.data.slice(1).map(function (r) { const o = {}; cols.forEach(function (k, i) { o[k] = r[i]; }); return o; });
  };
  t.counts = function () { return t.rows('ObligationRule').length + '/' + t.rows('ObligationOccurrence').length + '/' + t.rows('ObligationHistory').length; };
  t.snap = function () { return JSON.stringify(Object.keys(ss.sheetsByName).sort().map(function (n) { return [n, ss.sheetsByName[n].data]; })); };
  t.events = function () { return logs.filter(function (l) { return String(l).indexOf('EventBus Adapter') !== -1; }).length; };
  t.partialFailures = function () { return logs.filter(function (l) { return String(l).indexOf('PARTIAL FAILURE in recordPayment') !== -1; }).length; };
  t.property = function (name) {
    ctx.__p = { propertyName: name, addressLine1: 'x', purchasePrice: 1, freeholdLeasehold: 'Leasehold', propertyType: 'RESIDENTIAL_CONDO', unitLabel: 'A-19-11' };
    run('createProperty(__p)');
    return run('listActiveProperties()').filter(function (p) { return p.PropertyName === name; })[0].PropertyID;
  };
  t.bill = function (propertyId, over) {
    ctx.__b = Object.assign({ propertyId: propertyId, category: 'Water', payee: 'Air Selangor', amount: 42.5, frequencyType: 'Monthly',
      dueAnchor: '2026-10-15', graceDays: 0, autoGenerate: true }, over || {});
    return run('createObligation(__b)');
  };
  t.attempt = function (code) {
    try { return { ok: true, value: run(code) }; } catch (e) { return { ok: false, code: e && e.code, message: e && e.message }; }
  };
  t.pay = function (input) { ctx.__in = input; return t.attempt('recordPayment(__in)'); };
  t.consolePay = function (a, b, c, d) { ctx.__a = [a, b, c, d]; return run('console_recordPayment.apply(null, __a)'); };
  t.call = function (fnName, input) { ctx.__in = input; return t.attempt(fnName + '(__in)'); };
  t.fixture = function (over) { const pid = t.property('Est8 Seputeh'); const r = t.bill(pid, over); return { pid: pid, obl: r.obligationId, occ: r.occurrenceId }; };
  t.occRow = function (id) { return t.rows('ObligationOccurrence').filter(function (o) { return o.OccurrenceID === id; })[0]; };
  return t;
}

// ── Load ────────────────────────────────────────────────────────────────────
section('A. Load: sources, shim, functions, clock injection, static order of the checks');
console.log('node', process.version, '| source dir:', SRC, '| base dir:', BASE || '(none: group G skipped)');
var src912, src946;
try {
  src912 = fs.readFileSync(path.join(SRC, '912_ObligationEngine.js'), 'utf8');
  src946 = fs.readFileSync(path.join(SRC, '946_OperatorConsoleServer.js'), 'utf8');
  require(path.join(SRC, 'GasShim.js'));
} catch (e) { check('912, 946 and GasShim.js can be read from ' + SRC, false, e.message); finish(); }
console.log('912_ObligationEngine.js        sha256', sha256(src912));
console.log('946_OperatorConsoleServer.js   sha256', sha256(src946));
const t0 = fresh(SRC);
['parsePositiveAmount_', 'isRealIsoDate_', 'malaysiaTodayIso_', 'recordPayment', 'console_recordPayment'].forEach(function (n) {
  check(n + ' exists in the loaded runtime' + (/_$/.test(n) && n !== 'recordPayment' ? ' (S1 must be applied first)' : ''), t0.run('typeof ' + n) === 'function');
});
if (fail > 0) { console.log('\nRequired functions are missing: apply the S1 diffs, then the S2 diffs, to this directory.'); finish(); }
check('clock injection works: Date.now() inside the runtime returns the injected instant',
  withFixed(Date.parse('2026-10-24T16:00:00Z'), 1, function () { return t0.run('Date.now()'); }) === Date.parse('2026-10-24T16:00:00Z'));
check('malaysiaTodayIso_(Date.now()) under the injected clock 2026-10-24T16:00:00Z is 2026-10-25',
  withFixed(Date.parse('2026-10-24T16:00:00Z'), 1, function () { return t0.run('malaysiaTodayIso_(Date.now())'); }) === '2026-10-25');
const recText = extractFn(src912, 'recordPayment');
check('912 recordPayment source is found', recText !== null);
if (recText !== null) {
  const iAmt = recText.indexOf('parsePositiveAmount_(input.paidAmount)'), iDate = recText.indexOf('isRealIsoDate_(input.paidDate)');
  const iRead = recText.indexOf('findOccurrenceRowIndex_(input.occurrenceId)'), iWrite = recText.indexOf('updateOccurrenceFields_(');
  check('SR-3 the amount check and the date check both come BEFORE the Occurrence is read and BEFORE any write',
    iAmt > -1 && iDate > -1 && iRead > -1 && iWrite > -1 && iAmt < iRead && iDate < iRead && iRead < iWrite, [iAmt, iDate, iRead, iWrite].join(','));
  check('D4 compatibility: the engine still falls back to the Occurrence amount when paidAmount is null/undefined',
    recText.indexOf('input.paidAmount != null ? providedAmount : Number(occurrence.Amount)') !== -1);
  check('the default date comes from malaysiaTodayIso_(Date.now()); the script-time-zone default toIsoDate_(new Date()) is gone from recordPayment',
    recText.indexOf('malaysiaTodayIso_(Date.now())') !== -1 && recText.indexOf('toIsoDate_(new Date())') === -1);
}
const consoleText = extractFn(src946, 'console_recordPayment');
check('946 console_recordPayment source is found', consoleText !== null);
if (consoleText !== null) {
  check('SR-4 946 uses the single shared parser parsePositiveAmount_ and has no regex of its own', consoleText.indexOf('parsePositiveAmount_(paidAmount)') !== -1 && !/\/\^\(/.test(consoleText));
  check('946 no longer converts with Number(paidAmount) (a blank amount can no longer become 0)', consoleText.indexOf('Number(paidAmount)') === -1);
  check('946 passes the validated NUMBER to the engine, not the raw text', consoleText.indexOf('paidAmount: amount') !== -1);
}

// ── S-4 ─────────────────────────────────────────────────────────────────────
const MSG_AMT = 'Payment amount must be a number greater than 0.';
const MSG_REQ = 'Payment amount is required.';
const MSG_DATE = 'Payment date must be a valid date (yyyy-MM-dd).';
const INVALID_AMOUNTS = ['', '  ', '\t', 0, '0', '0.00', -5, '-5', '-0', -0, 'abc', '5.', '1e3', '1,200.00', 'RM 5', '+5', '1 2', '.', NaN,
  Infinity, -Infinity, true, false, [], {}, [5], '\u0665', '\uff15', '9'.repeat(400)];
section('S-4 recordPayment — a PROVIDED amount that is not a finite number > 0 is rejected before anything is read or written');
{
  const t = fresh(SRC); const f = t.fixture(); const before = t.snap();
  const r = t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24' });
  check('positive control: a valid payment succeeds and DOES change the sheets (so "unchanged" below is meaningful)', r.ok === true && t.snap() !== before && r.value.alreadyPaid === false);
}
INVALID_AMOUNTS.forEach(function (v) {
  const t = fresh(SRC); const f = t.fixture(); const before = t.snap(), ev = t.events();
  const r = t.pay({ occurrenceId: f.occ, paidAmount: v, paidDate: '2026-10-24' });
  check('amount ' + show(v) + ': rejected with INVALID_INPUT and the exact message', r.ok === false && r.code === 'INVALID_INPUT' && r.message === MSG_AMT, JSON.stringify(r));
  check('amount ' + show(v) + ': no sheet changed, no event published, the Occurrence is still Active',
    t.snap() === before && t.events() === ev && t.occRow(f.occ).Status === 'Active' && t.occRow(f.occ).PaidAmount === '');
});
[[42.5, 42.5], ['42.50', 42.5], [' 0.01 ', 0.01], ['.5', 0.5], [1e6, 1e6], ['007', 7], ['1550.00', 1550]].forEach(function (c) {
  const t = fresh(SRC); const f = t.fixture(); const r = t.pay({ occurrenceId: f.occ, paidAmount: c[0], paidDate: '2026-10-24' });
  const row = r.ok ? t.occRow(f.occ) : null;
  check('amount ' + show(c[0]) + ': accepted; the number ' + c[1] + ' is returned and stored',
    r.ok && r.value.paidAmount === c[1] && typeof r.value.paidAmount === 'number' && row.Status === 'Paid' && row.PaidAmount === c[1], JSON.stringify(r));
});
['omitted', 'undefined', 'null'].forEach(function (how) {
  const t = fresh(SRC); const f = t.fixture({ amount: 42.5 });
  const input = { occurrenceId: f.occ, paidDate: '2026-10-24' };
  if (how === 'undefined') input.paidAmount = undefined;
  if (how === 'null') input.paidAmount = null;
  const r = t.pay(input);
  check('D4 compatibility: paidAmount ' + how + ' falls back to the Occurrence expected amount 42.5 (the engine is NOT strict about a missing amount)',
    r.ok && r.value.paidAmount === 42.5 && t.occRow(f.occ).PaidAmount === 42.5, JSON.stringify(r));
});
{
  const t = fresh(SRC); const f = t.fixture(); const before = t.snap();
  const r = t.pay({ occurrenceId: f.occ, paidAmount: 'abc', paidDate: '2026-02-30' });
  check('both amount and date invalid: the amount error is reported first', r.ok === false && r.message === MSG_AMT && t.snap() === before);
}

// ── S-5 ─────────────────────────────────────────────────────────────────────
section('S-5 recordPayment — blank date = Malaysia day from the injected clock; malformed or unreal date rejected; valid date written as given');
[['2026-10-24T15:59:59Z', '2026-10-24'], ['2026-10-24T16:00:00Z', '2026-10-25'], ['2026-12-31T16:00:00Z', '2027-01-01'],
 ['2028-02-28T16:00:00Z', '2028-02-29'], ['2026-11-07T08:00:00Z', '2026-11-07']].forEach(function (c) {
  ['undefined', 'null', "''", "'   '", "'\\t\\n'"].forEach(function (blank) {
    const t = fresh(SRC); const f = t.fixture(); const input = { occurrenceId: f.occ, paidAmount: 42.5 };
    if (blank === 'null') input.paidDate = null; else if (blank === "''") input.paidDate = ''; else if (blank === "'   '") input.paidDate = '   '; else if (blank === "'\\t\\n'") input.paidDate = '\t\n';
    else if (blank === 'undefined') input.paidDate = undefined;
    const r = withFixed(Date.parse(c[0]), 5, function () { return t.pay(input); });
    check('paidDate ' + blank + ' at ' + c[0] + ' -> ' + c[1] + ' (returned and stored)', r.ok && r.value.paidDate === c[1] && t.occRow(f.occ).PaidDate === c[1], JSON.stringify(r));
  });
});
{
  const t = fresh(SRC); const f = t.fixture();
  const r = withFixed(Date.parse('2026-10-24T16:00:00Z'), 5, function () { return t.pay({ occurrenceId: f.occ, paidAmount: 42.5 }); });
  check('the default no longer follows the sandbox/script time zone: at 2026-10-24T16:00:00Z the day is 2026-10-25 whatever TZ this process uses', r.ok && r.value.paidDate === '2026-10-25');
}
const INVALID_DATES = ['2026-02-30', '2026-13-01', '2026-00-10', '2026-01-00', '2026-04-31', '2100-02-29', 'abc', '2026/10/24', ' 2026-10-24', '2026-10-24 ',
  '2026-10-24T08:00:00Z', '20261024', '2026-1-4', '26-10-24', '2026-10-24\n', '\uff12\uff10\uff12\uff16-10-24', 20261024, 0, false, true, new Date(0), [], {}, ['2026-10-24']];
INVALID_DATES.forEach(function (v) {
  const t = fresh(SRC); const f = t.fixture(); const before = t.snap(), ev = t.events();
  const r = t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: v });
  check('paidDate ' + show(v) + ': rejected with INVALID_INPUT and the exact message', r.ok === false && r.code === 'INVALID_INPUT' && r.message === MSG_DATE, JSON.stringify(r));
  check('paidDate ' + show(v) + ': no sheet changed, no event published, the Occurrence is still Active', t.snap() === before && t.events() === ev && t.occRow(f.occ).Status === 'Active');
});
['2026-02-28', '2028-02-29', '2026-10-24', '2019-01-01', '2030-12-31', '9999-12-31'].forEach(function (d) {
  const t = fresh(SRC); const f = t.fixture(); const r = t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: d });
  check('paidDate ' + d + ' is written as given (past and future dates are not restricted)', r.ok && r.value.paidDate === d && t.occRow(f.occ).PaidDate === d, JSON.stringify(r));
});

// ── S-6 ─────────────────────────────────────────────────────────────────────
section('S-6 console_recordPayment — raw amount checked at the Console boundary; the engine is not called when it is rejected (spy)');
function consoleSpy() {
  const t = fresh(SRC); const calls = [];
  t.ctx.recordPayment = function (input) {
    calls.push({ occurrenceId: input.occurrenceId, paidAmount: input.paidAmount, type: typeof input.paidAmount, paidDate: input.paidDate, note: input.note, keys: Object.keys(input).join(',') });
    return { spy: true };
  };
  return { t: t, calls: calls };
}
{
  const s = consoleSpy(); const r = s.t.consolePay('OCC-1', '42.50', '2026-10-24', 'n');
  check('harness: the spy replaces recordPayment inside the runtime (a valid call reaches it)', r.success === true && r.data.spy === true && s.calls.length === 1);
}
['', '   ', '\t', null, undefined].forEach(function (v) {
  const s = consoleSpy(); const r = s.t.consolePay('OCC-1', v, '2026-10-24', '');
  check('console amount ' + show(v) + ' (missing): {success:false, error:"' + MSG_REQ + '", code:INVALID_INPUT} and the engine is NOT called',
    r.success === false && r.error === MSG_REQ && r.code === 'INVALID_INPUT' && s.calls.length === 0, JSON.stringify(r));
});
['0', '-5', 'abc', '0.00', '5.', '1e3', '1,200.00', 'RM 5', 0, -5, NaN, Infinity, -Infinity, true, false, [], {}, '\uff15'].forEach(function (v) {
  const s = consoleSpy(); const r = s.t.consolePay('OCC-1', v, '2026-10-24', '');
  check('console amount ' + show(v) + ' (illegal): {success:false, error:"' + MSG_AMT + '", code:INVALID_INPUT} and the engine is NOT called',
    r.success === false && r.error === MSG_AMT && r.code === 'INVALID_INPUT' && s.calls.length === 0, JSON.stringify(r));
});
[['42.50', 42.5], [42.5, 42.5], [' 0.01 ', 0.01], ['.5', 0.5], ['1550', 1550]].forEach(function (c) {
  const s = consoleSpy(); const r = s.t.consolePay('OCC-9', c[0], '2026-10-24', '');
  check('console amount ' + show(c[0]) + ': the engine receives the NUMBER ' + c[1],
    r.success === true && s.calls.length === 1 && s.calls[0].paidAmount === c[1] && s.calls[0].type === 'number' && s.calls[0].occurrenceId === 'OCC-9', JSON.stringify(s.calls));
});
['2026-10-24', '', 'not-a-date', undefined, null].forEach(function (d) {
  const s = consoleSpy(); s.t.consolePay('OCC-1', '42.5', d, 'x');
  check('paidDate ' + show(d) + ' is passed through to the engine unchanged (the engine validates it); note is passed', s.calls.length === 1 && s.calls[0].paidDate === d && s.calls[0].note === 'x');
});
{
  const s = consoleSpy(); s.t.consolePay('OCC-1', '42.5', '2026-10-24');
  check('note defaults to an empty string', s.calls[0].note === '' && s.calls[0].keys === 'occurrenceId,paidAmount,paidDate,note');
}
section('S-6 console_recordPayment — end to end through the REAL engine (no spy)');
{
  const t = fresh(SRC); const f = t.fixture(); const before = t.snap();
  const rd = t.consolePay(f.occ, '42.50', '2026-02-30', '');
  check('invalid date through the console: {success:false, code:INVALID_INPUT, error:date message}; nothing written', rd.success === false && rd.code === 'INVALID_INPUT' && rd.error === MSG_DATE && t.snap() === before, JSON.stringify(rd));
  const rb = t.consolePay(f.occ, '', '2026-10-24', '');
  check('blank amount through the console: "' + MSG_REQ + '"; nothing written (it used to become 0)', rb.success === false && rb.error === MSG_REQ && t.snap() === before);
  const ok = t.consolePay(f.occ, '42.50', '2026-10-24', 'paid by bank transfer');
  check('valid call: {success:true, data:{alreadyPaid:false, occurrenceId, paidAmount:42.5, paidDate}}',
    ok.success === true && ok.data.alreadyPaid === false && ok.data.occurrenceId === f.occ && ok.data.paidAmount === 42.5 && ok.data.paidDate === '2026-10-24', JSON.stringify(ok));
  check('the stored Occurrence is Paid with the validated number and date', t.occRow(f.occ).Status === 'Paid' && t.occRow(f.occ).PaidAmount === 42.5 && t.occRow(f.occ).PaidDate === '2026-10-24');
}

// ── S-7 ─────────────────────────────────────────────────────────────────────
section('S-7 regression — idempotency, existing error codes and partial-write behaviour are unchanged');
{
  const t = fresh(SRC); const f = t.fixture();
  const first = t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24' });
  const cnt = t.counts(), ev = t.events(), snap = t.snap();
  const second = t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24' });
  check('second valid call on the same Occurrence: alreadyPaid:true with the first payment\'s date and amount',
    first.ok && second.ok && second.value.alreadyPaid === true && second.value.paidDate === '2026-10-24' && second.value.paidAmount === 42.5, JSON.stringify(second));
  check('second call writes nothing and publishes no event', t.counts() === cnt && t.events() === ev && t.snap() === snap);
  const third = t.pay({ occurrenceId: f.occ, paidAmount: 60, paidDate: '2026-11-01' });
  check('a repeat with a DIFFERENT valid amount and date still returns the ORIGINAL payment (alreadyPaid:true) and writes nothing',
    third.ok && third.value.alreadyPaid === true && third.value.paidAmount === 42.5 && third.value.paidDate === '2026-10-24' && t.snap() === snap);
  const bad = t.pay({ occurrenceId: f.occ, paidAmount: 'abc', paidDate: '2026-10-24' });
  check('DOCUMENTED BEHAVIOUR: an INVALID amount on an already-paid Occurrence is rejected (the checks run before the Occurrence is read), not answered with alreadyPaid',
    bad.ok === false && bad.code === 'INVALID_INPUT' && bad.message === MSG_AMT && t.snap() === snap);
}
{
  const t = fresh(SRC); const f = t.fixture({ endDate: undefined });
  const r = t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24' });
  check('a Monthly auto-generate payment still schedules the next Occurrence', r.ok && !!r.value.nextOccurrenceId && t.rows('ObligationOccurrence').length === 2);
}
{
  const t = fresh(SRC); const f = t.fixture(); t.call('pauseObligation', { obligationId: f.obl, reason: 'x' });
  const r = t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24' });
  check('paying under a Suspended obligation still succeeds and schedules no next Occurrence', r.ok && r.value.nextOccurrenceId === null);
}
{
  const t = fresh(SRC); const f = t.fixture(); t.call('cancelObligation', { obligationId: f.obl, reason: 'x' }); const before = t.snap();
  const r = t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24' });
  check('Cancelled obligation: OBLIGATION_CANCELLED as before, nothing written', r.ok === false && r.code === 'OBLIGATION_CANCELLED' && t.snap() === before);
  const r2 = t.pay({ occurrenceId: f.occ, paidAmount: 'abc', paidDate: '2026-10-24' });
  check('Cancelled obligation + invalid amount: the input check wins (INVALID_INPUT)', r2.ok === false && r2.code === 'INVALID_INPUT' && r2.message === MSG_AMT);
}
{
  const t = fresh(SRC); t.fixture();
  const r1 = t.pay({ occurrenceId: 'OCC-does-not-exist', paidAmount: 42.5, paidDate: '2026-10-24' });
  check('unknown Occurrence with valid input: OCCURRENCE_NOT_FOUND as before', r1.ok === false && r1.code === 'OCCURRENCE_NOT_FOUND');
  const r2 = t.pay({ paidAmount: 42.5, paidDate: '2026-10-24' });
  check('missing occurrenceId: INVALID_INPUT "recordPayment requires occurrenceId." as before', r2.ok === false && r2.code === 'INVALID_INPUT' && r2.message === 'recordPayment requires occurrenceId.');
  const r3 = t.pay({ paidAmount: 'abc', paidDate: 'x' });
  check('missing occurrenceId + invalid amount/date: the occurrenceId error still comes first', r3.ok === false && r3.message === 'recordPayment requires occurrenceId.');
}
{
  const t = fresh(SRC); const f = t.fixture(); const before = t.snap();
  const r = t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24', paidVia: 'NoSuchVia' });
  check('unknown paidVia: INVALID_INPUT as before, nothing written', r.ok === false && r.code === 'INVALID_INPUT' && /Unknown paidVia/.test(r.message) && t.snap() === before);
}
{
  const t = fresh(SRC); const f = t.fixture();
  t.ctx.appendObligationHistory_ = function () { throw new Error('boom: history'); };
  const r = t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24' });
  check('partial write (History fails after the Truth write): the error is re-thrown, the Occurrence is left Paid, a PARTIAL FAILURE line is logged (unchanged behaviour)',
    r.ok === false && r.message === 'boom: history' && t.occRow(f.occ).Status === 'Paid' && t.partialFailures() === 1);
}
{
  const t = fresh(SRC); const f = t.fixture();
  t.ctx.publishPropertyEvent_ = function () { throw new Error('boom: event'); };
  const r = t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24' });
  check('partial write (event publish fails after the Truth write): same unchanged behaviour', r.ok === false && r.message === 'boom: event' && t.occRow(f.occ).Status === 'Paid' && t.partialFailures() === 1);
}
{
  const t = fresh(SRC); const f = t.fixture();
  t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24' }); t.call('reversePayment', { occurrenceId: f.occ, reason: 'x' });
  const r = t.pay({ occurrenceId: f.occ, paidAmount: 40, paidDate: '2026-10-25' });
  check('pay, reverse, pay again still works and records the new amount and date', r.ok && r.value.alreadyPaid === false && t.occRow(f.occ).PaidAmount === 40 && t.occRow(f.occ).PaidDate === '2026-10-25');
}

// ── F: real responses through S1's interpretPayResponse_ ───────────────────
section('F. The real server responses, classified by the S1 function interpretPayResponse_ (945)');
{
  var html945 = null; try { html945 = fs.readFileSync(path.join(SRC, '945_OperatorConsole.html'), 'utf8'); } catch (e) { /* optional */ }
  const sm = html945 && html945.match(/<script>([\s\S]*?)<\/script>/);
  const names = ['formatAmount', 'parsePayAmount_', 'interpretPayResponse_'];
  const texts = sm ? names.map(function (n) { return extractFn(sm[1], n); }) : [];
  if (!sm || texts.some(function (x) { return x === null; })) {
    console.log('SKIP : 945 with the S1 functions was not found in ' + SRC + ' (group F is not counted)');
  } else {
    const uiCtx = vm.createContext({}); vm.runInContext(texts.join('\n\n'), uiCtx);
    const interpret = function (res, entered) { return JSON.parse(JSON.stringify(uiCtx.interpretPayResponse_(res, entered))); };
    const containsDate = function (v, seen) {
      seen = seen || new Set(); if (v instanceof Date) return true;
      if (v && typeof v === 'object') { if (seen.has(v)) return false; seen.add(v); return Object.keys(v).some(function (k) { return containsDate(v[k], seen); }); }
      return false;
    };
    const t = fresh(SRC); const f = t.fixture();
    const r1 = t.consolePay(f.occ, '42.50', '2026-10-24', '');
    check('new payment response -> kind recorded, "Payment recorded."', JSON.stringify(interpret(r1, { amount: '42.50', date: '2026-10-24' })) === JSON.stringify({ kind: 'recorded', message: 'Payment recorded.', isError: false }));
    check('new payment response contains no Date object (google.script.run would hand the browser null for such a response)', !containsDate(r1));
    const r2 = t.consolePay(f.occ, '42.50', '2026-10-24', '');
    check('repeat of the same payment -> kind alreadySame with the stored date and amount', interpret(r2, { amount: '42.50', date: '2026-10-24' }).kind === 'alreadySame' &&
      interpret(r2, { amount: '42.50', date: '2026-10-24' }).message === 'Already recorded: paid on 2026-10-24 for RM 42.50. Nothing was changed.', JSON.stringify(interpret(r2, { amount: '42.50', date: '2026-10-24' })));
    check('already-paid response contains no Date object', !containsDate(r2));
    check('repeat with another amount -> kind alreadyDifferent (error style, "NOT saved")', interpret(r2, { amount: '60', date: '2026-10-24' }).kind === 'alreadyDifferent' && interpret(r2, { amount: '60', date: '2026-10-24' }).isError === true);
    check('repeat with another date -> kind alreadyDifferent', interpret(r2, { amount: '42.50', date: '2026-10-25' }).kind === 'alreadyDifferent');
    check('repeat with the date left blank -> only the amount is compared: alreadySame', interpret(r2, { amount: '42.50', date: '' }).kind === 'alreadySame');
    const re = t.consolePay(f.occ, '42.50', '2026-02-30', '');
    const ie = interpret(re, { amount: '42.50', date: '2026-02-30' });
    check('a rejected payment (invalid date) -> kind error, message = the server text, error style', ie.kind === 'error' && ie.message === MSG_DATE && ie.isError === true, JSON.stringify(ie));
    check('SIMULATION ONLY: the server returns paidDate as text and paidAmount as a number in this shim; the real google.script.run shapes are unverified (REAL-5 / VT-08)', typeof r2.data.paidDate === 'string' && typeof r2.data.paidAmount === 'number');
  }
}

// ── G: differential ─────────────────────────────────────────────────────────
section('G. Differential: the same VALID-input scenarios on the tree before S2 and on this tree must give identical transcripts');
if (!BASE) {
  console.log('SKIP : no --base directory given (group G is not counted)');
} else {
  const NOW = Date.parse('2026-10-24T08:00:00Z');
  const normalise = function (s) { return s.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, 'TS'); };
  const SCEN = [
    ['pay: number amount + date', function (t, f, out) { out.push(t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24' })); }],
    ['pay: string amount "42.50" + date', function (t, f, out) { out.push(t.pay({ occurrenceId: f.occ, paidAmount: '42.50', paidDate: '2026-10-24' })); }],
    ['pay: string amount ".5" + date', function (t, f, out) { out.push(t.pay({ occurrenceId: f.occ, paidAmount: '.5', paidDate: '2026-10-24' })); }],
    ['pay: amount omitted (fallback)', function (t, f, out) { out.push(t.pay({ occurrenceId: f.occ, paidDate: '2026-10-24' })); }],
    ['pay: amount null (fallback)', function (t, f, out) { out.push(t.pay({ occurrenceId: f.occ, paidAmount: null, paidDate: '2026-10-24' })); }],
    ['pay: with note, evidence and paidVia', function (t, f, out) { out.push(t.pay({ occurrenceId: f.occ, paidAmount: 40, paidDate: '2026-10-20', note: 'n', evidence: 'e', paidVia: 'Manual' })); }],
    ['pay twice (second is alreadyPaid)', function (t, f, out) { out.push(t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24' })); out.push(t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24' })); }],
    ['pay after pause', function (t, f, out) { t.call('pauseObligation', { obligationId: f.obl, reason: 'x' }); out.push(t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24' })); }],
    ['pay on a cancelled obligation', function (t, f, out) { t.call('cancelObligation', { obligationId: f.obl, reason: 'x' }); out.push(t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24' })); }],
    ['unknown occurrence', function (t, f, out) { out.push(t.pay({ occurrenceId: 'OCC-nope', paidAmount: 42.5, paidDate: '2026-10-24' })); }],
    ['missing occurrenceId', function (t, f, out) { out.push(t.pay({ paidAmount: 42.5, paidDate: '2026-10-24' })); }],
    ['wrong id prefix', function (t, f, out) { out.push(t.pay({ occurrenceId: 'OBL-x', paidAmount: 42.5, paidDate: '2026-10-24' })); }],
    ['unknown paidVia', function (t, f, out) { out.push(t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24', paidVia: 'NoSuchVia' })); }],
    ['partial write: History throws', function (t, f, out) { t.ctx.appendObligationHistory_ = function () { throw new Error('boom: history'); }; out.push(t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24' })); }],
    ['partial write: event publish throws', function (t, f, out) { t.ctx.publishPropertyEvent_ = function () { throw new Error('boom: event'); }; out.push(t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24' })); }],
    ['pay, reverse, pay again', function (t, f, out) { out.push(t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: '2026-10-24' })); out.push(t.call('reversePayment', { occurrenceId: f.occ, reason: 'x' })); out.push(t.pay({ occurrenceId: f.occ, paidAmount: 40, paidDate: '2026-10-25' })); }],
    ['console: valid string amount + date', function (t, f, out) { out.push(t.consolePay(f.occ, '42.50', '2026-10-24', '')); }],
    ['console: valid, with note, then the same again', function (t, f, out) { out.push(t.consolePay(f.occ, '42.5', '2026-10-24', 'note')); out.push(t.consolePay(f.occ, '42.5', '2026-10-24', 'note')); }],
    ['console: unknown occurrence', function (t, f, out) { out.push(t.consolePay('OCC-nope', '42.5', '2026-10-24', '')); }]
  ];
  const transcript = function (dir, scen) {
    return withFixed(NOW, 7, function () {
      const t = fresh(dir); const f = t.fixture(); const out = [];
      scen[1](t, f, out);
      return normalise(JSON.stringify({ out: out, snap: JSON.parse(t.snap()), logs: t.logs }));
    });
  };
  SCEN.forEach(function (scen) {
    var a, b, err = null;
    try { a = transcript(BASE, scen); b = transcript(SRC, scen); } catch (e) { err = e.message; }
    check('identical transcript (results, all sheets, log) before and after S2: ' + scen[0], err === null && a === b && a.length > 100, err || (a === b ? 'transcript too short' : 'DIFFERENT'));
  });
  {
    const probe = SCEN[0]; const a = transcript(BASE, probe);
    check('the differential is not vacuous: the transcript records the payment itself (a row whose Status is exactly "Paid", amount 42.5, date 2026-10-24)',
      a.indexOf('"Paid"') !== -1 && a.indexOf('42.5') !== -1 && a.indexOf('2026-10-24') !== -1);
  }
  {
    // intended differences are NOT part of the comparison: a blank date (script-time-zone day -> Malaysia day) and invalid inputs (accepted -> rejected)
    const tb = fresh(BASE), fb = tb.fixture();
    const oldBlank = withFixed(Date.parse('2026-10-24T16:00:00Z'), 5, function () { return tb.pay({ occurrenceId: fb.occ, paidAmount: 42.5 }); });
    const tn = fresh(SRC), fn = tn.fixture();
    const newBlank = withFixed(Date.parse('2026-10-24T16:00:00Z'), 5, function () { return tn.pay({ occurrenceId: fn.occ, paidAmount: 42.5 }); });
    console.log('      intended difference, blank date at 2026-10-24T16:00:00Z: before S2 -> ' + (oldBlank.ok ? oldBlank.value.paidDate : oldBlank.message) + ' (old default = new Date() in the script time zone; it ignores the injected instant) | after S2 -> ' + (newBlank.ok ? newBlank.value.paidDate : newBlank.message) + ' (Malaysia day)');
    const tb2 = fresh(BASE), fb2 = tb2.fixture(); const oldBad = tb2.pay({ occurrenceId: fb2.occ, paidAmount: 'abc', paidDate: '2026-10-24' });
    console.log('      intended difference, amount "abc": before S2 -> ' + (oldBad.ok ? 'accepted, PaidAmount stored as ' + show(oldBad.value.paidAmount) : oldBad.message) + ' | after S2 -> rejected (INVALID_INPUT)');
    const tb3 = fresh(BASE), fb3 = tb3.fixture(); const oldBlankAmt = tb3.consolePay(fb3.occ, '', '2026-10-24', '');
    console.log('      intended difference, console blank amount: before S2 -> ' + (oldBlankAmt.success ? 'accepted, PaidAmount stored as ' + show(oldBlankAmt.data.paidAmount) + ' (Number("") is 0)' : oldBlankAmt.error) + ' | after S2 -> rejected: "Payment amount is required."');
    check('the intended differences really exist (so the groups above test something): blank-date default differs, "abc" was accepted before S2, and a blank console amount was recorded as 0 before S2',
      newBlank.ok && newBlank.value.paidDate === '2026-10-25' && oldBad.ok === true && oldBlankAmt.success === true && oldBlankAmt.data.paidAmount === 0);
  }

  // ── H: before/after for the INVALID inputs of S-4 and S-5 (informational) ──
  section('H. What the tree BEFORE S2 did with the invalid amounts and dates of S-4 / S-5 (printed for the audit trail)');
  const fmtOut = function (r, field) {
    return r.ok ? 'ACCEPTED, ' + field + ' became ' + show(field === 'amount' ? r.value.paidAmount : r.value.paidDate) : 'rejected ' + r.code + ' "' + r.message + '"';
  };
  var accAmt = 0, accDate = 0;
  INVALID_AMOUNTS.forEach(function (v) {
    const t = fresh(BASE); const f = t.fixture();
    const r = withFixed(Date.parse('2026-10-24T08:00:00Z'), 3, function () { return t.pay({ occurrenceId: f.occ, paidAmount: v, paidDate: '2026-10-24' }); });
    if (r.ok) accAmt++;
    console.log('      before S2, amount ' + show(v) + ': ' + fmtOut(r, 'amount') + '   | after S2: rejected');
  });
  INVALID_DATES.forEach(function (v) {
    const t = fresh(BASE); const f = t.fixture();
    const r = withFixed(Date.parse('2026-10-24T08:00:00Z'), 3, function () { return t.pay({ occurrenceId: f.occ, paidAmount: 42.5, paidDate: v }); });
    if (r.ok) accDate++;
    console.log('      before S2, date ' + show(v) + ': ' + fmtOut(r, 'date') + '   | after S2: rejected');
  });
  check('H. before S2 the tree ACCEPTED ' + accAmt + ' of the ' + INVALID_AMOUNTS.length + ' invalid amounts and ' + accDate + ' of the ' + INVALID_DATES.length + ' invalid dates (the new checks close real gaps)', accAmt > 0 && accDate > 0);
}

finish();
