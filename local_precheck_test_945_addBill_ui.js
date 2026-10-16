// 945 Operator Console — Add Bill / Property selector behaviour.
// Node `vm` + a small hand-written fake DOM. NOT a browser, NOT HtmlService, NOT GAS, NOT production.
// It loads the single inline <script> of 945_OperatorConsole.html and drives loadProperties() and
// submitAddBill() against a mocked google.script.run. Layout, CSS, real events and the HtmlService
// sandbox are NOT modelled; heavy renderers unrelated to Add Bill (loadDashboard, renderPropertiesList)
// are replaced by test doubles after the script is loaded. No runtime file is modified.
//
// Two kinds of result:
//   check()        — behaviour the current code must keep (a failure fails the run).
//   knownDefect()  — a documented gap in the CURRENT 945. It does not fail the run; when the gap is
//                    fixed it reports "now fixed" so the line can be promoted to check().
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const HTML_FILE = path.join(__dirname, '945_OperatorConsole.html');
var pass = 0, fail = 0, known = 0;
function check(label, cond, detail) {
  if (cond) { pass++; console.log('ok  :', label); }
  else { fail++; console.log('FAIL:', label, detail === undefined ? '' : '-> ' + JSON.stringify(detail)); }
}
function knownDefect(label, fixedCondition) {
  if (fixedCondition) { pass++; console.log('ok  : (known defect is now FIXED — promote to check())', label); }
  else { known++; console.log('KNOWN DEFECT (does not fail the run):', label); }
}

function loadUI(opt) {
  opt = opt || {};
  const html = fs.readFileSync(HTML_FILE, 'utf8');
  if ((html.match(/<script/g) || []).length !== 1) throw new Error('expected exactly one inline <script> in 945');
  const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const els = {}, toasts = [], uncaught = [], pending = [], calls = [];
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  function El() {
    this._value = ''; this._set = false; this._text = ''; this._html = ''; this.children = [];
    this.style = {}; this.className = ''; this.disabled = false; this.checked = false;
    this.classList = { add: function () {}, remove: function () {}, contains: function () { return false; } };
  }
  Object.defineProperty(El.prototype, 'value', {
    get: function () { return this._set ? this._value : (this.children.length ? this.children[0].value : this._value); },
    set: function (v) { this._value = v; this._set = true; } });
  Object.defineProperty(El.prototype, 'textContent', {
    get: function () { return this._text; }, set: function (v) { this._text = String(v); this._html = esc(v); } });
  Object.defineProperty(El.prototype, 'innerHTML', {
    get: function () { return this._html; },
    set: function (v) { this._html = String(v); this.children = []; this._set = false;
      var re = /<option value="([^"]*)">([^<]*)<\/option>/g, m;
      while ((m = re.exec(String(v)))) { var o = new El(); o.value = m[1]; o.textContent = m[2]; this.children.push(o); } } });
  El.prototype.appendChild = function (c) { this.children.push(c); return c; };
  El.prototype.cloneNode = function () { var c = new El(); c.value = this.value; c.textContent = this.textContent; return c; };
  El.prototype.addEventListener = function () {};
  El.prototype.querySelectorAll = function () { return []; };
  El.prototype.querySelector = function () { return null; };
  const document = {
    getElementById: function (id) { return els[id] || (els[id] = new El()); },
    createElement: function () { return new El(); }, addEventListener: function () {},
    querySelectorAll: function () { return []; }, querySelector: function () { return null; } };
  function runner(h) {
    return new Proxy({}, { get: function (_, name) {
      if (name === 'withSuccessHandler') return function (f) { return runner(Object.assign({}, h, { ok: f })); };
      if (name === 'withFailureHandler') return function (f) { return runner(Object.assign({}, h, { fail: f })); };
      return function () {
        const args = Array.prototype.slice.call(arguments); calls.push({ name: String(name), args: args });
        const deliver = function () {
          // A browser does not propagate an exception thrown inside a callback to the caller; it is "uncaught".
          const safely = function (f, a) { try { f(a); } catch (e) { uncaught.push(e.name + ': ' + e.message); } };
          var r;
          try { r = opt.server[name].apply(null, args); } catch (e) { if (h.fail) safely(h.fail, e); return; }
          if (r && r.__throw) { if (h.fail) safely(h.fail, new Error(r.__throw)); return; }
          if (h.ok) safely(h.ok, r);
        };
        if (opt.deferred) pending.push(deliver); else deliver();
      }; } });
  }
  const google = { script: { run: runner({}) } };
  const ctx = vm.createContext({ document: document, google: google, console: console,
    setTimeout: function (f, ms) { return ms; }, clearTimeout: function () {}, Array: Array, String: String, Number: Number, JSON: JSON, Object: Object });
  vm.runInContext(code, ctx);
  ctx.__dash = 0;
  vm.runInContext('loadDashboard = function () { __dash++; }; renderPropertiesList = function () {};', ctx);   // test doubles
  const realShow = ctx.showToast;
  ctx.showToast = function (msg, isErr, dur) { toasts.push({ msg: msg, isErr: !!isErr, dur: dur }); return realShow.apply(this, arguments); };
  return { ctx: ctx, toasts: toasts, uncaught: uncaught, pending: pending, calls: calls,
    el: function (id) { return document.getElementById(id); }, dash: function () { return ctx.__dash; },
    saves: function () { return calls.filter(function (c) { return c.name === 'console_createObligation'; }); } };
}

