/* Interactive concept calculators for the Data Analytics Notebook.
   Auto-mounts on any element with a data-calc="..." attribute.
   Pure client-side JS, no dependencies. Loaded only on chapters that use it.

   Supported:
     data-calc="ab-sample-size"      -> A/B test sample size (ch 26)
     data-calc="confusion-matrix"    -> precision/recall/F1 explorer (ch 10, 30)
     data-calc="confidence-interval" -> CI of a mean (ch 23)
     data-calc="correlation"         -> click-to-add-points Pearson r (ch 07)
*/
(function () {
  'use strict';

  /* ---- math helpers ---- */
  // Acklam's inverse normal CDF — returns z for a probability p in (0,1)
  function invNorm(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    var plow = 0.02425, phigh = 1 - plow, q, r;
    if (p < plow) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p <= phigh) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  function fmt(n, d) { if (!isFinite(n)) return '—'; d = d == null ? 2 : d; return Number(n).toLocaleString(undefined, { maximumFractionDigits: d }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* ---- registry ---- */
  var CALCS = {};

  /* ===== A/B test sample size ===== */
  CALCS['ab-sample-size'] = function (mount) {
    mount.innerHTML =
      '<div class="calc-head">🧮 A/B Test Sample-Size Calculator</div>' +
      '<div class="calc-grid">' +
      field('Baseline conversion rate', 'ab-base', 5, '%') +
      field('Minimum detectable effect', 'ab-mde', 1, '% (absolute)') +
      field('Significance level α', 'ab-alpha', 5, '%') +
      field('Statistical power', 'ab-power', 80, '%') +
      '</div>' +
      '<div class="calc-out" id="ab-out"></div>';
    function calc() {
      var p1 = num('ab-base') / 100, mde = num('ab-mde') / 100;
      var alpha = num('ab-alpha') / 100, power = num('ab-power') / 100;
      var p2 = p1 + mde;
      var out = document.getElementById('ab-out');
      if (!(p1 > 0 && p1 < 1) || !(p2 > 0 && p2 < 1) || mde <= 0 || alpha <= 0 || alpha >= 1 || power <= 0 || power >= 1) {
        out.innerHTML = '<span class="calc-warn">Enter valid values (rates between 0–100%, MDE &gt; 0).</span>'; return;
      }
      var za = invNorm(1 - alpha / 2), zb = invNorm(power);
      var n = Math.pow(za + zb, 2) * (p1 * (1 - p1) + p2 * (1 - p2)) / Math.pow(p2 - p1, 2);
      n = Math.ceil(n);
      out.innerHTML =
        '<div class="calc-result"><span class="calc-big">' + fmt(n, 0) + '</span><span class="calc-lbl">users per variant</span></div>' +
        '<div class="calc-note">≈ <strong>' + fmt(n * 2, 0) + '</strong> total, to detect a lift from <strong>' + fmt(p1 * 100, 2) + '%</strong> to <strong>' + fmt(p2 * 100, 2) + '%</strong> at ' + fmt(num('ab-alpha'), 0) + '% significance and ' + fmt(num('ab-power'), 0) + '% power.</div>';
    }
    wire(mount, calc); calc();
  };

  /* ===== Confusion-matrix metric explorer ===== */
  CALCS['confusion-matrix'] = function (mount) {
    mount.innerHTML =
      '<div class="calc-head">🎯 Confusion-Matrix Metric Explorer</div>' +
      '<div class="cm-wrap"><table class="cm-table"><tr><td class="cm-corner"></td><th>Pred +</th><th>Pred −</th></tr>' +
      '<tr><th>Actual +</th><td>' + cmInput('cm-tp', 80) + '</td><td>' + cmInput('cm-fn', 20) + '</td></tr>' +
      '<tr><th>Actual −</th><td>' + cmInput('cm-fp', 30) + '</td><td>' + cmInput('cm-tn', 870) + '</td></tr></table>' +
      '<div class="cm-legend"><span class="cm-k tp">TP</span> true positive · <span class="cm-k fn">FN</span> miss · <span class="cm-k fp">FP</span> false alarm · <span class="cm-k tn">TN</span> true negative</div></div>' +
      '<div class="calc-out cm-metrics" id="cm-out"></div>';
    function calc() {
      var tp = num('cm-tp'), fp = num('cm-fp'), fn = num('cm-fn'), tn = num('cm-tn');
      var total = tp + fp + fn + tn;
      var prec = tp + fp ? tp / (tp + fp) : 0;
      var rec = tp + fn ? tp / (tp + fn) : 0;
      var spec = tn + fp ? tn / (tn + fp) : 0;
      var acc = total ? (tp + tn) / total : 0;
      var f1 = prec + rec ? 2 * prec * rec / (prec + rec) : 0;
      document.getElementById('cm-out').innerHTML =
        metric('Precision', prec, 'Of predicted positives, how many were right') +
        metric('Recall', rec, 'Of actual positives, how many were caught') +
        metric('F1 score', f1, 'Harmonic mean of precision & recall') +
        metric('Accuracy', acc, 'Overall correct — misleading if imbalanced') +
        metric('Specificity', spec, 'Of actual negatives, how many were right');
    }
    wire(mount, calc); calc();
  };

  /* ===== Confidence interval of a mean ===== */
  CALCS['confidence-interval'] = function (mount) {
    mount.innerHTML =
      '<div class="calc-head">📏 Confidence Interval Calculator</div>' +
      '<div class="calc-grid">' +
      field('Sample mean', 'ci-mean', 100, '') +
      field('Sample std dev', 'ci-sd', 15, '') +
      field('Sample size n', 'ci-n', 50, '') +
      field('Confidence level', 'ci-conf', 95, '%') +
      '</div>' +
      '<div class="calc-out" id="ci-out"></div>';
    function calc() {
      var m = num('ci-mean'), sd = num('ci-sd'), n = num('ci-n'), conf = num('ci-conf') / 100;
      var out = document.getElementById('ci-out');
      if (sd < 0 || n < 2 || conf <= 0 || conf >= 1) { out.innerHTML = '<span class="calc-warn">Need n ≥ 2, sd ≥ 0, confidence 0–100%.</span>'; return; }
      var z = invNorm((1 + conf) / 2);
      var se = sd / Math.sqrt(n), margin = z * se;
      out.innerHTML =
        '<div class="calc-result"><span class="calc-big">' + fmt(m - margin) + ' &ndash; ' + fmt(m + margin) + '</span><span class="calc-lbl">' + fmt(conf * 100, 0) + '% confidence interval</span></div>' +
        '<div class="calc-note">Margin of error <strong>±' + fmt(margin) + '</strong> (z = ' + fmt(z, 3) + ', standard error = ' + fmt(se, 3) + '). Wider n shrinks the interval by √n.</div>';
    }
    wire(mount, calc); calc();
  };

  /* ===== Correlation playground (click to add points) ===== */
  CALCS['correlation'] = function (mount) {
    mount.innerHTML =
      '<div class="calc-head">📈 Correlation Playground</div>' +
      '<div class="calc-note" style="margin:.2rem 0 .7rem">Click on the chart to add points. Watch Pearson&rsquo;s <em>r</em> change. r near ±1 = strong linear link, near 0 = none.</div>' +
      '<canvas class="corr-canvas" id="corr-cv" width="600" height="340"></canvas>' +
      '<div class="corr-bar"><div class="calc-result" style="margin:0"><span class="calc-big" id="corr-r">0.00</span><span class="calc-lbl" id="corr-strength">no data</span></div>' +
      '<div class="corr-btns"><button class="calc-btn" data-preset="pos">Strong +</button><button class="calc-btn" data-preset="neg">Strong −</button><button class="calc-btn" data-preset="none">Random</button><button class="calc-btn ghost" data-preset="clear">Clear</button></div></div>';
    var cv = mount.querySelector('#corr-cv'), ctx = cv.getContext('2d');
    var pts = [];
    function resize() { var w = mount.querySelector('.corr-canvas').clientWidth || 600; cv.width = w; cv.height = Math.max(240, Math.round(w * 0.56)); draw(); }
    function pearson() {
      var n = pts.length; if (n < 2) return NaN;
      var sx = 0, sy = 0, sxy = 0, sx2 = 0, sy2 = 0;
      pts.forEach(function (p) { var y = cv.height - p.y; sx += p.x; sy += y; sxy += p.x * y; sx2 += p.x * p.x; sy2 += y * y; });
      var num2 = n * sxy - sx * sy;
      var den = Math.sqrt((n * sx2 - sx * sx) * (n * sy2 - sy * sy));
      return den === 0 ? NaN : num2 / den;
    }
    function draw() {
      var W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);
      var css = getComputedStyle(document.body);
      var grid = css.getPropertyValue('--line2') || '#3a445a';
      ctx.strokeStyle = grid; ctx.globalAlpha = .5; ctx.lineWidth = 1;
      for (var i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(W / 6 * i, 0); ctx.lineTo(W / 6 * i, H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, H / 6 * i); ctx.lineTo(W, H / 6 * i); ctx.stroke(); }
      ctx.globalAlpha = 1;
      var r = pearson();
      // best-fit line
      if (pts.length >= 2 && isFinite(r)) {
        var n = pts.length, sx = 0, sy = 0, sxy = 0, sx2 = 0;
        pts.forEach(function (p) { var y = H - p.y; sx += p.x; sy += y; sxy += p.x * y; sx2 += p.x * p.x; });
        var slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
        var inter = (sy - slope * sx) / n;
        if (isFinite(slope)) { ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, H - inter); ctx.lineTo(W, H - (slope * W + inter)); ctx.stroke(); }
      }
      ctx.fillStyle = '#3b82f6';
      pts.forEach(function (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 7); ctx.fill(); });
      var rl = mount.querySelector('#corr-r'), st = mount.querySelector('#corr-strength');
      if (!isFinite(r)) { rl.textContent = '0.00'; st.textContent = pts.length < 2 ? 'add ' + (2 - pts.length) + ' more point' + (pts.length === 1 ? '' : 's') : 'no variation'; }
      else { rl.textContent = (r >= 0 ? '+' : '') + r.toFixed(2); var a = Math.abs(r); st.textContent = a > .8 ? 'strong' : a > .5 ? 'moderate' : a > .2 ? 'weak' : 'almost none'; }
    }
    cv.addEventListener('click', function (e) { var rc = cv.getBoundingClientRect(); pts.push({ x: (e.clientX - rc.left) * cv.width / rc.width, y: (e.clientY - rc.top) * cv.height / rc.height }); draw(); });
    mount.querySelectorAll('.calc-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-preset'); pts = [];
        if (k !== 'clear') {
          for (var i = 0; i < 30; i++) {
            var W2 = cv.width, H2 = cv.height;
            var x = (i + 1) / 31 * W2;
            var noise = (((i * 37 + 11) % 100) / 100 - 0.5) * H2 * (k === 'none' ? 0 : 0.35);
            var yData = k === 'pos' ? (x / W2) * H2 * 0.7 + H2 * 0.15 + noise
                      : k === 'neg' ? (1 - x / W2) * H2 * 0.7 + H2 * 0.15 + noise
                      : ((i * 53 + 17) % 100) / 100 * H2;
            pts.push({ x: x, y: Math.max(8, Math.min(H2 - 8, H2 - yData)) });
          }
        }
        draw();
      });
    });
    setTimeout(resize, 30);
    window.addEventListener('resize', resize);
  };

  /* ---- shared field builders ---- */
  function field(label, id, val, suffix) {
    return '<label class="calc-field"><span>' + label + '</span><span class="calc-input-wrap"><input type="number" id="' + id + '" value="' + val + '" step="any">' + (suffix ? '<span class="calc-suffix">' + suffix + '</span>' : '') + '</span></label>';
  }
  function cmInput(id, val) { return '<input class="cm-input" type="number" id="' + id + '" value="' + val + '" min="0" step="1">'; }
  function metric(name, v, desc) {
    return '<div class="cm-metric"><span class="cm-mname">' + name + '</span><span class="cm-mval">' + (isFinite(v) ? (v * 100).toFixed(1) + '%' : '—') + '</span><span class="cm-mbar"><i style="width:' + Math.max(0, Math.min(100, v * 100)) + '%"></i></span><span class="cm-mdesc">' + desc + '</span></div>';
  }
  function num(id) { var e = document.getElementById(id); return e ? parseFloat(e.value) || 0 : 0; }
  function wire(mount, fn) { mount.querySelectorAll('input').forEach(function (i) { i.addEventListener('input', fn); }); }

  /* ---- mount everything ---- */
  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-calc]'), function (m) {
      var type = m.getAttribute('data-calc');
      if (CALCS[type] && !m.getAttribute('data-mounted')) { m.classList.add('calc'); m.setAttribute('data-mounted', '1'); try { CALCS[type](m); } catch (e) { m.innerHTML = '<div class="calc-warn">Calculator failed to load.</div>'; } }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
