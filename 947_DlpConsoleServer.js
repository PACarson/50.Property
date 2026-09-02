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

// 2026-09-01 update: originally a plain dlp_wrap_ return, reasoned (at
// the time) to be safe because 945's existing tabs already return
// comparably-nested plain objects with no issue. Real-device testing
// (CC, 2026-08-31/09-01) proved that reasoning wrong specifically for
// THIS endpoint: Overview loaded blank while Defect List/Detail worked
// fine. The underlying crash (getCaseTimeline's unguarded
// .localeCompare() on a possibly-non-string OccurredAt — see 922) is
// now fixed, but this object is still the deepest/richest one crossing
// this boundary (case info + 3-dimensional defect counts + a
// timeline) — same class of object as dlp_getCaseOverview above, which
// already needed this exact fix for the same reason. Applying it here
// too, not just trusting the getCaseTimeline fix alone to be sufficient.
function dlp_getSidebarCaseDashboard() {
  var result = dlp_wrap_(function () {
    return getDlpCaseDashboard(PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID);
  });
  return JSON.stringify(result);
}

function dlp_listSidebarDefects() {
  return dlp_wrap_(function () {
    return listDefectItemsForDashboard(PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID);
  });
}

// Bare pass-through of the raw DefectItem record (918's own field names —
// DefectID/ItemID/Category/... — not remapped to the List's camelCase
// shape here). Deliberate: remapping is a 922 Projection-layer concern
// Vertical slice 1 note (superseded 2026-08-31, same day): this used to
// be a bare pass-through of getDefectItem() — deliberately unshaped,
// since the proper 922 aggregation for this didn't exist yet (see
// REVIEW-008's Key Decision #2). Now that buildDefectDetailForSidebar_
// exists (vertical slice 2, bundling Rectification Events/Evidence/
// Secondary Damage alongside the defect record itself), this wrapper
// calls that instead. Return shape changed accordingly — see
// buildDefectDetailForSidebar_'s own comment in 922 for exactly what's
// in it. 945's renderDlpDefectDetail was updated in the same round to
// match (raw PascalCase defect fields are gone; everything is now the
// same camelCase shape the Defect List already uses).
function dlp_getSidebarDefectDetail(defectId) {
  return dlp_wrap_(function () {
    return buildDefectDetailForSidebar_(defectId);
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

// ─── Vertical slice 2 (2026-08-31, continued): Rectification Event /
// Evidence / Secondary Damage / Correspondence ─────────────────────────
// Same dlp_wrap_ discipline, same "no clientRequestId from this surface"
// reasoning as vertical slice 1 (Contract §13 — Sidebar's stable-
// connection profile doesn't carry Mobile's flaky-connection motivation
// for the pattern, even though these 3 Commands already support it,
// unlike Update Developer Status/Record Owner Verification's Commands).
// Double-submit is handled the same way slice 1's two actions already
// handle it: 945 disables the submit button on click, same as before.

function dlp_addRectificationEvent(input) {
  return dlp_wrap_(function () {
    input = input || {};
    return logRectificationEvent({
      caseId: PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID,
      defectId: input.defectId,
      eventType: input.eventType,
      eventDate: input.eventDate || undefined,
      entryTime: input.entryTime || '',
      exitTime: input.exitTime || '',
      contractorCompany: input.contractorCompany || '',
      contractorPersonnel: input.contractorPersonnel || '',
      notes: input.notes || '',
      source: input.source || undefined
    });
  });
}

// Distinct from dlp_attachEvidence above (Mobile-only — hardcoded
// evidenceType:'Photo'/phase:'NotApplicable', requires a checkId, always
// relatedEntityType:'DailyProgressCheck'). This one is for attaching
// Evidence directly to a Defect from the Sidebar, with the full
// EvidenceType/Phase enum (Contract §8 — "management surface, complete
// metadata", unlike Mobile's simplified always-Photo capture). 945's own
// UI only drives the upload path (base64Data/fileName/mimeType) — same
// as Mobile, no "pick an existing Drive file" UI concept exists — but
// driveFileId is still forwarded here so this wrapper doesn't silently
// disable a path attachEvidence (911) itself explicitly supports.
function dlp_attachDefectEvidence(input) {
  return dlp_wrap_(function () {
    input = input || {};
    if (!input.defectId) {
      throw propertyError_('DLP_SIDEBAR_EVIDENCE_MISSING_DEFECT', 'defectId is required — this wrapper is for attaching Evidence to a specific Defect.');
    }
    return attachEvidence({
      relatedCaseId: PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID,
      relatedDefectId: input.defectId,
      evidenceType: input.evidenceType || undefined,
      phase: input.phase || undefined,
      description: input.description || '',
      driveFileId: input.driveFileId || undefined,
      base64Data: input.base64Data,
      fileName: input.fileName,
      mimeType: input.mimeType
    });
  });
}

function dlp_addSecondaryDamage(input) {
  return dlp_wrap_(function () {
    input = input || {};
    return logSecondaryDamage({
      caseId: PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID,
      parentDefectId: input.defectId,
      damageType: input.damageType || undefined,
      description: input.description,
      observedDate: input.observedDate || undefined,
      observedBy: input.observedBy || '',
      responsibleParty: input.responsibleParty || '',
      administrativeSubmissionRequired: !!input.administrativeSubmissionRequired,
      separateSubmissionId: input.separateSubmissionId || '',
      dlpPrejudiceStatus: input.dlpPrejudiceStatus || '',
      contractualBasis: input.contractualBasis || ''
    });
  });
}

// View-only — no dlp_addCorrespondence exists, deliberately (Contract
// §1/§10: Phase 1 only lists "View" for Correspondence, and the Domain
// Model has no defectId on it at all — see buildDefectDetailForSidebar_'s
// sibling enrichCorrespondenceForDisplay_ in 922 for the same note).
function dlp_listSidebarCorrespondence() {
  return dlp_wrap_(function () {
    return listCorrespondenceForCase(PROPERTY_CONFIG.ACTIVE_DLP_CASE_ID).map(enrichCorrespondenceForDisplay_);
  });
}

// Static config, no wrapping needed — can't throw (same precedent as
// 946_OperatorConsoleServer.js's console_getFormOptions). Extended
// 2026-08-31 (vertical slice 2) with the enums slice 1 didn't need.
function dlp_getSidebarFormOptions() {
  return {
    developerStatuses: PROPERTY_CONFIG.DEVELOPER_STATUSES,
    ownerVerificationStatuses: PROPERTY_CONFIG.OWNER_VERIFICATION_STATUSES,
    rectificationEventTypes: PROPERTY_CONFIG.RECTIFICATION_EVENT_TYPES,
    rectificationSources: PROPERTY_CONFIG.RECTIFICATION_SOURCES,
    evidenceTypes: PROPERTY_CONFIG.EVIDENCE_TYPES,
    evidencePhases: PROPERTY_CONFIG.EVIDENCE_PHASES,
    secondaryDamageTypes: PROPERTY_CONFIG.SECONDARY_DAMAGE_TYPES
  };
}
