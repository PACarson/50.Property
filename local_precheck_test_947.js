// local_precheck_test_947.js
//
// 947_DlpConsoleServer.js has never had a dedicated local test file before
// this slice. This one is intentionally narrow — it does NOT re-test what
// local_precheck_test_918.js already covers (the actual idempotency
// mechanism). It only tests the one thing this Mobile Field Console
// retry-safety slice (2026-09-06) changed at the Bridge layer:
//
//   does the 947 wrapper actually forward clientRequestId to the
//   authoritative 918/911 Command, instead of silently dropping it?
//
// Covers: dlp_recordDeveloperStatus, dlp_recordOwnerVerification,
// dlp_addRectificationEvent (all three exercised for real — none of them
// touch Drive). dlp_attachDefectEvidence is exercised for real too, using
// an existing driveFileId (same shortcut BL-10's verification used) so
// this file doesn't hit the same PropertiesService/DriveApp gap that
// local_precheck_test_911.js already has on the upload-a-new-file path
// (pre-existing, out of scope for this slice).

const { loadPropertyOSContext } = require('./GasShim.js');
const vm = require('vm');

const FILES = [
  '900_PropertyConfig.js', '901_PropertySchema.js', '902_PropertyIdentity.js',
  '903_PropertyEventDefinitions.js', '910_PropertyAssetEngine.js',
  '918_DefectEngine.js', '911_DocumentEngine.js', '922_DashboardAdapter.js',
  '947_DlpConsoleServer.js'
];

var pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('ok  :', label); }
  else { fail++; console.log('FAIL:', label); }
}
function fresh() { return loadPropertyOSContext(__dirname, FILES).ctx; }
function run(ctx, code) { return vm.runInContext(code, ctx); }

function seedProperty(ctx) {
  return run(ctx, `
    createProperty({
      propertyName: 'Est8 Seputeh', developer: 'Eupe Corporation Berhad',
      addressLine1: 'A-19-11, Residensi Estetik 8, No 6, Jalan Syed Putra',
      addressCity: 'Kuala Lumpur', addressPostcode: '58000', addressCountry: 'Malaysia',
      purchaseDate: '2021-12-27', purchasePrice: 658000, freeholdLeasehold: 'Leasehold',
      propertyType: 'RESIDENTIAL_CONDO', developmentName: 'Est8 Seputeh', unitLabel: 'A-19-11'
    });
  `).propertyId;
}

function seedCaseAndDefect(ctx) {
  const propertyId = seedProperty(ctx);
  const caseId = run(ctx, `createPropertyCase({
    propertyId: '${propertyId}', caseType: 'DLP',
    originalSubmissionDate: '2026-08-13', originalSubmissionSource: 'Official mobile defect-reporting system',
    originalDefectCount: 140, managementOffice: 'Est8 JMC'
  });`).caseId;
  run(ctx, `PROPERTY_CONFIG = Object.assign({}, PROPERTY_CONFIG, { ACTIVE_DLP_CASE_ID: '${caseId}' });`);
  const d = run(ctx, `addDefectItem({ caseId: '${caseId}', description: 'AC not cooling adequately', category: 'Sanitary Fitting', location: 'Living Room', priority: 'High' });`);
  return { caseId: caseId, defectId: d.defectId };
}

console.log('═══ dlp_recordDeveloperStatus — clientRequestId forwarding to 918 ═══');
{
  const ctx = fresh(); const s = seedCaseAndDefect(ctx);
  const r1 = run(ctx, `dlp_recordDeveloperStatus({ defectId: '${s.defectId}', developerStatus: 'ClaimedCompleted', note: 'AC fixed', clientRequestId: 'bridge-dev-001' });`);
  check('first call via 947 wrapper succeeds', r1.success === true && r1.data.developerStatus === 'ClaimedCompleted');
  // Retry deliberately sends a DIFFERENT developerStatus ('InProgress') under
  // the SAME clientRequestId. If the Bridge genuinely forwards the ID and 918
  // short-circuits on cache, the returned value must still be the FIRST
  // call's 'ClaimedCompleted' — not this retry's 'InProgress'. Getting
  // 'InProgress' back would prove the ID was silently dropped somewhere and a
  // second, fresh mutation ran instead of a cache hit. (r1.defectId/r2.defectId
  // alone can't prove this — dlp_wrap_ nests the real result under .data, and
  // even correctly read, two fresh calls with the same defectId would report
  // the same defectId regardless of caching; the differing input value is
  // what actually makes this discriminating.)
  const r2 = run(ctx, `dlp_recordDeveloperStatus({ defectId: '${s.defectId}', developerStatus: 'InProgress', note: 'should be ignored if cached', clientRequestId: 'bridge-dev-001' });`);
  check('retry via 947 wrapper with same clientRequestId returns the FIRST call\'s cached 918 result, not a fresh mutation using this retry\'s different developerStatus',
    r2.success === true && r2.data.developerStatus === 'ClaimedCompleted' && JSON.stringify(r2.data) === JSON.stringify(r1.data));
  const timeline = run(ctx, `(function(){
    var sheet = propertyCaseTimelineSheet_(); var last = sheet.getLastRow();
    var cols = PROPERTY_SCHEMA.PropertyCaseTimeline.columns;
    return sheet.getRange(2,1,last-1,cols.length).getValues()
      .map(function(row){ var o={}; cols.forEach(function(c,i){o[c]=row[i];}); return o; })
      .filter(function(e){ return e.CaseID === '${s.caseId}' && e.EntryType === 'DEVELOPER_STATUS_UPDATED'; });
  })();`);
  check('retry produced no duplicate Timeline entry end-to-end through the 947 wrapper', timeline.length === 1);
}

