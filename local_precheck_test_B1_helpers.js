// local_precheck_test_B1_helpers.js
//
// B1 S1 CANDIDATE TEST — a NEW file. Not part of any repository yet, not applied anywhere.
// Specification: B1_implementation_plan_v2.md §2.1 (C1, C4a), §4.1 (B1-1 .. B1-3), §6.2 (S-1, S-2, S-3, S-8).
// Approved by the 2026-11-06 S0 text (D1, D2, D3, D5, D10 plan A, D11, D12; D4 conditional).
//
// What it is: Node `vm`, the same technique local_precheck_test_948_search.js uses. The pure functions are cut
// out of 912_ObligationEngine.js and out of the single inline <script> of 945_OperatorConsole.html and called
// directly. No fake DOM, no GAS shim, no Sheets, no google.script.run (D10 plan A). The test only READS the two
// source files; nothing is written or modified.
//
// What it is NOT: not a browser, not Apps Script, not real GAS. It shows the behaviour of the pure functions
// inside this model only. S-13 (Pay form click path) and REAL-1 .. REAL-6 remain blocked.
//
// Usage:  node local_precheck_test_B1_helpers.js [DIR]
//         DIR holds the PATCHED 912_ObligationEngine.js and 945_OperatorConsole.html
//         (default: env B1_SRC_DIR, else this file's own directory).
//         --no-s1-guard  skip the "S1 SCOPE GUARD" group. Use it once S2/S3 intentionally wire the helpers into
//                        recordPayment / the Pay form; the guard exists only to prove S1 wired nothing.
// Exit code 0 = every check passed, 1 = at least one failed.

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const crypto = require('crypto');

const argv = process.argv.slice(2);
const SKIP_GUARD = argv.indexOf('--no-s1-guard') !== -1;
const dirArg = argv.filter(function (a) { return a.indexOf('--') !== 0; })[0];
const SRC_DIR = path.resolve(dirArg || process.env.B1_SRC_DIR || __dirname);

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

// ── Load ────────────────────────────────────────────────────────────────────
section('Load: sources and the S1 functions');
console.log('node', process.version, '| source dir:', SRC_DIR);
var src912, html945;
try {
  src912 = fs.readFileSync(path.join(SRC_DIR, '912_ObligationEngine.js'), 'utf8');
  html945 = fs.readFileSync(path.join(SRC_DIR, '945_OperatorConsole.html'), 'utf8');
} catch (e) { check('912 and 945 can be read from ' + SRC_DIR, false, e.message); finish(); }
console.log('912_ObligationEngine.js   sha256', sha256(src912));
console.log('945_OperatorConsole.html  sha256', sha256(html945));
check('945 has exactly one "<script" (the existing UI test requires this)', (html945.match(/<script/g) || []).length === 1);
const sm = html945.match(/<script>([\s\S]*?)<\/script>/);
check('945 inline <script> block found', !!sm);
if (!sm) finish();
const js945 = sm[1];
var ok912 = true, ok945 = true;
try { new vm.Script(src912); } catch (e) { ok912 = false; console.log(e.message); }
try { new vm.Script(js945); } catch (e) { ok945 = false; console.log(e.message); }
check('912 compiles (syntax only)', ok912);
check('945 <script> compiles (syntax only)', ok945);

function extractFn(src, name) {          // top-level function: from "function NAME(" at column 0 to the next "\n}\n"
  const m = new RegExp('^function ' + name + '\\s*\\(', 'm').exec(src);
  if (!m) return null;
  const end = src.indexOf('\n}\n', m.index);
  return end === -1 ? null : src.slice(m.index, end + 2);
}
const ENG_NAMES = ['malaysiaTodayIso_', 'parsePositiveAmount_', 'isRealIsoDate_'];
const UI_NAMES = ['malaysiaTodayIso_', 'parsePayAmount_', 'isRealIsoDate_', 'interpretPayResponse_'];
const engText = {}, uiText = {};
ENG_NAMES.forEach(function (n) { engText[n] = extractFn(src912, n); check('912 defines ' + n, engText[n] !== null); });
UI_NAMES.forEach(function (n) { uiText[n] = extractFn(js945, n); check('945 defines ' + n, uiText[n] !== null); });
const fmtText = extractFn(js945, 'formatAmount');
check('945 defines formatAmount (existing helper that interpretPayResponse_ uses for "RM <amount>")', fmtText !== null);
if (fail > 0) { console.log('\nRequired functions are missing: the S1 patch is not applied in this directory.'); finish(); }

