// Built 2026-11-10 against the candidate tree S1+S2+S3: 945 sha256 b27d3e0292dfc7202636da22f6c26848c81bfd984d8920d190548ac496220e7c; 912 sha256 cc36243a3ced41bbb0533d7f46e97441b5578fc778dc360b45f3c40bec3c7100; 946 sha256 1026be1160d358ac77be881982de0d590acd71f278147f8d0b3e501924909526.
/*
 * b1_probe_browser.js — B1 real-environment verification probe, BROWSER side.
 *
 * WHAT IT IS: a read-only observer. It wraps a few page functions (showPayForm, showToast, interpretPayResponse_,
 * loadDashboard) and google.script.run so that every Pay-form action is recorded with a time stamp. It changes no data,
 * sends nothing anywhere, stores nothing (no localStorage, no network). Reload the dialog and it is gone.
 *
 * HOW TO USE (details in the runbook):
 *   1. Open the TEST COPY of the spreadsheet, menu "Property OS" > "Open Operator Console".
 *   2. Chrome DevTools (F12) > Console. In the context drop-down at the top of the Console (it says "top"),
 *      choose the entry named "userHtmlFrame". The console must run INSIDE the dialog's frame.
 *   3. Paste this whole file into the Console and press Enter. It prints one line: "B1 probe installed ...".
 *   4. Do the runbook steps. Use  __b1.mark('R3: typed 0')  to label what you are about to do.
 *   5. At the end run  copy(__b1.report())  and paste the clipboard back to Claude.
 *   6. If anything in the page misbehaves after installing: run  __b1.uninstall()  and reload the dialog, and report it.
 *
 * Optional, BEFORE pasting:  window.__B1_OPTS = { gasHook: false }   (do not wrap google.script.run)
 *
 * WHAT IT DOES NOT PROVE: a request that left the browser is proven only by the Apps Script "Executions" list.
 * The 'gas-call' events show that the PAGE asked google.script.run to call a server function.
 *
 * Fingerprints: SHA-256 of each page function's source text (Function.prototype.toString), compared with the
 * candidate files this kit was built from (S1 + S3 applied to 945). A mismatch is a lead, not a verdict:
 * if the text was reformatted on the way, paste showPayForm.toString() back instead.
 */