console.log('═══ dlp_recordOwnerVerification — clientRequestId forwarding to 918 ═══');
{
  const ctx = fresh(); const s = seedCaseAndDefect(ctx);
  const r1 = run(ctx, `dlp_recordOwnerVerification({ defectId: '${s.defectId}', ownerVerificationStatus: 'FailedVerification', reason: 'still not cooling', clientRequestId: 'bridge-owner-001' });`);
  check('first call via 947 wrapper succeeds', r1.success === true && r1.data.ownerVerificationStatus === 'FailedVerification');
  // Same discriminating-retry technique as the DeveloperStatus block above:
  // retry sends 'Verified' under the SAME clientRequestId, so getting
  // 'FailedVerification' back (the FIRST call's value) is what actually
  // proves a cache hit, not a coincidence of identical inputs.
  const r2 = run(ctx, `dlp_recordOwnerVerification({ defectId: '${s.defectId}', ownerVerificationStatus: 'Verified', reason: 'should be ignored if cached', clientRequestId: 'bridge-owner-001' });`);
  check('retry via 947 wrapper with same clientRequestId returns the FIRST call\'s cached 918 result, not a fresh mutation using this retry\'s different ownerVerificationStatus',
    r2.success === true && r2.data.ownerVerificationStatus === 'FailedVerification' && JSON.stringify(r2.data) === JSON.stringify(r1.data));
  const timeline = run(ctx, `(function(){
    var sheet = propertyCaseTimelineSheet_(); var last = sheet.getLastRow();
    var cols = PROPERTY_SCHEMA.PropertyCaseTimeline.columns;
    return sheet.getRange(2,1,last-1,cols.length).getValues()
      .map(function(row){ var o={}; cols.forEach(function(c,i){o[c]=row[i];}); return o; })
      .filter(function(e){ return e.CaseID === '${s.caseId}' && e.EntryType === 'OWNER_VERIFICATION_RECORDED'; });
  })();`);
  check('retry produced no duplicate Timeline entry end-to-end through the 947 wrapper', timeline.length === 1);
}

console.log('═══ dlp_addRectificationEvent — clientRequestId forwarding to 918 (Domain already supported it; only the wrapper was silent before this slice) ═══');
{
  const ctx = fresh(); const s = seedCaseAndDefect(ctx);
  const r1 = run(ctx, `dlp_addRectificationEvent({ defectId: '${s.defectId}', eventType: 'RectificationStarted', notes: 'first visit', clientRequestId: 'bridge-rect-001' });`);
  check('first call via 947 wrapper succeeds', r1.success === true);
  const r2 = run(ctx, `dlp_addRectificationEvent({ defectId: '${s.defectId}', eventType: 'RectificationStarted', notes: 'first visit', clientRequestId: 'bridge-rect-001' });`);
  check('retry via 947 wrapper with same clientRequestId returns the cached 918 result (before this slice this wrapper dropped the ID, so this would have silently created a duplicate)',
    r2.success === true && JSON.stringify(r2) === JSON.stringify(r1));
  const list = run(ctx, `listRectificationEventsForDefect('${s.defectId}');`);
  check('retry produced no duplicate RectificationEvent record end-to-end through the 947 wrapper', list.length === 1);
}

