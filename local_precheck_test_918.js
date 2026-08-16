const { loadPropertyOSContext } = require('./GasShim.js');
const vm = require('vm');

const FILES = [
  '900_PropertyConfig.js', '901_PropertySchema.js', '902_PropertyIdentity.js',
  '903_PropertyEventDefinitions.js', '910_PropertyAssetEngine.js', '918_DefectEngine.js'
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

// Seed one real Property (mirrors CC's actual EST8 record) for every scenario below.
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

console.log('═══ createPropertyCase ═══');
{
  const ctx = fresh(); const propertyId = seedProperty(ctx);
  const r = run(ctx, `createPropertyCase({
    propertyId: '${propertyId}', caseType: 'DLP',
    originalSubmissionDate: '2026-08-13', originalSubmissionSource: 'Official mobile defect-reporting system',
    originalDefectCount: 140, managementOffice: 'Est8 JMC'
  });`);
  check('succeeds with valid input', r.success === true);
  check('CaseID has CASE- prefix', r.caseId.indexOf('CASE-') === 0);
  check('Status starts Open', r.propertyCase.Status === 'Open');
  check('CaseTitle auto-derived from Property name when omitted',
    r.propertyCase.CaseTitle === 'Est8 Seputeh — DLP Case');
  check('does NOT store Developer on the Case row', !('Developer' in r.propertyCase));
  check('does NOT store a DLP end date on the Case row', !('DlpEndDate' in r.propertyCase));

  const timeline = run(ctx, `getRawTimeline_ = function(caseId) {
    var sheet = propertyCaseTimelineSheet_();
    var last = sheet.getLastRow();
    if (last < 2) return [];
    var cols = PROPERTY_SCHEMA.PropertyCaseTimeline.columns;
    return sheet.getRange(2,1,last-1,cols.length).getValues()
      .map(function(row){ var o={}; cols.forEach(function(c,i){o[c]=row[i];}); return o; })
      .filter(function(e){ return e.CaseID === caseId; });
  }; getRawTimeline_('${r.caseId}');`);
  check('Case creation wrote exactly one Timeline entry', timeline.length === 1);
  check('Timeline entry has the right EntryType', timeline[0].EntryType === 'CASE_CREATED');

  throws('propertyId required', () => run(ctx, `createPropertyCase({ originalSubmissionDate: '2026-08-13' });`));
  throws('unknown propertyId rejected', () => run(ctx, `createPropertyCase({ propertyId: 'PROP-doesnotexist', originalSubmissionDate: '2026-08-13' });`));
  throws('originalSubmissionDate required', () => run(ctx, `createPropertyCase({ propertyId: '${propertyId}' });`));
  throws('unknown caseType rejected', () => run(ctx, `createPropertyCase({ propertyId: '${propertyId}', caseType: 'RENTAL_DISPUTE', originalSubmissionDate: '2026-08-13' });`));

  // Idempotency
  const dup1 = run(ctx, `createPropertyCase({ propertyId: '${propertyId}', originalSubmissionDate: '2026-08-14', clientRequestId: 'req-abc' });`);
  const dup2 = run(ctx, `createPropertyCase({ propertyId: '${propertyId}', originalSubmissionDate: '2026-08-14', clientRequestId: 'req-abc' });`);
  check('same clientRequestId returns the SAME caseId (idempotent, no duplicate row)', dup1.caseId === dup2.caseId);
  const caseCount = run(ctx, `
    var s = propertyCaseSheet_(); s.getLastRow() - 1;
  `);
  check('idempotent replay did not create an extra PropertyCase row (2 real cases, not 3)', caseCount === 2);
}

console.log('\\n═══ addDefectItem ═══');
{
  const ctx = fresh(); const propertyId = seedProperty(ctx);
  const c = run(ctx, `createPropertyCase({ propertyId: '${propertyId}', originalSubmissionDate: '2026-08-13' });`);
  const caseId = c.caseId;

  check('Case starts Open before any defect', run(ctx, `getPropertyCase('${caseId}').Status`) === 'Open');
  const d1 = run(ctx, `addDefectItem({ caseId: '${caseId}', description: 'Bathroom 1 severe floor ponding', category: 'Waterproofing', location: 'Bathroom 1', priority: 'Critical', originalReference: '1' });`);
  check('succeeds with full input', d1.success === true);
  check('DefectID reuses the pre-reserved DEFECT- prefix', d1.defectId.indexOf('DEFECT-') === 0);
  check('DeveloperStatus starts Pending', d1.defectItem.DeveloperStatus === 'Pending');
  check('OwnerVerificationStatus starts NotChecked', d1.defectItem.OwnerVerificationStatus === 'NotChecked');
  check('derived Status starts Open', d1.defectItem.Status === 'Open');
  check('Case auto-advanced Open -> InProgress on first defect', run(ctx, `getPropertyCase('${caseId}').Status`) === 'InProgress');

  const d2 = run(ctx, `addDefectItem({ caseId: '${caseId}', description: 'Something minor' });`);
  check('lenient defaults: only caseId+description required', d2.success === true);
  check('Category defaults to Other', d2.defectItem.Category === 'Other');
  check('Priority defaults to Medium', d2.defectItem.Priority === 'Medium');

  throws('unknown caseId rejected', () => run(ctx, `addDefectItem({ caseId: 'CASE-doesnotexist', description: 'x' });`));
  throws('description required', () => run(ctx, `addDefectItem({ caseId: '${caseId}' });`));
  throws('unknown Category rejected', () => run(ctx, `addDefectItem({ caseId: '${caseId}', description: 'x', category: 'Volcano' });`));
  throws('unknown Priority rejected', () => run(ctx, `addDefectItem({ caseId: '${caseId}', description: 'x', priority: 'Ultra' });`));

  const list = run(ctx, `listDefectItemsForCase('${caseId}').length`);
  check('listDefectItemsForCase returns exactly the 2 added (Command-level errors did not leave partial rows)', list === 2);
}

console.log('\\n═══ THE key rule: DeveloperStatus / OwnerVerificationStatus independence (test scenario 8/9) ═══');
{
  const ctx = fresh(); const propertyId = seedProperty(ctx);
  const c = run(ctx, `createPropertyCase({ propertyId: '${propertyId}', originalSubmissionDate: '2026-08-13' });`);
  const d = run(ctx, `addDefectItem({ caseId: '${c.caseId}', description: 'Air-conditioner not cooling', category: 'AirConditioning', originalReference: '88' });`);
  const defectId = d.defectId;

  run(ctx, `recordDeveloperStatus({ defectId: '${defectId}', developerStatus: 'ClaimedCompleted', note: 'AC rectified' });`);
  const afterDevClaim = run(ctx, `getDefectItem('${defectId}');`);
  check('DeveloperStatus is ClaimedCompleted', afterDevClaim.DeveloperStatus === 'ClaimedCompleted');
  check('DeveloperClaimedCompletedDate got set', !!afterDevClaim.DeveloperClaimedCompletedDate);
  check('derived Status became PendingVerification', afterDevClaim.Status === 'PendingVerification');
  check('OwnerVerificationStatus untouched by the Developer call', afterDevClaim.OwnerVerificationStatus === 'NotChecked');

  const claimedDateBefore = afterDevClaim.DeveloperClaimedCompletedDate;
  run(ctx, `recordOwnerVerification({ defectId: '${defectId}', ownerVerificationStatus: 'FailedVerification', reason: 'Room still not cooling adequately' });`);
  const afterOwnerFail = run(ctx, `getDefectItem('${defectId}');`);

  check('*** CORE RULE *** DeveloperStatus is STILL ClaimedCompleted (not erased by the failed verification)',
    afterOwnerFail.DeveloperStatus === 'ClaimedCompleted');
  check('*** CORE RULE *** original DeveloperClaimedCompletedDate is preserved, byte for byte',
    afterOwnerFail.DeveloperClaimedCompletedDate === claimedDateBefore);
  check('OwnerVerificationStatus is now FailedVerification', afterOwnerFail.OwnerVerificationStatus === 'FailedVerification');
  check('BOTH "ClaimedCompleted" and "FailedVerification" are true on the SAME row at the SAME time',
    afterOwnerFail.DeveloperStatus === 'ClaimedCompleted' && afterOwnerFail.OwnerVerificationStatus === 'FailedVerification');
  check('derived Status reflects the failure (back to InProgress, not stuck at PendingVerification)',
    afterOwnerFail.Status === 'InProgress');

  // Now the developer fixes it for real and owner verifies OK — full realistic cycle
  run(ctx, `recordDeveloperStatus({ defectId: '${defectId}', developerStatus: 'ClaimedCompleted' });`);
  run(ctx, `recordOwnerVerification({ defectId: '${defectId}', ownerVerificationStatus: 'Verified' });`);
  const verified = run(ctx, `getDefectItem('${defectId}');`);
  check('after a second developer attempt + successful verification, Status is Verified', verified.Status === 'Verified');
}

console.log('\\n═══ closeDefectItem / reopenDefectItem ═══');
{
  const ctx = fresh(); const propertyId = seedProperty(ctx);
  const c = run(ctx, `createPropertyCase({ propertyId: '${propertyId}', originalSubmissionDate: '2026-08-13' });`);
  const d = run(ctx, `addDefectItem({ caseId: '${c.caseId}', description: 'Kitchen bottle trap leakage', category: 'Plumbing' });`);
  const defectId = d.defectId;

  throws('cannot close before OwnerVerificationStatus is Verified', () => run(ctx, `closeDefectItem({ defectId: '${defectId}' });`));

  run(ctx, `recordOwnerVerification({ defectId: '${defectId}', ownerVerificationStatus: 'Verified' });`);
  const closed = run(ctx, `closeDefectItem({ defectId: '${defectId}' });`);
  check('closes once Verified', closed.success === true);
  check('Status is Closed', run(ctx, `getDefectItem('${defectId}').Status`) === 'Closed');
  check('ClosedDate is set', !!run(ctx, `getDefectItem('${defectId}').ClosedDate`));

  throws('double-close rejected', () => run(ctx, `closeDefectItem({ defectId: '${defectId}' });`));
  throws('updateDefectItem refuses on a Closed item', () => run(ctx, `updateDefectItem({ defectId: '${defectId}', changedFields: { Location: 'x' } });`));
  throws('recordDeveloperStatus refuses on a Closed item', () => run(ctx, `recordDeveloperStatus({ defectId: '${defectId}', developerStatus: 'Pending' });`));
  throws('reopenDefectItem requires a reason', () => run(ctx, `reopenDefectItem({ defectId: '${defectId}' });`));

  run(ctx, `reopenDefectItem({ defectId: '${defectId}', reason: 'Leak recurred after two weeks' });`);
  const reopened = run(ctx, `getDefectItem('${defectId}');`);
  check('reopened: ClosedDate cleared', reopened.ClosedDate === '');
  check('reopened: Status re-derived from unchanged sub-statuses (still Verified, just not Closed)', reopened.Status === 'Verified');
  check('reopened: OwnerVerificationStatus untouched by reopen itself', reopened.OwnerVerificationStatus === 'Verified');

  throws('reopening a non-Closed item is rejected', () => run(ctx, `reopenDefectItem({ defectId: '${defectId}', reason: 'x' });`));
}

console.log('\\n═══ closeCase gating (test scenario 17/18) ═══');
{
  const ctx = fresh(); const propertyId = seedProperty(ctx);
  const c = run(ctx, `createPropertyCase({ propertyId: '${propertyId}', originalSubmissionDate: '2026-08-13' });`);
  const caseId = c.caseId;
  const d1 = run(ctx, `addDefectItem({ caseId: '${caseId}', description: 'Defect A' });`);
  const d2 = run(ctx, `addDefectItem({ caseId: '${caseId}', description: 'Defect B' });`);

  run(ctx, `recordOwnerVerification({ defectId: '${d1.defectId}', ownerVerificationStatus: 'Verified' });`);
  run(ctx, `closeDefectItem({ defectId: '${d1.defectId}' });`);

  throws('Case cannot close while Defect B is still open (17: one verified is not enough)',
    () => run(ctx, `closeCase({ caseId: '${caseId}' });`));
  check('Case itself is still InProgress, not forced closed', run(ctx, `getPropertyCase('${caseId}').Status`) === 'InProgress');

  run(ctx, `recordOwnerVerification({ defectId: '${d2.defectId}', ownerVerificationStatus: 'Verified' });`);
  run(ctx, `closeDefectItem({ defectId: '${d2.defectId}' });`);
  const closedCase = run(ctx, `closeCase({ caseId: '${caseId}' });`);
  check('Case closes once every DefectItem is Closed (18)', closedCase.success === true);
  check('Case Status is Closed', run(ctx, `getPropertyCase('${caseId}').Status`) === 'Closed');
  throws('double-close of a Case rejected', () => run(ctx, `closeCase({ caseId: '${caseId}' });`));
  throws('cannot add a DefectItem to a Closed Case', () => run(ctx, `addDefectItem({ caseId: '${caseId}', description: 'too late' });`));
}

console.log('\\n═══ Invalid IDs fail safely (test scenario 20) ═══');
{
  const ctx = fresh();
  check('getPropertyCase on unknown id returns null, does not throw', run(ctx, `getPropertyCase('CASE-nope') === null`));
  check('getDefectItem on unknown id returns null, does not throw', run(ctx, `getDefectItem('DEFECT-nope') === null`));
  throws('recordDeveloperStatus on unknown defectId throws cleanly', () => run(ctx, `recordDeveloperStatus({ defectId: 'DEFECT-nope', developerStatus: 'Pending' });`));
  throws('closeCase on unknown caseId throws cleanly', () => run(ctx, `closeCase({ caseId: 'CASE-nope' });`));
}

console.log('\\n═══ Phase 4: logDailyProgressCheck ═══');
{
  const ctx = fresh(); const propertyId = seedProperty(ctx);
  const c = run(ctx, `createPropertyCase({ propertyId: '${propertyId}', originalSubmissionDate: '2026-08-13' });`);
  const caseId = c.caseId;

  const noAccess = run(ctx, `logDailyProgressCheck({ caseId: '${caseId}', notes: 'No rectification activity observed.' });`);
  check('minimal input succeeds (caseId only + notes)', noAccess.success === true);
  check('CheckID has CHECK- prefix', noAccess.checkId.indexOf('CHECK-') === 0);
  check('booleans default false when omitted', noAccess.dailyCheck.AccessObserved === false && noAccess.dailyCheck.ContractorObserved === false);
  check('summary for a no-access day reads naturally',
    run(ctx, `getCaseTimelineRaw_ = function(caseId) {
      var sheet = propertyCaseTimelineSheet_(); var last = sheet.getLastRow();
      if (last < 2) return [];
      var cols = PROPERTY_SCHEMA.PropertyCaseTimeline.columns;
      return sheet.getRange(2,1,last-1,cols.length).getValues()
        .map(function(row){ var o={}; cols.forEach(function(c,i){o[c]=row[i];}); return o; })
        .filter(function(e){ return e.CaseID === caseId; });
    }; getCaseTimelineRaw_('${caseId}').slice(-1)[0].Summary;`).indexOf('no access observed') !== -1
  );

  const withAccess = run(ctx, `logDailyProgressCheck({
    caseId: '${caseId}', checkedBy: 'Carson', accessObserved: true, contractorObserved: true,
    workObserved: 'Air-conditioner inspection', notes: 'ABC M&E on site, Bedroom 1/2'
  });`);
  check('full input succeeds', withAccess.success === true);
  const accessSummary = run(ctx, `getCaseTimelineRaw_('${caseId}').slice(-1)[0].Summary;`);
  check('summary for an access day mentions contractor + work observed',
    accessSummary.indexOf('contractor on site') !== -1 && accessSummary.indexOf('Air-conditioner inspection') !== -1);

  check('listDailyChecksForCase returns both entries in order', run(ctx, `listDailyChecksForCase('${caseId}').length`) === 2);
  check('getDailyProgressCheck round-trips a single check', run(ctx, `getDailyProgressCheck('${withAccess.checkId}').CheckedBy`) === 'Carson');

  throws('unknown caseId rejected', () => run(ctx, `logDailyProgressCheck({ caseId: 'CASE-nope' });`));

  // Idempotency
  const dup1 = run(ctx, `logDailyProgressCheck({ caseId: '${caseId}', notes: 'dup test', clientRequestId: 'check-req-1' });`);
  const dup2 = run(ctx, `logDailyProgressCheck({ caseId: '${caseId}', notes: 'dup test', clientRequestId: 'check-req-1' });`);
  check('same clientRequestId returns the SAME checkId (idempotent)', dup1.checkId === dup2.checkId);
  check('idempotent replay did not create an extra row (3 real checks, not 4)', run(ctx, `listDailyChecksForCase('${caseId}').length`) === 3);

  // Refuses once Case is Closed
  const d = run(ctx, `addDefectItem({ caseId: '${caseId}', description: 'x' });`);
  run(ctx, `recordOwnerVerification({ defectId: '${d.defectId}', ownerVerificationStatus: 'Verified' });`);
  run(ctx, `closeDefectItem({ defectId: '${d.defectId}' });`);
  run(ctx, `closeCase({ caseId: '${caseId}' });`);
  throws('logDailyProgressCheck refuses once the Case is Closed', () => run(ctx, `logDailyProgressCheck({ caseId: '${caseId}' });`));
}

console.log('\\n' + '═'.repeat(60));
console.log(fail === 0 ? `ALL ${pass} CHECKS PASSED (0 failures)` : `${pass} passed, ${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
