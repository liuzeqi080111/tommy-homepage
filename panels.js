/* V7 分类浮层（站主 2026-09-23）：
   首屏保持「只留一屏」；首屏之外的内容按 5 类收进本页浮层，不再做页面内长滚动：
     关于我 / 学习与项目 / 生活 · 骑行 / 数字分身 / 联系与反馈
   入口链接一个字都没改（顶部导航、右栏快速导航、卡片下胶囊、ai-dock 还是原来的 href="#xxx"），
   这里统一拦截：点哪个入口就打开对应分类；#gallery 交给 V6 的全屏星空浮层（gallery.js）。
   独立文件，加载在 gallery3d.js 之后；万一它没加载，页面只是没有浮层，内容仍在 DOM 里。 */
(function () {
  'use strict';

  var layer = document.getElementById('catLayer');
  var body = document.getElementById('catBody');
  var nameEl = document.getElementById('catName');
  var closeBtn = document.getElementById('catClose');
  if (!layer || !body || !nameEl) return;

  var GROUPS = {
    about: { title: '关于我', sections: ['about'] },
    work: { title: '学习与项目', sections: ['work'] },
    ride: { title: '生活 · 骑行', sections: ['ride'] },
    twin: { title: '数字分身', sections: ['digital-twin'] },
    connect: { title: '联系与反馈', sections: ['contact', 'feedback'] }
  };
  var ALIAS = { contact: 'connect', feedback: 'connect', 'digital-twin': 'twin' };
  var CARDS = body.querySelectorAll('section.card');
  var lastFocus = null;

  function isOpen() { return layer.classList.contains('show'); }

  function open(key) {
    var g = GROUPS[key];
    if (!g) return false;
    var i, el;
    for (i = 0; i < CARDS.length; i++) CARDS[i].classList.remove('is-on');
    for (i = 0; i < g.sections.length; i++) {
      el = document.getElementById(g.sections[i]);
      if (el) el.classList.add('is-on');
    }
    nameEl.textContent = g.title;
    if (!isOpen()) lastFocus = document.activeElement;
    layer.classList.add('show');
    layer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overlay-open');
    layer.scrollTop = 0;
    if (closeBtn) closeBtn.focus();
    return true;
  }

  function close() {
    if (!isOpen()) return;
    layer.classList.remove('show');
    layer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overlay-open');
    var i;
    for (i = 0; i < CARDS.length; i++) CARDS[i].classList.remove('is-on');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  }

  // 图库 / 大图 / 视频开着时，ESC 归 gallery.js 处理，别一次关两层
  function occupied() {
    var ids = ['galleryOverlay', 'galleryViewer', 'videoModal'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el && el.classList.contains('show')) return true;
    }
    return false;
  }

  // 入口代理：所有 href="#about|work|ride|digital-twin|contact|feedback|gallery|top"
  document.addEventListener('click', function (e) {
    var t = e.target;
    var a = (t && t.closest) ? t.closest('a[href^="#"]') : null;
    if (!a) return;
    var h = (a.getAttribute('href') || '').slice(1);
    if (!h) return;
    if (h === 'top') { close(); return; }
    if (h === 'gallery') {
      var entry = document.querySelector('[data-open="gallery"]');
      if (!entry) return;
      e.preventDefault();
      entry.click();
      return;
    }
    if (GROUPS[h] || ALIAS[h]) {
      e.preventDefault();
      open(ALIAS[h] || h);
    }
  });

  // 浮层里的建议问题：先收掉本层，让首屏的对话区露出来（提问与聚焦由页面原有逻辑做）
  document.addEventListener('click', function (e) {
    if (!isOpen()) return;
    var t = e.target;
    if (t && t.closest && t.closest('#catBody [data-q]')) close();
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.keyCode !== 27) return;
    if (occupied()) return;
    close();
  }, true);

  if (closeBtn) closeBtn.addEventListener('click', close);
  layer.addEventListener('click', function (e) { if (e.target === layer) close(); });

  // 带锚点直接打开（例如 #work）：欢迎页 / 入场幕还开着时不抢焦点
  function shown(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    var st = window.getComputedStyle(el);
    return st.display !== 'none' && st.visibility !== 'hidden' && parseFloat(st.opacity || '1') > 0.05;
  }
  function fromHash() {
    var h = (location.hash || '').slice(1);
    var key = ALIAS[h] || h;
    if (!GROUPS[key]) return;
    if (shown(document.getElementById('welcome')) || shown(document.getElementById('intro'))) return;
    open(key);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fromHash);
  else fromHash();

  window.CatPanels = { open: open, close: close, groups: GROUPS };
})();
