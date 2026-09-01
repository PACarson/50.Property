/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 947_DlpConsoleServer.js
 * DLP Console — shared server-side glue (Phase 9/10)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Every dlp_* function below is a THIN wrapper — same discipline as
 * 946_OperatorConsoleServer.js's console_* functions: it calls an
 * existing Command or Query (918/911/910/922), catches whatever it
 * throws, and returns a consistent {success, data|error, code} shape.
 * Zero new business logic lives here. This file exists only because
 * google.script.run needs a clean success/failure boundary, and
 * because doGet() needs a single Web App entry point somewhere.
 *
 * This file is intended to serve BOTH the Mobile Web Console
 * (948_MobileConsole.html, via doGet()) and the future Sidebar DLP Tab
 * (945/946) — avoiding duplicate glue for the same Domain calls across
 * the two UI surfaces. Split it further only if it actually gets
 * crowded, not pre-emptively.
 *
 * Full design contract: DlpMobileConsole_UIContract.md (CC Final
 * Approval 2026-08-19). Two things load-bearing to that contract:
 *   - PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID / OPERATOR_NAME
 *     (900_PropertyConfig.js) are MVP Configuration, NOT Truth Layer —
 *     Contract §9.1/§9.2. Never treat ACTIVE_DLP_CASE_ID as the
 *     canonical source of "the" Case in any Domain-layer code — it
 *     only exists to give this file's bootstrap something to read.
 *   - Web App deployment access (executeAs/access in appsscript.json)
 *     is still OPEN — Contract §9.3 — not resolved by this file.
 * ═══════════════════════════════════════════════════════════════════════
 */

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('948_MobileConsole')
    .setTitle('DLP Daily Check')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function dlp_wrap_(fn) {
  try {
    return { success: true, data: fn() };
  } catch (e) {
    return { success: false, error: e.message, code: e.code || '' };
  }
}

// ─── Bootstrap (Mobile Console landing) ───────────────────────────────

function dlp_getMobileBootstrap() {
  return dlp_wrap_(function () {
    var caseId = PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID;
    var propertyCase = getPropertyCase(caseId);
    if (!propertyCase) {
      throw propertyError_(
        'DLP_MOBILE_CASE_NOT_CONFIGURED',
        'ACTIVE_DLP_CASE_ID (' + caseId + ') in 900_PropertyConfig.js does not match a real PropertyCase. ' +
        'Replace the placeholder with the real CaseID before using Mobile Console.'
      );
    }
    var property = getProperty(propertyCase.PropertyID);
    return {
      caseId: caseId,
      propertyName: property ? property.PropertyName : '',
      unitLabel: property ? property.UnitLabel : '',
      operatorName: PROPERTY_CONFIG.OPERATOR_NAME,
      nowIso: new Date().toISOString()
    };
  });
}

// ─── Daily Check (918, unchanged) ─────────────────────────────────────

function dlp_logDailyCheck(input) {
  return dlp_wrap_(function () {
    input = input || {};
    return logDailyProgressCheck({
      caseId: PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID,
      dateTime: input.dateTime,
      checkedBy: PROPERTY_CONFIG.OPERATOR_NAME,
      accessObserved: !!input.accessObserved,
      contractorObserved: !!input.contractorObserved,
      developerRepresentativeObserved: !!input.developerRepresentativeObserved,
      workObserved: input.workObserved || '',
      generalStatus: input.generalStatus || '',
      notes: input.notes || '',
      clientRequestId: input.clientRequestId
    });
  });
}

// ─── Evidence (911, unchanged) ─────────────────────────────────────────

function dlp_attachEvidence(input) {
  return dlp_wrap_(function () {
    input = input || {};
    if (!input.checkId) {
      throw propertyError_(
        'DLP_MOBILE_EVIDENCE_MISSING_CHECK',
        'checkId is required — evidence must be linked to the Daily Check it was captured for.'
      );
    }
    return attachEvidence({
      relatedCaseId: PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID,
      relatedEntityType: 'DailyProgressCheck',
      relatedEntityId: input.checkId,
      evidenceType: 'Photo',
      phase: 'NotApplicable',
      base64Data: input.base64Data,
      fileName: input.fileName,
      mimeType: input.mimeType,
      clientRequestId: input.clientRequestId
    });
  });
}

// ─── Case Overview — read-only (922, unchanged) ────────────────────────
// Bundles 3 existing reads into one round trip so a slow on-site
// connection isn't paying for 3 separate google.script.run hops
// (Contract §6). dashboard.recentTimeline (10 items) and the separate
// timeline (20 items) below deliberately overlap — harmless, the
// client only renders the fuller one.

