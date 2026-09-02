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
    itemId: defect.ItemID,
    category: defect.Category,
    // 2026-08-31 — Sidebar DLP Tab Phase 1 field alignment (Contract §11):
    // both optional on DefectItem, defaulted to '' so the client never
    // receives undefined/null for an unset value — same convention
    // buildCaseOverviewForMobile_ already established for these two.
    subCategory: defect.SubCategory || '',
    location: defect.Location,
    description: defect.Description,
    remark: defect.Remark || '',
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
/**
 * Defensive belt-and-suspenders coercion for datetime display fields —
 * sibling of 901_PropertySchema.js's coerceToIsoDateString_, but this
 * one lives here in 922 rather than 901 (Projection-layer concern, not
 * a Schema one — and 901 stays untouched, same as 900/918 throughout
 * this whole Sidebar DLP Tab effort). coerceToIsoDateString_ itself
 * isn't reusable here: it normalizes to a DATE-ONLY 'yyyy-MM-dd' via
 * toIsoDate_, which would silently truncate away the time-of-day
 * precision a real datetime field (OccurredAt, CreatedAt, etc.) needs
 * for correct same-day chronological ordering — appendCaseTimelineEntry_
 * writes OccurredAt via `new Date().toISOString()` directly (918/922
 * confirmed by direct read), a full ISO instant, not a coerceToIsoDateString_
 * calendar date.
 *
 * Real-device evidence (2026-08-31/2026-09-01, CC): Sidebar DLP Tab's
 * Overview loaded blank on a real device while Defect List/Detail and
 * both write actions worked fine — traced to getCaseTimeline's sort
 * below calling .localeCompare() directly on OccurredAt with no type
 * guard, which throws if that cell ever comes back as a native Date
 * object instead of a string (a known, previously-fixed-elsewhere risk
 * in this codebase — see coerceToIsoDateString_'s own comment, and
 * dateColumns text-formatting only applying `if (isNewSheet)` in
 * ensureSheetSchema_, so a sheet that already existed before dateColumns
 * was added to its schema never got that retroactive protection).
 */