function mkCtx(texts) { const ctx = vm.createContext({}); vm.runInContext(texts.join('\n\n'), ctx); return ctx; }
const eng = mkCtx(ENG_NAMES.map(function (n) { return engText[n]; }));
const ui = mkCtx([fmtText].concat(UI_NAMES.map(function (n) { return uiText[n]; })));
function stripComments(t) { return t.split('\n').filter(function (l) { return !/^\s*(\/\/|\/\*|\*)/.test(l); }).join('\n'); }

// ── SR-4 / SR-5 / SR-8 static properties of the new functions ───────────────
section('SR-4 same rules in 945 and 912 (comments stripped, name normalised) | SR-5 / SR-8 purity of the text');
check('SR-4 malaysiaTodayIso_: 945 copy is character-identical to 912',
  stripComments(uiText.malaysiaTodayIso_) === stripComments(engText.malaysiaTodayIso_));
check('SR-4 parsePayAmount_ (945) is character-identical to parsePositiveAmount_ (912) after renaming',
  stripComments(uiText.parsePayAmount_).replace(/parsePayAmount_/g, 'parsePositiveAmount_') === stripComments(engText.parsePositiveAmount_));
check('SR-4 isRealIsoDate_: 945 copy is character-identical to 912',
  stripComments(uiText.isRealIsoDate_) === stripComments(engText.isRealIsoDate_));
