// local_precheck_test_948_rectification.js
//
// M4 (Mobile Rectification Event submission UI, 2026-09-14) added a new
// chip-then-submit section to 948_MobileConsole.html, copying the M2/M3
// pattern exactly. This file does NOT re-test what already exists
// elsewhere:
//   - 918's own validation (missing fields, unknown eventType, unknown
//     defectId, cross-case defect, unknown Source, case-closed) is
//     already covered by local_precheck_test_918.js's Phase 7 section.
//   - The 947 wrapper's clientRequestId forwarding + dedup-at-947-level
//     for dlp_addRectificationEvent is already covered by
//     local_precheck_test_947.js (using eventType 'RectificationStarted').
// What was genuinely untested before this file:
//   (a) that all 7 RECTIFICATION_EVENT_TYPES — not just the one
//       'RectificationStarted' the 947 test happens to use — actually
//       succeed through the exact same wrapper 948 calls;
//   (b) the 948-side, DOM-facing wiring itself (chip values, clientRequestId
//       generation/transmission, notes forwarding, state reset on a fresh
//       Detail open, and that the new setup function is actually called) —
//       covered here the same way SEARCH-18/19/20 covered 948_search's
//       DOM-facing pieces: static source inspection, not DOM execution
//       (this file has no browser/DOM available, same constraint as that
//       precedent).

const { loadPropertyOSContext } = require('./GasShim.js');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

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

// ─── Part 1 (M4-02): every one of the 7 EventTypes 948 will expose  ───
// ─── actually succeeds through dlp_addRectificationEvent, not just ───
// ─── the one type ('RectificationStarted') the 947 file happens to ───
// ─── use for its dedup test.                                        ───

console.log('═══ M4-02 — all 7 RECTIFICATION_EVENT_TYPES succeed through dlp_addRectificationEvent ═══');
(function () {
  const ctx = fresh();
  const s = seedCaseAndDefect(ctx);
  const types = run(ctx, `PROPERTY_CONFIG.RECTIFICATION_EVENT_TYPES`);
  check('PROPERTY_CONFIG.RECTIFICATION_EVENT_TYPES has exactly 7 values (matches what 948\'s chips expose)', types.length === 7);
  types.forEach(function (t) {
    const res = run(ctx, `dlp_addRectificationEvent({ defectId: '${s.defectId}', eventType: '${t}', clientRequestId: 'm4-alltypes-${t}' });`);
    check('eventType ' + t + ' succeeds through dlp_addRectificationEvent', res && res.success === true);
  });
  const list = run(ctx, `listRectificationEventsForDefect('${s.defectId}');`);
  check('all 7 distinct submissions produced exactly 7 RectificationEvent rows (no cross-type dedup collision)', list.length === 7);
})();

console.log('\n═══ M4-01 — a representative valid submission carries Notes through end to end ═══');
(function () {
  const ctx = fresh();
  const s = seedCaseAndDefect(ctx);
  const res = run(ctx, `dlp_addRectificationEvent({ defectId: '${s.defectId}', eventType: 'AccessGranted', notes: 'Owner let contractor in at 10am', clientRequestId: 'm4-notes-1' });`);
  check('valid submission with notes succeeds', res && res.success === true);
  const stored = run(ctx, `getRectificationEvent('${res.data.rectificationEventId}');`);
  check('Notes field round-trips exactly as submitted', stored.Notes === 'Owner let contractor in at 10am');
})();

// ─── Part 2 (M4-05/06/07 + regression discipline): static inspection ───
// ─── of the actual 948_MobileConsole.html source. No DOM/browser here, ───
// ─── same constraint SEARCH-18/19/20 already documented for this file. ───

console.log('\n═══ Static checks on 948_MobileConsole.html (no DOM available; source inspection, same convention as SEARCH-18/19/20) ═══');
(function () {
  const src = fs.readFileSync(path.join(__dirname, '948_MobileConsole.html'), 'utf8');

  const expectedTypes = [
    'AccessRequested', 'AccessGranted', 'RectificationStarted', 'RectificationCompleted',
    'RectificationRejected', 'ReinspectionRequired', 'DeveloperClaimedCompleted'
  ];
  expectedTypes.forEach(function (t) {
    check('chip markup includes data-eventtype="' + t + '"', src.indexOf('data-eventtype="' + t + '"') !== -1);
  });

  check('M4-05: submitRectificationEvent_ generates a clientRequestId via generateClientRequestId_()',
    /submitRectificationEvent_[\s\S]*?generateClientRequestId_\(\)/.test(src));

  check('M4-06: the dlp_addRectificationEvent call includes clientRequestId: state.rectificationEventClientRequestId',
    /dlp_addRectificationEvent\(\{[\s\S]*?clientRequestId: state\.rectificationEventClientRequestId/.test(src));

  check('the dlp_addRectificationEvent call includes notes: notesVal (Notes field is actually sent, not just displayed)',
    /dlp_addRectificationEvent\(\{[\s\S]*?notes: notesVal/.test(src));

  check('openDefectDetail_ resets state.rectificationEventTypeSelected on every Detail open (fresh boundary, same as M2/M3)',
    /openDefectDetail_[\s\S]*?state\.rectificationEventTypeSelected = null/.test(src));

  check('openDefectDetail_ resets state.rectificationEventClientRequestId on every Detail open (a stale id must never leak into the next attempt)',
    /openDefectDetail_[\s\S]*?state\.rectificationEventClientRequestId = null/.test(src));

  check('setupRectificationEvent_() is actually invoked during init, not just defined', /setupRectificationEvent_\(\);/.test(src));

  check('no direct call to logRectificationEvent (918) from the client script — must go through the 947 wrapper',
    !/google\.script\.run[\s\S]{0,80}logRectificationEvent/.test(src));

  // Regression guard: confirm this slice did not touch the M2/M3 call
  // shape (defends against a future edit accidentally changing them
  // while working nearby in the same file).
  check('dlp_recordOwnerVerification call shape unchanged (M2 regression guard)',
    /dlp_recordOwnerVerification\(\{\s*defectId: defectIdAtSubmitTime,\s*ownerVerificationStatus: state\.ownerVerificationSelectedStatus,\s*clientRequestId: state\.ownerVerificationClientRequestId\s*\}\)/.test(src));
  check('dlp_recordDeveloperStatus call shape unchanged (M3 regression guard)',
    /dlp_recordDeveloperStatus\(\{\s*defectId: defectIdAtSubmitTime,\s*developerStatus: state\.developerStatusSelected,\s*clientRequestId: state\.developerStatusClientRequestId\s*\}\)/.test(src));
})();

console.log('\n════════════════════════════════════════════════════════════');
console.log(fail === 0 ? 'ALL ' + pass + ' CHECKS PASSED (0 failures)' : pass + ' passed, ' + fail + ' FAILED');
if (fail > 0) process.exit(1);