const PROPS = [
  { PropertyID: 'PROP-mshs0wca-skrq', PropertyName: 'Est8 Seputeh', UnitLabel: 'A-19-11' },
  { PropertyID: 'P2', PropertyName: 'Other', UnitLabel: '' },
  { PropertyID: 'P3', PropertyName: 'Third' },
  { PropertyID: 'P4', PropertyName: 'Fourth', UnitLabel: null },
  { PropertyID: 'P5', PropertyName: 'Fifth', UnitLabel: '   ' },
  { PropertyID: 'P6', PropertyName: '', UnitLabel: 'B-1' } ];
const EMPTY_MSG = 'No properties available. Please add a property before creating a bill.';
const GENERIC_MSG = 'Please fill in Property, Category, Payee, Amount, and Due Date.';
function created(id, due) { return { success: true, data: { obligationId: id, occurrenceId: 'OCC-X', rule: due ? { DueAnchor: due } : undefined } }; }
function fill(u, over) {
  const v = Object.assign({ ob_category: 'Water', ob_payee: 'Air Selangor', ob_amount: '42.50', ob_frequencyType: 'Monthly',
    ob_dueAnchor: '2026-10-15', ob_graceDays: '0', ob_customIntervalDays: '', ob_endDate: '' }, over || {});
  Object.keys(v).forEach(function (k) { u.el(k).value = v[k]; });
  u.el('ob_autoGenerate').checked = true;
}
function ready(server, opt) {
  const u = loadUI(Object.assign({ server: Object.assign({ console_listProperties: function () { return { success: true, data: PROPS }; } }, server || {}) }, opt || {}));
  u.ctx.loadProperties(); if (opt && opt.deferred) u.pending.shift()();
  u.el('ob_propertyId').value = 'PROP-mshs0wca-skrq'; fill(u); return u;
}

console.log('=== Property options and labels ===');
{
  const u = loadUI({ server: { console_listProperties: function () { return { success: true, data: PROPS }; } } });
  u.ctx.loadProperties();
  const add = u.el('ob_propertyId'), flt = u.el('propertyFilter');
  const ids = PROPS.map(function (p) { return p.PropertyID; });
  check('Add Bill option values are the canonical PropertyIDs', JSON.stringify(add.children.map(function (o) { return o.value; })) === JSON.stringify(ids));
  check('dashboard filter keeps "All Properties" and canonical PropertyIDs',
    flt.children[0].textContent === 'All Properties' && JSON.stringify(flt.children.slice(1).map(function (o) { return o.value; })) === JSON.stringify(ids));
  const labels = add.children.map(function (o) { return o.textContent; });
  check('label shows property and unit: "Est8 Seputeh · A-19-11"', labels[0] === 'Est8 Seputeh · A-19-11', labels[0]);
  check('missing / null / blank UnitLabel -> name only, no separator', labels.slice(1, 5).join('|') === 'Other|Third|Fourth|Fifth', labels);
  check('missing PropertyName falls back to the PropertyID', labels[5] === 'P6 · B-1', labels[5]);
  check('no label contains "undefined" or "null"', labels.every(function (l) { return !/undefined|null/.test(l); }), labels);
  check('the label is never used as the value (value stays the ID)', add.children.every(function (o, i) { return o.value === ids[i] && o.value !== o.textContent; }));
}