const SERVER_API = /\b(Utilities|Session|SpreadsheetApp|Logger|PropertiesService|CacheService|LockService)\b/;
const LOCAL_TIME = /\.get(FullYear|Month|Date|Day|Hours|Minutes|Seconds|Milliseconds|TimezoneOffset)\(|\btoLocale|\bIntl\b/;
ENG_NAMES.forEach(function (n) {
  const t = stripComments(engText[n]);
  check('SR-5 912 ' + n + ' uses no Sheets/Utilities/Session API and no local-time or locale API', !SERVER_API.test(t) && !LOCAL_TIME.test(t));
});
const DOM_API = /\b(document|window|google|innerHTML|outerHTML|showToast|getElementById|querySelector|localStorage|sessionStorage|state)\b/;
['malaysiaTodayIso_', 'parsePayAmount_', 'isRealIsoDate_', 'interpretPayResponse_'].forEach(function (n) {
  const t = stripComments(uiText[n]);
  check('SR-8 945 ' + n + ' touches no DOM, google.script.run, storage or shared state, and has no local-time API', !DOM_API.test(t) && !LOCAL_TIME.test(t));
});

// ── S-1 amount ──────────────────────────────────────────────────────────────
const AMOUNT_ACCEPT = [
  [42.5, 42.5], ['42.50', 42.5], [' 0.01 ', 0.01], ['.5', 0.5], [1e6, 1e6],
  ['1', 1], ['007', 7], ['0.50', 0.5], ['\t5\n', 5], ['\u00a05', 5], ['1500', 1500], ['1550.00', 1550],
  ['1234567890.123456', 1234567890.123456], [Number.MIN_VALUE, Number.MIN_VALUE], [Number.MAX_VALUE, Number.MAX_VALUE],
  [1e-7, 1e-7], ['0.0000001', 1e-7]
];
const AMOUNT_REJECT = [
  '', '  ', '\n', '\t', '\u00a0', null, undefined, NaN, Infinity, -Infinity, 0, '0', '0.00', '00', '.0', -5, '-5', '-0', -0,
  '5.', '1e3', '1E3', '1,200.00', 'RM 5', '5 RM', '+5', '--5', '5 5', '.', '..5', '5..', '1_000', '0x10', 'Infinity', 'NaN',
  '\uff15', '\u0665', true, false, [], {}, [5], ['5'], { valueOf: function () { return 5; } }, new Number(5),
  function () {}, Symbol('x'), BigInt(5), '9'.repeat(400), '0.' + '0'.repeat(400) + '1'
];
const impls = [['912 parsePositiveAmount_', function (x) { return eng.parsePositiveAmount_(x); }],
               ['945 parsePayAmount_', function (x) { return ui.parsePayAmount_(x); }]];
section('S-1 amount — plan matrix + extra cases, run on BOTH implementations');
impls.forEach(function (impl) {
  AMOUNT_ACCEPT.forEach(function (c) {
    var r; try { r = impl[1](c[0]); } catch (e) { r = 'THREW ' + e.message; }
    check(impl[0] + ' accepts ' + show(c[0]) + ' -> ' + show(c[1]), Object.is(r, c[1]), 'got ' + show(r));
  });
  AMOUNT_REJECT.forEach(function (v) {
    var r; try { r = impl[1](v); } catch (e) { r = 'THREW ' + e.message; }
    check(impl[0] + ' rejects ' + show(v), r === null, 'got ' + show(r));
  });
});

section('S-1 amount — 912 vs 945 agree on generated inputs (fixed seed)');
{
  const rnd = lcg(20261106);
  const ALPHA = '0123456789.,-+eE xX\t\nRM';
  const gen = [];
  for (var i = 0; i < 30000; i++) { var n = Math.floor(rnd() * 9), s = ''; for (var j = 0; j < n; j++) s += ALPHA[Math.floor(rnd() * ALPHA.length)]; gen.push(s); }
  for (i = 0; i < 6000; i++) gen.push((rnd() - 0.5) * Math.pow(10, Math.floor(rnd() * 40) - 20));
  gen.push(0.1 + 0.2, 1 / 3, 2 / 3, 123456789012345680000, 5e-324, 1.7976931348623157e308, 0.000001, 1e21, 1e-7);
  const bad = []; var plain = 0;
  gen.forEach(function (x) {
    const a = eng.parsePositiveAmount_(x), b = ui.parsePayAmount_(x);
    if (!Object.is(a, b)) bad.push(show(x) + ' 912=' + show(a) + ' 945=' + show(b));
    if (!(a === null || (typeof a === 'number' && isFinite(a) && a > 0))) bad.push('range violated for ' + show(x));
    if (typeof x === 'string' && /^\d+$/.test(x.trim()) && Number(x.trim()) > 0 && isFinite(Number(x.trim()))) {
      plain++; if (a !== Number(x.trim())) bad.push('plain integer string not accepted: ' + show(x));
    }
  });
  check('S-1 912 and 945 agree on ' + gen.length + ' generated inputs; every result is null or a finite number > 0; ' +
    plain + ' plain-integer strings are accepted', bad.length === 0, bad.slice(0, 3).join(' | '));
}

// ── S-2 malaysiaTodayIso_ ───────────────────────────────────────────────────
section('S-2 malaysiaTodayIso_ (fixed UTC+8) — plan table, edges, invalid input, independent Intl oracle');
const KL = [
  ['2026-10-24T15:59:59Z', '2026-10-24'], ['2026-10-24T16:00:00Z', '2026-10-25'], ['2026-10-24T23:59:59Z', '2026-10-25'],
  ['2026-10-25T00:00:00Z', '2026-10-25'], ['2026-12-31T16:00:00Z', '2027-01-01'], ['2028-02-28T16:00:00Z', '2028-02-29'],
  ['2028-02-29T16:00:00Z', '2028-03-01'], ['2026-12-31T15:59:59.999Z', '2026-12-31'], ['1970-01-01T00:00:00Z', '1970-01-01'],
  ['1969-12-31T16:00:00Z', '1970-01-01'], ['9999-12-31T15:59:59.999Z', '9999-12-31'], ['0000-01-01T00:00:00Z', '0000-01-01']
];
[['912', eng], ['945', ui]].forEach(function (p) {
  KL.forEach(function (c) {
    const r = p[1].malaysiaTodayIso_(Date.parse(c[0]));
    check(p[0] + ' malaysiaTodayIso_(' + c[0] + ') = ' + c[1], r === c[1], 'got ' + show(r));
  });
  const BAD = [NaN, Infinity, -Infinity, '2026-10-24', null, undefined, {}, [], true, 8.64e15, -8.64e15,
    Date.parse('9999-12-31T16:00:00Z'), -62167219200001 - 8 * 3600 * 1000];
  BAD.forEach(function (v) {
    var r; try { r = p[1].malaysiaTodayIso_(v); } catch (e) { r = 'THREW ' + e.message; }
    check(p[0] + ' malaysiaTodayIso_(' + show(v) + ') = null (no throw)', r === null, 'got ' + show(r));
  });
  check(p[0] + ' malaysiaTodayIso_(Date.now()) is a yyyy-MM-dd string', /^\d{4}-\d{2}-\d{2}$/.test(p[1].malaysiaTodayIso_(Date.now())));
});
{
  var oracleOk = true, fmt;
  try { fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }); fmt.format(new Date(0)); }
  catch (e) { oracleOk = false; }
  if (!oracleOk) { console.log('SKIP : Intl oracle for Asia/Kuala_Lumpur is unavailable in this Node build (not counted as pass or fail)'); }
  else {
    const oracle = function (ts) {
      const parts = fmt.formatToParts(new Date(ts)); const g = function (t) { return parts.filter(function (p) { return p.type === t; })[0].value; };
      return g('year') + '-' + g('month') + '-' + g('day');
    };
    const bad = []; var n = 0;
    const start = Date.UTC(1990, 0, 1) - 8 * 3600 * 1000, stop = Date.UTC(2100, 0, 1);
    for (var t = start; t < stop; t += 86400000) {            // every Malaysian local midnight, 1ms before and at it
      [t - 1, t].forEach(function (x) {
        n++; const o = oracle(x), a = eng.malaysiaTodayIso_(x), b = ui.malaysiaTodayIso_(x);
        if (a !== o || b !== o) bad.push(new Date(x).toISOString() + ' oracle=' + o + ' 912=' + a + ' 945=' + b);
      });
    }
    const rnd = lcg(7);
    for (var k = 0; k < 60000; k++) {
      const x = Math.floor(Date.UTC(1990, 0, 1) + rnd() * (Date.UTC(2100, 0, 1) - Date.UTC(1990, 0, 1)));
      n++; const o = oracle(x), a = eng.malaysiaTodayIso_(x), b = ui.malaysiaTodayIso_(x);
      if (a !== o || b !== o) bad.push(new Date(x).toISOString() + ' oracle=' + o + ' 912=' + a + ' 945=' + b);
    }
    check('S-2 912 and 945 equal Intl(Asia/Kuala_Lumpur) on ' + n + ' instants in 1990-2100 (all local midnights ±1ms + 60000 random)', bad.length === 0, bad.slice(0, 3).join(' | '));
  }
}

