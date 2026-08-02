/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 995_RunAllTests.js
 * Runs every GAS-native suite (991-994) in one call and logs a summary.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Run runAllPropertyOSTests() directly from the Script Editor. Requires
 * a TEST-named spreadsheet, same as 991/993/994 individually — this
 * just sequences them, it doesn't relax that requirement.
 * ═══════════════════════════════════════════════════════════════════════
 */

function runAllPropertyOSTests() {
  assertRunningInTestSpreadsheet_();

  var results = [
    runAllPureLogicTests(),           // 992 — no Sheet writes, but fine to include here too
    runAllObligationEngineTestsLive(), // 991
    runAllFullLifecycleTests(),        // 993
    runAllExtendedPlatformTests()      // 994
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