console.log('\n=== loading / empty / failed-to-load are three different states ===');
{
  const u = loadUI({ deferred: true, server: { console_listProperties: function () { return { success: true, data: [] }; } } });
  u.ctx.loadProperties(); const st = u.el('ob_propertyStatus');
  check('LOADING shows "Loading properties…"', st.textContent === 'Loading properties…' && st.style.display === 'block', st.textContent);
  u.pending.shift()();
  check('EMPTY shows the exact empty-state message, not error-styled', st.textContent === EMPTY_MSG && st.className === 'field-note', [st.textContent, st.className]);
  check('EMPTY leaves the Add Bill select without options', u.el('ob_propertyId').children.length === 0);
}
[['server reports failure', function () { return { success: false, error: 'boom' }; }, /^Failed to load properties: boom/],
 ['transport failure', function () { return { __throw: 'net down' }; }, /^Failed to load properties: net down/],
 ['NULL response (what google.script.run delivers for an unserializable result)', function () { return null; }, /^Failed to load properties: The server returned no data/],
 ['non-array data', function () { return { success: true, data: {} }; }, /^Failed to load properties: Unexpected response/]].forEach(function (c) {
  const u = loadUI({ server: { console_listProperties: c[1] } }); u.ctx.loadProperties(); const st = u.el('ob_propertyStatus');
  check(c[0] + ' -> FAILURE state (error-styled, reason shown), never the empty message',
    c[2].test(st.textContent) && st.className === 'field-note error' && st.textContent !== EMPTY_MSG && /does not mean there are no properties/.test(st.textContent), st.textContent);
  check(c[0] + ' -> no uncaught exception in the callback', u.uncaught.length === 0, u.uncaught);
});
{
  var n = 0; const u = loadUI({ server: { console_listProperties: function () { return ++n === 1 ? { success: true, data: PROPS } : { success: false, error: 'later' }; } } });
  u.ctx.loadProperties(); u.ctx.loadProperties();
  check('a failed reload keeps the last good list and says so', u.el('ob_propertyId').children.length === PROPS.length && /Showing the last loaded list/.test(u.el('ob_propertyStatus').textContent));
  const r = loadUI({ server: { console_listProperties: function () { return { success: true, data: PROPS }; } } }); r.ctx.loadProperties();
  check('READY hides the status line', r.el('ob_propertyStatus').style.display === 'none' && r.el('ob_propertyStatus').textContent === '');
}

console.log('\n=== a Property must be selected; required fields; client-side checks ===');
[['empty', function () { return { success: true, data: [] }; }, EMPTY_MSG],
 ['failed to load', function () { return { success: false, error: 'boom' }; }, /failed to load/],
 ['null response', function () { return null; }, /failed to load/]].forEach(function (c) {
  const u = loadUI({ server: { console_listProperties: c[1] } }); u.ctx.loadProperties(); fill(u); u.ctx.submitAddBill();
  const t = u.toasts[u.toasts.length - 1];
  check('no Property selectable (' + c[0] + ') -> specific error, nothing sent', t.isErr && (typeof c[2] === 'string' ? t.msg === c[2] : c[2].test(t.msg)) && u.saves().length === 0, t);
});
{
  const u = loadUI({ deferred: true, server: { console_listProperties: function () { return { success: true, data: PROPS }; } } });
  u.ctx.loadProperties(); fill(u); u.ctx.submitAddBill();
  check('submit while Properties are still loading -> "still loading", nothing sent', /still loading/.test(u.toasts.slice(-1)[0].msg) && u.saves().length === 0);
}
{
  [['category', { ob_category: '' }], ['payee', { ob_payee: '' }], ['amount (empty)', { ob_amount: '' }], ['amount 0', { ob_amount: '0' }],
   ['amount not a number', { ob_amount: 'abc' }], ['due date', { ob_dueAnchor: '' }]].forEach(function (c) {
    const u = ready(); fill(u, c[1]); u.ctx.submitAddBill();
    check('missing/invalid ' + c[0] + ' is stopped on the client with the generic message, nothing sent',
      u.toasts.slice(-1)[0].msg === GENERIC_MSG && u.toasts.slice(-1)[0].isErr && u.saves().length === 0 && u.el('ob_submit').disabled === false);
  });
  const u = ready(); u.el('ob_propertyId').value = ''; u.ctx.submitAddBill();
  check('Property deselected (while others are fine) -> generic message, nothing sent', u.toasts.slice(-1)[0].msg === GENERIC_MSG && u.saves().length === 0);
  const neg = ready({ console_createObligation: function () { return { success: false, code: 'INVALID_INPUT', error: 'Amount must be greater than 0.' }; } }); fill(neg, { ob_amount: '-5' }); neg.ctx.submitAddBill();
  check('(current behaviour) a NEGATIVE amount passes the client check and is rejected by the server instead', neg.saves().length === 1 && neg.toasts.slice(-1)[0].msg === 'Amount must be greater than 0.' && neg.toasts.slice(-1)[0].isErr);
}

