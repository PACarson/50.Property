/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 922_DashboardAdapter.js
 * Dashboard Adapter (ADR-P14)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Lighter-weight than the earlier-planned "922_DashboardEngine" name
 * implied — this is deliberately just a couple of aggregation/join
 * functions, not a formally Vertical-Sliced Engine. May grow into a
 * fuller Dashboard Engine later; not built out that way now, per
 * ADR-P14's MVP principle.
 *
 * Purpose: sit between the Operator Console (945/946) and wherever
 * dashboard numbers actually come from, so the Console never needs to
 * know or care. `getMonthlyExpenseSummary()` is the concrete instance
 * ADR-P14 called out: today it aggregates ObligationOccurrence directly
 * (Current Source — no 914_FinanceEngine yet); once 914 exists, only
 * this function's internals change to query the Ledger instead (Target
 * Source). The Operator Console's calling code never changes.
 *
 * 918_DefectEngine Vertical Slice — Phase 8 (2026-08-17) adds the DLP
 * Case equivalent of getDashboardSnapshot/enrichOccurrenceForDisplay_
 * below, same composition-not-storage pattern: these functions own no
 * Truth tables, they only call 918's existing read functions (and, for
 * the Timeline specifically, 918's private propertyCaseTimelineSheet_
 * directly — same cross-file private-helper reuse this file already
 * does via getObligationRuleById_ above).
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * Current Source: ObligationOccurrence (MVP — 914_FinanceEngine's
 * Ledger doesn't exist yet). Target Source: Finance Ledger (914_
 * FinanceEngine.queryLedgerEntries, once built) — swap the body of
 * this function only; every caller (945/946) stays untouched.
 *
 * @param {string} [propertyId] omit for all properties combined
 * @param {string} [yearMonth] 'YYYY-MM', defaults to the current month
 * @return {{yearMonth: string, total: number, byCategory: Object}}
 */
function getMonthlyExpenseSummary(propertyId, yearMonth) {
  var ym = yearMonth || toIsoDate_(new Date()).slice(0, 7);
  var monthStart = ym + '-01';
  var monthEndDate = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0); // day 0 of next month = last day of this one
  var monthEnd = toIsoDate_(monthEndDate);

  var payments = queryRecentPayments({
    propertyId: propertyId || undefined,
    from: monthStart,
    to: monthEnd
  }).results;

  var total = 0;
  var byCategory = {};
  payments.forEach(function (occ) {
    var rule = getObligationRuleById_(occ.ObligationID);
    var category = rule ? rule.Category : 'Unknown';
    var amount = Number(occ.PaidAmount) || 0;
    total += amount;
    byCategory[category] = (byCategory[category] || 0) + amount;
  });

  return { yearMonth: ym, total: total, byCategory: byCategory };
}

/**
 * One bundled call for the Operator Console's Dashboard view, to avoid
 * five separate google.script.run round-trips on every load. Each
 * Occurrence is enriched with its Rule's Category/Payee/PropertyID and
 * the Property's PropertyName, since raw IDs aren't useful for display.
 *
 * @param {string} [propertyId] omit for all properties combined
 * @return {Object} {overdue, dueThisWeek, dueUpcoming, monthlyExpense,
 *   recentPayments} — every array entry pre-enriched for direct display
 */
