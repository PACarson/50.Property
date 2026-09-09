// local_precheck_test_948_search.js
//
// 948_MobileConsole.html is client-side HTML/JS (document/google.script.run)
// and has never had automated local tests, for the same reason M1/M2/M3
// don't — no DOM in this Node environment. This one narrow exception:
// defectMatchesQuery_/compareDefectsByItemId_/filterAndSortDefects_ (the
// Defect Search/Sort slice, 2026-09-09) are deliberately pure — no DOM
// access inside them — specifically so they COULD be unit-tested directly,
// unlike the rest of 948. This file extracts 948's <script> content into a
// minimal VM context (document.addEventListener stubbed as a no-op so the
// module-level `document.addEventListener('DOMContentLoaded', init)` line
// doesn't throw; nothing else stubbed, since these 3 functions never touch
// google.script.run or any other DOM API) and calls the three functions
// directly with synthetic defect data. It does NOT exercise the DOM-facing
// applyDefectSearchAndSort_/renderDefectListCards_/setupDefectSearch_ —
// those remain covered by the same static grep-based inspection M1-M3 used
// (see the IMPLEMENTATION report), not by this file.

const fs = require('fs');
const vm = require('vm');

var pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('ok  :', label); }
  else { fail++; console.log('FAIL:', label); }
}