console.log('\n=== submission: the selected Property drives what is sent; button state; messages ===');
{
  const u = ready({ console_createObligation: function () { return created('OBL-1', '2026-10-15'); } });
  u.ctx.submitAddBill(); u.el('ob_propertyId').value = 'P2'; fill(u); u.ctx.submitAddBill();
  const sent = u.saves().map(function (c) { return c.args[0]; });
  check('first save sends the selected canonical PropertyID, the second sends the newly selected one', sent[0].propertyId === 'PROP-mshs0wca-skrq' && sent[1].propertyId === 'P2', sent.map(function (s) { return s.propertyId; }));
  check('the saved input carries the canonical category and numeric amount', sent[0].category === 'Water' && sent[0].amount === 42.5 && typeof sent[0].amount === 'number' && sent[0].dueAnchor === '2026-10-15' && sent[0].frequencyType === 'Monthly');
  check('the UI sends no currency, no payment status and no payment date', ['currency', 'status', 'paidDate', 'paidAmount', 'paid'].every(function (k) { return !(k in sent[0]); }), Object.keys(sent[0]));
}
{
  const u = ready({ console_createObligation: function () { return created('OBL-123', '2026-10-15'); } }, { deferred: true });
  u.ctx.submitAddBill();
  check('Save button is DISABLED while the request is in flight', u.el('ob_submit').disabled === true);
  check('no success message before the server answers', u.toasts.every(function (t) { return !/Bill added/.test(t.msg); }));
  u.pending.shift()();
  const t = u.toasts.slice(-1)[0];
  check('success -> message with Obligation ID and first due date, shown long enough to read', t.msg === 'Bill added. Obligation ID: OBL-123 · First due: 2026-10-15' && !t.isErr && t.dur === 10000, t);
  check('success -> button restored; payee and amount cleared; Property and category kept', u.el('ob_submit').disabled === false && u.el('ob_payee').value === '' && u.el('ob_amount').value === '' && u.el('ob_propertyId').value === 'PROP-mshs0wca-skrq' && u.el('ob_category').value === 'Water');
  check('success -> dashboard reloaded once', u.dash() === 1);
}
[['id only', { success: true, data: { obligationId: 'OBL-9' } }, 'Bill added. Obligation ID: OBL-9'],
 ['nothing returned', { success: true, data: {} }, 'Bill added.']].forEach(function (c) {
  const u = ready({ console_createObligation: function () { return c[1]; } }); u.ctx.submitAddBill();
  check('success message uses only values the server returned (' + c[0] + ')', u.toasts.slice(-1)[0].msg === c[2], u.toasts.slice(-1)[0].msg);
});
{
  const u = ready({ console_createObligation: function () { return { success: false, code: 'PROPERTY_NOT_FOUND', error: 'Property not found.' }; } }, { deferred: true });
  u.ctx.submitAddBill(); check('button disabled while a (failing) request is in flight', u.el('ob_submit').disabled === true);
  u.pending.shift()(); const t = u.toasts.slice(-1)[0];
  check('failed result -> the server error is shown as an error', t.isErr && t.msg === 'Property not found.', t);
  check('failed result -> NO success message anywhere', u.toasts.every(function (x) { return !/Bill added/.test(x.msg); }));
  check('failed result -> button restored', u.el('ob_submit').disabled === false);
  check('failed result -> every entered value is preserved', u.el('ob_propertyId').value === 'PROP-mshs0wca-skrq' && u.el('ob_category').value === 'Water' && u.el('ob_payee').value === 'Air Selangor' && u.el('ob_amount').value === '42.50' && u.el('ob_dueAnchor').value === '2026-10-15' && u.el('ob_frequencyType').value === 'Monthly');
  check('failed result -> dashboard not reloaded', u.dash() === 0);
}
{
  const u = ready({ console_createObligation: function () { return { __throw: 'net down' }; } }); u.ctx.submitAddBill();
  check('error callback (transport failure) -> error shown, button restored, values kept, no success text',
    u.toasts.slice(-1)[0].msg === 'net down' && u.toasts.slice(-1)[0].isErr && u.el('ob_submit').disabled === false && u.el('ob_payee').value === 'Air Selangor' && u.toasts.every(function (x) { return !/Bill added/.test(x.msg); }));
}