(function () {
  'use strict';
  var VERSION = 'b1-browser-probe-1';
  var EXPECTED = {
  "showPayForm": {
    "s3": "981bfa4ae2d76d9a227f3d41899f284b93215a97fb2488193ce8c893e96cfed3",
    "before": "2dfd8f4900effffd54160507526b61489756d3b3f7f12b61ec1cd52e3c1d5fae"
  },
  "malaysiaTodayIso_": {
    "s3": "3d60a56e5bac4172328d789e7552b8d0cf188e27d89d2c95979ee071323c2f66"
  },
  "parsePayAmount_": {
    "s3": "7455da51520caed23f4807ec2ade6f0cab3e44be3e1bd0d77d44cec1ed8c944a"
  },
  "isRealIsoDate_": {
    "s3": "f09b1269dee87bd5b1ff4bd06c1a1f42bbff4ad92103a21aa2844d86ad6eb53a"
  },
  "interpretPayResponse_": {
    "s3": "37e4e1d00e83884c373793366301f165244f6d2c963aaf4a7d57da0725f3001b"
  },
  "formatAmount": {
    "s3": "856e8e93ccbf3438b2841758fafc6d7158d2b5872c4d3e14da81c8a3083f8398"
  }
};
  var g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
  if (g.__b1 && typeof g.__b1.uninstall === 'function') { try { g.__b1.uninstall(); } catch (e0) { /* ignore */ } }
  var opts = g.__B1_OPTS || {};

  var startWall = Date.now();
  var events = [], seq = 0, originals = {}, features = {}, observers = [], clickInstalled = false, lastToastShownAt = null;

  function tryv(fn) { try { return fn(); } catch (e) { return 'ERROR: ' + (e && e.message ? e.message : String(e)); } }
  function perfNow() { try { return performance.now(); } catch (e) { return Date.now() - startWall; } }
  function push(type, data) {
    var ev = { seq: ++seq, tMs: Math.round(perfNow()), wall: new Date().toISOString(), type: type };
    for (var k in data) { if (Object.prototype.hasOwnProperty.call(data, k)) ev[k] = data[k]; }
    events.push(ev); if (events.length > 3000) events.shift();
    return ev;
  }
  function clone(v) { try { return v === undefined ? '__undefined__' : JSON.parse(JSON.stringify(v)); } catch (e) { return '__unserializable__: ' + String(e && e.message); } }
  function shapeOf(v) { return v === null ? 'null' : (Array.isArray(v) ? 'array' : typeof v); }
  function containsDate(v, seen) {
    seen = seen || [];
    if (v instanceof Date) return true;
    if (v && typeof v === 'object') {
      if (seen.indexOf(v) !== -1) return false; seen.push(v);
      var ks = Object.keys(v); for (var i = 0; i < ks.length; i++) { if (containsDate(v[ks[i]], seen)) return true; }
    }
    return false;
  }
  function summarizeArgs(a) {
    var out = [];
    for (var i = 0; i < a.length; i++) {
      var v = a[i];
      out.push(typeof v === 'string' ? { type: 'string', value: v.length > 80 ? v.slice(0, 77) + '...' : v } : (v === null || typeof v !== 'object' ? { type: typeof v, value: v } : { type: shapeOf(v) }));
    }
    return out;
  }

  // ── SHA-256 (pure JS, so it does not depend on crypto.subtle being available in the dialog frame) ──
  var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
  function utf8Bytes(s) {
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) { var d = s.charCodeAt(i + 1); if (d >= 0xdc00 && d <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; } }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }
  function sha256Hex(str) {
    var m = utf8Bytes(String(str)), l = m.length, hi = Math.floor(l / 0x20000000), lo = (l << 3) >>> 0;
    m.push(0x80); while (m.length % 64 !== 56) m.push(0);
    m.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255, (lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19], w = new Array(64), i, t;
    for (i = 0; i < m.length; i += 64) {
      for (t = 0; t < 16; t++) w[t] = ((m[i + 4 * t] << 24) | (m[i + 4 * t + 1] << 16) | (m[i + 4 * t + 2] << 8) | m[i + 4 * t + 3]) >>> 0;
      for (t = 16; t < 64; t++) {
        var s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3), s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], gg = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), ch = (e & f) ^ (~e & gg), t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), maj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + maj) >>> 0;
        h = gg; gg = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + gg) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    var out = ''; for (i = 0; i < 8; i++) out += ('00000000' + H[i].toString(16)).slice(-8);
    return out;
  }

  // ── environment and time helpers ──
  function klParts(d) {
    var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(d || new Date());
    var o = {}; for (var i = 0; i < p.length; i++) o[p[i].type] = p[i].value; return o;
  }
  function klDate(d) { return tryv(function () { var p = klParts(d); return p.year + '-' + p.month + '-' + p.day; }); }
  function klHour(d) { return tryv(function () { return Number(klParts(d).hour); }); }
  function env() {
    var d = new Date(), h = klHour(d);
    return {
      userAgent: tryv(function () { return navigator.userAgent; }),
      browserTimeZone: tryv(function () { return Intl.DateTimeFormat().resolvedOptions().timeZone; }),
      timezoneOffsetMinutes: d.getTimezoneOffset(), nowIso: d.toISOString(),
      malaysiaDateIntl: klDate(d), malaysiaHourIntl: h, utcDate: d.toISOString().slice(0, 10),
      inMalaysia00to08: typeof h === 'number' ? h < 8 : null,
      malaysiaTodayIso: typeof g.malaysiaTodayIso_ === 'function' ? tryv(function () { return (originals.malaysiaTodayIso_ || g.malaysiaTodayIso_)(Date.now()); }) : 'MISSING (S1 not applied?)',
      isSecureContext: g.isSecureContext, hostname: tryv(function () { return location.hostname; }), documentTitle: tryv(function () { return document.title; })
    };
  }

  // ── fingerprints of the page's functions (always the ORIGINALS, never our wrappers) ──
  var FP_NAMES = ['showPayForm', 'malaysiaTodayIso_', 'parsePayAmount_', 'isRealIsoDate_', 'interpretPayResponse_', 'formatAmount'];
  function fingerprints() {
    var out = {};
    FP_NAMES.forEach(function (n) {
      var f = originals[n] || g[n], rec = { present: typeof f === 'function' };
      if (rec.present) {
        var src = tryv(function () { return Function.prototype.toString.call(f); });
        rec.sha256 = sha256Hex(src); rec.length = String(src).length;
        var e = EXPECTED[n] || {};
        rec.matches = rec.sha256 === e.s3 ? 's3' : (e.before && rec.sha256 === e.before ? 'before_s3' : 'UNKNOWN');
      }
      out[n] = rec;
    });
    return out;
  }
  function classify(fp) {
    var s1 = ['malaysiaTodayIso_', 'parsePayAmount_', 'isRealIsoDate_', 'interpretPayResponse_'];
    var s1ok = s1.every(function (n) { return fp[n].present && fp[n].matches === 's3'; });
    var s1missing = s1.every(function (n) { return !fp[n].present; });
    var pay = fp.showPayForm && fp.showPayForm.matches;
    if (s1ok && pay === 's3') return 'S3 (S1 + S3 applied to 945)';
    if (s1ok && pay === 'before_s3') return 'S1 only (S3 NOT applied)';
    if (s1missing && pay === 'before_s3') return 'ORIGINAL 945 (no S1, no S3)';
    return 'UNKNOWN: compare the per-function results';
  }

  // ── hooks ──
  function hook(name, make) {
    var orig = g[name];
    if (typeof orig !== 'function') { features['hook:' + name] = 'function not found'; return; }
    originals[name] = orig;
    try { g[name] = make(orig); features['hook:' + name] = 'installed'; } catch (e) { features['hook:' + name] = 'FAILED: ' + e.message; }
  }
  function wrapRunner(r) {
    if (typeof Proxy === 'undefined' || !r) return r;
    return new Proxy(r, {
      get: function (target, prop) {
        var v = target[prop];
        if (typeof v !== 'function') return v;
        if (prop === 'withSuccessHandler' || prop === 'withFailureHandler' || prop === 'withUserObject') return function () { return wrapRunner(v.apply(target, arguments)); };
        return function () { push('gas-call', { fn: String(prop), args: summarizeArgs(arguments) }); return v.apply(target, arguments); };
      }
    });
  }
  function install() {
    hook('showToast', function (orig) {
      return function (msg, isError, durationMs) {
        push('toast', { message: String(msg), isError: !!isError, durationArg: durationMs === undefined ? 'default' : durationMs });
        var r = orig.apply(this, arguments); lastToastShownAt = perfNow(); return r;
      };
    });
    hook('interpretPayResponse_', function (orig) {
      return function (res, entered) {
        var result, thrown = null;
        try { result = orig.apply(this, arguments); } catch (e) { thrown = e; }
        var data = (res && typeof res === 'object') ? res.data : undefined;
        var dataObj = data && typeof data === 'object';
        push('interpret', {
          res: clone(res), resType: shapeOf(res), resContainsDate: containsDate(res),
          dataPaidDateType: dataObj ? shapeOf(data.paidDate) : 'n/a', dataPaidAmountType: dataObj ? shapeOf(data.paidAmount) : 'n/a',
          entered: clone(entered), result: clone(result), threw: thrown ? String(thrown.message) : null
        });
        if (thrown) throw thrown; return result;
      };
    });
    hook('loadDashboard', function (orig) { return function () { push('loadDashboard', {}); return orig.apply(this, arguments); }; });
    hook('showPayForm', function (orig) {
      return function (card, item) {
        var r = orig.apply(this, arguments);
        try {
          var d = card && card.querySelector ? card.querySelector('.pf-date') : null, a = card && card.querySelector ? card.querySelector('.pf-amount') : null, e = env();
          push('payFormOpened', {
            formDefaultDate: d ? d.value : null, formDefaultAmount: a ? a.value : null, occurrenceId: item && item.occurrenceId, expectedAmount: item && item.expectedAmount,
            malaysiaTodayIso: e.malaysiaTodayIso, malaysiaDateIntl: e.malaysiaDateIntl, utcDate: e.utcDate, inMalaysia00to08: e.inMalaysia00to08
          });
        } catch (e2) { push('payFormOpened', { error: String(e2 && e2.message) }); }
        return r;
      };
    });
    if (opts.gasHook === false) { features.gasHook = 'disabled by __B1_OPTS'; }
    else {
      try {
        if (!g.google || !g.google.script || !g.google.script.run) features.gasHook = 'google.script.run not found';
        else { originals.run = g.google.script.run; g.google.script.run = wrapRunner(originals.run); features.gasHook = g.google.script.run !== originals.run ? 'installed' : 'FAILED (property not writable)'; }
      } catch (e3) { features.gasHook = 'FAILED: ' + e3.message; }
    }
    try {
      document.addEventListener('click', onClick, true); clickInstalled = true; features.clickCapture = 'installed';
      var el = document.getElementById('toast');
      if (el && typeof MutationObserver !== 'undefined') {
        var mo = new MutationObserver(function () {
          if (el.style.display === 'none' && lastToastShownAt !== null) { push('toast-hidden', { visibleMs: Math.round(perfNow() - lastToastShownAt) }); lastToastShownAt = null; }
        });
        mo.observe(el, { attributes: true, attributeFilter: ['style'] }); observers.push(mo); features.toastTiming = 'installed';
      } else features.toastTiming = 'toast element or MutationObserver not found';
    } catch (e4) { features.clickCapture = 'FAILED: ' + e4.message; }
    try {
      if (typeof PerformanceObserver !== 'undefined') {
        var po = new PerformanceObserver(function (list) {
          list.getEntries().forEach(function (en) { if (en.initiatorType === 'xmlhttprequest' || en.initiatorType === 'fetch') push('network', { initiatorType: en.initiatorType, path: String(en.name).split('?')[0].slice(-80), durationMs: Math.round(en.duration) }); });
        });
        po.observe({ type: 'resource', buffered: false }); observers.push(po); features.networkObserver = 'installed (best effort; google.script.run may not show up here)';
      }
    } catch (e5) { features.networkObserver = 'unavailable'; }
  }
  function onClick(ev) {
    try {
      var el = ev.target, btn = el && el.closest ? el.closest('button') : null; if (!btn) return;
      var form = btn.closest ? btn.closest('.pay-form') : null, rec = { label: (btn.textContent || '').trim().slice(0, 40), disabledBefore: !!btn.disabled };
      if (form) { var a = form.querySelector('.pf-amount'), d = form.querySelector('.pf-date'); rec.formAmount = a ? a.value : null; rec.formDate = d ? d.value : null; }
      push('click', rec);
      setTimeout(function () { push('click-after', { label: rec.label, disabledAfter: !!btn.disabled, buttonStillInDom: btn.isConnected !== undefined ? btn.isConnected : null }); }, 80);
    } catch (e) { /* never break the page */ }
  }

  // ── public API ──
  var api = {
    version: VERSION, sha256: sha256Hex, fingerprints: fingerprints,
    mark: function (label) { push('mark', { label: String(label) }); return 'marked'; },
    events: function () { return events.slice(); },
    last: function (n) { return events.slice(-(n || 10)); },
    reset: function () { events.length = 0; return 'events cleared'; },
    defaultDate: function () {
      var inputs = document.querySelectorAll ? document.querySelectorAll('.pf-date') : [];
      var v = inputs.length ? inputs[inputs.length - 1].value : null, e = env();
      var res = { formDefaultDate: v, malaysiaTodayIso: e.malaysiaTodayIso, malaysiaDateIntl: e.malaysiaDateIntl, utcDate: e.utcDate, malaysiaHour: e.malaysiaHourIntl, discriminating: e.malaysiaDateIntl !== e.utcDate };
      res.verdict = v === null ? 'No Pay form is open: click Pay on an Active occurrence first'
        : (v === e.malaysiaTodayIso && v === e.malaysiaDateIntl ? (res.discriminating ? 'PASS: the form shows the Malaysia date while the UTC date is different' : 'consistent, but NOT discriminating at this hour (UTC date = Malaysia date); repeat between 00:00 and 08:00 Malaysia time')
        : (v === e.utcDate && res.discriminating ? 'FAIL: the form shows the UTC date' : 'MISMATCH: see the fields'));
      push('defaultDateCheck', res); return res;
    },
    report: function (o) {
      o = o || {}; var fp = fingerprints();
      var out = { probe: VERSION, generatedAt: new Date().toISOString(), features: features, env: env(), deployedVersion: classify(fp), fingerprints: fp, eventCount: events.length };
      if (o.events !== false) out.events = events.slice();
      return JSON.stringify(out, null, 1);
    },
    uninstall: function () {
      Object.keys(originals).forEach(function (k) {
        try { if (k === 'run') { g.google.script.run = originals.run; } else { g[k] = originals[k]; } } catch (e) { /* ignore */ }
      });
      originals = {};
      try { if (clickInstalled) document.removeEventListener('click', onClick, true); } catch (e1) { /* ignore */ }
      observers.forEach(function (o) { try { o.disconnect(); } catch (e2) { /* ignore */ } });
      observers = []; clickInstalled = false;
      try { delete g.__b1; } catch (e3) { g.__b1 = undefined; }
      return 'B1 probe uninstalled';
    }
  };
  install();
  var fp0 = fingerprints();
  push('install', { features: features, deployedVersion: classify(fp0) });
  g.__b1 = api;
  var line = 'B1 probe installed (' + VERSION + '). Page code detected: ' + classify(fp0) + '. Hooks: ' + Object.keys(features).map(function (k) { return k + '=' + String(features[k]).split(' ')[0]; }).join(', ');
  try { console.log(line); } catch (e6) { /* ignore */ }
  return line;
})();