const html = fs.readFileSync(__dirname + '/948_MobileConsole.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
if (!scriptMatch) { throw new Error('Could not find <script> block in 948_MobileConsole.html'); }

const sandbox = { document: { addEventListener: function () {} } };
vm.createContext(sandbox);
vm.runInContext(scriptMatch[1], sandbox);

function d(overrides) {
  return Object.assign({
    defectId: 'DEFECT-x', itemId: '', category: '', subCategory: '',
    location: '', description: '', remark: '', status: 'Open',
    developerStatus: 'Pending', ownerVerificationStatus: 'NotChecked'
  }, overrides);
}

console.log('═══ defectMatchesQuery_ ═══');
{
  const defect = d({ itemId: '12', category: 'Sanitary Fitting', subCategory: 'Aircond',
    location: 'Bathroom 1', description: 'Water leakage near basin', remark: 'Urgent' });

  check('SEARCH-01 exact ItemID matches', sandbox.defectMatchesQuery_(defect, '12'));
  check('SEARCH-02 partial ItemID matches', sandbox.defectMatchesQuery_(d({ itemId: 'DEF-123' }), '123'));
  check('SEARCH-03 Category matches', sandbox.defectMatchesQuery_(defect, 'Sanitary'));
  check('SEARCH-04 Location matches', sandbox.defectMatchesQuery_(defect, 'Bathroom'));
  check('SEARCH-05 partial Description matches', sandbox.defectMatchesQuery_(defect, 'leak'));
  check('SEARCH-06 Remark matches', sandbox.defectMatchesQuery_(defect, 'Urgent'));
  check('SEARCH-07 case-insensitive: "BATHROOM" matches "Bathroom 1"', sandbox.defectMatchesQuery_(defect, 'BATHROOM'));
  check('SEARCH-07 case-insensitive: "bathroom" matches "Bathroom 1"', sandbox.defectMatchesQuery_(defect, 'bathroom'));
  check('SEARCH-08 single-keyword partial match on a longer phrase', sandbox.defectMatchesQuery_(defect, 'leakage'));
  check('SEARCH-09 multi-keyword AND across different fields (location + description)',
    sandbox.defectMatchesQuery_(defect, 'bathroom leak'));
  check('SEARCH-09b multi-keyword fails when one term matches nothing',
    !sandbox.defectMatchesQuery_(defect, 'bathroom nonexistentword'));
  check('SEARCH-10 no-match returns false', !sandbox.defectMatchesQuery_(defect, 'zzz-nomatch-zzz'));
  check('empty query matches everything (no search active)', sandbox.defectMatchesQuery_(defect, ''));
  check('does not search CaseID/internal fields', !sandbox.defectMatchesQuery_(d({ caseId: 'CASE-secret-999' }), 'secret'));
}

console.log('═══ compareDefectsByItemId_ (A-Z / Z-A sort) ═══');
{
  check('SEARCH-12 numeric ItemIDs sort naturally, not lexically (2 before 10)',
    sandbox.compareDefectsByItemId_(d({ itemId: '2' }), d({ itemId: '10' })) < 0);
  check('lexical sort would have gotten this wrong ("10" < "2" as plain strings)',
    '10'.localeCompare('2') < 0); // sanity check the premise itself, not the fix
  check('SEARCH-13 Z-A is just the reverse comparator', sandbox.compareDefectsByItemId_(d({ itemId: '10' }), d({ itemId: '2' })) > 0);
  check('alphanumeric ItemIDs sort naturally too (DEF-2 before DEF-10)',
    sandbox.compareDefectsByItemId_(d({ itemId: 'DEF-2' }), d({ itemId: 'DEF-10' })) < 0);
  check('case-insensitive comparison ("a" and "A" treated the same)',
    sandbox.compareDefectsByItemId_(d({ itemId: 'a1' }), d({ itemId: 'A1' })) === 0);
  check('empty ItemID sorts before a non-empty one', sandbox.compareDefectsByItemId_(d({ itemId: '' }), d({ itemId: '1' })) < 0);
}

console.log('═══ filterAndSortDefects_ (composition) ═══');
{
  const all = [
    d({ defectId: 'D1', itemId: '10', location: 'Bathroom 1', description: 'Tile crack' }),
    d({ defectId: 'D2', itemId: '2', location: 'Bathroom 2', description: 'Water leak' }),
    d({ defectId: 'D3', itemId: '5', location: 'Kitchen', description: 'Water leak near sink' }),
    d({ defectId: 'D4', itemId: '1', location: 'Living Room', description: 'Paint peeling' })
  ];

  check('SEARCH-11 empty query + no sort returns the full original-order list unmodified',
    JSON.stringify(sandbox.filterAndSortDefects_(all, '', null).map(x => x.defectId)) === JSON.stringify(['D1', 'D2', 'D3', 'D4']));

  const leakResults = sandbox.filterAndSortDefects_(all, 'leak', null);
  check('search "leak" narrows to the 2 matching defects, original order preserved when sortMode is null',
    JSON.stringify(leakResults.map(x => x.defectId)) === JSON.stringify(['D2', 'D3']));

  check('SEARCH-14 search + A-Z composition: "leak" then ascending by ItemID (2, 5)',
    JSON.stringify(sandbox.filterAndSortDefects_(all, 'leak', 'asc').map(x => x.itemId)) === JSON.stringify(['2', '5']));

  check('SEARCH-15 search + Z-A composition: "leak" then descending by ItemID (5, 2)',
    JSON.stringify(sandbox.filterAndSortDefects_(all, 'leak', 'desc').map(x => x.itemId)) === JSON.stringify(['5', '2']));

  check('SEARCH-12 (full list) A-Z with no search sorts all 4 by ItemID ascending: 1,2,5,10',
    JSON.stringify(sandbox.filterAndSortDefects_(all, '', 'asc').map(x => x.itemId)) === JSON.stringify(['1', '2', '5', '10']));

  check('SEARCH-13 (full list) Z-A with no search sorts all 4 by ItemID descending: 10,5,2,1',
    JSON.stringify(sandbox.filterAndSortDefects_(all, '', 'desc').map(x => x.itemId)) === JSON.stringify(['10', '5', '2', '1']));

  check('SEARCH-10 (composed) a query matching nothing returns an empty array, not an error',
    sandbox.filterAndSortDefects_(all, 'zzz-nomatch-zzz', 'asc').length === 0);

  check('SEARCH-17 filtering never mutates the original array (still 4 items after multiple calls)',
    all.length === 4);

  check('SEARCH-16 premise: filtered/sorted results still carry the real defectId (not array index) for each item',
    leakResults.every(x => typeof x.defectId === 'string' && x.defectId.indexOf('D') === 0));
}

console.log('\n' + '═'.repeat(60));
console.log(fail === 0 ? `ALL ${pass} CHECKS PASSED (0 failures)` : `${pass} passed, ${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
