'use strict';
/**
 * Property OS — Obligation Engine Vertical Slice — full Test Plan runner.
 * Run with: node runAllTests.js
 *
 * Runs every suite's runAllXTests(), matching the ecosystem's existing
 * Node-sandbox convention. Exit code is 0 iff every suite passed
 * completely — safe to wire into a CI-style check later if desired.
 */

const { runAllFoundationTests } = require('./tests/900_Tests_Foundation');
const { runAllObligationEngineTests } = require('./tests/912_Tests_ObligationEngine');
const { runAllObligationIntegrationTests } = require('./tests/919_Tests_ObligationIntegration');

function main() {
  const suiteResults = [
    runAllFoundationTests(),
    runAllObligationEngineTests(),
    runAllObligationIntegrationTests()
  ];

  const totalTests = suiteResults.reduce((sum, r) => sum + r.total, 0);
  const totalPassed = suiteResults.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = suiteResults.reduce((sum, r) => sum + r.failed, 0);

  console.log('\n' + '='.repeat(60));
  console.log('PROPERTY OS — Obligation Engine Vertical Slice Test Plan');
  console.log('='.repeat(60));
  suiteResults.forEach((r) => {
    console.log('  ' + (r.failed === 0 ? '✓' : '✗') + '  ' + r.suiteName + ': ' + r.passed + '/' + r.total);
  });
  console.log('-'.repeat(60));
  console.log('  TOTAL: ' + totalPassed + '/' + totalTests + (totalFailed > 0 ? '  (' + totalFailed + ' FAILING)' : '  — all passing'));
  console.log('='.repeat(60) + '\n');

  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
