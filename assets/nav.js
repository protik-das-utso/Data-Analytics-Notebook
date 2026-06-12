/* Shared shell: sidebar, collapsible groups, full collapse, search, theme,
   progress, per-page complete/bookmark, doc templates, copy buttons. */
(function () {
  var CH = window.CHAPTERS || [];
  var GROUPS = window.GROUPS || [];
  var pathn = location.pathname.replace(/\\/g, '/');
  var inCh = pathn.indexOf('/chapters/') !== -1;
  var ROOT = inCh ? '../' : './';
  var here = document.body.getAttribute('data-slug') || '';
  var curNum = parseInt(document.body.getAttribute('data-num') || '0', 10);

  var K = {
    completed: 'da_notebook_completed',
    bookmarks: 'da_notebook_bookmarks',
    theme: 'da_notebook_theme',
    groups: 'da_nb_groups_collapsed',
    sb: 'da_nb_sidebar_collapsed'
  };
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var completed = get(K.completed, []);
  var bookmarks = get(K.bookmarks, []);
  var groupsCollapsed = get(K.groups, null);
  if (groupsCollapsed === null) groupsCollapsed = GROUPS.slice(); // default: all groups start collapsed

  var docTemplates = {
    readme: '# Project Title\n\n## Business Question\n- What decision this analysis supports\n\n## Data Source\n- Source:\n- Date pulled:\n- Time range:\n- Grain:\n\n## Workflow\n1. Data loading\n2. EDA\n3. Cleaning\n4. Transformation / feature engineering\n5. Analysis or modeling\n6. Reporting\n\n## Key Findings\n- Finding 1\n\n## Limitations\n- Limitation 1\n\n## Reproducibility\n- Python version:\n- Libraries:\n- Run order:\n',
    dictionary: '| column_name | description | dtype | unit | allowed_values | null_policy |\n|---|---|---|---|---|---|\n|  |  |  |  |  |  |\n',
    analysis: '# Analysis Log\n\n## Project\n- Name:\n- Analyst:\n- Date:\n\n## Step-by-step record\n| step | action | reason | impact |\n|---|---|---|---|\n| data load |  |  |  |\n| cleaning |  |  |  |\n\n## Open Issues\n- Issue 1\n\n## Next Actions\n- Action 1\n'
  };

  function pct() { return CH.length ? Math.round((completed.length / CH.length) * 100) : 0; }
  function href(file) { return ROOT + 'chapters/' + file; }

  /* ---- build sidebar ---- */
  var sb = document.getElementById('sidebar');
  if (sb) {
    var h = '';
    h += '<div class="sidebar-head">';
    h += '<div class="sidebar-logo"><h2><a href="' + ROOT + 'index.html" style="color:inherit;text-decoration:none">Data Analytics Notebook</a></h2>';
    h += '<p style="font-size:10.5px;color:#7dd3fc;margin-top:.3rem;letter-spacing:.04em;font-weight:600">The Professional Decision Handbook</p></div>';
    h += '<button class="sidebar-collapse" id="sbCollapse" title="Collapse sidebar" aria-label="Collapse sidebar">&#8249;</button>';
    h += '</div>';

    h += '<div class="sidebar-tools">';
    h += '<div class="tool-row"><button id="toggleTheme" class="tool-btn">Toggle Theme</button><button id="resetProgress" class="tool-btn">Reset Progress</button></div>';
    h += '<div id="chapterStats" class="chapter-stats">Completed: ' + pct() + '%</div>';
    h += '</div>';

    h += '<nav id="nav">';
    for (var gi = 0; gi < GROUPS.length; gi++) {
      var gname = GROUPS[gi];
      var items = CH.filter(function (c) { return c.group === gname; });
      var hasCurrent = items.some(function (c) { return c.file === here; });
      var collapsed = groupsCollapsed.indexOf(gname) !== -1; // all groups start collapsed; open on click
      h += '<div class="nav-group' + (collapsed ? ' collapsed' : '') + '" data-group="' + gname + '">';
      h += '<button class="nav-group-header"><span>' + gname + '</span><span class="nav-group-count">' + items.length + '</span><span class="nav-group-chevron">&#9660;</span></button>';
      h += '<div class="nav-group-items">';
      for (var ii = 0; ii < items.length; ii++) {
        var c = items[ii];
        var active = c.file === here ? ' active' : '';
        var marked = bookmarks.indexOf(c.file) !== -1 ? ' bookmarked' : '';
        h += '<a class="nav-item' + active + marked + '" data-slug="' + c.file + '" href="' + href(c.file) + '">';
        h += '<span class="nav-num">' + (c.num < 10 ? '0' + c.num : c.num) + '</span>' + c.title + '</a>';
      }
      h += '</div></div>';
    }
    h += '</nav>';
    sb.innerHTML = h;
  }

  /* ---- progress bar + stats ---- */
  function refreshProgress() {
    var p = pct();
    var bar = document.getElementById('progress'); if (bar) bar.style.width = p + '%';
    var stat = document.getElementById('chapterStats'); if (stat) stat.textContent = 'Completed: ' + p + '%';
  }
  refreshProgress();

  /* ---- per-page complete / bookmark ---- */
  var meta = document.getElementById('chapterMeta');
  function renderMeta() {
    if (!meta || !here) return;
    var done = completed.indexOf(here) !== -1;
    var star = bookmarks.indexOf(here) !== -1;
    meta.innerHTML =
      '<button class="meta-btn' + (done ? ' done' : '') + '" id="btnDone">' + (done ? 'Completed' : 'Mark as completed') + '</button>' +
      '<button class="meta-btn' + (star ? ' starred' : '') + '" id="btnStar">' + (star ? 'Bookmarked' : 'Bookmark') + '</button>';
    document.getElementById('btnDone').onclick = function () {
      var i = completed.indexOf(here); if (i >= 0) completed.splice(i, 1); else completed.push(here);
      set(K.completed, completed); renderMeta(); refreshProgress();
    };
    document.getElementById('btnStar').onclick = function () {
      var i = bookmarks.indexOf(here); if (i >= 0) bookmarks.splice(i, 1); else bookmarks.push(here);
      set(K.bookmarks, bookmarks); renderMeta();
      var navItem = document.querySelector('.nav-item[data-slug="' + here + '"]');
      if (navItem) navItem.classList.toggle('bookmarked', bookmarks.indexOf(here) !== -1);
    };
  }
  renderMeta();

  /* ---- group accordion ---- */
  Array.prototype.forEach.call(document.querySelectorAll('.nav-group-header'), function (btn) {
    btn.addEventListener('click', function () {
      var g = btn.parentElement; var name = g.getAttribute('data-group');
      g.classList.toggle('collapsed');
      var isCol = g.classList.contains('collapsed');
      var idx = groupsCollapsed.indexOf(name);
      if (isCol && idx < 0) groupsCollapsed.push(name);
      if (!isCol && idx >= 0) groupsCollapsed.splice(idx, 1);
      set(K.groups, groupsCollapsed);
    });
  });

  /* ---- full sidebar collapse ---- */
  function applySb() { document.body.classList.toggle('sb-collapsed', get(K.sb, false) === true); }
  if (window.innerWidth <= 980 && localStorage.getItem(K.sb) === null) set(K.sb, true);
  applySb();
  function toggleSb() { set(K.sb, !(get(K.sb, false) === true)); applySb(); }
  var cBtn = document.getElementById('sbCollapse'); if (cBtn) cBtn.onclick = toggleSb;
  var oBtn = document.getElementById('sbOpen'); if (oBtn) oBtn.onclick = toggleSb;

  /* ---- theme ---- */
  if (get(K.theme, 'dark') === 'light') document.body.classList.add('light-theme');
  var themeBtn = document.getElementById('toggleTheme');
  if (themeBtn) themeBtn.onclick = function () {
    document.body.classList.toggle('light-theme');
    set(K.theme, document.body.classList.contains('light-theme') ? 'light' : 'dark');
  };

  /* ---- reset ---- */
  var resetBtn = document.getElementById('resetProgress');
  if (resetBtn) resetBtn.onclick = function () {
    if (!window.confirm('Reset all completed progress for a new project?')) return;
    completed = []; set(K.completed, completed); refreshProgress(); renderMeta();
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item.bookmarked'), function () {});
  };

  /* ---- doc templates ---- */
  var dsel = document.getElementById('docTemplate');
  var dcopy = document.getElementById('copyDocTemplate');
  var ddl = document.getElementById('downloadDocTemplate');
  if (dcopy) dcopy.onclick = function () {
    navigator.clipboard.writeText(docTemplates[dsel.value] || '').then(function () {
      dcopy.textContent = 'Copied'; setTimeout(function () { dcopy.textContent = 'Copy'; }, 1300);
    });
  };
  if (ddl) ddl.onclick = function () {
    var blob = new Blob([docTemplates[dsel.value] || ''], { type: 'text/markdown;charset=utf-8' });
    var url = URL.createObjectURL(blob); var a = document.createElement('a');
    a.href = url; a.download = dsel.value + '_template.md'; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  /* ---- code-block language accent ---- */
  Array.prototype.forEach.call(document.querySelectorAll('.code-block'), function (block) {
    var label = block.querySelector('.code-label'); if (!label) return;
    var n = label.textContent.trim().toLowerCase(); var cls = 'lang-generic';
    if (n.indexOf('python') !== -1) cls = 'lang-python';
    else if (n.indexOf('terminal') !== -1 || n.indexOf('shell') !== -1 || n.indexOf('bash') !== -1) cls = 'lang-terminal';
    else if (n.indexOf('layout') !== -1 || n.indexOf('structure') !== -1 || n.indexOf('skeleton') !== -1) cls = 'lang-layout';
    block.classList.add(cls);
  });

  /* ---- global copy for content code buttons ---- */
  window.copyCode = function (btn) {
    var pre = btn.previousElementSibling; var text = pre ? pre.innerText : '';
    navigator.clipboard.writeText(text).then(function () {
      btn.textContent = 'Copied!'; btn.style.color = '#22c55e';
      setTimeout(function () { btn.textContent = 'copy'; btn.style.color = ''; }, 1500);
    });
  };

  /* close drawer on mobile after navigating via a nav link */
  if (window.innerWidth <= 980) {
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), function (a) {
      a.addEventListener('click', function () { set(K.sb, true); });
    });
  }
})();