function getDashboardSnapshot(propertyId) {
  var today = new Date();
  var todayIso = toIsoDate_(today);
  var weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);
  var upcomingEnd = new Date(today); upcomingEnd.setDate(upcomingEnd.getDate() + 30);

  var overdue = queryOverdue({ propertyId: propertyId || undefined }).results;
  var dueThisWeek = queryUpcomingPayments({
    propertyId: propertyId || undefined, from: todayIso, to: toIsoDate_(weekEnd)
  }).results;
  var dueUpcoming = queryUpcomingPayments({
    propertyId: propertyId || undefined, from: toIsoDate_(weekEnd), to: toIsoDate_(upcomingEnd)
  }).results;
  var recentPayments = queryRecentPayments({ propertyId: propertyId || undefined, limit: 10 }).results;

  return {
    overdue: overdue.map(enrichOccurrenceForDisplay_),
    dueThisWeek: dueThisWeek.map(enrichOccurrenceForDisplay_),
    dueUpcoming: dueUpcoming.map(enrichOccurrenceForDisplay_),
    monthlyExpense: getMonthlyExpenseSummary(propertyId),
    recentPayments: recentPayments.map(enrichOccurrenceForDisplay_)
  };
}

/**
 * Joins an Occurrence with its Rule (Category/Payee/PropertyID) and
 * Property (PropertyName), for display purposes only — never used by
 * any Command, never written back anywhere. Read-only join within
 * 912/910's own public Query functions, not a Truth Layer write.
 */
function enrichOccurrenceForDisplay_(occurrence) {
  var rule = getObligationRuleById_(occurrence.ObligationID);
  var property = rule ? getProperty(rule.PropertyID) : null;
  return {
    occurrenceId: occurrence.OccurrenceID,
    obligationId: occurrence.ObligationID,
    effectiveDue: occurrence.EffectiveDue,
    status: occurrence.Status,
    paidDate: occurrence.PaidDate || '',
    paidAmount: occurrence.PaidAmount || '',
    category: rule ? rule.Category : 'Unknown',
    payee: rule ? rule.Payee : '',
    expectedAmount: rule ? rule.Amount : '',
    propertyId: rule ? rule.PropertyID : '',
    propertyName: property ? property.PropertyName : ''
  };
}

// ─────────────────────────────────────────────────────────────────────
// 918_DefectEngine Vertical Slice — Phase 8 (2026-08-17)
// ─────────────────────────────────────────────────────────────────────

/**
 * Lazy Computation — an EventDate today-or-later means the event hasn't
 * happened yet, i.e. it's scheduled. Note this relies on a convention,
 * not a dedicated field: RectificationEvent (Phase 7, CC Review Approval
 * 2026-08-15) is an append-only log of EventType + EventDate, with no
 * separate "this is a future scheduled date" flag. Logging a
 * RectificationEvent with a future EventDate is how "upcoming" gets
 * represented — works today, but flag it if that convention doesn't
 * match how you'll actually use it once the Phase 9/10 UI exists.
 */
function isRectificationEventUpcoming_(rectificationEvent) {
  var eventDate = parseIsoDate_(rectificationEvent.EventDate);
  var today = parseIsoDate_(toIsoDate_(new Date()));
  return eventDate >= today;
}

/**
 * Joins a PropertyCase with its Property for display. DlpEndDate reads
 * Property.DefectExpiry (single source of truth, Phase0 Audit §4.1); if
 * that's blank but Property.VPDate is set, falls back to a computed
 * "~VPDate + 24 months" estimate, clearly flagged via
 * dlpEndDateIsEstimated — never silently presented as the authoritative
 * date. Neither value is written back anywhere; purely a display join.
 */
function enrichPropertyCaseForDisplay_(propertyCase) {
  var property = getProperty(propertyCase.PropertyID);
  var dlpEndDate = property ? property.DefectExpiry : '';
  var dlpEndDateIsEstimated = false;
  if (!dlpEndDate && property && property.VPDate) {
    var vp = parseIsoDate_(property.VPDate);
    var estimate = new Date(vp.getTime());
    estimate.setMonth(estimate.getMonth() + 24);
    dlpEndDate = toIsoDate_(estimate);
    dlpEndDateIsEstimated = true;
  }
  return {
    caseId: propertyCase.CaseID,
    propertyId: propertyCase.PropertyID,
    propertyName: property ? property.PropertyName : '',
    unitLabel: property ? property.UnitLabel : '',
    developer: property ? property.Developer : '',
    caseType: propertyCase.CaseType,
    caseTitle: propertyCase.CaseTitle,
    managementOffice: propertyCase.ManagementOffice,
    dlpStartDate: propertyCase.DlpStartDate,
    dlpEndDate: dlpEndDate,
    dlpEndDateIsEstimated: dlpEndDateIsEstimated,
    originalSubmissionDate: propertyCase.OriginalSubmissionDate,
    originalDefectCount: propertyCase.OriginalDefectCount,
    status: propertyCase.Status
  };
}