console.log('\n=== Insurance category (two-step save) ===');
{
  const ins = { ob_category: 'Insurance', ob_insInsuranceCompany: 'Co', ob_insPolicyNumber: 'N1', ob_insCoverageType: 'Fire', ob_insCoverageAmount: '1000', ob_insPolicyStartDate: '2026-01-01', ob_insPolicyExpiryDate: '2027-01-01' };
  const run = function (pol) { const u = ready({ console_createObligation: function () { return created('OBL-9', '2026-11-01'); }, console_createInsurancePolicy: pol }); fill(u, ins); u.ctx.submitAddBill(); return u; };
  var u = run(function () { return { success: true, data: {} }; });
  check('both steps succeed -> "Bill and policy added" with ID + first due; policy step used the returned obligationId',
    u.toasts.slice(-1)[0].msg === 'Bill and policy added. Obligation ID: OBL-9 · First due: 2026-11-01' && u.calls.filter(function (c) { return c.name === 'console_createInsurancePolicy'; })[0].args[0] === 'OBL-9' && u.el('ob_submit').disabled === false);
  u = run(function () { return { success: false, error: 'pfail' }; });
  check('policy step fails -> the existing "Bill added, but the policy details failed" error, button restored',
    u.toasts.slice(-1)[0].msg === 'Bill added, but the policy details failed to save: pfail' && u.toasts.slice(-1)[0].isErr && u.el('ob_submit').disabled === false);
  u = run(function () { return { __throw: 'net down' }; });
  check('policy step transport failure -> same error message, button restored', u.toasts.slice(-1)[0].msg === 'Bill added, but the policy details failed to save: net down' && u.el('ob_submit').disabled === false);
}

console.log('\n=== empty / null server responses to the SAVE request (current behaviour) ===');
{
  const u = ready({ console_createObligation: function () { return null; } }); u.ctx.submitAddBill();
  console.log('     (observed: uncaught =', JSON.stringify(u.uncaught), '| button disabled =', u.el('ob_submit').disabled, '| messages =', u.toasts.length, ')');
  knownDefect('NULL response to Save: the callback must not throw, the button must be restored and a message shown', u.uncaught.length === 0 && u.el('ob_submit').disabled === false && u.toasts.length > 0);
  knownDefect('NULL response to Save: the UI must not stay permanently disabled', u.el('ob_submit').disabled === false);
  const v = ready({ console_createObligation: function () { return { success: false }; } }); v.ctx.submitAddBill();
  knownDefect('failure result WITHOUT an error text must not render the literal text "undefined" in the toast', v.el('toast').textContent !== 'undefined');
  const ins = { ob_category: 'Insurance', ob_insInsuranceCompany: 'Co', ob_insPolicyNumber: 'N1', ob_insCoverageType: 'Fire', ob_insCoverageAmount: '1000', ob_insPolicyStartDate: '2026-01-01', ob_insPolicyExpiryDate: '2027-01-01' };
  const w = ready({ console_createObligation: function () { return created('OBL-9', '2026-11-01'); }, console_createInsurancePolicy: function () { return null; } }); fill(w, ins); w.ctx.submitAddBill();
  knownDefect('NULL response to the policy step must produce a message (button is restored, but today nothing is shown)', w.uncaught.length === 0 && w.toasts.length > 0);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed, ' + known + ' known defects');
process.exit(fail ? 1 : 0);