function dlp_getCaseOverview() {
  var result = dlp_wrap_(function () {
    var caseId = PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID;
    // Was: getDlpCaseDashboard(caseId) + listDefectItemsForDashboard(caseId)
    // + getCaseTimeline(caseId, 20) -- three calls that together did a real
    // N+1 (getPropertyCase/getProperty once per defect) and read the full
    // PropertyCaseTimeline sheet three times. buildCaseOverviewForMobile_
    // (922_DashboardAdapter.js) does the same job in one pass, each of the
    // 4 sheets it actually needs read exactly once. Same output shape, so
    // 948_MobileConsole.html's renderOverview_ needs no changes.
    var overview = buildCaseOverviewForMobile_(caseId, 20);
    return {
      dashboard: { caseInfo: overview.caseInfo, defectCounts: overview.defectCounts },
      defects: overview.defects,
      timeline: overview.timeline
    };
  });
  // Serialized to a plain string before crossing the google.script.run
  // boundary. Real-device verification (2026-08-21) showed "Completed"
  // in Executions with no error, yet the client received nothing -- kept
  // scoped to just this one RPC, not folded into dlp_wrap_ itself, since
  // the other three dlp_* calls are already confirmed working real-device.
  return JSON.stringify(result);
}

// ─── Sidebar DLP Tab (Phase 1, 2026-08-31) ─────────────────────────────
// New dlp_* wrappers for 945_OperatorConsole.html's DLP tab, per
// DlpSidebarTab_UIContract.md §12/§18/§1 (Case Overview, Defect List,
// Defect Detail, Update Developer Status, Record Owner Verification —
// this vertical slice only; Rectification Event/Evidence/Secondary
// Damage/Correspondence come in the next round per CC's pacing). Same
// dlp_wrap_ discipline as the Mobile-facing functions above — zero new
// business logic, every write still goes through its existing 918
// Command untouched, 918/922 semantics unchanged.
//
// Deliberately reuse getDlpCaseDashboard/listDefectItemsForDashboard
// as-is rather than adding a new 922 aggregation function: both already
// exist, both already carry their own docblock intent to serve "the
// future Sidebar DLP Tab" (Contract §18 cites this exact precedent), and
// listDefectItemsForDashboard now surfaces subCategory/remark for free
// via enrichDefectForDisplay_'s §11 edit above — no new 922 code needed
// for this batch. The one genuinely new-shape read is
// dlp_getSidebarDefectDetail, which is just getDefectItem() (918) with a
// not-found check; no new 922 function either, since batch 1's Detail
// view is the record's own fields only, no Rectification Event/Evidence/
// Secondary Damage join (that bundle, and the 922 function it needs, is
// explicitly deferred — Contract §18 — to the next round).
//
// No JSON.stringify here, unlike dlp_getCaseOverview above: that was a
// fix scoped to the Mobile Web App's doGet() google.script.run boundary
// specifically (see that function's own comment, and its real-device
// 2026-08-21 root cause). 945's four existing tabs already return
// comparably-nested plain objects/arrays through console_wrap_ with no
// such issue (e.g. console_getDashboardSnapshot's nested
// byCategory/overdue/dueThisWeek shape) — the Sidebar-facing wrappers
// here follow that already-proven Sidebar pattern instead.

function dlp_getSidebarCaseDashboard() {
  return dlp_wrap_(function () {
    return getDlpCaseDashboard(PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID);
  });
}

function dlp_listSidebarDefects() {
  return dlp_wrap_(function () {
    return listDefectItemsForDashboard(PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID);
  });
}

// Bare pass-through of the raw DefectItem record (918's own field names —
// DefectID/ItemID/Category/... — not remapped to the List's camelCase
// shape here). Deliberate: remapping is a 922 Projection-layer concern
// (Contract §12), and building a proper 922 shape for this is exactly
// what the next round's fuller Detail-page aggregation function will do
// once it also needs to bundle in Rectification Events/Evidence/
// Secondary Damage (§18) — not worth inventing a shape now that would
// likely just be replaced then. 945's Detail view reads the raw field
// names directly for this batch.
function dlp_getSidebarDefectDetail(defectId) {
  return dlp_wrap_(function () {
    var defect = getDefectItem(defectId);
    if (!defect) {
      throw propertyError_('DLP_SIDEBAR_DEFECT_NOT_FOUND', 'No DefectItem found for defectId ' + defectId + '.');
    }
    return defect;
  });
}

function dlp_recordDeveloperStatus(input) {
  return dlp_wrap_(function () {
    input = input || {};
    return recordDeveloperStatus({
      defectId: input.defectId,
      developerStatus: input.developerStatus,
      claimedCompletedDate: input.claimedCompletedDate || undefined,
      note: input.note || ''
    });
  });
}

function dlp_recordOwnerVerification(input) {
  return dlp_wrap_(function () {
    input = input || {};
    return recordOwnerVerification({
      defectId: input.defectId,
      ownerVerificationStatus: input.ownerVerificationStatus,
      verifiedDate: input.verifiedDate || undefined,
      reason: input.reason || ''
    });
  });
}

// Static config, no wrapping needed — can't throw (same precedent as
// 946_OperatorConsoleServer.js's console_getFormOptions).
function dlp_getSidebarFormOptions() {
  return {
    developerStatuses: PROPERTY_CONFIG.DEVELOPER_STATUSES,
    ownerVerificationStatuses: PROPERTY_CONFIG.OWNER_VERIFICATION_STATUSES
  };
}
