/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 911_DocumentEngine.js
 * Runtime Layer — Evidence (minimal, pulled forward from its originally
 * planned Phase 3 slot — Phase0 Audit §3.2, ADR-P15/P16)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Vertical Slice, Phase 5 (Review Approval 2026-08-15/16).
 *
 * Deliberately minimal — this is NOT the full future Document Library
 * envisioned when 911 was originally reserved (PII handling, full-text
 * search, a general document metadata browser). It's just what the DLP
 * Case & Rectification Tracking slice needs: attach a file (or a
 * reference to one already in Drive) to a Case/Defect/other entity, and
 * query it back out. The full Document Engine, if ever built, can grow
 * from this without a rename — same ID prefix (DOC-), same Evidence
 * table already defined in 901_PropertySchema.js (Phase 1).
 *
 * ADR-P07/P11 Infrastructure Adapter Isolation: saveEvidenceFile_ (and
 * the two folder helpers just above it) are the ONLY functions in
 * Property OS allowed to know DriveApp specifics. Everything else in
 * this file, and everything in 918, only ever sees a driveFileId string.
 *
 * Depends on: 900_PropertyConfig.js, 901_PropertySchema.js,
 * 902_PropertyIdentity.js, 903_PropertyEventDefinitions.js,
 * 918_DefectEngine.js (caseExists_, defectItemExists_, getDefectItem,
 * appendCaseTimelineEntry_ — read-only + shared Timeline helper, same
 * Runtime→Runtime pattern 912 already uses on 910). This is a
 * one-directional dependency — 918's own Commands do not call into
 * this file; a future Phase could wire that up if a Command ever needs
 * to look up an entity's evidence mid-flow, not needed yet.
 * ═══════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────
// Shared infra — independently-named, functionally identical wrappers
// around the same underlying LockService/CacheService, same pattern as
// 910/912/918 each having their own.
// ─────────────────────────────────────────────────────────────────────

function withDocumentEngineLock_(fn) {
  var lock = LockService.getScriptLock();
  var acquired = lock.tryLock(30000);
  if (!acquired) {
    throw propertyError_(
      'DOCUMENT_ENGINE_LOCK_TIMEOUT',
      'Could not acquire the script lock within 30s. Another Property OS ' +
      'operation is in progress — please try again shortly.'
    );
  }
  try {
    return fn();
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

function logDocumentEnginePartialFailure_(commandName, truthDescription, originalError) {
  Logger.log(
    '[PropertyOS PARTIAL FAILURE] ' + commandName + ': ' + truthDescription +
    ' Original error: ' + (originalError && originalError.message ? originalError.message : originalError)
  );
}

function getCachedDocumentEngineCommandResult_(clientRequestId) {
  var cached = CacheService.getScriptCache().get('propertyos_idem_doc_' + clientRequestId);
  return cached ? JSON.parse(cached) : null;
}

function cacheDocumentEngineCommandResult_(clientRequestId, result) {
  CacheService.getScriptCache().put(
    'propertyos_idem_doc_' + clientRequestId, JSON.stringify(result), 3600
  );
}

function evidenceSheet_() {
  ensureSheetSchema_(
    PROPERTY_SCHEMA.Evidence.sheetName,
    PROPERTY_SCHEMA.Evidence.columns,
    PROPERTY_SCHEMA.Evidence.dateColumns
  );
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROPERTY_SCHEMA.Evidence.sheetName);
}

// ─────────────────────────────────────────────────────────────────────
// Drive Adapter — the ONLY functions in Property OS that know DriveApp
// (ADR-P07/P11). Root folder ID is cached in Script Properties so
// repeat calls don't re-search Drive by name (fragile if a duplicate
// name ever exists) — same "resolve once, store the ID" idiom as
// everything else in this project that anchors a singleton resource.
// ─────────────────────────────────────────────────────────────────────

function getEvidenceRootFolder_() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('PROPERTYOS_EVIDENCE_ROOT_FOLDER_ID');
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {
      // Stored ID no longer resolves (folder deleted/moved out of reach) — recreate below.
    }
  }
  var folder = DriveApp.createFolder('Property OS Evidence');
  props.setProperty('PROPERTYOS_EVIDENCE_ROOT_FOLDER_ID', folder.getId());
  return folder;
}