// ── S-3 isRealIsoDate_ ──────────────────────────────────────────────────────
section('S-3 isRealIsoDate_ — plan matrix, edges, independent calendar oracle (both implementations)');
const DATE_ACCEPT = ['2026-02-28', '2028-02-29', '2000-02-29', '2026-12-31', '2026-01-01', '9999-12-31', '0001-01-01', '0000-01-01', '0050-06-15'];
const DATE_REJECT = ['2026-02-30', '2026-13-01', 'abc', '2026/10/24', '', ' 2026-10-24', '2026-10-24 ', '2026-10-24T08:00:00Z', '2026-10-24\n',
  '2026-10-4', '26-10-24', '2026-1-04', '2026-00-10', '2026-01-00', '2026-04-31', '2100-02-29', '1900-02-29', '2026-02-29',
  '\uff12\uff10\uff12\uff16-10-24', '2026\u201310\u201324', '2026-10-24Z', '20261024',
  null, undefined, 20261024, new Date(0), ['2026-10-24'], { toString: function () { return '2026-10-24'; } }, true];
[['912', eng], ['945', ui]].forEach(function (p) {
  DATE_ACCEPT.forEach(function (v) { check(p[0] + ' isRealIsoDate_ accepts ' + show(v), p[1].isRealIsoDate_(v) === true); });
  DATE_REJECT.forEach(function (v) {
    var r; try { r = p[1].isRealIsoDate_(v); } catch (e) { r = 'THREW ' + e.message; }
    check(p[0] + ' isRealIsoDate_ rejects ' + show(v), r === false, 'got ' + show(r));
  });
});
{
  const pad = function (n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; };
  const leap = function (y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; };
  const dim = function (y, m) { return [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; };
  const bad = []; var n = 0;
  for (var y = 1900; y <= 2100; y++) for (var m = 0; m <= 13; m++) {
    const days = (m >= 1 && m <= 12) ? [0, 1, 2, 15, 27, 28, 29, 30, 31, 32, 33] : [0, 1, 15, 28, 31, 32];
    days.forEach(function (d) {
      const s = pad(y, 4) + '-' + pad(m, 2) + '-' + pad(d, 2);
      const expect = m >= 1 && m <= 12 && d >= 1 && d <= dim(y, m);
      n++; const a = eng.isRealIsoDate_(s), b = ui.isRealIsoDate_(s);
      if (a !== expect || b !== expect) bad.push(s + ' expect=' + expect + ' 912=' + a + ' 945=' + b);
    });
  }
  check('S-3 912 and 945 agree with an independent leap-year/month-length oracle on ' + n + ' strings (years 1900-2100, months 0-13, days 0-33)', bad.length === 0, bad.slice(0, 3).join(' | '));
}

// ── S-8 interpretPayResponse_ ───────────────────────────────────────────────
section('S-8 interpretPayResponse_ — plan response matrix (945)');
const R = function (res, entered) { return ui.interpretPayResponse_(res, entered); };
const MSG = {
  recorded: 'Payment recorded.',
  unconfirmed: 'Payment result could not be confirmed.',
  unreadable: 'Already recorded earlier. The recorded amount or date could not be read.',
  same: 'Already recorded: paid on 2026-10-27 for RM 42.50. Nothing was changed.',
  different: 'This bill was already paid on 2026-10-27 for RM 42.50. The amount or date you entered was NOT saved.'
};
const E_OK = { amount: '42.5', date: '2026-10-27' };
function expectR(label, r, kind, message, isError) {
  check(label + ' -> ' + kind, r.kind === kind && r.message === message && r.isError === isError,
    'got ' + JSON.stringify(r));
}
[null, undefined, 'ok', 42, true, [], function () {}].forEach(function (v) {
  expectR('res=' + show(v), R(v, E_OK), 'unconfirmed', MSG.unconfirmed, true);
});
expectR('res={}', R({}, E_OK), 'unconfirmed', MSG.unconfirmed, true);
expectR("res={success:'true'}", R({ success: 'true' }, E_OK), 'unconfirmed', MSG.unconfirmed, true);
expectR('res={success:1}', R({ success: 1 }, E_OK), 'unconfirmed', MSG.unconfirmed, true);
expectR("res={success:false, error:'x'} (left to the existing branch; text unchanged)", R({ success: false, error: 'x' }, E_OK), 'error', 'x', true);
expectR('res={success:false} (no error text)', R({ success: false }, E_OK), 'error', '', true);
expectR('res={success:false, data:{alreadyPaid:false, occurrenceId:"OCC-1"}} (success:false wins)', R({ success: false, error: 'e', data: { alreadyPaid: false, occurrenceId: 'OCC-1' } }, E_OK), 'error', 'e', true);
[undefined, null, 'x', [], 42].forEach(function (d) {
  expectR('res={success:true, data:' + show(d) + '}', R({ success: true, data: d }, E_OK), 'unconfirmed', MSG.unconfirmed, true);
});
expectR('res={success:true, data:{}}', R({ success: true, data: {} }, E_OK), 'unconfirmed', MSG.unconfirmed, true);
expectR("data={alreadyPaid:'false', occurrenceId:'OCC-1'} (alreadyPaid is a string)", R({ success: true, data: { alreadyPaid: 'false', occurrenceId: 'OCC-1' } }, E_OK), 'unconfirmed', MSG.unconfirmed, true);
expectR('data={alreadyPaid:false} (no occurrenceId)', R({ success: true, data: { alreadyPaid: false } }, E_OK), 'unconfirmed', MSG.unconfirmed, true);
['', '  ', 5, null].forEach(function (o) {
  expectR('data={alreadyPaid:false, occurrenceId:' + show(o) + '}', R({ success: true, data: { alreadyPaid: false, occurrenceId: o } }, E_OK), 'unconfirmed', MSG.unconfirmed, true);
});
expectR('data={alreadyPaid:false, occurrenceId:"OCC-1", paidAmount:42.5, paidDate:"2026-10-27"} (the only recorded case)',
  R({ success: true, data: { alreadyPaid: false, occurrenceId: 'OCC-1', paidAmount: 42.5, paidDate: '2026-10-27' } }, E_OK), 'recorded', MSG.recorded, false);
expectR('data={alreadyPaid:false, occurrenceId:"OCC-1"} (amount/date not required for recorded)',
  R({ success: true, data: { alreadyPaid: false, occurrenceId: 'OCC-1' } }, undefined), 'recorded', MSG.recorded, false);
const PAID = { success: true, data: { alreadyPaid: true, paidAmount: 42.5, paidDate: '2026-10-27' } };
expectR('alreadyPaid, entered 42.5 + same day', R(PAID, E_OK), 'alreadySame', MSG.same, false);
expectR('alreadyPaid, entered "42.50" + same day', R(PAID, { amount: '42.50', date: '2026-10-27' }), 'alreadySame', MSG.same, false);
expectR('alreadyPaid, entered 42.5 (number) + same day', R(PAID, { amount: 42.5, date: '2026-10-27' }), 'alreadySame', MSG.same, false);
expectR('alreadyPaid, entered date left blank -> amount only is compared', R(PAID, { amount: '42.5', date: '' }), 'alreadySame', MSG.same, false);
expectR('alreadyPaid, entered amount 60', R(PAID, { amount: '60', date: '2026-10-27' }), 'alreadyDifferent', MSG.different, true);
expectR('alreadyPaid, entered a different date', R(PAID, { amount: '42.5', date: '2026-10-28' }), 'alreadyDifferent', MSG.different, true);
[undefined, null, 'x', {}, { amount: 'abc', date: '2026-10-27' }, { amount: '', date: '' }, { amount: '0', date: '2026-10-27' }].forEach(function (e) {
  expectR('alreadyPaid, entered=' + show(e) + ' (cannot prove a match, so it is NOT reported as same)', R(PAID, e), 'alreadyDifferent', MSG.different, true);
});
[{ alreadyPaid: true }, { alreadyPaid: true, paidAmount: 42.5 }, { alreadyPaid: true, paidDate: '2026-10-27' },
 { alreadyPaid: true, paidAmount: 42.5, paidDate: null }, { alreadyPaid: true, paidAmount: 42.5, paidDate: '' },
 { alreadyPaid: true, paidAmount: 42.5, paidDate: '   ' }, { alreadyPaid: true, paidAmount: 42.5, paidDate: new Date(0) },
 { alreadyPaid: true, paidAmount: null, paidDate: '2026-10-27' }, { alreadyPaid: true, paidAmount: '42.5', paidDate: '2026-10-27' },
 { alreadyPaid: true, paidAmount: NaN, paidDate: '2026-10-27' }, { alreadyPaid: true, paidAmount: Infinity, paidDate: '2026-10-27' }
].forEach(function (d) {
  expectR('alreadyPaid with unreadable record ' + show(d), R({ success: true, data: d }, E_OK), 'alreadyUnreadable', MSG.unreadable, true);
});
check('amount formatting follows the dashboard helper: 1550 -> "RM 1,550.00"; 0 -> "RM 0.00"',
  R({ success: true, data: { alreadyPaid: true, paidAmount: 1550, paidDate: '2026-10-27' } }, { amount: '1550', date: '' }).message === 'Already recorded: paid on 2026-10-27 for RM 1,550.00. Nothing was changed.' &&
  R({ success: true, data: { alreadyPaid: true, paidAmount: 0, paidDate: '2026-10-27' } }, E_OK).message === 'This bill was already paid on 2026-10-27 for RM 0.00. The amount or date you entered was NOT saved.');
check('a recorded date with surrounding spaces is trimmed before it is shown and compared',
  R({ success: true, data: { alreadyPaid: true, paidAmount: 42.5, paidDate: ' 2026-10-27 ' } }, E_OK).message === MSG.same);

section('S-8 interpretPayResponse_ — shape, purity, SR-14 read rules, never throws');
{
  const r = R(PAID, E_OK);
  check('result has exactly the keys kind, message, isError (in that order)', Object.keys(r).join(',') === 'kind,message,isError');
  const a = R(null), b = R(null); a.message = 'changed';
  check('every call returns a fresh object (mutating one result does not leak into the next)', b.message === MSG.unconfirmed);
  const input = { success: true, data: { alreadyPaid: true, paidAmount: 42.5, paidDate: '2026-10-27' } }, ent = { amount: '42.5', date: '2026-10-27' };
  const before = JSON.stringify([input, ent]); R(input, ent);
  check('inputs are not mutated', JSON.stringify([input, ent]) === before);
  check('same inputs give the same result (deterministic)', JSON.stringify(R(input, ent)) === JSON.stringify(R(input, ent)));

  var reads = 0;
  const spy = function (v) { return { get: function () { reads++; return v; } }; };
  const arrRes = []; Object.defineProperty(arrRes, 'success', spy(true)); Object.defineProperty(arrRes, 'data', spy({ alreadyPaid: false, occurrenceId: 'OCC-1' }));
  var out = R(arrRes, E_OK);
  check('SR-14 res is an array: no property of res is read; result unconfirmed', reads === 0 && out.kind === 'unconfirmed');
  reads = 0; const fnRes = function () {}; Object.defineProperty(fnRes, 'success', spy(true)); Object.defineProperty(fnRes, 'data', spy({ alreadyPaid: false, occurrenceId: 'OCC-1' }));
  out = R(fnRes, E_OK);
  check('SR-14 res is a function: no property of res is read; result unconfirmed', reads === 0 && out.kind === 'unconfirmed');
  reads = 0; var o1 = { success: 'maybe' }; Object.defineProperty(o1, 'data', spy({ alreadyPaid: false, occurrenceId: 'OCC-1' }));
  out = R(o1, E_OK);
  check('SR-14 success is neither true nor false: res.data is not read; unconfirmed', reads === 0 && out.kind === 'unconfirmed');
  reads = 0; var o2 = { success: false, error: 'e' }; Object.defineProperty(o2, 'data', spy({ alreadyPaid: false, occurrenceId: 'OCC-1' }));
  out = R(o2, E_OK);
  check('SR-14 success is false: res.data is not read; kind error', reads === 0 && out.kind === 'error');
  reads = 0; const dataArr = []; Object.defineProperty(dataArr, 'alreadyPaid', spy(false)); Object.defineProperty(dataArr, 'occurrenceId', spy('OCC-1'));
  out = R({ success: true, data: dataArr }, E_OK);
  check('SR-14 res.data is an array: data.alreadyPaid is not read; unconfirmed', reads === 0 && out.kind === 'unconfirmed');

  const boom = function () { return new Proxy({}, { get: function () { throw new Error('boom'); }, has: function () { throw new Error('boom'); }, ownKeys: function () { throw new Error('boom'); } }); };
  const hostile = [
    ['res is a throwing Proxy', boom(), E_OK],
    ['res.success getter throws', Object.defineProperty({}, 'success', { get: function () { throw new Error('boom'); } }), E_OK],
    ['res.data getter throws', Object.defineProperty({ success: true }, 'data', { get: function () { throw new Error('boom'); } }), E_OK],
    ['data.alreadyPaid getter throws', { success: true, data: Object.defineProperty({}, 'alreadyPaid', { get: function () { throw new Error('boom'); } }) }, E_OK],
    ['data.occurrenceId getter throws', { success: true, data: Object.defineProperty({ alreadyPaid: false }, 'occurrenceId', { get: function () { throw new Error('boom'); } }) }, E_OK],
    ['data.paidDate getter throws', { success: true, data: Object.defineProperty({ alreadyPaid: true, paidAmount: 42.5 }, 'paidDate', { get: function () { throw new Error('boom'); } }) }, E_OK],
    ['entered is a throwing Proxy while the record is readable', PAID, boom()],
    ['entered.amount getter throws while the record is readable', PAID, Object.defineProperty({}, 'amount', { get: function () { throw new Error('boom'); } })]
  ];
  hostile.forEach(function (h) {
    var res2, threw = false; try { res2 = R(h[1], h[2]); } catch (e) { threw = true; }
    check('never throws and never claims success: ' + h[0], !threw && res2 && res2.kind === 'unconfirmed' && res2.isError === true && res2.message === MSG.unconfirmed, threw ? 'THREW' : JSON.stringify(res2));
  });
}

section('S-8 interpretPayResponse_ — exhaustive cross-product: only the one recognised shape may say "Payment recorded."');
{
  const SUCC = [true, false, 'true', 1, undefined, null];
  const PAIDF = [true, false, 'true', 1, undefined, null];
  const OCC = ['OCC-1', '', '  ', 5, undefined];
  const AMT = [42.5, '42.5', NaN, undefined, null, 0, -3, Infinity];
  const DATE = ['2026-10-27', '', '  ', null, undefined, new Date(0), 5];
  const ENT = [undefined, null, 'x', { amount: '42.5', date: '2026-10-27' }, { amount: '60', date: '' }, { amount: ' 42.50 ', date: '' }, {}];
  const expectKind = function (s, p, o, a, d, e) {            // independent oracle (written from the plan's table, not from the code)
    if (s === false) return 'error';
    if (s !== true) return 'unconfirmed';
    if (p === true) {
      const recDate = typeof d === 'string' ? d.trim() : '';
      if (typeof a !== 'number' || !isFinite(a) || recDate === '') return 'alreadyUnreadable';
      const isO = e !== null && typeof e === 'object';
      const ea = isO && e.amount !== undefined ? Number(String(e.amount).trim()) : NaN;
      const ed = isO && typeof e.date === 'string' ? e.date.trim() : '';
      return (ea === a && (ed === '' || ed === recDate)) ? 'alreadySame' : 'alreadyDifferent';
    }
    if (p === false && typeof o === 'string' && o.trim() !== '') return 'recorded';
    return 'unconfirmed';
  };
  const KINDS = ['recorded', 'alreadySame', 'alreadyDifferent', 'alreadyUnreadable', 'error', 'unconfirmed'];
  const bad = []; var n = 0, nRecorded = 0, nSame = 0, nDiff = 0, nUnread = 0, nUnconf = 0, nError = 0;
  SUCC.forEach(function (s) { PAIDF.forEach(function (p) { OCC.forEach(function (o) { AMT.forEach(function (a) { DATE.forEach(function (d) { ENT.forEach(function (e) {
    n++;
    var r; try { r = R({ success: s, data: { alreadyPaid: p, occurrenceId: o, paidAmount: a, paidDate: d } }, e); } catch (x) { bad.push('THREW for ' + show([s, p, o, a, d, e])); return; }
    const want = expectKind(s, p, o, a, d, e);
    if (r.kind !== want) bad.push(show([s, p, o, a, d, e]) + ' kind=' + r.kind + ' want=' + want);
    if (KINDS.indexOf(r.kind) === -1 || typeof r.message !== 'string' || typeof r.isError !== 'boolean') bad.push('bad shape ' + JSON.stringify(r));
    if ((r.message === MSG.recorded) !== (r.kind === 'recorded')) bad.push('"Payment recorded." text/kind mismatch ' + JSON.stringify(r));
    if (r.kind !== 'recorded' && r.kind !== 'alreadySame' && r.isError !== true) bad.push('non-success kind without error style ' + JSON.stringify(r));
    if (r.kind === 'recorded') nRecorded++; else if (r.kind === 'alreadySame') nSame++; else if (r.kind === 'alreadyDifferent') nDiff++;
    else if (r.kind === 'alreadyUnreadable') nUnread++; else if (r.kind === 'error') nError++; else nUnconf++;
  }); }); }); }); }); });
  check('S-8 ' + n + ' response/input combinations: kind equals the independent oracle, never throws, shape valid, "Payment recorded." only for kind recorded, every other non-same kind uses error style',
    bad.length === 0, bad.slice(0, 3).join(' | '));
  console.log('      distribution: recorded=' + nRecorded + ' alreadySame=' + nSame + ' alreadyDifferent=' + nDiff + ' alreadyUnreadable=' + nUnread + ' error=' + nError + ' unconfirmed=' + nUnconf);
  check('every kind occurs in the cross-product (the oracle is not vacuous)', nRecorded > 0 && nSame > 0 && nDiff > 0 && nUnread > 0 && nError > 0 && nUnconf > 0);
}

// ── S1 SCOPE GUARD ──────────────────────────────────────────────────────────
if (SKIP_GUARD) {
  console.log('\nSKIP : S1 SCOPE GUARD (--no-s1-guard)');
} else {
  section('S1 SCOPE GUARD — nothing is wired yet (SR-1, SR-12). Retire with --no-s1-guard when S2/S3 wire the helpers in.');
  const code = function (t) { return stripComments(t); };
  const count = function (text, name) { return (text.match(new RegExp('\\b' + name + '\\b', 'g')) || []).length; };
  const c912 = code(src912), c945 = code(js945);
  check('912: malaysiaTodayIso_ appears once in code (its definition only: not called)', count(c912, 'malaysiaTodayIso_') === 1);
  check('912: parsePositiveAmount_ appears once in code (not called)', count(c912, 'parsePositiveAmount_') === 1);
  check('912: isRealIsoDate_ appears once in code (not called)', count(c912, 'isRealIsoDate_') === 1);
  check('912: no 945-only names (parsePayAmount_, interpretPayResponse_)', count(c912, 'parsePayAmount_') === 0 && count(c912, 'interpretPayResponse_') === 0);
  check('945: malaysiaTodayIso_ appears once in code (not called)', count(c945, 'malaysiaTodayIso_') === 1);
  check('945: isRealIsoDate_ appears once in code (not called)', count(c945, 'isRealIsoDate_') === 1);
  check('945: interpretPayResponse_ appears once in code (not called)', count(c945, 'interpretPayResponse_') === 1);
  check('945: parsePayAmount_ appears twice (definition + the call inside interpretPayResponse_)', count(c945, 'parsePayAmount_') === 2);
  check('945: no 912-only name (parsePositiveAmount_)', count(c945, 'parsePositiveAmount_') === 0);
  const NAMES = ['malaysiaTodayIso_', 'parsePositiveAmount_', 'parsePayAmount_', 'isRealIsoDate_', 'interpretPayResponse_'];
  const others = fs.readdirSync(SRC_DIR).filter(function (f) {
    return /\.(js|html)$/.test(f) && f !== '912_ObligationEngine.js' && f !== '945_OperatorConsole.html' && f.indexOf('local_precheck_test_B1_') !== 0;
  });
  const hits = [];
  others.forEach(function (f) {
    const t = code(fs.readFileSync(path.join(SRC_DIR, f), 'utf8'));
    NAMES.forEach(function (nm) { if (count(t, nm) > 0) hits.push(f + ':' + nm); });
  });
  check('none of the ' + others.length + ' other .js/.html files in the directory references any of the five new names (946 and the rest are untouched in this respect)', hits.length === 0, hits.join(', '));
  check('912 recordPayment still has its original default-date line (S2 will change it)', src912.indexOf("var paidDate = input.paidDate || toIsoDate_(new Date());") !== -1);
  check('912 recordPayment still has its original amount line (S2 will change it)', src912.indexOf("var paidAmount = input.paidAmount != null ? Number(input.paidAmount) : Number(occurrence.Amount);") !== -1);
  check('945 showPayForm still uses its original UTC default date (S3 will change it)', js945.indexOf("var today = new Date().toISOString().slice(0, 10);") !== -1);
  check('945 showPayForm still has its original success handling lines (S3 will change them)',
    js945.indexOf("if (!res.success) { showToast(res.error, true); confirmBtn.disabled = false; return; }") !== -1 &&
    js945.indexOf("showToast('Payment recorded.');") !== -1);
  var f946 = null; try { f946 = fs.readFileSync(path.join(SRC_DIR, '946_OperatorConsoleServer.js'), 'utf8'); } catch (e) { /* optional */ }
  if (f946 !== null) check('946 console_recordPayment still has its original Number(paidAmount) conversion (S2 will change it)', f946.indexOf('paidAmount: Number(paidAmount),') !== -1);
}

finish();
