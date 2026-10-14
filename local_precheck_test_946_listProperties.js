// 946 console_listProperties — browser-safety of the Property list.
// Node + GasShim (in-memory Sheets). NOT GAS, NOT a browser.
// GasShim reproduces real Sheets' coercion of ISO-date-shaped strings into Date
// values in cells that are not text-formatted, which is the failure condition.
const { loadPropertyOSContext } = require('./GasShim.js');
const vm = require('vm');

const FILES = [
  '900_PropertyConfig.js', '901_PropertySchema.js', '902_PropertyIdentity.js',
  '903_PropertyEventDefinitions.js', '910_PropertyAssetEngine.js', '946_OperatorConsoleServer.js'
];

var pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('ok  :', label); }
  else { fail++; console.log('FAIL:', label); }
}
function fresh() { return loadPropertyOSContext(__dirname, FILES).ctx; }
function run(ctx, code) { return vm.runInContext(code, ctx); }
function hasDate(v) {
  if (v instanceof Date) return true;
  if (Array.isArray(v)) return v.some(hasDate);
  if (v && typeof v === 'object') return Object.keys(v).some(function (k) { return hasDate(v[k]); });
  return false;
}
function mkProperty(ctx, extra) {
  const input = Object.assign({
    propertyName: 'Est8 Seputeh', addressLine1: 'A-19-11', purchasePrice: 658000,
    freeholdLeasehold: 'Leasehold', propertyType: 'RESIDENTIAL_CONDO',
    purchaseDate: '2021-12-27', vpDate: '2026-07-18', unitLabel: 'A-19-11', developmentName: 'Est8 Seputeh'
  }, extra || {});
  return run(ctx, 'createProperty(' + JSON.stringify(input) + ').propertyId || createProperty(' + JSON.stringify(input) + ')');
}
// Put a real date into a cell the way a manual edit would: un-protect the cell, then write an ISO string.
function typeIntoCell(ctx, columnName, isoString) {
  const sheet = run(ctx, 'propertySheet_()');
  const col = run(ctx, 'PROPERTY_SCHEMA.Property.columns').indexOf(columnName) + 1;
  sheet.getRange(2, col, 1, 1).setNumberFormat('General');
  sheet.getRange(2, col, 1, 1).setValues([[isoString]]);
}

console.log('=== normal row (script-written, text dates): result identical to the engine ===');
{
  const ctx = fresh();
  run(ctx, 'createProperty(' + JSON.stringify({
    propertyName: 'Est8 Seputeh', addressLine1: 'A-19-11', purchasePrice: 658000, freeholdLeasehold: 'Leasehold',
    propertyType: 'RESIDENTIAL_CONDO', purchaseDate: '2021-12-27', vpDate: '2026-07-18', unitLabel: 'A-19-11', developmentName: 'Est8 Seputeh'
  }) + ')');
  const engine = run(ctx, 'listActiveProperties()');
  const res = run(ctx, 'console_listProperties()');
  check('returns success with one Active property', res.success === true && Array.isArray(res.data) && res.data.length === 1);
  check('no Date anywhere in the result', !hasDate(res));
  check('values identical to the engine output when there are no Date cells', JSON.stringify(res.data) === JSON.stringify(engine));
  check('PropertyID / PropertyName / UnitLabel / Status preserved',
    /^PROP-/.test(res.data[0].PropertyID) && res.data[0].PropertyName === 'Est8 Seputeh' &&
    res.data[0].UnitLabel === 'A-19-11' && res.data[0].Status === 'Active');
}

console.log('\n=== the live failure condition: real Date values in Properties date cells ===');
{
  const ctx = fresh();
  run(ctx, 'createProperty(' + JSON.stringify({
    propertyName: 'Est8 Seputeh', addressLine1: 'A-19-11', purchasePrice: 658000, freeholdLeasehold: 'Leasehold',
    propertyType: 'RESIDENTIAL_CONDO', unitLabel: 'A-19-11', developmentName: 'Est8 Seputeh'
  }) + ')');
  typeIntoCell(ctx, 'PurchaseDate', '2021-12-27');
  typeIntoCell(ctx, 'VPDate', '2026-07-18');
  const engine = run(ctx, 'listActiveProperties()');
  check('precondition: the engine really returns Date objects for those cells (what GAS turns into null)',
    engine[0].PurchaseDate instanceof Date && engine[0].VPDate instanceof Date);
  const res = run(ctx, 'console_listProperties()');
  check('console_listProperties still succeeds', res.success === true && res.data.length === 1);
  check('result contains NO Date objects (so google.script.run can deliver it)', !hasDate(res));
  check('PurchaseDate is the same calendar day as text', res.data[0].PurchaseDate === '2021-12-27');
  check('VPDate is the same calendar day as text', res.data[0].VPDate === '2026-07-18');
  check('canonical PropertyID unchanged by the conversion', res.data[0].PropertyID === engine[0].PropertyID);
  check('result survives a JSON round trip unchanged', JSON.stringify(JSON.parse(JSON.stringify(res))) === JSON.stringify(res));
  check('non-Date values untouched (number stays number, text stays text)',
    res.data[0].PurchasePrice === engine[0].PurchasePrice && typeof res.data[0].PurchasePrice === 'number' &&
    res.data[0].PropertyName === 'Est8 Seputeh');
}

console.log('\n=== ...At columns keep their time of day ===');
{
  const ctx = fresh();
  run(ctx, 'createProperty(' + JSON.stringify({
    propertyName: 'P', addressLine1: 'X', purchasePrice: 1, freeholdLeasehold: 'Freehold', propertyType: 'LAND'
  }) + ')');
  const sheet = run(ctx, 'propertySheet_()');
  const col = run(ctx, 'PROPERTY_SCHEMA.Property.columns').indexOf('CreatedAt') + 1;
  sheet.data[1][col - 1] = new Date(Date.UTC(2026, 7, 6, 17, 15, 11, 673));
  const res = run(ctx, 'console_listProperties()');
  check('a Date in CreatedAt becomes an ISO datetime string, not a bare date', res.data[0].CreatedAt === '2026-08-06T17:15:11.673Z');
  check('and the result is still Date-free', !hasDate(res));
}

console.log('\n=== failure path unchanged ===');
{
  const ctx = fresh();
  run(ctx, 'listActiveProperties = function () { throw new Error("boom"); };');
  const res = run(ctx, 'console_listProperties()');
  check('an engine error is still reported as {success:false, error}', res.success === false && res.error === 'boom');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