function getOrCreateCaseEvidenceFolder_(caseId) {
  var root = getEvidenceRootFolder_();
  var existing = root.getFoldersByName(caseId);
  if (existing.hasNext()) return existing.next();
  return root.createFolder(caseId);
}

/**
 * Saves a base64-encoded file into the Case's Evidence subfolder
 * (Property OS Evidence / <CaseID> / <fileName>) and returns its Drive
 * file ID. The folder-per-Case structure is what makes Evidence
 * traceable back to Property -> Case rather than scattered as
 * untrackable random files (Phase0 Audit §4.7 / task §十九).
 *
 * @param {string} caseId
 * @param {string} base64Data
 * @param {string} fileName
 * @param {string} mimeType
 * @return {string} the new file's Drive file ID
 */
function saveEvidenceFile_(caseId, base64Data, fileName, mimeType) {
  var folder = getOrCreateCaseEvidenceFolder_(caseId);
  var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
  var file = folder.createFile(blob);
  return file.getId();
}

// ─────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────

function getEvidence(evidenceId) {
  var sheet = evidenceSheet_();
  var rowIndex = findRowIndexByFirstColumn_(sheet, evidenceId);
  if (rowIndex === -1) return null;
  return readRowAsObject_(sheet, rowIndex, PROPERTY_SCHEMA.Evidence.columns);
}

function listEvidenceForCase(caseId) {
  var sheet = evidenceSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var columns = PROPERTY_SCHEMA.Evidence.columns;
  var values = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
  var caseIdIndex = columns.indexOf('RelatedCaseID');
  return values
    .filter(function (row) { return row[caseIdIndex] === caseId; })
    .map(function (row) {
      var obj = {};
      columns.forEach(function (col, i) { obj[col] = row[i]; });
      return obj;
    });
}

function listEvidenceForDefect(defectId) {
  var sheet = evidenceSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var columns = PROPERTY_SCHEMA.Evidence.columns;
  var values = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
  var defectIdIndex = columns.indexOf('RelatedDefectID');
  return values
    .filter(function (row) { return row[defectIdIndex] === defectId; })
    .map(function (row) {
      var obj = {};
      columns.forEach(function (col, i) { obj[col] = row[i]; });
      return obj;
    });
}

// ─────────────────────────────────────────────────────────────────────
// Command
// ─────────────────────────────────────────────────────────────────────

/**
 * Attaches one piece of Evidence to a Case (and optionally a specific
 * Defect / other entity within it). Either pass an existing
 * driveFileId (the file is already in Drive — e.g. placed there some
 * other way), or pass base64Data + fileName + mimeType and this
 * Command uploads it via the sole Drive Adapter above.
 *
 * @param {Object} input {relatedCaseId, relatedDefectId, relatedEntityType,
 *   relatedEntityId, evidenceType, phase, source, description, capturedAt,
 *   driveFileId, base64Data, fileName, mimeType, clientRequestId}
 */
