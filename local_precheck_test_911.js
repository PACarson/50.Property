const { loadPropertyOSContext } = require('./GasShim.js');
const vm = require('vm');

const FILES = [
  '900_PropertyConfig.js', '901_PropertySchema.js', '902_PropertyIdentity.js',
  '903_PropertyEventDefinitions.js', '910_PropertyAssetEngine.js', '918_DefectEngine.js',
  '911_DocumentEngine.js'
];

var pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('ok  :', label); }
  else { fail++; console.log('FAIL:', label); }
}
function throws(label, fn) {
  try { fn(); check(label, false); }
  catch (e) { check(label + '  [threw: ' + e.message.slice(0, 70) + '...]', true); }
}
function fresh() { return loadPropertyOSContext(__dirname, FILES).ctx; }
function run(ctx, code) { return vm.runInContext(code, ctx); }

function seedCase(ctx) {
  const pid = run(ctx, `createProperty({ propertyName: 'Est8 Seputeh', addressLine1: 'A-19-11', purchasePrice: 1, freeholdLeasehold: 'Leasehold', propertyType: 'RESIDENTIAL_CONDO' }).propertyId`);
  return run(ctx, `createPropertyCase({ propertyId: '${pid}', originalSubmissionDate: '2026-08-13' }).caseId`);
}

const SAMPLE_B64 = Buffer.from('fake jpeg bytes').toString('base64');

console.log('═══ attachEvidence — upload path ═══');
{
  const ctx = fresh(); const caseId = seedCase(ctx);
  const r = run(ctx, `attachEvidence({
    relatedCaseId: '${caseId}', evidenceType: 'Photo', phase: 'Before',
    source: 'Owner phone', description: 'AC unit before inspection',
    base64Data: '${SAMPLE_B64}', fileName: 'ac-before.jpg', mimeType: 'image/jpeg'
  });`);
  check('succeeds and uploads a new Drive file', r.success === true && !!r.driveFileId);
  check('EvidenceID reuses the DOC- prefix', r.evidenceId.indexOf('DOC-') === 0);
  check('Evidence row stores the new driveFileId', r.evidence.DriveFileID === r.driveFileId);
  check('Phase stored correctly', r.evidence.Phase === 'Before');

  const fetched = run(ctx, `getEvidence('${r.evidenceId}');`);
  check('getEvidence round-trips', fetched.Description === 'AC unit before inspection');

  const debug = run(ctx, `DriveApp._debug;`);
  const folderNames = Object.values(debug.folders).map(f => f.name);
  check('root "Property OS Evidence" folder was created', folderNames.indexOf('Property OS Evidence') !== -1);
  check('a per-Case subfolder named after the CaseID was created', folderNames.indexOf(caseId) !== -1);
  check('exactly one file exists in fake Drive', Object.keys(debug.files).length === 1);
  check('the file has the right name/mimeType', Object.values(debug.files)[0].name === 'ac-before.jpg' && Object.values(debug.files)[0].mimeType === 'image/jpeg');
}

console.log('\n═══ attachEvidence — existing driveFileId path (no upload) ═══');
{
  const ctx = fresh(); const caseId = seedCase(ctx);
  const r = run(ctx, `attachEvidence({ relatedCaseId: '${caseId}', evidenceType: 'Email', driveFileId: 'EXISTING-FILE-ID-123' });`);
  check('succeeds with a pre-existing driveFileId', r.success === true);
  check('does NOT create a new Drive file when one is already given', r.driveFileId === 'EXISTING-FILE-ID-123');
  const debug = run(ctx, `DriveApp._debug;`);
  check('no root/case folders were created at all (nothing to upload)', Object.keys(debug.folders).length === 0);
}

console.log('\n═══ Multiple uploads for the SAME case reuse the SAME folder ═══');
{
  const ctx = fresh(); const caseId = seedCase(ctx);
  run(ctx, `attachEvidence({ relatedCaseId: '${caseId}', base64Data: '${SAMPLE_B64}', fileName: 'a.jpg', mimeType: 'image/jpeg' });`);
  run(ctx, `attachEvidence({ relatedCaseId: '${caseId}', base64Data: '${SAMPLE_B64}', fileName: 'b.jpg', mimeType: 'image/jpeg' });`);
  const debug = run(ctx, `DriveApp._debug;`);
  const folderNames = Object.values(debug.folders).map(f => f.name);
  check('still exactly ONE root folder (not created twice)', folderNames.filter(n => n === 'Property OS Evidence').length === 1);
  check('still exactly ONE per-case subfolder (not created twice)', folderNames.filter(n => n === caseId).length === 1);
  check('two files exist total', Object.keys(debug.files).length === 2);
}

