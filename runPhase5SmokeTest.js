/**
 * Phase 5 (911_DocumentEngine) smoke test — paste into a scratch
 * function in the Apps Script editor, run once, read the log, then
 * delete this function. Not part of any deliverable file.
 *
 * Uses a fresh throwaway test Property/Case (like the original Phase
 * 2/3 smoke test did) rather than the real EST8 A-19-11 case, so the
 * files it creates in Drive are obviously test data, easy to find and
 * delete afterward — look for a "Property OS Evidence" folder in your
 * Drive root, with one subfolder named after the test CaseID logged
 * below.
 */
function runPhase5SmokeTest() {
  Logger.log('=== STARTING PHASE 5 SMOKE TEST ===');

  var propertyResult = createProperty({
    propertyName: 'TEST-DLP-SmokeProperty-' + new Date().getTime(),
    addressLine1: 'Test Address',
    purchasePrice: 1,
    freeholdLeasehold: 'Freehold',
    propertyType: 'RESIDENTIAL_CONDO'
  });
  Logger.log('1. Created test Property: ' + propertyResult.propertyId);

  var caseResult = createPropertyCase({
    propertyId: propertyResult.propertyId,
    originalSubmissionDate: '2026-08-13'
  });
  Logger.log('2. Created PropertyCase: ' + caseResult.caseId);

  var defectResult = addDefectItem({
    caseId: caseResult.caseId,
    description: 'Smoke test defect for Evidence attachment',
    category: 'Waterproofing'
  });
  Logger.log('3. Added Defect: ' + defectResult.defectId);

  // Real upload path — exercises saveEvidenceFile_ / DriveApp for real,
  // not the fake in-memory Drive the local Node pre-check used.
  var base64Data = Utilities.base64Encode(
    'Property OS Phase 5 smoke test evidence file — ' + new Date().toISOString()
  );
  var uploadResult = attachEvidence({
    relatedCaseId: caseResult.caseId,
    relatedDefectId: defectResult.defectId,
    evidenceType: 'Other',
    phase: 'Before',
    source: 'Smoke test',
    description: 'Real Drive upload smoke test',
    base64Data: base64Data,
    fileName: 'phase5-smoke-test.txt',
    mimeType: 'text/plain'
  });
  Logger.log('4. Attached Evidence (real upload): ' + uploadResult.evidenceId);
  Logger.log('   DriveFileID: ' + uploadResult.driveFileId);

  // Confirm the file is genuinely retrievable from real Drive, and log
  // the actual folder chain so you can go look at it by eye.
  var driveFile = DriveApp.getFileById(uploadResult.driveFileId);
  Logger.log('5. Confirmed real Drive file exists: ' + driveFile.getName() + ' — ' + driveFile.getUrl());
  var parentFolders = driveFile.getParents();
  if (parentFolders.hasNext()) {
    var caseFolder = parentFolders.next();
    Logger.log('   Case folder: ' + caseFolder.getName() + ' — ' + caseFolder.getUrl());
    var rootFolders = caseFolder.getParents();
    if (rootFolders.hasNext()) {
      Logger.log('   Root folder: ' + rootFolders.next().getName());
    }
  }

  // Second attach, reusing the SAME driveFileId — should NOT create a
  // second Drive file, just a second Evidence row referencing it.
  var refResult = attachEvidence({
    relatedCaseId: caseResult.caseId,
    evidenceType: 'DeveloperReport',
    driveFileId: uploadResult.driveFileId,
    description: 'Referencing the same file, no new upload'
  });
  Logger.log('6. Attached Evidence (existing driveFileId, no upload): ' + refResult.evidenceId);

  var caseEvidence = listEvidenceForCase(caseResult.caseId);
  Logger.log('7. listEvidenceForCase returned count: ' + caseEvidence.length + ' (expect 2)');
  var defectEvidence = listEvidenceForDefect(defectResult.defectId);
  Logger.log('   listEvidenceForDefect returned count: ' + defectEvidence.length + ' (expect 1)');
  var fetched = getEvidence(uploadResult.evidenceId);
  Logger.log('8. getEvidence read back successfully: ' + (fetched !== null));

  try {
    attachEvidence({ relatedCaseId: caseResult.caseId, relatedDefectId: 'DEFECT-doesnotexist', driveFileId: 'x' });
    Logger.log('9. ERROR — should have thrown for an unknown relatedDefectId, did not!');
  } catch (e) {
    Logger.log('9. Correctly rejected unknown relatedDefectId with error: ' + e.message);
  }

  Logger.log('=== PHASE 5 SMOKE TEST PASSED SUCCESSFULLY ===');
}