/**
 * Joins a DefectItem with its Case and Property for display. All three
 * status dimensions (status/developerStatus/ownerVerificationStatus)
 * are surfaced separately and never collapsed into one value — showing
 * only one would defeat the entire reason this Vertical Slice keeps
 * them independent (Phase0 Audit §4.2, ADR-P15).
 */
function enrichDefectForDisplay_(defect) {
  var propertyCase = getPropertyCase(defect.CaseID);
  var property = propertyCase ? getProperty(propertyCase.PropertyID) : null;
  return {
    defectId: defect.DefectID,
    caseId: defect.CaseID,
    originalReference: defect.OriginalReference,
    category: defect.Category,
    location: defect.Location,
    description: defect.Description,
    priority: defect.Priority,
    status: defect.Status,
    developerStatus: defect.DeveloperStatus,
    ownerVerificationStatus: defect.OwnerVerificationStatus,
    submittedAt: defect.SubmittedAt,
    closedDate: defect.ClosedDate,
    propertyId: property ? property.PropertyID : '',
    propertyName: property ? property.PropertyName : '',
    unitLabel: property ? property.UnitLabel : '',
    developer: property ? property.Developer : ''
  };
}

/**
 * Case Timeline, newest first. Reads 918's PropertyCaseTimeline sheet
 * directly via its private accessor (propertyCaseTimelineSheet_) —
 * same cross-file private-helper reuse this file already does via
 * getObligationRuleById_ above, not a new pattern.
 *
 * @param {string} caseId
 * @param {number} [limit] omit for the full history
 */
function getCaseTimeline(caseId, limit) {
  var sheet = propertyCaseTimelineSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var columns = PROPERTY_SCHEMA.PropertyCaseTimeline.columns;
  var values = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
  var caseIdIndex = columns.indexOf('CaseID');
  var entries = values
    .filter(function (row) { return row[caseIdIndex] === caseId; })
    .map(function (row) {
      var obj = {};
      columns.forEach(function (col, i) { obj[col] = row[i]; });
      return obj;
    });
  entries.sort(function (a, b) { return b.OccurredAt.localeCompare(a.OccurredAt); });
  return limit ? entries.slice(0, limit) : entries;
}

/**
 * DefectItem rows enriched for a table view — the "Property / Unit /
 * Case / Priority / Latest Event / Latest Status" listing (task §十六).
 * "Last Checked" from that same request is deliberately NOT included
 * per row: DailyProgressCheck has no DefectID (task's own field list,
 * §七) — it's a Case-level fact, not a per-defect one. It's surfaced
 * once, case-wide, in getDlpCaseDashboard's top-level lastChecked
 * instead of being forced onto every row here.
 */
function listDefectItemsForDashboard(caseId) {
  var defects = listDefectItemsForCase(caseId);
  var timeline = getCaseTimeline(caseId); // newest first, no limit
  return defects.map(function (defect) {
    var enriched = enrichDefectForDisplay_(defect);
    var related = timeline.filter(function (t) { return t.RelatedDefectID === defect.DefectID; });
    var latest = related.length > 0 ? related[0] : null;
    enriched.latestEvent = latest ? latest.Summary : '';
    enriched.latestEventAt = latest ? latest.OccurredAt : '';
    return enriched;
  });
}

