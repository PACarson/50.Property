// b1_probes_selftest.js — checks the two real-environment probes against STAND-INS in Node.
//
// WHAT THIS PROVES: the probes' own logic (SHA-256, fingerprint classification, event recording, hook install and
// uninstall, snapshot checksums, read-back) behaves as intended on the candidate code, against stub pages and a stub
// Spreadsheet. It also proves the embedded expected fingerprints equal the hashes of the candidate files.
// WHAT IT DOES NOT PROVE: that the probes work in a real browser dialog or in real Apps Script. Nothing here runs either.
//
// Usage:  node b1_probes_selftest.js S3TREE [BEFORE_S3_TREE [BEFORE_S2_TREE [ORIGINAL_TREE]]]
//   S3TREE          the tree with S1, S2 and S3 applied (needs GasShim.js and the 900-903, 910, 912, 913, 945, 946 sources)
//   BEFORE_S3_TREE  the tree with S1 and S2 only   (enables the "S1 only" browser classification check)
//   BEFORE_S2_TREE  the tree with S1 only          (enables the "S1 only" server classification check)
//   ORIGINAL_TREE   the original zip tree          (enables the "ORIGINAL" classification checks)
// Exit code 0 = every check passed.

const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const args = process.argv.slice(2).map(function (a) { return path.resolve(a); });
const [S3, BEFORE_S3, BEFORE_S2, ORIGINAL] = args;
if (!S3) { console.log('usage: node b1_probes_selftest.js S3TREE [BEFORE_S3_TREE [BEFORE_S2_TREE [ORIGINAL_TREE]]]'); process.exit(2); }

var pass = 0, fail = 0;
function check(label, cond, detail) { if (cond) { pass++; console.log('ok  :', label); } else { fail++; console.log('FAIL:', label, detail === undefined ? '' : '-> ' + String(detail).slice(0, 300)); } }
function section(t) { console.log('\n═══ ' + t + ' ═══'); }
function finish() { console.log('\n' + '═'.repeat(60)); console.log(fail === 0 ? 'ALL ' + pass + ' CHECKS PASSED (0 failures)' : pass + ' passed, ' + fail + ' FAILED'); process.exit(fail === 0 ? 0 : 1); }
const sha = function (s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); };
const KIT = __dirname;
const browserSrc = fs.readFileSync(path.join(KIT, 'b1_probe_browser.js'), 'utf8');
const serverSrc = fs.readFileSync(path.join(KIT, 'b1_probe_server.gs'), 'utf8');
function extractFn(src, name) { const m = new RegExp('^function ' + name + '\\s*\\(', 'm').exec(src); if (!m) return null; const e = src.indexOf('\n}\n', m.index); return e === -1 ? null : src.slice(m.index, e + 2); }
const rd = function (dir, f) { return fs.readFileSync(path.join(dir, f), 'utf8'); };
const js945 = function (dir) { return rd(dir, '945_OperatorConsole.html').match(/<script>([\s\S]*?)<\/script>/)[1]; };
const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