function coerceIsoDateTimeForDisplay_(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

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
      obj.OccurredAt = coerceIsoDateTimeForDisplay_(obj.OccurredAt);
      obj.CreatedAt = coerceIsoDateTimeForDisplay_(obj.CreatedAt);
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

/**
 * Single-pass aggregation for the Mobile Console's Case Overview screen
 * (948_MobileConsole.html, via 947's dlp_getCaseOverview). Deliberately
 * NOT built on getDlpCaseDashboard + listDefectItemsForDashboard above —
 * real-device verification (2026-08-21/22) traced a genuine N+1 there:
 * enrichDefectForDisplay_ calls getPropertyCase/getProperty once PER
 * defect, even though every defect in one Case shares the identical
 * CaseID/PropertyID (140 defects -> ~280 redundant Sheets reads for a
 * result that's the same every time). Separately, getDlpCaseDashboard's
 * recentTimeline, listDefectItemsForDashboard's own getCaseTimeline
 * call, and dlp_getCaseOverview's direct getCaseTimeline call each did
 * their own full read+sort of PropertyCaseTimeline — 3 full scans of
 * the same sheet for one page load.
 *
 * getDlpCaseDashboard/listDefectItemsForDashboard are untouched by this
 * addition: 947's own header comment marks them as intended for a
 * future Sidebar DLP Tab too, and changing shared functions to fit one
 * caller's performance needs is exactly the kind of speculative
 * generalization this project avoids. This is a new, separate,
 * mobile-specific function instead.
 *
 * Reads exactly 4 sheets, each exactly once: PropertyCase, Property,
 * DefectItem, PropertyCaseTimeline. Does not read SecondaryDamage,
 * Correspondence, RectificationEvent, or DailyProgressCheck — none of
 * those are rendered by 948_MobileConsole.html's renderOverview_
 * (verified directly against that function, not assumed).
 *
 * 2026-08-30 — added itemId/subCategory/remark to each entry below
 * (CC-approved Mobile Console field-display enhancement; UI/read-side
 * only — no Domain/Schema/dedup change, all three already existed on
 * DefectItem, this function just wasn't selecting them into its output
 * yet). All three are optional on DefectItem, so each is defaulted to
 * '' here instead of passed through raw, so the client never receives
 * undefined/null for an unset value. enrichDefectForDisplay_ above is
 * intentionally untouched by this — that's the future Sidebar DLP
 * Tab's display path, out of scope for this Mobile Console change.
 *
 * @param {string} caseId
 * @param {number} [timelineLimit] entries to return for display (default 20)
 * @return {{caseInfo: Object, defectCounts: Object, defects: Array, timeline: Array}}
 */
function buildCaseOverviewForMobile_(caseId, timelineLimit) {
  var propertyCase = getPropertyCase(caseId);
  if (!propertyCase) {
    throw propertyError_('DLP_CASE_NOT_FOUND', 'No PropertyCase found for caseId ' + caseId + '.');
  }
  var property = getProperty(propertyCase.PropertyID);

  var defects = listDefectItemsForCase(caseId);
  var defectCounts = {
    total: defects.length,
    byStatus: { Open: 0, InProgress: 0, PendingVerification: 0, Verified: 0, Closed: 0 }
  };

  // Fetched exactly once, then reused both for the latest-event-per-
  // defect join below and for the displayed list -- replaces what were
  // three separate full-sheet reads with one.
  var timeline = getCaseTimeline(caseId); // newest first, no limit

  // O(N) hash index instead of an O(defects x timeline) filter() per
  // defect, so this stays cheap as the Case Timeline grows.
  var latestByDefectId = {};
  timeline.forEach(function (t) {
    if (t.RelatedDefectID && !latestByDefectId[t.RelatedDefectID]) {
      latestByDefectId[t.RelatedDefectID] = t; // already newest-first
    }
  });

  var enrichedDefects = defects.map(function (defect) {
    defectCounts.byStatus[defect.Status] = (defectCounts.byStatus[defect.Status] || 0) + 1;
    var latest = latestByDefectId[defect.DefectID] || null;
    return {
      defectId: defect.DefectID,
      caseId: defect.CaseID,
      itemId: defect.ItemID || '',
      category: defect.Category,
      subCategory: defect.SubCategory || '',
      location: defect.Location,
      description: defect.Description,
      remark: defect.Remark || '',
      priority: defect.Priority,
      status: defect.Status,
      developerStatus: defect.DeveloperStatus,
      ownerVerificationStatus: defect.OwnerVerificationStatus,
      latestEvent: latest ? latest.Summary : '',
      latestEventAt: latest ? latest.OccurredAt : ''
    };
  });

  return {
    caseInfo: {
      caseId: propertyCase.CaseID,
      propertyName: property ? property.PropertyName : '',
      unitLabel: property ? property.UnitLabel : '',
      status: propertyCase.Status
    },
    defectCounts: defectCounts,
    defects: enrichedDefects,
    timeline: timeline.slice(0, timelineLimit || 20)
  };
}

// ─── Sidebar DLP Tab — vertical slice 2 (2026-08-31, continued) ────────
// Rectification Event / Evidence / Secondary Damage / Correspondence.

/**
 * Single-pass Detail-page bundle for the Sidebar DLP Tab: one defect's
 * full record plus its Rectification Events, Evidence, and Secondary
 * Damage — everything Defect Detail (Contract §4/§7/§8/§9) needs, in one
 * server call. Deliberately separate from buildCaseOverviewForMobile_
 * above (Contract §18/CC's ruling: no shared/universal aggregation
 * function across the two UI Surfaces, even though both ultimately read
 * overlapping data — same precedent this file already set for
 * getDlpCaseDashboard/listDefectItemsForDashboard staying untouched when
 * buildCaseOverviewForMobile_ was added).
 *
 * Builds on enrichDefectForDisplay_ rather than duplicating its
 * Property/Case join (List and Detail share the same base defect
 * shape), then layers on the extra timestamp fields Detail needs that
 * the List doesn't (RectificationStartDate/DeveloperClaimedCompletedDate/
 * OwnerVerifiedDate/CreatedAt/UpdatedAt — SubmittedAt/ClosedDate are
 * already on the List shape). This replaces vertical-slice-1's
 * dlp_getSidebarDefectDetail, which bare-passed getDefectItem() with no
 * shaping at all — deliberately deferred until this function existed
 * (see that wrapper's original comment / REVIEW-008's Key Decision #2).
 * Each of the 3 related-record reads below hits its own sheet exactly
 * once — no N+1 here, unlike the Mobile problem buildCaseOverviewForMobile_
 * fixed (that one came from calling enrichDefectForDisplay_ once PER
 * DEFECT across a whole Case; this function runs it exactly once, for
 * exactly one defect).
 */
function buildDefectDetailForSidebar_(defectId) {
  var defect = getDefectItem(defectId);
  if (!defect) {
    throw propertyError_('DLP_SIDEBAR_DEFECT_NOT_FOUND', 'No DefectItem found for defectId ' + defectId + '.');
  }
  var display = enrichDefectForDisplay_(defect);
  display.rectificationStartDate = defect.RectificationStartDate ? coerceIsoDateTimeForDisplay_(defect.RectificationStartDate) : '';
  display.developerClaimedCompletedDate = defect.DeveloperClaimedCompletedDate ? coerceIsoDateTimeForDisplay_(defect.DeveloperClaimedCompletedDate) : '';
  display.ownerVerifiedDate = defect.OwnerVerifiedDate ? coerceIsoDateTimeForDisplay_(defect.OwnerVerifiedDate) : '';
  display.createdAt = defect.CreatedAt ? coerceIsoDateTimeForDisplay_(defect.CreatedAt) : '';
  display.updatedAt = defect.UpdatedAt ? coerceIsoDateTimeForDisplay_(defect.UpdatedAt) : '';

  return {
    defect: display,
    rectificationEvents: listRectificationEventsForDefect(defectId).map(enrichRectificationEventForDisplay_),
    evidence: listEvidenceForDefect(defectId).map(enrichEvidenceForDisplay_),
    secondaryDamage: listSecondaryDamageForDefect(defectId).map(enrichSecondaryDamageForDisplay_)
  };
}

function enrichRectificationEventForDisplay_(event) {
  return {
    rectificationEventId: event.RectificationEventID,
    eventType: event.EventType,
    eventDate: coerceIsoDateTimeForDisplay_(event.EventDate),
    entryTime: event.EntryTime || '',
    exitTime: event.ExitTime || '',
    contractorCompany: event.ContractorCompany || '',
    contractorPersonnel: event.ContractorPersonnel || '',
    notes: event.Notes || '',
    source: event.Source,
    createdAt: coerceIsoDateTimeForDisplay_(event.CreatedAt)
  };
}

function enrichEvidenceForDisplay_(evidence) {
  return {
    evidenceId: evidence.EvidenceID,
    evidenceType: evidence.EvidenceType,
    driveFileId: evidence.DriveFileID,
    capturedAt: evidence.CapturedAt ? coerceIsoDateTimeForDisplay_(evidence.CapturedAt) : '',
    uploadedAt: coerceIsoDateTimeForDisplay_(evidence.UploadedAt),
    source: evidence.Source || '',
    description: evidence.Description || '',
    phase: evidence.Phase,
    createdAt: coerceIsoDateTimeForDisplay_(evidence.CreatedAt)
  };
}

function enrichSecondaryDamageForDisplay_(damage) {
  return {
    damageId: damage.DamageID,
    damageType: damage.DamageType,
    description: damage.Description,
    observedDate: coerceIsoDateTimeForDisplay_(damage.ObservedDate),
    observedBy: damage.ObservedBy || '',
    responsibleParty: damage.ResponsibleParty || '',
    status: damage.Status,
    resolution: damage.Resolution || '',
    administrativeSubmissionRequired: !!damage.AdministrativeSubmissionRequired,
    separateSubmissionId: damage.SeparateSubmissionID || '',
    dlpPrejudiceStatus: damage.DlpPrejudiceStatus || '',
    contractualBasis: damage.ContractualBasis || '',
    createdAt: coerceIsoDateTimeForDisplay_(damage.CreatedAt)
  };
}

// View-only (Contract §1/§10 — Correspondence has no defectId on the
// Domain Model at all, and Phase 1 only lists "View", never "Add", for
// this one — no logCorrespondence wrapper exists in 947 for this
// reason, not an oversight).
function enrichCorrespondenceForDisplay_(correspondence) {
  return {
    correspondenceId: correspondence.CorrespondenceID,
    date: coerceIsoDateTimeForDisplay_(correspondence.Date),
    direction: correspondence.Direction,
    sender: correspondence.Sender,
    recipient: correspondence.Recipient,
    subject: correspondence.Subject,
    responseStatus: correspondence.ResponseStatus,
    responseRequestedDate: correspondence.ResponseRequestedDate ? coerceIsoDateTimeForDisplay_(correspondence.ResponseRequestedDate) : '',
    responseDueDate: correspondence.ResponseDueDate ? coerceIsoDateTimeForDisplay_(correspondence.ResponseDueDate) : '',
    responseReceivedDate: correspondence.ResponseReceivedDate ? coerceIsoDateTimeForDisplay_(correspondence.ResponseReceivedDate) : ''
  };
}
