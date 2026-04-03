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
  var groupsCollapsed = get(K.groups, []);

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
    h += '<input id="chapterSearch" class="search-input" type="text" placeholder="Search chapters...">';
    h += '<div class="tool-row"><button id="toggleTheme" class="tool-btn">Toggle Theme</button><button id="resetProgress" class="tool-btn">Reset Progress</button></div>';
    h += '<div class="docs-box"><select id="docTemplate" class="doc-select" aria-label="Documentation template"><option value="readme">README template</option><option value="dictionary">Data dictionary template</option><option value="analysis">Analysis log template</option></select>';
    h += '<button id="copyDocTemplate" class="tool-btn secondary">Copy</button><button id="downloadDocTemplate" class="tool-btn secondary">Save</button></div>';
    h += '<div class="doc-note">Reusable documentation templates for each new project.</div>';
    h += '<div id="chapterStats" class="chapter-stats">Completed: ' + pct() + '%</div>';
    h += '</div>';

    h += '<nav id="nav">';
    for (var gi = 0; gi < GROUPS.length; gi++) {
      var gname = GROUPS[gi];
      var items = CH.filter(function (c) { return c.group === gname; });
      var hasCurrent = items.some(function (c) { return c.file === here; });
      var collapsed = groupsCollapsed.indexOf(gname) !== -1 && !hasCurrent;
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

  /* ---- search ---- */
  var search = document.getElementById('chapterSearch');
  if (search) search.addEventListener('input', function (e) {
    var q = e.target.value.trim().toLowerCase();
    Array.prototype.forEach.call(document.querySelectorAll('.nav-group'), function (g) {
      var any = false;
      Array.prototype.forEach.call(g.querySelectorAll('.nav-item'), function (it) {
        var match = !q || it.textContent.toLowerCase().indexOf(q) !== -1;
        it.classList.toggle('hidden', !match); if (match) any = true;
      });
      g.style.display = any ? '' : 'none';
      if (q) g.classList.remove('collapsed');
    });
  });

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