// ── page stand-in ────────────────────────────────────────────────────────────
function makeRunner(state, onOk, onFail) {
  return {
    withSuccessHandler: function (fn) { return makeRunner(state, fn, onFail); },
    withFailureHandler: function (fn) { return makeRunner(state, onOk, fn); },
    console_recordPayment: function () { state.calls.push(Array.prototype.slice.call(arguments)); setTimeout(function () { if (onOk) onOk(state.canned); }, 0); },
    console_getDashboardSnapshot: function () { state.calls.push('dash'); }
  };
}
function makePage(opts) {
  opts = opts || {};
  const state = { clock: 1000, calls: [], canned: { success: true, data: { alreadyPaid: false, occurrenceId: 'OCC-1' } }, listeners: { click: [] }, observers: [], loads: 0, formInputs: null,
    toastEl: { style: { display: 'none' }, className: 'toast', textContent: '' }, timers: {}, timerSeq: 0 };
  const sandbox = { __state: state,
    setTimeout: function (fn, ms) { if (ms >= 1000) { const id = ++state.timerSeq; state.timers[id] = fn; return id; } return setTimeout(fn, ms); },
    clearTimeout: function (id) { delete state.timers[id]; clearTimeout(id); } };
  const ctx = vm.createContext(sandbox);
  vm.runInContext('var window = globalThis; var isSecureContext = true;' +
    "var navigator = { userAgent: 'selftest-agent' }; var location = { hostname: 'selftest.invalid' };" +
    'var performance = { now: function () { return __state.clock; } };' +
    'var document = { title: "selftest", getElementById: function (id) { return id === "toast" && !__state.noToast ? __state.toastEl : null; },' +
    '  addEventListener: function (t, fn) { (__state.listeners[t] = __state.listeners[t] || []).push(fn); },' +
    '  removeEventListener: function (t, fn) { var a = __state.listeners[t] || []; var i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); },' +
    '  querySelectorAll: function (sel) { return sel === ".pf-date" && __state.formInputs ? [__state.formInputs.date] : []; } };' +
    'function MutationObserver(cb) { this.cb = cb; this.connected = false; __state.observers.push(this); }' +
    'MutationObserver.prototype.observe = function () { this.connected = true; }; MutationObserver.prototype.disconnect = function () { this.connected = false; };', ctx);
  if (!opts.noGoogle) sandbox.google = { script: { run: makeRunner(state) } };
  if (opts.fixedNow !== undefined) vm.runInContext('var __RD = Date; var __FIXED = ' + opts.fixedNow + '; Date = class extends __RD { constructor() { if (arguments.length) super(...arguments); else super(__FIXED); } static now() { return __FIXED; } };', ctx);
  if (opts.tree) {
    const js = js945(opts.tree), names = opts.realNames || ['showToast', 'malaysiaTodayIso_', 'parsePayAmount_', 'isRealIsoDate_', 'interpretPayResponse_', 'formatAmount'];
    var texts = names.map(function (n) { return extractFn(js, n); }).filter(function (x) { return x !== null; });
    if (opts.mutate) texts = texts.map(opts.mutate);
    vm.runInContext('var toastTimer;\n' + texts.join('\n\n'), ctx);
  }
  if (opts.stubForms) {
    vm.runInContext('function loadDashboard() { __state.loads++; }' +
      'function showPayForm(card, item) { __state.formInputs = { date: { value: item.defaultDate }, amount: { value: String(item.expectedAmount) } }; card.opened = true; }', ctx);
  }
  return { ctx: ctx, state: state, run: function (c) { return vm.runInContext(c, ctx); }, probe: function () { return vm.runInContext(browserSrc, ctx); } };
}
function realFnPage(tree, mutate) {   // a page that has the REAL 945 functions (including showPayForm) defined but never called: for fingerprints
  return makePage({ tree: tree, mutate: mutate, realNames: ['showToast', 'showPayForm', 'malaysiaTodayIso_', 'parsePayAmount_', 'isRealIsoDate_', 'interpretPayResponse_', 'formatAmount'] });
}

// ── A. the embedded expected fingerprints equal the candidate files ─────────
section('A. The expected fingerprints embedded in the probes equal SHA-256 of the candidate function texts');
{
  const exB = new Function('return ' + /var EXPECTED = (\{[\s\S]*?\n\});/.exec(browserSrc)[1])();
  const exS = new Function('return ' + /var B1_PROBE_EXPECTED_ = (\{[\s\S]*?\n\});/.exec(serverSrc)[1])();
  const j = js945(S3);
  ['showPayForm', 'malaysiaTodayIso_', 'parsePayAmount_', 'isRealIsoDate_', 'interpretPayResponse_', 'formatAmount'].forEach(function (n) {
    check('browser expected ' + n + '.s3 = sha256 of the S3 tree text', exB[n] && exB[n].s3 === sha(extractFn(j, n)));
  });
  if (BEFORE_S3) check('browser expected showPayForm.before = sha256 of the text in the tree before S3', exB.showPayForm.before === sha(extractFn(js945(BEFORE_S3), 'showPayForm')));
  const s912 = rd(S3, '912_ObligationEngine.js'), s946 = rd(S3, '946_OperatorConsoleServer.js');
  ['recordPayment', 'parsePositiveAmount_', 'isRealIsoDate_', 'malaysiaTodayIso_'].forEach(function (n) { check('server expected 912:' + n + '.s2 = sha256 of the S2 tree text', exS['912:' + n] && exS['912:' + n].s2 === sha(extractFn(s912, n))); });
  check('server expected 946:console_recordPayment.s2 = sha256 of the S2 tree text', exS['946:console_recordPayment'].s2 === sha(extractFn(s946, 'console_recordPayment')));
  if (BEFORE_S2) { check('server expected 912:recordPayment.before = sha256 of the text before S2', exS['912:recordPayment'].before === sha(extractFn(rd(BEFORE_S2, '912_ObligationEngine.js'), 'recordPayment')));
    check('server expected 946:console_recordPayment.before = sha256 of the text before S2', exS['946:console_recordPayment'].before === sha(extractFn(rd(BEFORE_S2, '946_OperatorConsoleServer.js'), 'console_recordPayment'))); }
}

