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
  const d1 = run(ctx, `addDefectItem({ caseId: '${caseId}', description: 'Bathroom 1 severe floor ponding', category: 'Sanitary Fitting', location: 'Bathroom 1', priority: 'Critical', itemId: '1' });`);
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
  const d = run(ctx, `addDefectItem({ caseId: '${c.caseId}', description: 'Air-conditioner not cooling', category: 'Appliances', itemId: '88' });`);
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

console.log("\n=== Phase 6: addWorkingDays_ (pure function) ===");
{
  const ctx = fresh();
  check('the real task scenario: 14 Aug 2026 (Fri) + 3 working days = 19 Aug 2026 (Wed), skipping the weekend',
    run(ctx, `addWorkingDays_('2026-08-14', 3)`) === '2026-08-19');
  check('Monday + 1 working day = Tuesday', run(ctx, `addWorkingDays_('2026-08-17', 1)`) === '2026-08-18');
  check('Friday + 1 working day = Monday (skips Sat/Sun)', run(ctx, `addWorkingDays_('2026-08-21', 1)`) === '2026-08-24');
  check('+0 working days returns the same date unchanged', run(ctx, `addWorkingDays_('2026-08-17', 0)`) === '2026-08-17');
}

console.log("\n=== Phase 6: logCorrespondence ===");
{
  const ctx = fresh(); const propertyId = seedProperty(ctx);
  const c = run(ctx, `createPropertyCase({ propertyId: '${propertyId}', originalSubmissionDate: '2026-08-13' });`);
  const caseId = c.caseId;

  const r1 = run(ctx, `logCorrespondence({
    caseId: '${caseId}', direction: 'Sent', sender: 'Carson', recipient: 'Eupe Corporation Berhad',
    subject: 'Official DLP Defect Rectification Requirements, Access Control and Technical Clarifications Unit A-19-11',
    date: '2026-08-14', responseRequestedDate: '2026-08-14', responseWorkingDays: 3
  });`);
  check('succeeds', r1.success === true);
  check('CorrespondenceID has CORR- prefix', r1.correspondenceId.indexOf('CORR-') === 0);
  check('ResponseDueDate correctly computed via addWorkingDays_', r1.correspondence.ResponseDueDate === '2026-08-19');
  check('ResponseStatus defaults to Pending', r1.correspondence.ResponseStatus === 'Pending');

  const r2 = run(ctx, `logCorrespondence({ caseId: '${caseId}', direction: 'Received', subject: 'Noted with thanks', responseDueDate: '2026-09-01' });`);
  check('explicit responseDueDate override respected (bypasses addWorkingDays_)', r2.correspondence.ResponseDueDate === '2026-09-01');

  const r3 = run(ctx, `logCorrespondence({ caseId: '${caseId}', direction: 'Sent', subject: 'FYI only, no reply needed' });`);
  check('no deadline info given, ResponseDueDate stays blank (not defaulted to anything)', r3.correspondence.ResponseDueDate === '');

  throws('caseId required', () => run(ctx, `logCorrespondence({ direction: 'Sent', subject: 'x' });`));
  throws('unknown Direction rejected', () => run(ctx, `logCorrespondence({ caseId: '${caseId}', direction: 'Sideways', subject: 'x' });`));
  throws('subject required', () => run(ctx, `logCorrespondence({ caseId: '${caseId}', direction: 'Sent' });`));
  throws('unknown caseId rejected', () => run(ctx, `logCorrespondence({ caseId: 'CASE-nope', direction: 'Sent', subject: 'x' });`));

  check('listCorrespondenceForCase returns all 3', run(ctx, `listCorrespondenceForCase('${caseId}').length`) === 3);
  check('getCorrespondence round-trips', run(ctx, `getCorrespondence('${r1.correspondenceId}').Subject`).indexOf('Official DLP') === 0);
}

