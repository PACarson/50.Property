const { loadPropertyOSContext } = require('./GasShim.js');
const vm = require('vm');

const FILES = [
  '900_PropertyConfig.js', '901_PropertySchema.js', '902_PropertyIdentity.js',
  '903_PropertyEventDefinitions.js', '910_PropertyAssetEngine.js', '911_DocumentEngine.js',
  '912_ObligationEngine.js', '913_ObligationScheduler.js', '918_DefectEngine.js',
  '922_DashboardAdapter.js'
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

console.log('=== REGRESSION: existing Obligation dashboard functions untouched ===');
{
  const ctx = fresh();
  const pid = run(ctx, `createProperty({ propertyName: 'X', addressLine1: 'Y', purchasePrice: 1, freeholdLeasehold: 'Freehold', propertyType: 'LAND' }).propertyId`);
  const snapshot = run(ctx, `getDashboardSnapshot('${pid}');`);
  check('getDashboardSnapshot still returns the same shape (no defect-related keys leaking in)',
    'overdue' in snapshot && 'dueThisWeek' in snapshot && 'dueUpcoming' in snapshot &&
    'monthlyExpense' in snapshot && 'recentPayments' in snapshot);
  const summary = run(ctx, `getMonthlyExpenseSummary('${pid}');`);
  check('getMonthlyExpenseSummary still works unchanged', summary.total === 0 && summary.byCategory && typeof summary.yearMonth === 'string');
}

console.log('\n=== enrichPropertyCaseForDisplay_ / DlpEndDate estimate fallback ===');
{
  const ctx = fresh();
  // Property with real DefectExpiry set -> used as-is, not estimated
  const p1 = run(ctx, `createProperty({
    propertyName: 'Est8 Seputeh', addressLine1: 'A-19-11', purchasePrice: 1, freeholdLeasehold: 'Leasehold',
    propertyType: 'RESIDENTIAL_CONDO', vpDate: '2026-07-18', defectExpiry: '2028-07-18', developmentName: 'Est8 Seputeh', unitLabel: 'A-19-11'
  }).propertyId`);
  const c1 = run(ctx, `createPropertyCase({ propertyId: '${p1}', originalSubmissionDate: '2026-08-13' });`);
  const info1 = run(ctx, `enrichPropertyCaseForDisplay_(getPropertyCase('${c1.caseId}'));`);
  check('DlpEndDate reads real Property.DefectExpiry when present', info1.dlpEndDate === '2028-07-18');
  check('not flagged as estimated when a real value exists', info1.dlpEndDateIsEstimated === false);
  check('unitLabel/developer correctly joined from Property', info1.unitLabel === 'A-19-11' && info1.developer === '');

  // Property with VPDate but NO DefectExpiry -> falls back to a computed estimate
  const p2 = run(ctx, `createProperty({
    propertyName: 'Test No Expiry', addressLine1: 'X', purchasePrice: 1, freeholdLeasehold: 'Freehold',
    propertyType: 'RESIDENTIAL_CONDO', vpDate: '2026-07-18'
  }).propertyId`);
  const c2 = run(ctx, `createPropertyCase({ propertyId: '${p2}', originalSubmissionDate: '2026-08-13' });`);
  const info2 = run(ctx, `enrichPropertyCaseForDisplay_(getPropertyCase('${c2.caseId}'));`);
  check('falls back to VPDate + 24 months when DefectExpiry is blank', info2.dlpEndDate === '2028-07-18');
  check('correctly flagged as an estimate', info2.dlpEndDateIsEstimated === true);

  // Property with NEITHER VPDate nor DefectExpiry -> blank, no crash
  const p3 = run(ctx, `createProperty({ propertyName: 'Test Neither', addressLine1: 'X', purchasePrice: 1, freeholdLeasehold: 'Freehold', propertyType: 'RESIDENTIAL_CONDO' }).propertyId`);
  const c3 = run(ctx, `createPropertyCase({ propertyId: '${p3}', originalSubmissionDate: '2026-08-13' });`);
  const info3 = run(ctx, `enrichPropertyCaseForDisplay_(getPropertyCase('${c3.caseId}'));`);
  check('blank when neither date exists, no crash', info3.dlpEndDate === '' && info3.dlpEndDateIsEstimated === false);
}

console.log('\n=== isRectificationEventUpcoming_ ===');
{
  const ctx = fresh();
  check('a past EventDate is not upcoming', run(ctx, `isRectificationEventUpcoming_({ EventDate: '2020-01-01' })`) === false);
  check("today's date IS upcoming (hasn't happened yet at time of check)", run(ctx, `isRectificationEventUpcoming_({ EventDate: '${run(ctx, "toIsoDate_(new Date())")}' })`) === true);
  check('a future EventDate is upcoming', run(ctx, `isRectificationEventUpcoming_({ EventDate: '2099-01-01' })`) === true);
}

console.log('\n=== getDlpCaseDashboard — full realistic scenario ===');
{
  const ctx = fresh();
  const pid = run(ctx, `createProperty({
    propertyName: 'Est8 Seputeh', addressLine1: 'A-19-11', purchasePrice: 1, freeholdLeasehold: 'Leasehold',
    propertyType: 'RESIDENTIAL_CONDO', vpDate: '2026-07-18', developmentName: 'Est8 Seputeh', unitLabel: 'A-19-11'
  }).propertyId`);
  const caseId = run(ctx, `createPropertyCase({ propertyId: '${pid}', originalSubmissionDate: '2026-08-13', originalDefectCount: 140 }).caseId`);

  // 4 defects in 4 different states
  const d1 = run(ctx, `addDefectItem({ caseId: '${caseId}', description: 'Open one', priority: 'Critical' });`); // stays Open
  const d2 = run(ctx, `addDefectItem({ caseId: '${caseId}', description: 'In progress one' });`);
  run(ctx, `recordDeveloperStatus({ defectId: '${d2.defectId}', developerStatus: 'InProgress' });`);
  const d3 = run(ctx, `addDefectItem({ caseId: '${caseId}', description: 'Failed verification one' });`);
  run(ctx, `recordDeveloperStatus({ defectId: '${d3.defectId}', developerStatus: 'ClaimedCompleted' });`);
  run(ctx, `recordOwnerVerification({ defectId: '${d3.defectId}', ownerVerificationStatus: 'FailedVerification' });`);
  const d4 = run(ctx, `addDefectItem({ caseId: '${caseId}', description: 'Closed one' });`);
  run(ctx, `recordOwnerVerification({ defectId: '${d4.defectId}', ownerVerificationStatus: 'Verified' });`);
  run(ctx, `closeDefectItem({ defectId: '${d4.defectId}' });`);

  run(ctx, `logSecondaryDamage({ caseId: '${caseId}', parentDefectId: '${d3.defectId}', description: 'Scratched tile' });`);

  run(ctx, `logCorrespondence({ caseId: '${caseId}', direction: 'Sent', subject: 'Overdue one', responseDueDate: '2020-01-01' });`);
  run(ctx, `logCorrespondence({ caseId: '${caseId}', direction: 'Sent', subject: 'Not due yet', responseDueDate: '2099-01-01' });`);
  const answered = run(ctx, `logCorrespondence({ caseId: '${caseId}', direction: 'Sent', subject: 'Already answered', responseDueDate: '2020-01-01' });`);
  run(ctx, `recordCorrespondenceResponse({ correspondenceId: '${answered.correspondenceId}', responseStatus: 'Answered' });`);

  run(ctx, `logRectificationEvent({ caseId: '${caseId}', eventType: 'ReinspectionRequired', eventDate: '2099-01-01' });`);
  run(ctx, `logRectificationEvent({ caseId: '${caseId}', defectId: '${d2.defectId}', eventType: 'AccessGranted', eventDate: '2099-02-01' });`);

  run(ctx, `logDailyProgressCheck({ caseId: '${caseId}', accessObserved: false });`);
  const check2 = run(ctx, `logDailyProgressCheck({ caseId: '${caseId}', accessObserved: true, contractorObserved: true });`);

  const dash = run(ctx, `getDlpCaseDashboard('${caseId}');`);

  check('caseInfo.propertyName correct', dash.caseInfo.propertyName === 'Est8 Seputeh');
  check('caseInfo.unitLabel correct', dash.caseInfo.unitLabel === 'A-19-11');
  check('caseInfo.dlpEndDate estimated correctly from VPDate', dash.caseInfo.dlpEndDate === '2028-07-18' && dash.caseInfo.dlpEndDateIsEstimated === true);
  check('caseInfo.originalDefectCount preserved (static snapshot, not recomputed)', dash.caseInfo.originalDefectCount === 140);

  check('defectCounts.total === 4', dash.defectCounts.total === 4);
  check('defectCounts.byStatus.Open === 1', dash.defectCounts.byStatus.Open === 1);
  check('defectCounts.byStatus.InProgress === 2 (both the explicit InProgress AND the FailedVerification one)', dash.defectCounts.byStatus.InProgress === 2);
  check('defectCounts.byStatus.Closed === 1', dash.defectCounts.byStatus.Closed === 1);
  check('defectCounts.byDeveloperStatus.ClaimedCompleted === 1', dash.defectCounts.byDeveloperStatus.ClaimedCompleted === 1);
  check('defectCounts.byOwnerVerificationStatus.FailedVerification === 1', dash.defectCounts.byOwnerVerificationStatus.FailedVerification === 1);
  check('defectCounts.byOwnerVerificationStatus.Verified === 1 (the closed one still shows Verified on this dimension)', dash.defectCounts.byOwnerVerificationStatus.Verified === 1);

  check('secondaryDamageCount.total === 1', dash.secondaryDamageCount.total === 1);
  check('secondaryDamageCount.unresolved === 1 (Reported, not yet Rectified)', dash.secondaryDamageCount.unresolved === 1);

  check('correspondence.total === 3', dash.correspondence.total === 3);
  check('correspondence.awaitingDeveloperResponse === 2 (the two not Answered/Rejected)', dash.correspondence.awaitingDeveloperResponse === 2);
  check('correspondence.overdue === 1 (only the genuinely overdue one, Answered one excluded)', dash.correspondence.overdue === 1);
  check('overdueItems has the right subject', dash.correspondence.overdueItems[0].subject === 'Overdue one');

  check('upcomingReinspection has exactly 1 entry', dash.upcomingReinspection.length === 1);
  check('upcomingRectification has exactly 1 entry (the AccessGranted one, reinspection excluded)', dash.upcomingRectification.length === 1);

  check('lastChecked reflects the MOST RECENT daily check, not the first', dash.lastChecked === check2.dailyCheck.DateTime);

  check('recentTimeline is non-empty and sorted newest-first', dash.recentTimeline.length > 0 &&
    (dash.recentTimeline.length === 1 || dash.recentTimeline[0].OccurredAt >= dash.recentTimeline[1].OccurredAt));

  throws('unknown caseId throws cleanly', () => run(ctx, `getDlpCaseDashboard('CASE-nope');`));

  console.log('\n=== listDefectItemsForDashboard ===');
  const rows = run(ctx, `listDefectItemsForDashboard('${caseId}');`);
  check('returns all 4 defects', rows.length === 4);
  check('each row carries all three independent status dimensions, not collapsed into one',
    rows.every(r => 'status' in r && 'developerStatus' in r && 'ownerVerificationStatus' in r));
  const d3Row = rows.find(r => r.defectId === run(ctx, `'${d3.defectId}'`));
  check("d3's latestEvent reflects its true latest activity chronologically (the secondary damage log, which ran AFTER the verification in this sequence — correctly not stuck on an older entry)",
    d3Row.latestEvent.indexOf('Secondary damage') !== -1);
  check('propertyName/unitLabel correctly joined on every row', rows.every(r => r.propertyName === 'Est8 Seputeh' && r.unitLabel === 'A-19-11'));
}

console.log('\n' + '='.repeat(60));
console.log(fail === 0 ? `ALL ${pass} CHECKS PASSED (0 failures)` : `${pass} passed, ${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
