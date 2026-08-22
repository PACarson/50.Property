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
    return {
      dashboard: getDlpCaseDashboard(caseId),
      defects: listDefectItemsForDashboard(caseId),
      timeline: getCaseTimeline(caseId, 20)
    };
  });
  // Serialized to a plain string before crossing the google.script.run
  // boundary. Real-device verification (2026-08-21, Executions log showed
  // "Completed", 6.8s, no error, yet the client received nothing) traced
  // to google.script.run's client-bridge silently returning null for this
  // specific payload. Scoped to just this one RPC rather than folded into
  // dlp_wrap_ itself, since the other three dlp_* calls (bootstrap, daily
  // check, evidence) are already confirmed working real-device and don't
  // need it. See 00_Project_State.js / MANUAL_VERIFICATION_CHECKLIST.md.
  return JSON.stringify(result);
}