console.log("\n=== Phase 6: recordCorrespondenceResponse, NotedOnly is never auto-upgraded (scenario 13) ===");
{
  const ctx = fresh(); const propertyId = seedProperty(ctx);
  const caseId = run(ctx, `createPropertyCase({ propertyId: '${propertyId}', originalSubmissionDate: '2026-08-13' }).caseId`);
  const corr = run(ctx, `logCorrespondence({ caseId: '${caseId}', direction: 'Sent', subject: 'Formal DLP requirements email' });`);

  const noted = run(ctx, `recordCorrespondenceResponse({ correspondenceId: '${corr.correspondenceId}', responseStatus: 'NotedOnly' });`);
  check('recordCorrespondenceResponse succeeds', noted.success === true);
  const afterNoted = run(ctx, `getCorrespondence('${corr.correspondenceId}');`);
  check('CORE RULE: ResponseStatus is exactly NotedOnly, not silently upgraded to Answered', afterNoted.ResponseStatus === 'NotedOnly');
  check('ResponseReceivedDate got set even though it is not a substantive response', !!afterNoted.ResponseReceivedDate);

  throws('unknown ResponseStatus rejected', () => run(ctx, `recordCorrespondenceResponse({ correspondenceId: '${corr.correspondenceId}', responseStatus: 'Ignored' });`));
  throws('unknown correspondenceId rejected', () => run(ctx, `recordCorrespondenceResponse({ correspondenceId: 'CORR-nope', responseStatus: 'Answered' });`));

  run(ctx, `recordCorrespondenceResponse({ correspondenceId: '${corr.correspondenceId}', responseStatus: 'Answered' });`);
  check('a LATER explicit call CAN move it to Answered (still not automatic)', run(ctx, `getCorrespondence('${corr.correspondenceId}').ResponseStatus`) === 'Answered');
}

console.log("\n=== Phase 6: isCorrespondenceOverdue_ (Lazy Computation) ===");
{
  const ctx = fresh();
  check('no ResponseDueDate at all -> never overdue',
    run(ctx, `isCorrespondenceOverdue_({ ResponseDueDate: '', ResponseStatus: 'Pending' })`) === false);
  check('due date in the far past + still Pending -> overdue',
    run(ctx, `isCorrespondenceOverdue_({ ResponseDueDate: '2020-01-01', ResponseStatus: 'Pending' })`) === true);
  check('due date in the far past + NotedOnly -> STILL overdue (scenario 13 extends to the dashboard too)',
    run(ctx, `isCorrespondenceOverdue_({ ResponseDueDate: '2020-01-01', ResponseStatus: 'NotedOnly' })`) === true);
  check('due date in the far past + Answered -> resolved, not overdue',
    run(ctx, `isCorrespondenceOverdue_({ ResponseDueDate: '2020-01-01', ResponseStatus: 'Answered' })`) === false);
  check('due date in the far past + Rejected -> resolved (a definitive no is still resolved), not overdue',
    run(ctx, `isCorrespondenceOverdue_({ ResponseDueDate: '2020-01-01', ResponseStatus: 'Rejected' })`) === false);
  check('due date far in the future + Pending -> not yet overdue',
    run(ctx, `isCorrespondenceOverdue_({ ResponseDueDate: '2099-01-01', ResponseStatus: 'Pending' })`) === false);
}

