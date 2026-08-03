/**
 * ═══════════════════════════════════════════════════════════════════════
 * PROPERTY OS — 996_Tests_PropertyAssetEngine.js
 * GAS-native tests — real SpreadsheetApp. Every 910 Command's
 * validation, success, and state-transition paths.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠ Same safety requirement as 991/993/994 — TEST-named spreadsheet only
 * (assertRunningInTestSpreadsheet_, defined in 991, same project/global
 * scope). Run runAllPropertyAssetEngineTests() from the Script Editor.
 * ═══════════════════════════════════════════════════════════════════════
 */

function basePropertyInput_(overrides) {
  var input = {
    propertyName: TEST_PROPERTY_NAME_TAG_ + new Date().getTime() + '-' + Math.floor(Math.random() * 1e6),
    addressLine1: '1 Test Street',
    addressCity: 'Test City',
    addressState: 'Test State',
    addressPostcode: '00000',
    addressCountry: 'Test Country',
    purchaseDate: '2020-01-01',
    purchasePrice: 500000,
    freeholdLeasehold: 'Freehold',
    propertyType: 'RESIDENTIAL_CONDO'
  };
  for (var k in (overrides || {})) input[k] = overrides[k];
  return input;
}

function runAllPropertyAssetEngineTests() {
  assertRunningInTestSpreadsheet_();
  var s = makeGasTestSuite_('996_Tests_PropertyAssetEngine (real GAS, real Sheets)');
  initPropertySchema_();

  // ─── createProperty ──────────────────────────────────────────────

  s.test('createProperty rejects a missing propertyName', function () {
    s.assertThrows(function () { createProperty(basePropertyInput_({ propertyName: '' })); }, 'INVALID_INPUT');
  });

  s.test('createProperty rejects a missing addressLine1', function () {
    s.assertThrows(function () { createProperty(basePropertyInput_({ addressLine1: '' })); }, 'INVALID_INPUT');
  });

  s.test('createProperty rejects a non-positive purchasePrice', function () {
    s.assertThrows(function () { createProperty(basePropertyInput_({ purchasePrice: 0 })); }, 'INVALID_INPUT');
  });

  s.test('createProperty rejects an unknown freeholdLeasehold', function () {
    s.assertThrows(function () { createProperty(basePropertyInput_({ freeholdLeasehold: 'Freeholdish' })); }, 'INVALID_INPUT');
  });

  s.test('createProperty rejects an unknown propertyType', function () {
    s.assertThrows(function () { createProperty(basePropertyInput_({ propertyType: 'CASTLE' })); }, 'INVALID_PROPERTY_TYPE');
  });

  s.test('createProperty succeeds: CurrentValue defaults to PurchasePrice when omitted', function () {
    var result = createProperty(basePropertyInput_({ purchasePrice: 750000 }));
    s.assertTrue(result.success);
    var property = getProperty(result.propertyId);
    s.assertEqual(property.CurrentValue, 750000);
    s.assertEqual(property.Status, 'Active');
  });

  s.test('createProperty succeeds: explicit CurrentValue is respected, not overridden by the default', function () {
    var result = createProperty(basePropertyInput_({ purchasePrice: 500000, currentValue: 620000 }));
    s.assertEqual(getProperty(result.propertyId).CurrentValue, 620000);
  });

  s.test('createProperty stores the six structured Address columns, not a flat string', function () {
    var result = createProperty(basePropertyInput_({ addressLine1: '42 Jalan Test', addressCity: 'Petaling Jaya' }));
    var property = getProperty(result.propertyId);
    s.assertEqual(property.AddressLine1, '42 Jalan Test');
    s.assertEqual(property.AddressCity, 'Petaling Jaya');
  });

  s.test('createProperty with a ClientRequestID is idempotent', function () {
    var input = basePropertyInput_({ clientRequestId: 'TEST-idem-prop-' + new Date().getTime() });
    var first = createProperty(input);
    var second = createProperty(input);
    s.assertEqual(first.propertyId, second.propertyId);
  });

  // ─── updateProperty ──────────────────────────────────────────────

  s.test('updateProperty rejects changing Status via changedFields', function () {
    var created = createProperty(basePropertyInput_());
    s.assertThrows(function () {
      updateProperty({ propertyId: created.propertyId, changedFields: { Status: 'Sold' } });
    }, 'INVALID_INPUT');
  });

  s.test('updateProperty rejects updating a Sold property', function () {
    var created = createProperty(basePropertyInput_());
    markPropertySold({ propertyId: created.propertyId, soldPrice: 600000 });
    s.assertThrows(function () {
      updateProperty({ propertyId: created.propertyId, changedFields: { PropertyName: 'New Name' } });
    }, 'PROPERTY_IMMUTABLE');
  });

  s.test('updateProperty rejects an unknown PropertyType in changedFields', function () {
    var created = createProperty(basePropertyInput_());
    s.assertThrows(function () {
      updateProperty({ propertyId: created.propertyId, changedFields: { PropertyType: 'CASTLE' } });
    }, 'INVALID_PROPERTY_TYPE');
  });

  s.test('updateProperty successfully changes a field', function () {
    var created = createProperty(basePropertyInput_());
    updateProperty({ propertyId: created.propertyId, changedFields: { Developer: 'New Developer Sdn Bhd' } });
    s.assertEqual(getProperty(created.propertyId).Developer, 'New Developer Sdn Bhd');
  });

  // ─── markPropertySold / reversePropertySale (ADR-P06/P10) ────────

  s.test('markPropertySold rejects an already-Sold property with ALREADY_SOLD', function () {
    var created = createProperty(basePropertyInput_());
    markPropertySold({ propertyId: created.propertyId, soldPrice: 600000 });
    s.assertThrows(function () { markPropertySold({ propertyId: created.propertyId, soldPrice: 610000 }); }, 'ALREADY_SOLD');
  });

  s.test('markPropertySold rejects a non-positive soldPrice', function () {
    var created = createProperty(basePropertyInput_());
    s.assertThrows(function () { markPropertySold({ propertyId: created.propertyId, soldPrice: 0 }); }, 'INVALID_INPUT');
  });

  s.test('markPropertySold succeeds: Active -> Sold, SoldDate/SoldPrice recorded', function () {
    var created = createProperty(basePropertyInput_());
    var result = markPropertySold({ propertyId: created.propertyId, soldPrice: 650000, soldDate: '2026-08-01' });
    s.assertTrue(result.success);
    var property = getProperty(created.propertyId);
    s.assertEqual(property.Status, 'Sold');
    s.assertEqual(property.SoldPrice, 650000);
    s.assertEqual(property.SoldDate, '2026-08-01');
  });

  s.test('reversePropertySale rejects a property that is not Sold', function () {
    var created = createProperty(basePropertyInput_());
    s.assertThrows(function () { reversePropertySale({ propertyId: created.propertyId }); }, 'PROPERTY_NOT_SOLD');
  });

  s.test('reversePropertySale moves Sold back to Active and clears SoldDate/SoldPrice', function () {
    var created = createProperty(basePropertyInput_());
    markPropertySold({ propertyId: created.propertyId, soldPrice: 600000, soldDate: '2026-08-01' });
    var rev = reversePropertySale({ propertyId: created.propertyId, reason: 'deal fell through' });
    s.assertTrue(rev.success);
    var property = getProperty(created.propertyId);
    s.assertEqual(property.Status, 'Active');
    s.assertEqual(property.SoldDate, '');
    s.assertEqual(property.SoldPrice, '');
  });

  s.test('sell -> reverse -> sell again cycle works cleanly (mirrors 912 recordPayment/reversePayment/recordPayment)', function () {
    var created = createProperty(basePropertyInput_());
    markPropertySold({ propertyId: created.propertyId, soldPrice: 600000 });
    reversePropertySale({ propertyId: created.propertyId, reason: 'typo' });
    markPropertySold({ propertyId: created.propertyId, soldPrice: 615000 });
    var property = getProperty(created.propertyId);
    s.assertEqual(property.Status, 'Sold');
    s.assertEqual(property.SoldPrice, 615000);
  });

  // ─── Cross-Engine integration (§8 — the loop this closes) ────────

  s.test('propertyExists_ (now real, called from 912) returns true for a real Property and false for a fake one', function () {
    var created = createProperty(basePropertyInput_());
    s.assertTrue(propertyExists_(created.propertyId));
    s.assertTrue(!propertyExists_('PROP-definitely-not-real-0000'));
  });

  s.test('createObligation (912) now genuinely rejects an Obligation for a Property that does not exist', function () {
    s.assertThrows(function () {
      createObligation({
        propertyId: 'PROP-definitely-not-real-0000', category: 'Mortgage', payee: 'Test Bank',
        amount: 1000, frequencyType: 'Monthly', dueAnchor: '2026-09-01'
      });
    }, 'PROPERTY_NOT_FOUND');
  });

  var summary = s.report();
  Logger.log('\nThis run\'s rows are tagged PropertyName starting with "' + TEST_PROPERTY_NAME_TAG_ + '" — call cleanupTestData_() when done inspecting them.');
  return summary;
}
