/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 990_TestKit.js
 * GAS-native test utility.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * This file, and 991_Tests_ObligationEngine.js, are meant to be pasted
 * into the SAME Apps Script project as 900-903/912-913 and run directly
 * from the Script Editor (select a function, click Run). Nothing here
 * uses require/module.exports/process/__dirname — those are Node
 * constructs that don't exist in Apps Script, and never will here.
 *
 * This is a different tool from property-os-tests/ (the Node sandbox) —
 * that one runs on a local machine against a simulated GAS, this one
 * runs for real, inside GAS, against real SpreadsheetApp/LockService/
 * CacheService. Both exist on purpose; see 991's header for why.
 * ═══════════════════════════════════════════════════════════════════════
 */

function makeGasTestSuite_(suiteName) {
  var results = [];

  function test(name, fn) {
    try {
      fn();
      results.push({ name: name, pass: true });
    } catch (e) {
      results.push({ name: name, pass: false, error: e.message + (e.code ? ' [' + e.code + ']' : '') });
    }
  }

  function assertEqual(actual, expected, msg) {
    var a = JSON.stringify(actual);
    var e = JSON.stringify(expected);
    if (a !== e) {
      throw new Error((msg ? msg + ' — ' : '') + 'expected ' + e + ', got ' + a);
    }
  }

  function assertTrue(value, msg) {
    if (!value) throw new Error(msg || ('expected truthy value, got ' + JSON.stringify(value)));
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
    throw new Error((msg ? msg + ' — ' : '') + 'expected a throw, nothing was thrown');
  }

  function report() {
    var passed = 0;
    var lines = ['=== ' + suiteName + ' ==='];
    var failLines = [];
    results.forEach(function (r) {
      if (r.pass) {
        passed++;
        lines.push('  OK   ' + r.name);
      } else {
        failLines.push('  FAIL ' + r.name + ' :: ' + r.error);
      }
    });
    lines = lines.concat(failLines);
    lines.push('--- ' + passed + '/' + results.length + ' passed ---');
    var text = lines.join('\n');
    Logger.log(text);
    return { suiteName: suiteName, total: results.length, passed: passed, failed: results.length - passed, text: text };
  }

  return { test: test, assertEqual: assertEqual, assertTrue: assertTrue, assertThrows: assertThrows, report: report };
}