console.log("\n=== Phase 7: logRectificationEvent ===");
{
  const ctx = fresh(); const propertyId = seedProperty(ctx);
  const caseId = run(ctx, `createPropertyCase({ propertyId: '${propertyId}', originalSubmissionDate: '2026-08-13' }).caseId`);
  const d = run(ctx, `addDefectItem({ caseId: '${caseId}', description: 'AC not cooling', category: 'Appliances' });`);
  const otherCase = run(ctx, `createPropertyCase({ propertyId: '${propertyId}', originalSubmissionDate: '2026-08-14' }).caseId`);

  const r1 = run(ctx, `logRectificationEvent({
    caseId: '${caseId}', defectId: '${d.defectId}', eventType: 'AccessGranted',
    eventDate: '2026-08-16', entryTime: '10:00', exitTime: '12:00',
    contractorCompany: 'ABC M&E', contractorPersonnel: '2 technicians',
    notes: 'Inspected AC unit', source: 'OwnerObserved'
  });`);
  check('succeeds', r1.success === true);
  check('RectificationEventID has RECT- prefix', r1.rectificationEventId.indexOf('RECT-') === 0);
  check('Source defaults correctly when given explicitly', r1.rectificationEvent.Source === 'OwnerObserved');

  const r2 = run(ctx, `logRectificationEvent({ caseId: '${caseId}', eventType: 'AccessRequested' });`);
  check('case-level event (no defectId) succeeds', r2.success === true);
  check('DefectID blank for a case-level event', r2.rectificationEvent.DefectID === '');
  check('Source defaults to OwnerObserved when omitted', r2.rectificationEvent.Source === 'OwnerObserved');

  throws('caseId required', () => run(ctx, `logRectificationEvent({ eventType: 'AccessGranted' });`));
  throws('unknown eventType rejected', () => run(ctx, `logRectificationEvent({ caseId: '${caseId}', eventType: 'DidAThing' });`));
  throws('unknown defectId rejected', () => run(ctx, `logRectificationEvent({ caseId: '${caseId}', defectId: 'DEFECT-nope', eventType: 'AccessGranted' });`));
  throws('defect belonging to a different case rejected', () => run(ctx, `logRectificationEvent({ caseId: '${otherCase}', defectId: '${d.defectId}', eventType: 'AccessGranted' });`));
  throws('unknown Source rejected', () => run(ctx, `logRectificationEvent({ caseId: '${caseId}', eventType: 'AccessGranted', source: 'Telepathy' });`));

  check('listRectificationEventsForCase returns both', run(ctx, `listRectificationEventsForCase('${caseId}').length`) === 2);
  check('listRectificationEventsForDefect returns only the one scoped to that defect', run(ctx, `listRectificationEventsForDefect('${d.defectId}').length`) === 1);
  check('getRectificationEvent round-trips', run(ctx, `getRectificationEvent('${r1.rectificationEventId}').ContractorCompany`) === 'ABC M&E');

  const timeline = run(ctx, `
    var sheet = propertyCaseTimelineSheet_(); var last = sheet.getLastRow();
    var cols = PROPERTY_SCHEMA.PropertyCaseTimeline.columns;
    sheet.getRange(2,1,last-1,cols.length).getValues()
      .map(function(row){ var o={}; cols.forEach(function(c,i){o[c]=row[i];}); return o; })
      .filter(function(e){ return e.EntryType === 'RECTIFICATION_EVENT_LOGGED'; });
  `);
  check('Timeline summary humanizes the EventType naturally', timeline[0].Summary.indexOf('Access Granted') !== -1);
  check('Timeline summary includes the contractor company', timeline[0].Summary.indexOf('ABC M&E') !== -1);

  // Idempotency
  const dup1 = run(ctx, `logRectificationEvent({ caseId: '${caseId}', eventType: 'RectificationStarted', clientRequestId: 'rect-req-1' });`);
  const dup2 = run(ctx, `logRectificationEvent({ caseId: '${caseId}', eventType: 'RectificationStarted', clientRequestId: 'rect-req-1' });`);
  check('same clientRequestId returns the SAME rectificationEventId', dup1.rectificationEventId === dup2.rectificationEventId);
  check('idempotent replay did not create an extra row', run(ctx, `listRectificationEventsForCase('${caseId}').length`) === 3);

  // Case-closed guard
  run(ctx, `recordOwnerVerification({ defectId: '${d.defectId}', ownerVerificationStatus: 'Verified' });`);
  run(ctx, `closeDefectItem({ defectId: '${d.defectId}' });`);
  run(ctx, `closeCase({ caseId: '${caseId}' });`);
  throws('logRectificationEvent refuses once the Case is Closed', () => run(ctx, `logRectificationEvent({ caseId: '${caseId}', eventType: 'AccessGranted' });`));
}

console.log("\n=== Phase 7: humanizeEventType_ ===");
{
  const ctx = fresh();
  check("'AccessGranted' -> 'Access Granted'", run(ctx, `humanizeEventType_('AccessGranted')`) === 'Access Granted');
  check("'DeveloperClaimedCompleted' -> 'Developer Claimed Completed'",
    run(ctx, `humanizeEventType_('DeveloperClaimedCompleted')`) === 'Developer Claimed Completed');
  check("'ReinspectionRequired' -> 'Reinspection Required'", run(ctx, `humanizeEventType_('ReinspectionRequired')`) === 'Reinspection Required');
}