(async function main() {
// ── B. SHA-256 inside the browser probe ─────────────────────────────────────
section('B. The probe\'s pure-JS SHA-256 equals Node crypto (it cannot rely on crypto.subtle inside the dialog frame)');
const pg0 = makePage({ tree: S3 }); pg0.probe();
{
  const api = pg0.run('__b1');
  const samples = ['', 'abc', 'The quick brown fox', '\u4e2d\u6587\u5b57\u7b26 \u00e9\u00e8 \ud83d\ude00 emoji', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(63), 'x'.repeat(64), 'x'.repeat(65), 'x'.repeat(119), 'x'.repeat(120), 'x'.repeat(1000)];
  const bad = []; samples.forEach(function (s) { if (api.sha256(s) !== sha(s)) bad.push(JSON.stringify(s.slice(0, 12)) + ' len ' + s.length); });
  for (var n = 0; n <= 200; n++) { const s = 'a'.repeat(n); if (api.sha256(s) !== sha(s)) bad.push('len ' + n); }
  const j = js945(S3); ['showPayForm', 'interpretPayResponse_', 'formatAmount'].forEach(function (nm) { const t = extractFn(j, nm); if (api.sha256(t) !== sha(t)) bad.push(nm); });
  check('sha256 agrees with Node on ' + (samples.length + 201 + 3) + ' inputs (padding boundaries 55/56/63/64/119/120, multibyte, real function texts)', bad.length === 0, bad.slice(0, 4).join(' | '));
  const pgT = makePage({ tree: S3 });
  check('Function.prototype.toString() of a function defined from the file text equals the file text (so a page fingerprint can match)', pgT.run('Function.prototype.toString.call(interpretPayResponse_)') === extractFn(js945(S3), 'interpretPayResponse_'));
}

// ── C. classification ───────────────────────────────────────────────────────
section('C. Browser probe: which version of the page code is running');
{
  const pg = realFnPage(S3); const line = pg.probe();
  check('S3 tree is classified "S3 (S1 + S3 applied to 945)"', /Page code detected: S3 \(S1 \+ S3 applied to 945\)/.test(line), line);
  check('all six fingerprints match (s3)', JSON.parse(pg.run('__b1.report({events:false})')).fingerprints.showPayForm.matches === 's3');
  if (BEFORE_S3) { const l2 = realFnPage(BEFORE_S3).probe(); check('the tree before S3 is classified "S1 only (S3 NOT applied)"', /S1 only \(S3 NOT applied\)/.test(l2), l2); }
  if (ORIGINAL) { const l3 = makePage({ tree: ORIGINAL, realNames: ['showToast', 'showPayForm', 'formatAmount'] }).probe(); check('the original zip tree is classified "ORIGINAL 945 (no S1, no S3)"', /ORIGINAL 945 \(no S1, no S3\)/.test(l3), l3); }
  const l4 = realFnPage(S3, function (t) { return /^function showPayForm/.test(t) ? t.replace('Enter a payment amount greater than 0.', 'Enter an amount.') : t; }).probe();
  check('a one-phrase change inside showPayForm is classified UNKNOWN', /UNKNOWN/.test(l4), l4);
  const pgH = realFnPage(S3); pgH.probe();
  check('after the hooks are installed the classification still uses the ORIGINAL functions, not the wrappers', JSON.parse(pgH.run('__b1.report({events:false})')).deployedVersion.indexOf('S3') === 0);
}

// ── D. hooks and events ─────────────────────────────────────────────────────
section('D. Browser probe: hooks, events, timing');
{
  const pg = makePage({ tree: S3, stubForms: true }); const line = pg.probe();
  const f = JSON.parse(pg.run('__b1.report({events:false})')).features;
  check('all four function hooks, the google.script.run hook, click capture and toast timing are reported as installed',
    ['hook:showToast', 'hook:interpretPayResponse_', 'hook:loadDashboard', 'hook:showPayForm'].every(function (k) { return f[k] === 'installed'; }) && f.gasHook === 'installed' && f.clickCapture === 'installed' && f.toastTiming === 'installed', JSON.stringify(f));
  pg.state.clock = 1000; pg.run("showToast('Already recorded: paid on 2026-10-27 for RM 42.50. Nothing was changed.', false)");
  check('showToast still works through the hook (the page element was updated)', pg.state.toastEl.textContent.indexOf('Already recorded') === 0 && pg.state.toastEl.style.display === 'block');
  pg.state.clock = 4500; pg.state.toastEl.style.display = 'none'; pg.state.observers[0].cb();
  const ev1 = JSON.parse(pg.run('JSON.stringify(__b1.events())'));
  const toast = ev1.filter(function (e) { return e.type === 'toast'; })[0], hidden = ev1.filter(function (e) { return e.type === 'toast-hidden'; })[0];
  check('a toast event records the exact message, the error flag and that the default duration was used', toast && toast.message.indexOf('Already recorded') === 0 && toast.isError === false && toast.durationArg === 'default');
  check('a toast-hidden event records how long it stayed visible (3500 ms with the stub clock)', hidden && hidden.visibleMs === 3500, JSON.stringify(hidden));
  pg.run("showToast('x', true, 8000)"); check('an explicit duration argument is recorded', pg.run('__b1.last(1)[0].durationArg') === 8000);
  pg.run("interpretPayResponse_({ success: true, data: { alreadyPaid: true, paidAmount: 42.5, paidDate: null } }, { amount: '42.5', date: '' })");
  const i1 = JSON.parse(pg.run('JSON.stringify(__b1.last(1)[0])'));
  check('interpret event: result kind alreadyUnreadable, paidDate type recorded as null (the Date-serialization symptom)', i1.type === 'interpret' && i1.result.kind === 'alreadyUnreadable' && i1.dataPaidDateType === 'null' && i1.dataPaidAmountType === 'number', JSON.stringify(i1));
  pg.run("interpretPayResponse_({ success: true, data: { alreadyPaid: true, paidAmount: 42.5, paidDate: '2026-10-27' } }, { amount: '42.5', date: '2026-10-27' })");
  const i2 = JSON.parse(pg.run('JSON.stringify(__b1.last(1)[0])'));
  check('interpret event: a same-amount, same-date repeat is alreadySame and the original entered values are logged', i2.result.kind === 'alreadySame' && i2.entered.amount === '42.5' && i2.resContainsDate === false);
  pg.run("interpretPayResponse_({ success: true, data: { alreadyPaid: false, occurrenceId: 'OCC-1', paidDate: new Date(0) } }, {})");
  check('a Date object inside the response is flagged (resContainsDate)', pg.run('__b1.last(1)[0].resContainsDate') === true);
  pg.run('loadDashboard()'); check('loadDashboard calls are counted as events and still reach the page', pg.state.loads === 1 && pg.run('__b1.last(1)[0].type') === 'loadDashboard');
  pg.ctx.__card = { querySelector: function (sel) { return sel === '.pf-date' ? { value: '2026-11-10' } : (sel === '.pf-amount' ? { value: '42.5' } : null); } };
  pg.run("showPayForm(__card, { occurrenceId: 'OCC-9', expectedAmount: 42.5, defaultDate: '2026-11-10' })");
  const po = JSON.parse(pg.run('JSON.stringify(__b1.last(1)[0])'));
  check('payFormOpened records the date the form was pre-filled with, next to the Malaysia date and the UTC date', po.type === 'payFormOpened' && po.formDefaultDate === '2026-11-10' && po.occurrenceId === 'OCC-9' && typeof po.malaysiaTodayIso === 'string' && typeof po.utcDate === 'string', JSON.stringify(po));
  var ok = null, calls0 = pg.state.calls.length;
  pg.state.canned = { success: true, data: { alreadyPaid: false, occurrenceId: 'OCC-1' } }; pg.ctx.__ok = function (r) { ok = r; };
  pg.run("google.script.run.withSuccessHandler(__ok).withFailureHandler(function () {}).console_recordPayment('OCC-1', '42.50', '2026-10-24', '')");
  await sleep(30);
  const gc = JSON.parse(pg.run('JSON.stringify(__b1.events().filter(function (e) { return e.type === "gas-call"; }))'));
  check('the google.script.run hook records the server function name and the RAW arguments, and the call still reaches the page and its handler', gc.length === 1 && gc[0].fn === 'console_recordPayment' && gc[0].args[1].value === '42.50' && gc[0].args[2].value === '2026-10-24' && pg.state.calls.length === calls0 + 1 && ok && ok.success === true, JSON.stringify(gc));
  const btn = { disabled: false, textContent: ' Confirm ', isConnected: true, closest: function (sel) { return sel === 'button' ? btn : (sel === '.pay-form' ? form : null); } };
  const form = { querySelector: function (sel) { return sel === '.pf-amount' ? { value: '0' } : { value: '2026-11-10' }; } };
  pg.state.listeners.click[0]({ target: btn }); btn.disabled = true; await sleep(140);
  const ck = JSON.parse(pg.run('JSON.stringify(__b1.events().filter(function (e) { return e.type === "click" || e.type === "click-after"; }))'));
  check('click capture records the button, the raw field values and, 80 ms later, whether the button got disabled', ck.length === 2 && ck[0].label === 'Confirm' && ck[0].formAmount === '0' && ck[0].formDate === '2026-11-10' && ck[0].disabledBefore === false && ck[1].disabledAfter === true, JSON.stringify(ck));
  const rep = JSON.parse(pg.run('__b1.report()'));
  check('report() is valid JSON with features, env, deployedVersion, fingerprints, eventCount and the events', rep.probe === 'b1-browser-probe-1' && rep.features && rep.env && rep.deployedVersion && rep.fingerprints && rep.eventCount === rep.events.length && rep.events.length > 8);
  check('report({events:false}) leaves the events out', JSON.parse(pg.run('__b1.report({events:false})')).events === undefined);
  check('mark() adds a labelled event', pg.run("__b1.mark('R3: typed 0'); __b1.last(1)[0].label") === 'R3: typed 0');
  check('reset() clears the events', pg.run('__b1.reset(); __b1.events().length') === 0);
}

// ── E. default-date verdicts ────────────────────────────────────────────────
section('E. defaultDate(): the verdict needs the 00:00-08:00 Malaysia window to be conclusive');
[['2026-11-09T20:00:00Z', '2026-11-10', 'PASS', 'Malaysia date shown while UTC is still the day before (04:00 MYT)'],
 ['2026-11-09T20:00:00Z', '2026-11-09', 'FAIL', 'the old UTC default shown at 04:00 MYT'],
 ['2026-11-10T08:00:00Z', '2026-11-10', 'NOT discriminating', '16:00 MYT: UTC date = Malaysia date'],
 ['2026-11-09T20:00:00Z', '2026-11-08', 'MISMATCH', 'neither date']].forEach(function (c) {
  const pg = makePage({ tree: S3, stubForms: true, fixedNow: Date.parse(c[0]) }); pg.probe();
  pg.state.formInputs = { date: { value: c[1] } };
  const r = JSON.parse(pg.run('JSON.stringify(__b1.defaultDate())'));
  check('at ' + c[0] + ' a form pre-filled with ' + c[1] + ' gives ' + c[2] + ' (' + c[3] + ')', r.verdict.indexOf(c[2]) !== -1, r.verdict);
});
{ const pg = makePage({ tree: S3, stubForms: true, fixedNow: Date.parse('2026-11-09T20:00:00Z') }); pg.probe();
  check('inMalaysia00to08 is true at 04:00 MYT and the Malaysia hour is 4', JSON.parse(pg.run('__b1.report({events:false})')).env.inMalaysia00to08 === true && JSON.parse(pg.run('__b1.report({events:false})')).env.malaysiaHourIntl === 4);
  check('with no Pay form open the verdict says so', pg.run('__b1.defaultDate().verdict').indexOf('No Pay form is open') === 0); }

// ── F. uninstall, re-install, missing features ──────────────────────────────
section('F. Uninstall restores the page; installing twice does not double-wrap; missing features do not break it');
{
  const pg = makePage({ tree: S3, stubForms: true });
  const before = pg.run('[showToast, interpretPayResponse_, loadDashboard, showPayForm, google.script.run]');
  pg.probe(); pg.probe();
  pg.run("showToast('once', false)");
  check('installing the probe twice records ONE toast event per call (the first install was removed first)', pg.run('__b1.events().filter(function (e) { return e.type === "toast"; }).length') === 1);
  const msg = pg.run('__b1.uninstall()');
  const after = pg.run('[showToast, interpretPayResponse_, loadDashboard, showPayForm, google.script.run]');
  check('uninstall() puts the original functions and google.script.run back (same identity)', msg === 'B1 probe uninstalled' && before.every(function (f, i) { return f === after[i]; }));
  check('uninstall() removes the click listener, disconnects the toast observer and removes window.__b1', pg.state.listeners.click.length === 0 && pg.state.observers.every(function (o) { return o.connected === false; }) && pg.run('typeof __b1') === 'undefined');
  pg.probe(); check('the probe can be installed again after an uninstall', pg.run('typeof __b1.report') === 'function');
}
{
  const pg = makePage({ tree: S3, noGoogle: true }); pg.state.noToast = true; var threw = null, line = '';
  try { line = pg.probe(); } catch (e) { threw = e; }
  check('on a page without google.script.run and without a toast element the probe still installs and says what is missing', !threw && /gasHook=google\.script\.run/.test(line) && /toastTiming=toast/.test(line), threw ? threw.message : line);
}
{
  const pg = makePage({ tree: S3, stubForms: true }); pg.ctx.__B1_OPTS = { gasHook: false }; pg.probe();
  check('window.__B1_OPTS = { gasHook: false } leaves google.script.run alone', JSON.parse(pg.run('__b1.report({events:false})')).features.gasHook.indexOf('disabled') === 0);
}

// ── G. server probe against stand-ins ───────────────────────────────────────
section('G. Server probe on the real 912/946 code, an in-memory Sheets stand-in and stand-in Utilities/Session');
{
  const FILES = ['900_PropertyConfig.js', '901_PropertySchema.js', '902_PropertyIdentity.js', '903_PropertyEventDefinitions.js', '910_PropertyAssetEngine.js', '912_ObligationEngine.js', '913_ObligationScheduler.js', '946_OperatorConsoleServer.js'];
  function tzFormat(date, tz, fmt) {
    const p = {}; new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second), offMin = Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000), sign = offMin >= 0 ? '+' : '-', a = Math.abs(offMin);
    const z = sign + ('0' + Math.floor(a / 60)).slice(-2) + ('0' + (a % 60)).slice(-2);
    return fmt === 'yyyy-MM-dd' ? p.year + '-' + p.month + '-' + p.day : p.year + '-' + p.month + '-' + p.day + ' ' + p.hour + ':' + p.minute + ':' + p.second + ' ' + z;
  }
  function extendFakeSheets(ss) {   // additive: gives the shim's fake the few read methods the probe uses; the engine's calls are untouched
    const tmp = ss.insertSheet('__tmp__'), rng = tmp.getRange(1, 1, 1, 1);
    const SSP = Object.getPrototypeOf(ss), SHP = Object.getPrototypeOf(tmp), RGP = Object.getPrototypeOf(rng);
    delete ss.sheetsByName['__tmp__'];
    SSP.getName = function () { return 'TEST COPY (stand-in)'; }; SSP.getId = function () { return 'SPREADSHEET-ID-ABCDEF123456'; };
    SSP.getSpreadsheetTimeZone = function () { return 'Asia/Singapore'; };
    SSP.getSheets = function () { return Object.keys(this.sheetsByName).map(function (n) { return this.sheetsByName[n]; }, this); };
    SHP.getName = function () { return this.name; };
    if (!SHP.__b1patched) { const orig = SHP.getRange; SHP.getRange = function (r, c, nr, nc) { return orig.call(this, r, c, nr === undefined ? 1 : nr, nc === undefined ? 1 : nc); }; SHP.__b1patched = true; }
    RGP.getValue = function () { return this.getValues()[0][0]; };
    RGP.getDisplayValue = function () { const v = this.getValue(); return v instanceof Date ? v.toISOString().slice(0, 10) : String(v); };
    RGP.getNumberFormat = function () { const f = this.sheet._formats[this.row - 1]; return (f && f[this.col - 1]) || 'General'; };
  }
  function freshServer(dir) {
    const shim = require(path.join(dir, 'GasShim.js')), loaded = shim.loadPropertyOSContext(dir, FILES), ctx = loaded.ctx, ss = loaded.spreadsheet;
    extendFakeSheets(ss);
    const realFormat = ctx.Utilities.formatDate;
    ctx.Utilities = Object.assign({}, ctx.Utilities, {
      computeDigest: function (alg, str) { return Array.from(crypto.createHash('sha256').update(String(str), 'utf8').digest()).map(function (b) { return b > 127 ? b - 256 : b; }); },
      DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
      formatDate: function (d, tz, fmt) { return (fmt === 'yyyy-MM-dd' || fmt === 'yyyy-MM-dd HH:mm:ss Z') && tz !== 'UTC' ? tzFormat(d, tz, fmt) : realFormat(d, tz, fmt); } });
    ctx.Session = { getScriptTimeZone: function () { return 'Asia/Singapore'; } };
    ctx.ScriptApp = { getScriptId: function () { return 'SCRIPT-ID-1234567890'; } };
    vm.runInContext(serverSrc, ctx);
    const run = function (c) { return vm.runInContext(c, ctx); };
    const t = { ctx: ctx, run: run, ss: ss };
    t.fixture = function () { ctx.__p = { propertyName: 'TEST Est8', addressLine1: 'x', purchasePrice: 1, freeholdLeasehold: 'Leasehold', propertyType: 'RESIDENTIAL_CONDO', unitLabel: 'A-1' }; run('createProperty(__p)');
      const pid = run('listActiveProperties()')[0].PropertyID; ctx.__b = { propertyId: pid, category: 'Water', payee: 'Air Selangor', amount: 42.5, frequencyType: 'Monthly', dueAnchor: '2026-10-15', graceDays: 0, autoGenerate: true }; return run('createObligation(__b)'); };
    t.pay = function (input) { ctx.__in = input; try { return { ok: true, v: run('recordPayment(__in)') }; } catch (e) { return { ok: false, m: e.message }; } };
    t.consolePay = function (a, b, c) { ctx.__a = [a, b, c, '']; return run('console_recordPayment.apply(null, __a)'); };
    return t;
  }
  const t = freshServer(S3);
  const info = t.run('b1ProbeInfo()');
  check('b1ProbeInfo(): the S2 tree is classified "S2 (S1 + S2 applied to 912, S2 applied to 946)" with five matching fingerprints', info.deployedVersion.indexOf('S2 (') === 0 && Object.keys(info.fingerprints).every(function (k) { return info.fingerprints[k].matches === 's2'; }), info.deployedVersion);
  check('b1ProbeInfo(): script time zone, spreadsheet name and the id TAILS (not the full ids) are reported', info.scriptTimeZone === 'Asia/Singapore' && info.spreadsheetName === 'TEST COPY (stand-in)' && info.spreadsheetIdTail === '...123456' && info.scriptIdTail === '...567890' && JSON.stringify(info).indexOf('SPREADSHEET-ID-ABCDEF123456') === -1);
  check('b1ProbeInfo(): malaysiaTodayIso equals the Asia/Kuala_Lumpur date, and the script-time-zone date (Asia/Singapore, same offset) agrees', info.malaysiaTodayIsoEqualsKualaLumpurDate === true && info.scriptTimeZoneDateEqualsKualaLumpurDate === true, JSON.stringify([info.malaysiaTodayIso, info.klDate, info.scriptTimeZoneDate]));
  if (BEFORE_S2) { const i1 = freshServer(BEFORE_S2).run('b1ProbeInfo()'); check('the S1-only tree is classified "S1 only (S2 NOT applied)"', i1.deployedVersion.indexOf('S1 only') === 0, i1.deployedVersion); }
  if (ORIGINAL) { const t0 = freshServer(ORIGINAL); const i0 = t0.run('b1ProbeInfo()'); check('the original tree is classified "ORIGINAL 912 / 946 (no S1, no S2)" and malaysiaTodayIso is reported as MISSING', i0.deployedVersion.indexOf('ORIGINAL') === 0 && /MISSING/.test(i0.malaysiaTodayIso), i0.deployedVersion); }
  const mut = freshServer(S3); mut.run('recordPayment = (function () { var f = recordPayment; return function recordPayment(input) { return f(input); }; })();');
  check('replacing recordPayment with different source text is classified UNKNOWN', mut.run('b1ProbeInfo()').deployedVersion.indexOf('UNKNOWN') === 0);
  const f = t.fixture(); const occ = f.occurrenceId;
  const s0 = t.run('b1ProbeSnapshot()'), s0b = t.run('b1ProbeSnapshot()');
  check('b1ProbeSnapshot(): taking it twice without any change gives the same overall checksum', s0.overallSha256 === s0b.overallSha256 && s0.sheets.length >= 3);
  const bad = t.pay({ occurrenceId: occ, paidAmount: 'abc', paidDate: '2026-10-24' }), s1 = t.run('b1ProbeSnapshot()');
  check('a REJECTED payment (invalid amount) leaves the overall checksum unchanged: this is how "nothing was written" is proven', bad.ok === false && s1.overallSha256 === s0.overallSha256, bad.m);
  const rej = t.consolePay(occ, '', '2026-10-24'), s2 = t.run('b1ProbeSnapshot()');
  check('a rejected console call (blank amount) leaves it unchanged too', rej.success === false && s2.overallSha256 === s0.overallSha256);
  const ok = t.pay({ occurrenceId: occ, paidAmount: 42.5, paidDate: '2026-10-24' }), s3 = t.run('b1ProbeSnapshot()');
  check('an ACCEPTED payment changes the checksum (the positive control)', ok.ok === true && s3.overallSha256 !== s0.overallSha256 && s3.sheets.some(function (x, i) { return x.sha256 !== s0.sheets[i].sha256; }));
  {
    const names = Object.keys(t.ss.sheetsByName).sort(), snap = t.run('b1ProbeSnapshot()');
    check('b1ProbeSnapshot() lists EVERY sheet of the spreadsheet (same names, same count)', JSON.stringify(snap.sheets.map(function (x) { return x.name; }).sort()) === JSON.stringify(names) && names.length >= 3, JSON.stringify([snap.sheets.length, names.length]));
    const wrong = [];
    snap.sheets.forEach(function (x) { const sh = t.ss.sheetsByName[x.name], vals = (sh.getLastRow() > 0 && sh.getLastColumn() > 0) ? sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues() : []; if (x.sha256 !== sha(JSON.stringify(vals))) wrong.push(x.name); });
    check('every sheet checksum equals an independent SHA-256 of that sheet\'s values', wrong.length === 0, wrong.join(','));
    const missed = [];
    names.forEach(function (nm) { const a = t.run('b1ProbeSnapshot()'); t.ss.sheetsByName[nm].appendRow(['probe-selftest']); const b = t.run('b1ProbeSnapshot()');
      const sa = a.sheets.filter(function (x) { return x.name === nm; })[0], sb = b.sheets.filter(function (x) { return x.name === nm; })[0];
      if (!(a.overallSha256 !== b.overallSha256 && sa && sb && sa.sha256 !== sb.sha256)) missed.push(nm); });
    check('a change to ANY single sheet (tested one sheet at a time, ' + names.length + ' sheets) changes both that sheet\'s checksum and the overall checksum', missed.length === 0, missed.join(','));
  }
  const rb = t.run('b1ProbeReadBack(3)'), last = rb.rows[rb.rows.length - 1], paid = rb.rows.filter(function (r) { return r.OccurrenceID.display === occ; })[0];
  check('b1ProbeReadBack(): the paid row shows Status Paid, PaidAmount as a number 42.5 and PaidDate as TEXT "2026-10-24" with its cell format', paid && paid.Status.display === 'Paid' && paid.PaidAmount.valueType === 'number' && paid.PaidAmount.display === '42.5' && paid.PaidDate.valueType === 'string' && paid.PaidDate.display === '2026-10-24' && paid.PaidDate.numberFormat === '@', JSON.stringify(paid));
  check('b1ProbeReadBack(): headerMatchesSchema is true and the history row count is reported', rb.headerMatchesSchema === true && rb.history && rb.history.dataRowCount >= 1, JSON.stringify([rb.headerMatchesSchema, rb.history]));
  const forbidden = /\b(setValue|setValues|appendRow|deleteRow|deleteRows|insertRow|insertSheet|clearContent|clear|LockService|PropertiesService|CacheService|newTrigger|setFormula|sort|copyTo|moveTo|setNumberFormat|UrlFetchApp|MailApp|GmailApp|DriveApp)\b/;
  const codeOnly = serverSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[ \t])\/\/[^\n]*/gm, '$1');
  check('the server probe contains no call that writes, locks, sends or schedules anything (static scan of its code, comments excluded)', !forbidden.test(codeOnly), (forbidden.exec(codeOnly) || [])[0]);
  const forbiddenB = /\b(localStorage|sessionStorage|indexedDB|sendBeacon|WebSocket|eval)\b|\bfetch\s*\(|new\s+XMLHttpRequest|document\.cookie|postMessage\s*\(/;   // calls and constructors only: the string 'fetch' is used to FILTER performance entries, not to send anything
  const codeB = browserSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[ \t])\/\/[^\n]*/gm, '$1');
  check('the browser probe stores nothing and sends nothing (static scan: no storage, no fetch()/XMLHttpRequest/beacon/WebSocket call, no eval, no cookies, no postMessage call)', !forbiddenB.test(codeB), (forbiddenB.exec(codeB) || [])[0]);
}
finish();
})();