/* =====================================================================
   Intelligent layer: global search palette (Ctrl/Cmd+K), section
   anchors + deep-link scroll, on-page table of contents with scroll-spy,
   reading time, keyboard navigation, and the Tools nav section.
   Added as a separate IIFE so the shell above is untouched.
   ===================================================================== */
(function () {
  var pathn = location.pathname.replace(/\\/g, '/');
  var inCh = pathn.indexOf('/chapters/') !== -1;
  var ROOT = inCh ? '../' : './';
  var content = document.querySelector('.content');
  var article = document.querySelector('article.chapter');
  var here = document.body.getAttribute('data-slug') || '';

  // MUST stay identical to slugify() in tools/build-search-index.js
  function slugify(s) {
    return String(s).toLowerCase()
      .replace(/&[a-z]+;/g, ' ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'section';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function chPath(file) { return inCh ? file : 'chapters/' + file; }

  /* ---- Tools section injected at the top of the sidebar nav ---- */
  (function buildToolsNav() {
    var nav = document.getElementById('nav');
    var tools = window.TOOLS || [];
    if (!nav || !tools.length) return;
    var anyActive = tools.some(function (t) { return here === '' && pathn.indexOf(t.file) !== -1; });
    var h = '<div class="nav-group nav-group-tools' + (anyActive ? '' : ' collapsed') + '" data-group="Tools">';
    h += '<button class="nav-group-header"><span>Tools</span><span class="nav-group-count">' + tools.length + '</span><span class="nav-group-chevron">&#9660;</span></button>';
    h += '<div class="nav-group-items">';
    for (var i = 0; i < tools.length; i++) {
      var t = tools[i];
      var active = (here === '' && pathn.indexOf(t.file) !== -1) ? ' active' : '';
      h += '<a class="nav-item nav-tool' + active + '" href="' + ROOT + t.file + '">' +
        '<span class="nav-num nav-tool-ico">' + t.icon + '</span>' + t.title + '</a>';
    }
    h += '</div></div>';
    nav.insertAdjacentHTML('afterbegin', h);
    // wire accordion toggle for the injected group
    var hdr = nav.querySelector('.nav-group-tools .nav-group-header');
    if (hdr) hdr.addEventListener('click', function () { hdr.parentElement.classList.toggle('collapsed'); });
  })();

  /* ---- section anchors (runtime ids matching the search index) ---- */
  var sections = [];
  if (article) {
    var titles = article.querySelectorAll('.section-title');
    var seen = {};
    Array.prototype.forEach.call(titles, function (el) {
      var slug = slugify(el.textContent || '');
      if (seen[slug]) { seen[slug]++; slug = slug + '-' + seen[slug]; } else { seen[slug] = 1; }
      el.id = slug;
      var a = document.createElement('a');
      a.className = 'sec-anchor';
      a.href = '#' + slug;
      a.setAttribute('aria-label', 'Link to this section');
      a.innerHTML = '#';
      el.appendChild(a);
      sections.push({ id: slug, label: (el.textContent || '').replace(/#$/, '').trim(), el: el });
    });
  }

  /* smooth-scroll with offset for in-page anchors */
  function scrollToId(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var y = el.getBoundingClientRect().top + window.pageYOffset - 16;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
  // jump to a deep-linked section once ids exist
  if (location.hash && location.hash.length > 1) {
    var hid = decodeURIComponent(location.hash.slice(1));
    setTimeout(function () { scrollToId(hid); }, 60);
  }

  /* ---- reading time ---- */
  if (article && here) {
    var words = (article.innerText || '').trim().split(/\s+/).length;
    var mins = Math.max(1, Math.round(words / 200));
    var rt = document.createElement('div');
    rt.className = 'ch-readtime';
    rt.innerHTML = '<span>&#9203; ' + mins + ' min read</span><span>&#167; ' + sections.length + ' sections</span>';
    var metaEl = document.getElementById('chapterMeta');
    var descEl = article.querySelector('.ch-desc');
    if (metaEl) metaEl.parentNode.insertBefore(rt, metaEl.nextSibling);
    else if (descEl) descEl.parentNode.insertBefore(rt, descEl.nextSibling);
  }

  /* ---- on-page table of contents + scroll-spy ---- */
  if (sections.length >= 3 && content) {
    var toc = document.createElement('nav');
    toc.className = 'chap-toc';
    toc.setAttribute('aria-label', 'On this page');
    var th = '<div class="chap-toc-head"><span>On this page</span><button class="chap-toc-x" aria-label="Toggle">&#9776;</button></div><ul>';
    sections.forEach(function (s) {
      th += '<li><a href="#' + s.id + '" data-id="' + s.id + '">' + esc(s.label) + '</a></li>';
    });
    th += '</ul>';
    toc.innerHTML = th;
    var anchorEl = article.querySelector('.ch-readtime') || document.getElementById('chapterMeta') || article.querySelector('.ch-desc');
    if (anchorEl && anchorEl.parentNode) anchorEl.parentNode.insertBefore(toc, anchorEl.nextSibling);
    else article.appendChild(toc);

    // helpful info box right after the table of contents
    var tips = document.createElement('div');
    tips.className = 'chap-tips';
    tips.innerHTML =
      '<span class="ct-ico">&#128161;</span>' +
      '<div class="ct-body"><strong>Make the most of this page.</strong> ' +
      'Press <kbd>Ctrl</kbd><kbd>K</kbd> to search the whole handbook, and use <kbd>&larr;</kbd><kbd>&rarr;</kbd> to move between chapters. ' +
      'Mark this chapter <b>Completed</b> or <b>Bookmark</b> it above to track your progress on the ' +
      '<a href="' + ROOT + 'roadmap.html">Learning Roadmap</a>. ' +
      'Not sure which method fits your data? Open the <a href="' + ROOT + 'decision-assistant.html">Decision Assistant</a> for a guided recommendation.</div>';
    toc.parentNode.insertBefore(tips, toc.nextSibling);

    var links = toc.querySelectorAll('a[data-id]');
    Array.prototype.forEach.call(links, function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var id = a.getAttribute('data-id');
        history.replaceState(null, '', '#' + id);
        scrollToId(id);
      });
    });
    var xb = toc.querySelector('.chap-toc-x');
    if (xb) xb.addEventListener('click', function () { toc.classList.toggle('collapsed'); });

    var spy = null;
    function refreshSpy() {
      spy = null;
      var best = -Infinity;
      sections.forEach(function (s) {
        var top = s.el.getBoundingClientRect().top;
        if (top - 140 <= 0 && top > best) { best = top; spy = s.id; }
      });
      if (!spy && sections.length) spy = sections[0].id;
      Array.prototype.forEach.call(links, function (a) {
        a.classList.toggle('active', a.getAttribute('data-id') === spy);
      });
    }
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      window.requestAnimationFrame(function () { refreshSpy(); ticking = false; });
    }, { passive: true });
    refreshSpy();
  }

  /* ---- back-to-top button ---- */
  var toTop = document.createElement('button');
  toTop.className = 'to-top';
  toTop.setAttribute('aria-label', 'Back to top');
  toTop.innerHTML = '&#8593;';
  document.body.appendChild(toTop);
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  window.addEventListener('scroll', function () {
    toTop.classList.toggle('show', window.pageYOffset > 600);
  }, { passive: true });

  /* ---- glossary tooltips: lazy-load data, wrap key terms in prose ---- */
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function injectGlossary() {
    var G = window.GLOSSARY || []; if (!G.length || !article) return;
    var map = [];
    G.forEach(function (e) {
      [e.term].concat(e.aliases || []).forEach(function (t) { map.push({ k: t.toLowerCase(), term: e.term, def: e.def, len: t.length }); });
    });
    map.sort(function (a, b) { return b.len - a.len; });
    var used = {}, count = 0, MAXN = 45;
    var nodes = article.querySelectorAll('p, .ch-desc');
    Array.prototype.forEach.call(nodes, function (p) {
      if (count >= MAXN) return;
      Array.prototype.slice.call(p.childNodes).forEach(function (node) {
        if (node.nodeType !== 3 || count >= MAXN) return;
        var text = node.nodeValue;
        for (var i = 0; i < map.length; i++) {
          var m = map[i]; if (used[m.term]) continue;
          var match = new RegExp('\\b' + reEsc(m.k) + '\\b', 'i').exec(text);
          if (match) {
            var tail = node.splitText(match.index);
            tail.nodeValue = tail.nodeValue.substring(match[0].length);
            var span = document.createElement('span');
            span.className = 'gloss'; span.tabIndex = 0;
            span.appendChild(document.createTextNode(match[0]));
            var pop = document.createElement('span'); pop.className = 'gloss-pop';
            pop.innerHTML = '<b>' + esc(m.term) + '</b> ' + esc(m.def);
            span.appendChild(pop);
            p.insertBefore(span, tail);
            used[m.term] = 1; count++;
            break;
          }
        }
      });
    });
  }
  if (article && here) {
    var gscript = document.createElement('script');
    gscript.src = ROOT + 'assets/glossary.js';
    gscript.onload = function () { try { injectGlossary(); } catch (e) {} };
    document.head.appendChild(gscript);
  }

  /* ---- personal notes per chapter (localStorage) ---- */
  if (here) {
    var NK = 'da_notebook_notes';
    var getNotes = function () { try { return JSON.parse(localStorage.getItem(NK)) || {}; } catch (e) { return {}; } };
    var nbtn = document.createElement('button');
    nbtn.className = 'notes-btn'; nbtn.setAttribute('aria-label', 'My notes for this chapter');
    nbtn.innerHTML = '&#128221;';
    document.body.appendChild(nbtn);
    var np = document.createElement('div'); np.className = 'notes-panel'; np.hidden = true;
    var chTitle = (document.querySelector('.ch-title') || {}).textContent || 'this chapter';
    np.innerHTML =
      '<div class="notes-head"><span>&#128221; My notes</span><button class="notes-x" aria-label="Close">&times;</button></div>' +
      '<div class="notes-sub">' + esc(chTitle) + '</div>' +
      '<textarea class="notes-ta" placeholder="Jot key takeaways, questions, or code to revisit. Saved on this device automatically."></textarea>' +
      '<div class="notes-foot"><span class="notes-status"></span><button class="notes-clear">Clear</button></div>';
    document.body.appendChild(np);
    var nta = np.querySelector('.notes-ta'), nstatus = np.querySelector('.notes-status');
    nta.value = getNotes()[here] || '';
    var markNotes = function () { nbtn.classList.toggle('has', (getNotes()[here] || '').trim().length > 0); };
    markNotes();
    var ntimer;
    nta.addEventListener('input', function () {
      clearTimeout(ntimer); nstatus.textContent = 'saving…';
      ntimer = setTimeout(function () {
        var a = getNotes(); if (nta.value.trim()) a[here] = nta.value; else delete a[here];
        try { localStorage.setItem(NK, JSON.stringify(a)); } catch (e) {}
        nstatus.textContent = 'saved ✓'; markNotes();
        setTimeout(function () { nstatus.textContent = ''; }, 1200);
      }, 350);
    });
    nbtn.onclick = function () { np.hidden = !np.hidden; if (!np.hidden) nta.focus(); };
    np.querySelector('.notes-x').onclick = function () { np.hidden = true; };
    np.querySelector('.notes-clear').onclick = function () {
      if (!nta.value || window.confirm('Clear your notes for this chapter?')) {
        nta.value = ''; var a = getNotes(); delete a[here]; try { localStorage.setItem(NK, JSON.stringify(a)); } catch (e) {}
        markNotes(); nstatus.textContent = 'cleared'; setTimeout(function () { nstatus.textContent = ''; }, 1000);
      }
    };
  }

  /* ---- keyboard chapter navigation (← / →) ---- */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.getElementById('cmdk') && !document.getElementById('cmdk').hidden) return;
    if (e.key === 'ArrowLeft') {
      var prev = document.querySelector('.nav-footer .nav-btn:not(.primary)');
      if (prev && prev.getAttribute('href')) location.href = prev.getAttribute('href');
    } else if (e.key === 'ArrowRight') {
      var next = document.querySelector('.nav-footer .nav-btn.primary');
      if (next && next.getAttribute('href')) location.href = next.getAttribute('href');
    }
  });

  /* =================== global search palette =================== */
  var palette = document.createElement('div');
  palette.className = 'cmdk';
  palette.id = 'cmdk';
  palette.hidden = true;
  palette.innerHTML =
    '<div class="cmdk-backdrop" data-close="1"></div>' +
    '<div class="cmdk-panel" role="dialog" aria-modal="true" aria-label="Search the handbook">' +
    '<div class="cmdk-input-row"><span class="cmdk-ico">&#128269;</span>' +
    '<input id="cmdkInput" type="text" placeholder="Search the whole handbook…" autocomplete="off" spellcheck="false">' +
    '<kbd class="cmdk-esc">Esc</kbd></div>' +
    '<div class="cmdk-results" id="cmdkResults"></div>' +
    '<div class="cmdk-foot"><span><kbd>&#8593;</kbd><kbd>&#8595;</kbd> navigate</span>' +
    '<span><kbd>&#8629;</kbd> open</span><span id="cmdkCount"></span></div>' +
    '</div>';
  document.body.appendChild(palette);

  var cInput = palette.querySelector('#cmdkInput');
  var cResults = palette.querySelector('#cmdkResults');
  var cCount = palette.querySelector('#cmdkCount');
  var INDEX = null, loading = false, sel = -1, current = [];

  function loadIndex(cb) {
    if (INDEX) { cb(); return; }
    if (loading) return;
    loading = true;
    cResults.innerHTML = '<div class="cmdk-empty">Loading the handbook…</div>';
    fetch(ROOT + 'assets/search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (d) { INDEX = d; loading = false; cb(); })
      .catch(function () {
        loading = false;
        cResults.innerHTML = '<div class="cmdk-empty">Search index could not load.</div>';
      });
  }

  function score(entry, tokens, phrase) {
    var s = 0, h = entry.h.toLowerCase(), t = entry.t;
    if (phrase.length > 1) {
      if (h.indexOf(phrase) !== -1) s += 40;
      if (t.indexOf(phrase) !== -1) s += 12;
    }
    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i];
      if (!tk) continue;
      if (h.indexOf(tk) !== -1) s += 9;
      if (t.indexOf(tk) !== -1) s += 2;
    }
    if (s > 0 && entry.id === '') s += 1; // tiny nudge for chapter-level hits
    return s;
  }

  function highlight(text, tokens) {
    var out = esc(text);
    tokens.forEach(function (tk) {
      if (tk.length < 2) return;
      var re = new RegExp('(' + tk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  }

  function render(q) {
    q = q.trim().toLowerCase();
    if (!q) {
      cResults.innerHTML = '<div class="cmdk-empty">Type to search 35 chapters &mdash; methods, metrics, code, pitfalls.</div>';
      cCount.textContent = ''; current = []; sel = -1; return;
    }
    var tokens = q.split(/\s+/).filter(Boolean);
    var ranked = [];
    for (var i = 0; i < INDEX.length; i++) {
      var sc = score(INDEX[i], tokens, q);
      if (sc > 0) ranked.push([sc, INDEX[i]]);
    }
    ranked.sort(function (a, b) { return b[0] - a[0] || a[1].c - b[1].c; });
    current = ranked.slice(0, 40).map(function (r) { return r[1]; });
    sel = current.length ? 0 : -1;
    if (!current.length) {
      cResults.innerHTML = '<div class="cmdk-empty">No matches for &ldquo;' + esc(q) + '&rdquo;.</div>';
      cCount.textContent = ''; return;
    }
    var html = '';
    current.forEach(function (e, i) {
      var url = chPath(e.file) + (e.id ? '#' + e.id : '');
      var label = e.id ? e.h : e.title;
      html += '<a class="cmdk-item' + (i === 0 ? ' sel' : '') + '" href="' + url + '" data-i="' + i + '">' +
        '<span class="cmdk-ch">Ch ' + (e.c < 10 ? '0' + e.c : e.c) + '</span>' +
        '<span class="cmdk-body"><span class="cmdk-h">' + highlight(label, tokens) + '</span>' +
        '<span class="cmdk-ctx">' + (e.id ? esc(e.title) + ' &middot; ' : '') + highlight((e.s || '').slice(0, 120), tokens) + '</span></span></a>';
    });
    cResults.innerHTML = html;
    cCount.textContent = current.length + (current.length === 40 ? '+ results' : ' results');
    Array.prototype.forEach.call(cResults.querySelectorAll('.cmdk-item'), function (a) {
      a.addEventListener('mousemove', function () { setSel(parseInt(a.getAttribute('data-i'), 10)); });
    });
  }

  function setSel(i) {
    var items = cResults.querySelectorAll('.cmdk-item');
    if (!items.length) return;
    sel = Math.max(0, Math.min(items.length - 1, i));
    Array.prototype.forEach.call(items, function (a, idx) { a.classList.toggle('sel', idx === sel); });
    var act = items[sel];
    if (act) act.scrollIntoView({ block: 'nearest' });
  }

  function openPalette() {
    palette.hidden = false;
    document.body.classList.add('cmdk-open');
    loadIndex(function () { render(cInput.value); });
    setTimeout(function () { cInput.focus(); cInput.select(); }, 10);
  }
  function closePalette() {
    palette.hidden = true;
    document.body.classList.remove('cmdk-open');
  }

  cInput.addEventListener('input', function () { if (INDEX) render(cInput.value); });
  palette.addEventListener('click', function (e) {
    if (e.target.getAttribute('data-close')) closePalette();
  });
  cInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(sel + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(sel - 1); }
    else if (e.key === 'Enter') {
      var items = cResults.querySelectorAll('.cmdk-item');
      if (items[sel]) location.href = items[sel].getAttribute('href');
    } else if (e.key === 'Escape') { closePalette(); }
  });

  // global open shortcut + sidebar trigger button
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault(); palette.hidden ? openPalette() : closePalette();
    } else if (e.key === 'Escape' && !palette.hidden) { closePalette(); }
  });
  (function addTrigger() {
    var tools = document.querySelector('.sidebar-tools');
    if (!tools) return;
    var btn = document.createElement('button');
    btn.className = 'global-search-btn';
    btn.id = 'globalSearchBtn';
    btn.innerHTML = '<span>&#128269; Search the handbook</span><kbd>Ctrl K</kbd>';
    tools.insertBefore(btn, tools.firstChild);
    btn.addEventListener('click', openPalette);
  })();
})();
