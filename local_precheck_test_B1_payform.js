// local_precheck_test_B1_payform.js
//
// B1 S3 CANDIDATE TEST — a NEW file. Not part of any repository yet, not applied anywhere.
// Specification: B1_implementation_plan_v2.md §2.1 (C5), §4.1 (B1-1, B1-2, B1-3), §6.1 (SR-6, SR-7, SR-8, SR-12, SR-13).
// Approved by the S0 text of 2026-11-06 (D1, D2, D3, D5, D10 plan A, D11, D12); S3 started on "继续s3".
//
// THIS IS A STATIC TEST. It reads 945_OperatorConsole.html and checks the TEXT of showPayForm: what is called, in which
// order, which old lines survive, and that nothing outside showPayForm (and one comment block) changed. It does NOT run
// the Pay form: there is no fake DOM and no click simulation (D10 plan A: "不扩展 UI 假 DOM"; S-13 is BLOCKED and needs a
// real browser). The behaviour of the functions the form calls is covered by local_precheck_test_B1_helpers.js (S1).
// A passing result therefore means "the code is wired the way the plan says", not "the Pay form works in a browser".
//
// Usage:  node local_precheck_test_B1_payform.js [DIR] [--base BASEDIR]
//         DIR      the tree with S1 and S3 applied (default: env B1_SRC_DIR, else this file's directory).
//         BASEDIR  the same tree WITHOUT S3 (S1/S2 applied); enables the scope group F. Default: env B1_BASE_DIR.
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
function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function extractFn(src, name) {          // top-level function: from "function NAME(" at column 0 to the next "\n}\n"
  const m = new RegExp('^function ' + name + '\\s*\\(', 'm').exec(src);
  if (!m) return null;
  const end = src.indexOf('\n}\n', m.index);
  return end === -1 ? null : src.slice(m.index, end + 2);
}
function stripComments(t) { return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[ \t])\/\/[^\n]*/gm, '$1'); }   // the checks look at CODE, not at what a comment says
function norm(t) { return t.replace(/\s+/g, ' '); }       // formatting-insensitive comparison
function count(text, needle) { return text.split(needle).length - 1; }
function loadScript(dir) {
  const html = fs.readFileSync(path.join(dir, '945_OperatorConsole.html'), 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  return { html: html, js: m ? m[1] : null, tags: (html.match(/<script/g) || []).length };
}

// ── A. Load ─────────────────────────────────────────────────────────────────
section('A. Load: 945, its single script, the Pay form and the S1 functions it calls');
console.log('node', process.version, '| source dir:', SRC, '| base dir:', BASE || '(none: group F skipped)');
var cur;
try { cur = loadScript(SRC); } catch (e) { check('945_OperatorConsole.html can be read from ' + SRC, false, e.message); finish(); }
console.log('945_OperatorConsole.html  sha256', sha256(cur.html));
check('945 has exactly one "<script" (the existing UI test requires this)', cur.tags === 1);
check('945 inline <script> block found', cur.js !== null);
if (cur.js === null) finish();
var compiles = true; try { new vm.Script(cur.js); } catch (e) { compiles = false; console.log(e.message); }
check('945 <script> compiles (syntax only)', compiles);
const S1_NAMES = ['malaysiaTodayIso_', 'parsePayAmount_', 'isRealIsoDate_', 'interpretPayResponse_'];
S1_NAMES.concat(['formatAmount', 'showToast', 'loadDashboard', 'showPayForm']).forEach(function (n) {
  check('945 defines ' + n, extractFn(cur.js, n) !== null);
});
if (fail > 0) { console.log('\nRequired functions are missing: apply the S1 diff of 945 first, then the S3 diff.'); finish(); }
const jsCode = stripComments(cur.js);
const payText = stripComments(extractFn(cur.js, 'showPayForm'));
const pay = norm(payText);
const iStart = pay.indexOf("confirmBtn.addEventListener('click', function () {");
const iEnd = pay.indexOf('form.appendChild(confirmBtn);');
check('the Confirm click handler is found inside showPayForm', iStart > -1 && iEnd > iStart);
const handler = pay.slice(iStart, iEnd);
const iSucc = handler.indexOf('.withSuccessHandler('), iFail = handler.indexOf('.withFailureHandler(');
check('the handler contains a success handler followed by a failure handler', iSucc > -1 && iFail > iSucc);
const success = handler.slice(iSucc, iFail);

// ── B. Default date (SR-6) ──────────────────────────────────────────────────
section('B. Default date (B1-D1, SR-6): the Pay form starts from today in Malaysia, not from the UTC day');
check("the default date is  var today = malaysiaTodayIso_(Date.now()) || '';", pay.indexOf("var today = malaysiaTodayIso_(Date.now()) || '';") !== -1);
check('showPayForm no longer builds a date with toISOString()', pay.indexOf('toISOString') === -1);
check('the date input is still pre-filled from `today`', pay.indexOf('class="pf-date" value="\' + today + \'"') !== -1);
{
  const NEEDLE = 'nextStart.toISOString().slice(0, 10)';          // the insurance renewal form's own UTC default (945, "New Start Date")
  const others = count(jsCode, NEEDLE);
  const baseOthers = BASE ? count(stripComments(loadScript(BASE).js), NEEDLE) : null;
  check('the OTHER UTC date default (insurance renewal "New Start Date": ' + NEEDLE + ') is still there exactly once and is NOT touched, as the plan says' + (BASE ? ' (count before: ' + baseOthers + ', after: ' + others + ')' : ''),
    BASE ? (others === 1 && baseOthers === 1) : others === 1);
}

// ── C. Validate first (B1-1, B1-2) ──────────────────────────────────────────
section('C. Input is checked BEFORE the button is disabled or anything is sent (B1-1, B1-2)');
const iAmt = handler.indexOf('parsePayAmount_(amount) === null'), iDate = handler.indexOf('isRealIsoDate_(date)');
const iDis = handler.indexOf('confirmBtn.disabled = true;'), iRun = handler.indexOf('google.script.run');
check('order inside the handler: amount check < date check < disabling the button < google.script.run', iAmt > -1 && iDate > iAmt && iDis > iDate && iRun > iDis, [iAmt, iDate, iDis, iRun].join(','));
const before = handler.slice(0, iDis > -1 ? iDis : 0);
check('nothing before the validation has passed disables the button or touches google.script.run', iDis > -1 && before.indexOf('disabled') === -1 && before.indexOf('google') === -1);
check('a blank or non-numeric amount shows the exact prompt and returns',
  /if \(parsePayAmount_\(amount\) === null\) \{ showToast\('Enter a payment amount greater than 0\.', true\); return; \}/.test(handler));
check('a non-blank, unreal date shows the date prompt and returns; a BLANK date is allowed (the server then uses the Malaysia day)',
  /if \(date\.trim\(\) !== '' && !isRealIsoDate_\(date\)\) \{ showToast\('Enter a valid payment date \(yyyy-MM-dd\)\.', true\); return; \}/.test(handler));
check('the amount prompt text exists exactly once in the whole script', count(jsCode, 'Enter a payment amount greater than 0.') === 1);
check('the date prompt text exists exactly once in the whole script', count(jsCode, 'Enter a valid payment date (yyyy-MM-dd).') === 1);
check('the RAW field values are what is sent: .console_recordPayment(item.occurrenceId, amount, date, \'\') is unchanged',
  /\.console_recordPayment\(item\.occurrenceId, amount, date, ''\);/.test(handler));
check('the values are read from the two fields before validation', handler.indexOf("var amount = form.querySelector('.pf-amount').value;") !== -1 && handler.indexOf("var date = form.querySelector('.pf-date').value;") !== -1 &&
  handler.indexOf("var amount = form.querySelector('.pf-amount').value;") < iAmt);

// ── D. Response handling (B1-3, D12, SR-7) ──────────────────────────────────
section('D. The response is interpreted, not trusted (B1-3, B1-D5, B1-D12, SR-7)');
check('the success handler calls interpretPayResponse_(res, { amount: amount, date: date }) with the raw field values', success.indexOf('interpretPayResponse_(res, { amount: amount, date: date })') !== -1);
check('the success handler never reads res.success, res.data, res.alreadyPaid or res.occurrenceId itself', !/\bres\.(success|data|alreadyPaid|occurrenceId)\b/.test(success));
check('res.error is read exactly once: inside the unchanged error branch',
  count(success, 'res.error') === 1 && /if \(r\.kind === 'error'\) \{ showToast\(res\.error, true\); confirmBtn\.disabled = false; return; \}/.test(success));
check('the ORIGINAL error line (toast + button restored + return) survives word for word',
  success.indexOf('showToast(res.error, true); confirmBtn.disabled = false; return;') !== -1);
check("'Payment recorded.' is shown only in the recorded branch, with the original literal call; every other kind shows r.message with r.isError; then loadDashboard() for all of them",
  /if \(r\.kind === 'recorded'\) \{ showToast\('Payment recorded\.'\); \} else \{ showToast\(r\.message, r\.isError\); \} loadDashboard\(\);/.test(success));
check("the literal 'Payment recorded.' appears exactly twice in the script: showPayForm and interpretPayResponse_", count(jsCode, "'Payment recorded.'") === 2 && count(payText, "'Payment recorded.'") === 1 && count(stripComments(extractFn(cur.js, 'interpretPayResponse_')), "'Payment recorded.'") === 1);
check('loadDashboard() is called exactly once in the success handler, after the toast (so every non-error outcome refreshes the dashboard)', count(success, 'loadDashboard();') === 1 && success.indexOf('loadDashboard();') > success.indexOf('showToast(r.message, r.isError);'));
{
  const ik = stripComments(extractFn(cur.js, 'interpretPayResponse_')); const kinds = {}; (ik.match(/out\('(\w+)'/g) || []).forEach(function (m) { kinds[m.slice(5, -1)] = true; });
  if (/unconfirmed\(\)/.test(ik)) kinds.unconfirmed = true;
  check("the two kinds the handler branches on ('error', 'recorded') are kinds interpretPayResponse_ can return", kinds.error === true && kinds.recorded === true, Object.keys(kinds).join(','));
}

// ── E. Unchanged parts of the form ──────────────────────────────────────────
section('E. What the plan says must NOT change (SR-12, SR-8)');
check('the transport-failure callback is unchanged (toast with err.message, button restored)',
  pay.indexOf(".withFailureHandler(function (err) { showToast(err.message, true); confirmBtn.disabled = false; })") !== -1);
check('the failure-path restore line `confirmBtn.disabled = false` still appears in exactly the two places it did (error branch, failure callback)', count(handler, 'confirmBtn.disabled = false;') === 2);
check('the Cancel button handler is unchanged (form removed, original button shown again)', pay.indexOf("cancelBtn.addEventListener('click', function () { form.remove(); if (existingBtn) existingBtn.style.display = ''; });") !== -1);
{
  const m = /form\.innerHTML = (.*?);/.exec(pay);
  check('SR-8 the only HTML the form builds contains item.expectedAmount and `today`; no server text, no response, no error is put into innerHTML',
    !!m && /item\.expectedAmount/.test(m[1]) && /today/.test(m[1]) && !/\bres\b|\br\.|\berr\b|\bamount\b|\bdate\b/.test(m[1].replace(/<[^>]*>/g, '').replace(/'[^']*'/g, '')), m ? m[1].slice(0, 120) : 'no innerHTML');
  check('SR-8 the response text reaches the page only through showToast (which writes with textContent)', extractFn(cur.js, 'showToast').indexOf('t.textContent = msg;') !== -1 && !/innerHTML\s*=[^;]*\b(r\.message|res\.error)\b/.test(jsCode));
}
{
  const st = extractFn(cur.js, 'showToast');
  const m = /durationMs \|\| (\d+)/.exec(st);
  console.log('      info (not a check): showToast keeps its default duration of ' + (m ? m[1] : '?') + ' ms; the longest new message is ' +
    ["Enter a payment amount greater than 0.", "Enter a valid payment date (yyyy-MM-dd).", "Payment result could not be confirmed.",
     "Already recorded earlier. The recorded amount or date could not be read.",
     "This bill was already paid on 2026-10-27 for RM 1,550.00. The amount or date you entered was NOT saved."].reduce(function (a, s) { return Math.max(a, s.length); }, 0) +
    ' characters (the "NOT saved" message with a typical date and amount).');
}

// ── F. Scope (needs --base) ─────────────────────────────────────────────────
section('F. Nothing else in 945 changed: with showPayForm and the S1 header comment cut out, before and after are identical');
if (!BASE) {
  console.log('SKIP : no --base directory given (group F is not counted)');
} else {
  var baseS; try { baseS = loadScript(BASE); } catch (e) { baseS = null; }
  check('the base 945 can be read from ' + BASE, baseS !== null);
  if (baseS !== null) {
    const cut = function (html) {
      var t = html.replace(extractFn(html, 'showPayForm'), '/*SHOWPAYFORM*/');
      t = t.replace(/\/\/ ─── B1 S1[^\n]*\n(?:\/\/[^\n]*\n)*/, '/*S1HEADER*/\n');
      return t;
    };
    const a = cut(baseS.html), b = cut(cur.html);
    check('outside showPayForm and the S1 header comment, 945 is byte-identical before and after S3 (Add Bill, dashboard, toast, CSS, markup, the S1 functions)', a === b && a.indexOf('/*SHOWPAYFORM*/') !== -1 && a.indexOf('/*S1HEADER*/') !== -1);
    check('the cut-out parts really differ (the comparison is not vacuous)', stripComments(extractFn(baseS.html, 'showPayForm')) !== payText);
    S1_NAMES.forEach(function (n) { check('the S1 function ' + n + ' is byte-identical before and after S3', extractFn(baseS.html, n) === extractFn(cur.html, n)); });
    ['submitAddBill', 'loadDashboard', 'showToast', 'renderDashboard', 'loadProperties'].forEach(function (n) {
      const x = extractFn(baseS.html, n);
      if (x !== null) check('945 ' + n + ' is byte-identical before and after S3', x === extractFn(cur.html, n));
    });
    check('the header comment no longer says the helpers are unwired', cur.html.indexOf('NOT WIRED YET') === -1 && cur.html.indexOf('Nothing below is called by the Pay form until S3') === -1);
  }
}

console.log('\nNOTE: S-13 (Pay form click path in a real browser) is NOT covered by this static test and remains unverified.');
finish();
