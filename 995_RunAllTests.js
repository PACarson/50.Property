/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 995_RunAllTests.js
 * Runs every GAS-native suite (991-994, 996) in one call and logs a
 * summary.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Run runAllPropertyOSTests() directly from the Script Editor. Requires
 * a TEST-named spreadsheet, same as each suite individually — this just
 * sequences them, it doesn't relax that requirement.
 *
 * ⚠ Confirmed 2026-07-29: a full run of all ~140 tests can exceed GAS's
 * execution time limit (real Sheets API round-trips, not the near-zero
 * cost of the Node shim's simulation — the Manual Verification
 * Checklist's Runtime limits section had flagged this as untested until
 * it happened for real). Mitigated by caching each sheet's schema
 * verification per execution instead of repeating it on every single
 * operation (see 901_PropertySchema.js's ensureSheetSchema_) — this
 * should substantially cut real API round-trips, but hasn't been
 * re-confirmed against a real timeout yet. If runAllPropertyOSTests()
 * still times out, call each suite separately instead — GAS's limit is
 * per-execution, so five separate Script Editor runs
 * (runAllPureLogicTests, runAllObligationEngineTestsLive,
 * runAllFullLifecycleTests, runAllExtendedPlatformTests,
 * runAllPropertyAssetEngineTests) sidesteps the ceiling entirely, at
 * the cost of reading five summaries instead of one.
 * ═══════════════════════════════════════════════════════════════════════
 */

function runAllPropertyOSTests() {
  assertRunningInTestSpreadsheet_();

  var results = [
    runAllPureLogicTests(),           // 992 — no Sheet writes, but fine to include here too
    runAllObligationEngineTestsLive(), // 991
    runAllFullLifecycleTests(),        // 993
    runAllExtendedPlatformTests(),      // 994
    runAllPropertyAssetEngineTests()    // 996
  ];

  var totalTests = 0, totalPassed = 0, totalFailed = 0;
  var lines = ['', '═'.repeat(60), 'PROPERTY OS — Full GAS-Native Test Plan', '═'.repeat(60)];
  results.forEach(function (r) {
    totalTests += r.total;
    totalPassed += r.passed;
    totalFailed += r.failed;
    lines.push('  ' + (r.failed === 0 ? '✓' : '✗') + '  ' + r.suiteName + ': ' + r.passed + '/' + r.total);
  });
  lines.push('-'.repeat(60));
  lines.push('  TOTAL: ' + totalPassed + '/' + totalTests + (totalFailed > 0 ? '  (' + totalFailed + ' FAILING)' : '  — all passing'));
  lines.push('═'.repeat(60));
  lines.push('');
  lines.push('Test rows are tagged PROP-TEST-... — call cleanupTestData_() to remove them when done inspecting.');

  var summary = lines.join('\n');
  Logger.log(summary);
  return { totalTests: totalTests, totalPassed: totalPassed, totalFailed: totalFailed, summary: summary };
}