console.log('\n═══ validation ═══');
{
  const ctx = fresh(); const caseId = seedCase(ctx);
  const d = run(ctx, `addDefectItem({ caseId: '${caseId}', description: 'AC not cooling' });`);
  const otherCaseId = seedCase(ctx);

  throws('relatedCaseId required', () => run(ctx, `attachEvidence({ driveFileId: 'x' });`));
  throws('unknown relatedCaseId rejected', () => run(ctx, `attachEvidence({ relatedCaseId: 'CASE-nope', driveFileId: 'x' });`));
  throws('unknown relatedDefectId rejected', () => run(ctx, `attachEvidence({ relatedCaseId: '${caseId}', relatedDefectId: 'DEFECT-nope', driveFileId: 'x' });`));
  throws('defect belonging to a DIFFERENT case is rejected (cross-check)',
    () => run(ctx, `attachEvidence({ relatedCaseId: '${otherCaseId}', relatedDefectId: '${d.defectId}', driveFileId: 'x' });`));
  throws('invalid evidenceType rejected', () => run(ctx, `attachEvidence({ relatedCaseId: '${caseId}', evidenceType: 'Holograph', driveFileId: 'x' });`));
  throws('invalid phase rejected', () => run(ctx, `attachEvidence({ relatedCaseId: '${caseId}', phase: 'Yesterday', driveFileId: 'x' });`));
  throws('invalid relatedEntityType rejected', () => run(ctx, `attachEvidence({ relatedCaseId: '${caseId}', relatedEntityType: 'Nonsense', driveFileId: 'x' });`));
  throws('neither driveFileId nor upload data provided', () => run(ctx, `attachEvidence({ relatedCaseId: '${caseId}' });`));

  const valid = run(ctx, `attachEvidence({ relatedCaseId: '${caseId}', relatedDefectId: '${d.defectId}', driveFileId: 'x' });`);
  check('valid matching case+defect pair succeeds', valid.success === true);
}

console.log('\n═══ Timeline + lists ═══');
{
  const ctx = fresh(); const caseId = seedCase(ctx);
  const d = run(ctx, `addDefectItem({ caseId: '${caseId}', description: 'x' });`);
  run(ctx, `attachEvidence({ relatedCaseId: '${caseId}', relatedDefectId: '${d.defectId}', evidenceType: 'Photo', description: 'Leak photo', driveFileId: 'f1' });`);
  run(ctx, `attachEvidence({ relatedCaseId: '${caseId}', evidenceType: 'Email', description: 'Developer response', driveFileId: 'f2' });`);

  check('listEvidenceForCase returns both', run(ctx, `listEvidenceForCase('${caseId}').length`) === 2);
  check('listEvidenceForDefect returns only the one scoped to that defect', run(ctx, `listEvidenceForDefect('${d.defectId}').length`) === 1);

  const timeline = run(ctx, `
    var sheet = propertyCaseTimelineSheet_(); var last = sheet.getLastRow();
    var cols = PROPERTY_SCHEMA.PropertyCaseTimeline.columns;
    sheet.getRange(2,1,last-1,cols.length).getValues()
      .map(function(row){ var o={}; cols.forEach(function(c,i){o[c]=row[i];}); return o; })
      .filter(function(e){ return e.EntryType === 'EVIDENCE_ATTACHED'; });
  `);
  check('exactly 2 EVIDENCE_ATTACHED Timeline entries', timeline.length === 2);
  check('Timeline summary includes the evidence description', timeline[0].Summary.indexOf('Leak photo') !== -1);
}

console.log('\n═══ Idempotency ═══');
{
  const ctx = fresh(); const caseId = seedCase(ctx);
  const r1 = run(ctx, `attachEvidence({ relatedCaseId: '${caseId}', driveFileId: 'x', clientRequestId: 'ev-req-1' });`);
  const r2 = run(ctx, `attachEvidence({ relatedCaseId: '${caseId}', driveFileId: 'x', clientRequestId: 'ev-req-1' });`);
  check('same clientRequestId returns the SAME evidenceId', r1.evidenceId === r2.evidenceId);
  check('idempotent replay did not create an extra row', run(ctx, `listEvidenceForCase('${caseId}').length`) === 1);
}

console.log('\n' + '═'.repeat(60));
console.log(fail === 0 ? `ALL ${pass} CHECKS PASSED (0 failures)` : `${pass} passed, ${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