/**
 * One bundled call for a DLP Case's dashboard view, same
 * avoid-N-round-trips reasoning as getDashboardSnapshot above. Every
 * count comes straight from 918's existing read functions — nothing
 * here is stored, all of it is computed at call time (Lazy Computation,
 * same principle as isCorrespondenceOverdue_/isRectificationEventUpcoming_).
 *
 * @param {string} caseId
 * @return {Object} see inline shape below — caseInfo, defectCounts
 *   (by all three independent status dimensions), secondaryDamageCount,
 *   correspondence (incl. overdue), upcomingRectification,
 *   upcomingReinspection, lastChecked, recentTimeline
 */
function getDlpCaseDashboard(caseId) {
  var propertyCase = getPropertyCase(caseId);
  if (!propertyCase) {
    throw propertyError_('DLP_CASE_NOT_FOUND', 'No PropertyCase found for caseId ' + caseId + '.');
  }

  var defects = listDefectItemsForCase(caseId);
  var defectCounts = {
    total: defects.length,
    byStatus: { Open: 0, InProgress: 0, PendingVerification: 0, Verified: 0, Closed: 0 },
    byDeveloperStatus: { Pending: 0, Scheduled: 0, InProgress: 0, ClaimedCompleted: 0 },
    byOwnerVerificationStatus: { NotChecked: 0, Verified: 0, FailedVerification: 0, PartiallyVerified: 0 }
  };
  defects.forEach(function (d) {
    defectCounts.byStatus[d.Status] = (defectCounts.byStatus[d.Status] || 0) + 1;
    defectCounts.byDeveloperStatus[d.DeveloperStatus] = (defectCounts.byDeveloperStatus[d.DeveloperStatus] || 0) + 1;
    defectCounts.byOwnerVerificationStatus[d.OwnerVerificationStatus] =
      (defectCounts.byOwnerVerificationStatus[d.OwnerVerificationStatus] || 0) + 1;
  });

  var secondaryDamages = listSecondaryDamageForCase(caseId);
  var secondaryDamageCount = {
    total: secondaryDamages.length,
    unresolved: secondaryDamages.filter(function (d) { return d.Status !== 'Rectified'; }).length
  };

  var correspondence = listCorrespondenceForCase(caseId);
  var awaitingDeveloperResponse = correspondence.filter(function (c) {
    return c.Direction === 'Sent' && ['Answered', 'Rejected'].indexOf(c.ResponseStatus) === -1;
  });
  var overdueCorrespondence = correspondence.filter(isCorrespondenceOverdue_);

  var rectificationEvents = listRectificationEventsForCase(caseId);
  var upcomingReinspection = rectificationEvents.filter(function (e) {
    return e.EventType === 'ReinspectionRequired' && isRectificationEventUpcoming_(e);
  });
  var upcomingRectification = rectificationEvents.filter(function (e) {
    return e.EventType !== 'ReinspectionRequired' && isRectificationEventUpcoming_(e);
  });

  var dailyChecks = listDailyChecksForCase(caseId);
  var lastChecked = dailyChecks.reduce(function (latest, c) {
    return (!latest || c.DateTime > latest) ? c.DateTime : latest;
  }, '');

  return {
    caseInfo: enrichPropertyCaseForDisplay_(propertyCase),
    defectCounts: defectCounts,
    secondaryDamageCount: secondaryDamageCount,
    correspondence: {
      total: correspondence.length,
      awaitingDeveloperResponse: awaitingDeveloperResponse.length,
      overdue: overdueCorrespondence.length,
      overdueItems: overdueCorrespondence.map(function (c) {
        return { correspondenceId: c.CorrespondenceID, subject: c.Subject, responseDueDate: c.ResponseDueDate };
      })
    },
    upcomingRectification: upcomingRectification,
    upcomingReinspection: upcomingReinspection,
    lastChecked: lastChecked,
    recentTimeline: getCaseTimeline(caseId, 10)
  };
}
