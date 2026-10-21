// 946 console_createObligation — the Add Bill save path as the Operator Console UI calls it.
// Node + GasShim (in-memory Sheets). NOT GAS, NOT a browser, NOT production. No real data is touched.
// The input object is exactly the shape 945 submitAddBill() builds (Number() conversions included).
const { loadPropertyOSContext } = require('./GasShim.js');
const vm = require('vm');

const FILES = [
  '900_PropertyConfig.js', '901_PropertySchema.js', '902_PropertyIdentity.js', '903_PropertyEventDefinitions.js',
  '910_PropertyAssetEngine.js', '912_ObligationEngine.js', '913_ObligationScheduler.js', '946_OperatorConsoleServer.js'
];

var pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('ok  :', label); }
  else { fail++; console.log('FAIL:', label); }
}
function fresh() {
  const ctx = loadPropertyOSContext(__dirname, FILES).ctx;
  const run = function (c) { return vm.runInContext(c, ctx); };
  const ss = run('SpreadsheetApp.getActiveSpreadsheet()');
  const rows = function (name) { const sh = ss.getSheetByName(name); return sh ? sh.data.length - 1 : 0; };
  const row = function (name, columns, i) {
    const sh = ss.getSheetByName(name); const o = {};
    run(columns).forEach(function (c, k) { o[c] = sh.data[i][k]; });
    return o;
  };
  return {
    run: run,
    counts: function () { return rows('ObligationRules') + '/' + rows('ObligationOccurrences') + '/' + rows('ObligationHistory'); },
    rule: function (i) { return row('ObligationRules', 'PROPERTY_SCHEMA.ObligationRule.columns', i); },
    occ: function (i) { return row('ObligationOccurrences', 'PROPERTY_SCHEMA.ObligationOccurrence.columns', i); },
    hist: function (i) { return row('ObligationHistory', 'PROPERTY_SCHEMA.ObligationHistory.columns', i); },
    property: function (name) {
      run('createProperty(' + JSON.stringify({ propertyName: name, addressLine1: 'x', purchasePrice: 1,
        freeholdLeasehold: 'Leasehold', propertyType: 'RESIDENTIAL_CONDO', unitLabel: 'A-19-11' }) + ')');
      return run('listActiveProperties()').filter(function (p) { return p.PropertyName === name; })[0].PropertyID;
    },
    save: function (input) { return run('console_createObligation(' + JSON.stringify(input) + ')'); }
  };
}
function uiInput(propertyId, over) {
  return Object.assign({ propertyId: propertyId, category: 'Water', payee: 'Air Selangor', amount: Number('42.50'),
    frequencyType: 'Monthly', dueAnchor: '2026-10-15', graceDays: Number('0' || 0), autoGenerate: true }, over || {});
}

console.log('=== Water / Electricity / MaintenanceFee: canonical category, PropertyID, amount, state ===');
['Water', 'Electricity', 'MaintenanceFee'].forEach(function (category) {
  const t = fresh(); const pid = t.property('Est8 Seputeh');
  check(category + ' is a canonical category value in PROPERTY_CONFIG',
    t.run('PROPERTY_CONFIG.OBLIGATION_CATEGORIES').indexOf(category) !== -1);
  const res = t.save(uiInput(pid, { category: category }));
  check(category + ': save succeeds and returns ids + rule', res.success === true && /^OBL-/.test(res.data.obligationId) &&
    /^OCC-/.test(res.data.occurrenceId) && res.data.rule && res.data.rule.DueAnchor === '2026-10-15');
  check(category + ': exactly one new row in ObligationRules / Occurrences / History', t.counts() === '1/1/1');
  const rule = t.rule(1), occ = t.occ(1), hist = t.hist(1);
  check(category + ': rule stores the canonical category and the selected canonical PropertyID',
    rule.Category === category && rule.PropertyID === pid && res.data.rule.Category === category);
  check(category + ': amount stored as a number', typeof rule.Amount === 'number' && rule.Amount === 42.5);
  check(category + ': currency comes from PROPERTY_CONFIG.DEFAULT_CURRENCY (the UI sends none)',
    rule.Currency === t.run('PROPERTY_CONFIG.DEFAULT_CURRENCY') && occ.Currency === rule.Currency);
  check(category + ': returned ids match the stored rows', res.data.obligationId === rule.ObligationID && res.data.occurrenceId === occ.OccurrenceID);
  check(category + ': first Occurrence EffectiveDue equals the entered due date', occ.EffectiveDue === '2026-10-15');
  check(category + ': a newly entered bill is NOT paid (Status Active, no payment fields)',
    rule.Status === 'Active' && occ.Status === 'Active' && occ.PaidDate === '' && occ.PaidAmount === '' && occ.PaidVia === '');
  check(category + ': history row records creation (blank -> Active)',
    hist.OccurrenceID === occ.OccurrenceID && hist.FromStatus === '' && hist.ToStatus === 'Active');
});

console.log('\n=== the selected Property drives the saved Property reference ===');
{
  const t = fresh(); const p1 = t.property('Est8 Seputeh'); const p2 = t.property('Second Property');
  t.save(uiInput(p1)); t.save(uiInput(p2));
  check('first save references the first selected PropertyID', t.rule(1).PropertyID === p1);
  check('after changing the selection, the next save references the other PropertyID', t.rule(2).PropertyID === p2 && p1 !== p2);
}

console.log('\n=== failed saves report failure and write nothing ===');
{
  const t = fresh(); const pid = t.property('Est8 Seputeh');
  [['amount -5', { amount: -5 }, 'INVALID_INPUT'], ['amount 0', { amount: 0 }, 'INVALID_INPUT'], ['amount NaN', { amount: NaN }, 'INVALID_INPUT'],
   ['unknown PropertyID', { propertyId: 'PROP-doesnotexist-0000' }, 'PROPERTY_NOT_FOUND'],
   ['empty PropertyID', { propertyId: '' }, 'INVALID_ID_FORMAT'],
   ['category with a trailing space', { category: 'Water ' }, 'INVALID_CATEGORY'],
   ['category in lower case', { category: 'water' }, 'INVALID_CATEGORY'],
   ['missing due date', { dueAnchor: '' }, 'INVALID_INPUT'],
   ['unknown frequency', { frequencyType: 'Daily' }, 'INVALID_FREQUENCY']].forEach(function (c) {
    const before = t.counts(); const res = t.save(uiInput(pid, c[1]));
    check(c[0] + ': success=false with code ' + c[2], res.success === false && res.code === c[2] && typeof res.error === 'string' && res.error.length > 0);
    check(c[0] + ': nothing written to any Obligation sheet', t.counts() === before);
  });
}

console.log('\n=== repeated submission (current behaviour of the existing API) ===');
{
  const t = fresh(); const pid = t.property('Est8 Seputeh');
  const a = t.save(uiInput(pid, { clientRequestId: 'req-1' })); const b = t.save(uiInput(pid, { clientRequestId: 'req-1' }));
  check('the API\'s own clientRequestId mechanism returns the first result and writes once',
    a.success && b.success && a.data.obligationId === b.data.obligationId && t.counts() === '1/1/1');
}
{
  // The Add Bill UI sends NO clientRequestId, so the API has nothing to de-duplicate on.
  // This documents the current behaviour; if idempotency is ever added to the UI path, update this check.
  const t = fresh(); const pid = t.property('Est8 Seputeh');
  const a = t.save(uiInput(pid)); const b = t.save(uiInput(pid));
  check('without clientRequestId (as the UI sends it) the same input creates two separate rules',
    a.success && b.success && a.data.obligationId !== b.data.obligationId && t.counts() === '2/2/2');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