console.log("\n=== Phase 7: logSecondaryDamage + updateSecondaryDamageStatus ===");
{
  const ctx = fresh(); const propertyId = seedProperty(ctx);
  const caseId = run(ctx, `createPropertyCase({ propertyId: '${propertyId}', originalSubmissionDate: '2026-08-13' }).caseId`);
  const d = run(ctx, `addDefectItem({ caseId: '${caseId}', description: 'Kitchen cabinet leak', category: 'Plumbing' });`);
  const rect = run(ctx, `logRectificationEvent({ caseId: '${caseId}', defectId: '${d.defectId}', eventType: 'RectificationStarted' });`);
  const otherCase = run(ctx, `createPropertyCase({ propertyId: '${propertyId}', originalSubmissionDate: '2026-08-14' }).caseId`);

  const dmg = run(ctx, `logSecondaryDamage({
    caseId: '${caseId}', parentDefectId: '${d.defectId}', rectificationEventId: '${rect.rectificationEventId}',
    damageType: 'Cabinet', description: 'Lower cabinet panel damaged during pipe access',
    observedBy: 'Carson', responsibleParty: 'Contractor (as reported)'
  });`);
  check('succeeds', dmg.success === true);
  check('DamageID has DMG- prefix', dmg.damageId.indexOf('DMG-') === 0);
  check('Status starts Reported', dmg.damage.Status === 'Reported');
  check('AdministrativeSubmissionRequired defaults false', dmg.damage.AdministrativeSubmissionRequired === false);
  check('ResponsibleParty stored as plain text, no legal judgment made by the system', dmg.damage.ResponsibleParty === 'Contractor (as reported)');

  const minimalDmg = run(ctx, `logSecondaryDamage({ caseId: '${caseId}', description: 'Scratched flooring' });`);
  check('minimal input succeeds (caseId + description only)', minimalDmg.success === true);
  check('DamageType defaults to Other', minimalDmg.damage.DamageType === 'Other');

  throws('caseId required', () => run(ctx, `logSecondaryDamage({ description: 'x' });`));
  throws('description required', () => run(ctx, `logSecondaryDamage({ caseId: '${caseId}' });`));
  throws('unknown damageType rejected', () => run(ctx, `logSecondaryDamage({ caseId: '${caseId}', description: 'x', damageType: 'Volcano' });`));
  throws('unknown parentDefectId rejected', () => run(ctx, `logSecondaryDamage({ caseId: '${caseId}', description: 'x', parentDefectId: 'DEFECT-nope' });`));
  throws('defect belonging to a different case rejected', () => run(ctx, `logSecondaryDamage({ caseId: '${otherCase}', description: 'x', parentDefectId: '${d.defectId}' });`));
  throws('unknown rectificationEventId rejected', () => run(ctx, `logSecondaryDamage({ caseId: '${caseId}', description: 'x', rectificationEventId: 'RECT-nope' });`));

  const updated = run(ctx, `updateSecondaryDamageStatus({ damageId: '${dmg.damageId}', status: 'Acknowledged' });`);
  check('updateSecondaryDamageStatus succeeds', updated.success === true);
  check('Status persisted', run(ctx, `getSecondaryDamage('${dmg.damageId}').Status`) === 'Acknowledged');

  run(ctx, `updateSecondaryDamageStatus({ damageId: '${dmg.damageId}', status: 'Rectified', resolution: 'Cabinet panel replaced by contractor at no cost' });`);
  const resolved = run(ctx, `getSecondaryDamage('${dmg.damageId}');`);
  check('Resolution persisted alongside a later status update', resolved.Resolution === 'Cabinet panel replaced by contractor at no cost');
  check('Disputed is a reachable status too (no strict transition graph)',
    run(ctx, `updateSecondaryDamageStatus({ damageId: '${dmg.damageId}', status: 'Disputed' }).success`) === true);

  throws('unknown Status rejected', () => run(ctx, `updateSecondaryDamageStatus({ damageId: '${dmg.damageId}', status: 'OnFire' });`));
  throws('unknown damageId rejected', () => run(ctx, `updateSecondaryDamageStatus({ damageId: 'DMG-nope', status: 'Reported' });`));

  check('listSecondaryDamageForCase returns both', run(ctx, `listSecondaryDamageForCase('${caseId}').length`) === 2);
  check('listSecondaryDamageForDefect returns only the one scoped to that defect', run(ctx, `listSecondaryDamageForDefect('${d.defectId}').length`) === 1);
}

console.log('\\n' + '═'.repeat(60));
console.log(fail === 0 ? `ALL ${pass} CHECKS PASSED (0 failures)` : `${pass} passed, ${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