console.log('═══ dlp_attachDefectEvidence — clientRequestId forwarding to 911 (Domain already supported it; only the wrapper was silent before this slice) ═══');
{
  // Uses an existing driveFileId (same shortcut BL-10 used) to stay clear of
  // saveEvidenceFile_'s PropertiesService/DriveApp dependency, which GasShim
  // does not mock (pre-existing local_precheck_test_911.js gap, unrelated to
  // this slice).
  const ctx = fresh(); const s = seedCaseAndDefect(ctx);
  const r1 = run(ctx, `dlp_attachDefectEvidence({ defectId: '${s.defectId}', evidenceType: 'Photo', phase: 'After', driveFileId: 'fake-drive-id-for-bridge-test', clientRequestId: 'bridge-evid-001' });`);
  check('first call via 947 wrapper succeeds', r1.success === true);
  const r2 = run(ctx, `dlp_attachDefectEvidence({ defectId: '${s.defectId}', evidenceType: 'Photo', phase: 'After', driveFileId: 'fake-drive-id-for-bridge-test', clientRequestId: 'bridge-evid-001' });`);
  check('retry via 947 wrapper with same clientRequestId returns the cached 911 result (before this slice this wrapper dropped the ID, so this would have silently created a duplicate)',
    r2.success === true && JSON.stringify(r2) === JSON.stringify(r1));
  const list = run(ctx, `listEvidenceForDefect('${s.defectId}');`);
  check('retry produced no duplicate Evidence record end-to-end through the 947 wrapper', list.length === 1);
}

console.log('═══ dlp_addSecondaryDamage — unchanged in this slice (B3: not modified unless proven broken); confirming untouched behavior only ═══');
{
  const ctx = fresh(); const s = seedCaseAndDefect(ctx);
  const r1 = run(ctx, `dlp_addSecondaryDamage({ defectId: '${s.defectId}', damageType: 'Flooring', description: 'water staining' });`);
  check('dlp_addSecondaryDamage still works exactly as before (not touched by this slice)', r1.success === true);
}

console.log('═══ dlp_getMobileDefectDetail — new in M1 (2026-09-08), thin wrapper around the existing buildDefectDetailForSidebar_ (922) ═══');
{
  const ctx = fresh(); const s = seedCaseAndDefect(ctx);
  // Give this defect one of each related record so the bundle actually
  // exercises all three arrays, not just an empty-list happy path.
  run(ctx, `logRectificationEvent({ caseId: '${s.caseId}', defectId: '${s.defectId}', eventType: 'RectificationStarted', notes: 'contractor on site' });`);
  run(ctx, `attachEvidence({ relatedCaseId: '${s.caseId}', relatedDefectId: '${s.defectId}', evidenceType: 'Photo', phase: 'Before', driveFileId: 'fake-drive-id-for-m1-test' });`);
  run(ctx, `logSecondaryDamage({ caseId: '${s.caseId}', parentDefectId: '${s.defectId}', damageType: 'Flooring', description: 'water staining' });`);

  const raw = run(ctx, `dlp_getMobileDefectDetail({ defectId: '${s.defectId}' });`);
  check('returns a JSON string, not a raw object (same google.script.run boundary convention as dlp_getCaseOverview)', typeof raw === 'string');
  const res = JSON.parse(raw);
  check('parses back into {success:true, data:{...}}', res.success === true && !!res.data);
  check('data.defect has the identity/description/priority-state fields M1 needs', res.data.defect.defectId === s.defectId
    && res.data.defect.category === 'Sanitary Fitting' && res.data.defect.location === 'Living Room'
    && res.data.defect.priority === 'High' && res.data.defect.status !== undefined
    && res.data.defect.developerStatus !== undefined && res.data.defect.ownerVerificationStatus !== undefined);
  check('data.defect has date fields present as keys (not silently dropped), even where empty', 'submittedAt' in res.data.defect && 'closedDate' in res.data.defect
    && 'rectificationStartDate' in res.data.defect && 'createdAt' in res.data.defect && 'updatedAt' in res.data.defect);
  check('data.rectificationEvents reflects the one event just logged', res.data.rectificationEvents.length === 1 && res.data.rectificationEvents[0].eventType === 'RectificationStarted');
  check('data.evidence reflects the one evidence record just attached', res.data.evidence.length === 1 && res.data.evidence[0].evidenceType === 'Photo');
  check('data.secondaryDamage is present in the payload (922 always includes it) even though 948 deliberately never renders it (Contract §1/§9)', res.data.secondaryDamage.length === 1);

  const rawMissing = run(ctx, `dlp_getMobileDefectDetail({ defectId: 'DEFECT-does-not-exist' });`);
  const resMissing = JSON.parse(rawMissing);
  check('a non-existent defectId fails gracefully as {success:false, error}, not a thrown/uncaught exception', resMissing.success === false && typeof resMissing.error === 'string');

  const rawNoInput = run(ctx, `dlp_getMobileDefectDetail({});`);
  const resNoInput = JSON.parse(rawNoInput);
  check('a call with no defectId at all also fails gracefully, not a crash', resNoInput.success === false);
}

console.log('\n' + '═'.repeat(60));
console.log(fail === 0 ? `ALL ${pass} CHECKS PASSED (0 failures)` : `${pass} passed, ${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