function attachEvidence(input) {
  return withDocumentEngineLock_(function () {
    input = input || {};

    if (input.clientRequestId) {
      var cached = getCachedDocumentEngineCommandResult_(input.clientRequestId);
      if (cached) return cached;
    }

    if (!input.relatedCaseId) {
      throw propertyError_('EVIDENCE_INVALID_INPUT', 'relatedCaseId is required.');
    }
    if (!caseExists_(input.relatedCaseId)) {
      throw propertyError_('EVIDENCE_CASE_NOT_FOUND', 'No PropertyCase found for relatedCaseId ' + input.relatedCaseId + '.');
    }
    if (input.relatedDefectId) {
      var defect = getDefectItem(input.relatedDefectId);
      if (!defect) {
        throw propertyError_('EVIDENCE_DEFECT_NOT_FOUND', 'No DefectItem found for relatedDefectId ' + input.relatedDefectId + '.');
      }
      if (defect.CaseID !== input.relatedCaseId) {
        throw propertyError_(
          'EVIDENCE_DEFECT_CASE_MISMATCH',
          'DefectItem ' + input.relatedDefectId + ' belongs to Case ' + defect.CaseID +
          ', not ' + input.relatedCaseId + '.'
        );
      }
    }
    var evidenceType = input.evidenceType || 'Other';
    if (PROPERTY_CONFIG.EVIDENCE_TYPES.indexOf(evidenceType) === -1) {
      throw propertyError_('EVIDENCE_INVALID_TYPE', 'Unknown EvidenceType: ' + evidenceType + '.');
    }
    var phase = input.phase || 'NotApplicable';
    if (PROPERTY_CONFIG.EVIDENCE_PHASES.indexOf(phase) === -1) {
      throw propertyError_('EVIDENCE_INVALID_PHASE', 'Unknown Phase: ' + phase + '.');
    }
    if (input.relatedEntityType && PROPERTY_CONFIG.EVIDENCE_RELATED_ENTITY_TYPES.indexOf(input.relatedEntityType) === -1) {
      throw propertyError_('EVIDENCE_INVALID_RELATED_ENTITY_TYPE', 'Unknown RelatedEntityType: ' + input.relatedEntityType + '.');
    }

    var driveFileId = input.driveFileId;
    if (!driveFileId) {
      if (!input.base64Data || !input.fileName || !input.mimeType) {
        throw propertyError_(
          'EVIDENCE_INVALID_INPUT',
          'Provide either an existing driveFileId, or base64Data + fileName + mimeType to upload a new file.'
        );
      }
      driveFileId = saveEvidenceFile_(input.relatedCaseId, input.base64Data, input.fileName, input.mimeType);
    }

    var now = new Date().toISOString();
    var evidenceId = generateEvidenceId_();
    var evidence = {
      EvidenceID: evidenceId,
      EvidenceType: evidenceType,
      DriveFileID: driveFileId,
      CapturedAt: input.capturedAt ? new Date(input.capturedAt).toISOString() : '',
      UploadedAt: now,
      Source: input.source || '',
      Description: input.description || '',
      Phase: phase,
      RelatedCaseID: input.relatedCaseId,
      RelatedDefectID: input.relatedDefectId || '',
      RelatedEntityType: input.relatedEntityType || '',
      RelatedEntityID: input.relatedEntityId || '',
      CreatedAt: now
    };

    evidenceSheet_().appendRow(objectToRowArray_(evidence, PROPERTY_SCHEMA.Evidence.columns));

    try {
      appendCaseTimelineEntry_(
        input.relatedCaseId, 'EVIDENCE_ATTACHED',
        'Evidence attached: ' + evidenceType + (input.description ? (' — ' + input.description) : ''),
        {
          relatedDefectId: input.relatedDefectId, relatedEntityType: 'Evidence',
          relatedEntityId: evidenceId, triggeredBy: 'attachEvidence'
        }
      );
      publishPropertyEvent_(PROPERTY_EVENTS.EVIDENCE_ATTACHED, null, null, {
        evidenceId: evidenceId, evidenceType: evidenceType, relatedCaseId: input.relatedCaseId
      });
    } catch (e) {
      logDocumentEnginePartialFailure_(
        'attachEvidence',
        'Evidence ' + evidenceId + ' row was written (and a new Drive file saved, if one was uploaded); ' +
        'Timeline/Event publish failed.',
        e
      );
      throw e;
    }

    var result = { success: true, evidenceId: evidenceId, driveFileId: driveFileId, evidence: evidence };
    if (input.clientRequestId) cacheDocumentEngineCommandResult_(input.clientRequestId, result);
    return result;
  });
}
