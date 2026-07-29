'use strict';
/**
 * Minimal test runner. No external dependencies (no Jest/Mocha) — this
 * whole harness needs to run with nothing but `node`, matching the
 * ecosystem's existing Node-sandbox convention rather than adding a new
 * tooling dependency for one project.
 */

function makeSuite(suiteName) {
  const results = [];

  function test(name, fn) {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (e) {
      results.push({ name, pass: false, error: e.message, stack: e.stack });
    }
  }

  function assertEqual(actual, expected, msg) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) {
      throw new Error((msg ? msg + ' — ' : '') + 'expected ' + e + ', got ' + a);
    }
  }

  function assertTrue(value, msg) {
    if (!value) throw new Error(msg || 'expected truthy value, got ' + JSON.stringify(value));
  }

  function assertThrows(fn, expectedCode, msg) {
    try {
      fn();
    } catch (e) {
      if (expectedCode && e.code !== expectedCode) {
        throw new Error((msg ? msg + ' — ' : '') + 'expected error code "' + expectedCode + '", got "' + e.code + '" (' + e.message + ')');
      }
      return;
    }
    throw new Error((msg ? msg + ' — ' : '') + 'expected a throw' + (expectedCode ? ' with code "' + expectedCode + '"' : '') + ', nothing was thrown');
  }

  function report() {
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass);
    console.log('\n=== ' + suiteName + ': ' + passed + '/' + results.length + ' passed ===');
    failed.forEach(f => {
      console.log('  ✗ ' + f.name);
      console.log('    ' + f.error);
    });
    if (failed.length === 0) {
      results.forEach(r => console.log('  ✓ ' + r.name));
    }
    return { suiteName, total: results.length, passed, failed: failed.length, failures: failed };
  }

  return { test, assertEqual, assertTrue, assertThrows, report };
}

module.exports = { makeSuite };
