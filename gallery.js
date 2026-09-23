/* ============================================================================
   site/gallery.js —— 图库浮层 + 骑行视频弹窗（站主 spec 二/三/四/六/七/十）

   · 组件对应（spec 十二「组件应该合理拆分」）：
       GalleryCard    → 首页 .entry-card[data-open="gallery"]（#gallery）
       GalleryOverlay → #galleryOverlay（全屏黑底空间，z-index 2000）
       GallerySpace   → #ridePhotos（.g-plane，承载照片 + 拖拽平移 + 视差）
       ImageViewer    → #galleryViewer（放大 / 查看原图 / 上一张 / 下一张）
       CyclingCard    → 首页 .entry-card[data-open="cycling"]
       VideoModal     → #videoModal（站内播放，不跳转、不自动播放）
   · 数据只来自 site/gallery-data.js（window.SITE_MEDIA / galleryItems / cyclingItems），
     照片与视频全部是站内真实资源，未新增任何未确认的个人内容。
   · 交互（spec 四/七/十三）：点卡片打开、点图片放大、可看高清、ESC / Close / 点背景关闭、
     鼠标移动轻微视差、鼠标拖拽平移、hover 放大 + Glow + 层级提升 + 显示信息。
   ============================================================================ */
(function () {
  'use strict';

  var MEDIA = window.SITE_MEDIA || {};
  var gallery = (MEDIA.gallery && MEDIA.gallery.items) || window.galleryItems || [];
  var cycling = (MEDIA.cycling && MEDIA.cycling.items) || window.cyclingItems || [];

  var overlay = document.getElementById('galleryOverlay');
  var plane = document.getElementById('ridePhotos');   // GallerySpace，同时保住既有锚点 id
  var viewer = document.getElementById('galleryViewer');
  var vImg = document.getElementById('galleryViewerImg');
  var vTitle = document.getElementById('galleryViewerTitle');
  var vDate = document.getElementById('galleryViewerDate');
  var vOrig = document.getElementById('galleryViewerOrig');
  var vClose = document.getElementById('galleryViewerClose');
  var vPrev = document.getElementById('galleryViewerPrev');
  var vNext = document.getElementById('galleryViewerNext');
  var overlayClose = document.getElementById('galleryClose');

  var modal = document.getElementById('videoModal');
  var modalClose = document.getElementById('videoClose');
  var epList = document.getElementById('videoList');
  var player = document.getElementById('ridePlayer');

  var built = false;
  var current = -1;
  var lastFocus = null;
  // V6.1：3D 球体引擎。注意 index.html 里 gallery.js 先于 gallery3d.js 载入，
  // 所以必须「用到时再取 window.Gallery3D」；载入瞬间就抓会永久拿到 null，
  // 结果是 3D 静默回落成二维星空（2026-09-23 站主复看「还是不立体」的根因）。
  function g3d() { return window.Gallery3D || null; }
  var mode3d = false;                   // V6.1：当前是否处于 3D 模式

  /* ---------- 数量文案跟着数据走（避免首页写死的「28 张 / 3 段」以后跟数据对不上） ---------- */
  function syncCounts() {
    var pairs = [['[data-count="gallery"]', gallery.length], ['[data-count="cycling"]', cycling.length]];
    for (var k = 0; k < pairs.length; k++) {
      var els = document.querySelectorAll(pairs[k][0]);
      for (var m = 0; m < els.length; m++) els[m].textContent = String(pairs[k][1]);
    }
  }

  /* ---------- 漂浮布局：黄金角散列 + 确定性伪随机 ----------
     同一张照片每次打开位置一致（可复现、可自检），不同大小/远近形成深度感；
     中央 ±9% / ±13% 的光柱区域留空，避免挡住视觉焦点。 */
  function layout(i) {
    var GA = 2.399963;
    var a = i * GA;
    var ring = 18 + (i % 5) * 10.5;
    var x = 50 + Math.cos(a) * ring * 1.28;
    var y = 47 + Math.sin(a) * ring * 0.86;
    if (Math.abs(x - 50) < 9 && Math.abs(y - 47) < 13) x += (x < 50 ? -9 : 9);
    x = Math.min(93, Math.max(7, x));
    y = Math.min(87, Math.max(9, y));
    var z = 0.5 + ((i * 7) % 5) * 0.16;                 // 0.50 ~ 1.14 深度
    var w = Math.round(104 + ((i * 5) % 4) * 20 + z * 34);   // 104 ~ 220 px
    var rot = (((i * 13) % 9) - 4) * 0.8;               // -3.2 ~ 3.2 deg
    return {
      x: x.toFixed(2) + '%',
      y: y.toFixed(2) + '%',
      z: z.toFixed(2),
      w: w + 'px',
      rot: rot.toFixed(2) + 'deg',
      d: (i % 14) * 42
    };
  }

  /* ---------- 首次打开时才建节点（28 张照片不拖慢首屏） ---------- */
  function build() {
    if (built || !plane || !gallery.length) return;
    built = true;
    var frag = document.createDocumentFragment();
    gallery.forEach(function (it, i) {
      var L = layout(i);

      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'g-item';
      item.setAttribute('data-i', String(i));
      item.setAttribute('aria-label', it.title + '（' + it.date + '），点击放大');
      item.style.setProperty('--x', L.x);
      item.style.setProperty('--y', L.y);
      item.style.setProperty('--w', L.w);
      item.style.setProperty('--z', L.z);
      item.style.setProperty('--rot', L.rot);
      item.style.setProperty('--d', String(L.d));

      var float = document.createElement('span');
      float.className = 'g-float';
      float.style.setProperty('--d', String(L.d));

      var frame = document.createElement('span');
      frame.className = 'g-frame';

      var img = document.createElement('img');
      img.src = it.src;
      img.alt = it.title;
      img.loading = 'lazy';
      img.decoding = 'async';

      var meta = document.createElement('span');
      meta.className = 'g-meta';
      var b = document.createElement('b');
      b.textContent = it.title;
      var d = document.createElement('i');
      d.textContent = it.date;
      meta.appendChild(b);
      meta.appendChild(d);

      frame.appendChild(img);
      frame.appendChild(meta);
      float.appendChild(frame);
      item.appendChild(float);
      frag.appendChild(item);
    });
    plane.appendChild(frag);
  }

  /* ---------- GallerySpace：鼠标拖拽平移（带边界，避免把照片拖出屏幕外丢掉） ---------- */
  var pan = { x: 0, y: 0 };
  var drag = null;
  var dragged = false;

  function limit() {
    return {
      x: Math.min(360, Math.round(window.innerWidth * 0.26)),
      y: Math.min(260, Math.round(window.innerHeight * 0.22))
    };
  }
  function applyPan() {
    if (!plane) return;
    plane.style.setProperty('--pan-x', pan.x + 'px');
    plane.style.setProperty('--pan-y', pan.y + 'px');
  }
  function resetPan() {
    pan.x = 0;
    pan.y = 0;
    applyPan();
  }

  if (plane) {
    plane.addEventListener('pointerdown', function (e) {
      if (mode3d) return;                                            // V6.1：3D 下拖拽交给球体引擎
      if (e.target.closest && e.target.closest('.g-item')) return;   // 点照片 = 放大，不是拖拽
      var lim = limit();
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y, lim: lim };
      dragged = false;
      plane.classList.add('dragging');
      try { plane.setPointerCapture(e.pointerId); } catch (err) { /* 老浏览器忽略 */ }
    });
    plane.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.sx;
      var dy = e.clientY - drag.sy;
      if (Math.abs(dx) + Math.abs(dy) > 6) dragged = true;
      pan.x = Math.max(-drag.lim.x, Math.min(drag.lim.x, drag.px + dx));
      pan.y = Math.max(-drag.lim.y, Math.min(drag.lim.y, drag.py + dy));
      applyPan();
    });
    function endDrag(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      drag = null;
      if (plane) plane.classList.remove('dragging');
    }
    plane.addEventListener('pointerup', endDrag);
    plane.addEventListener('pointercancel', endDrag);
    plane.addEventListener('click', function (e) {
      if (dragged) { dragged = false; return; }               // 拖完这一次点击不当作关闭
      // V6.1：3D 模式下空白处是渲染画布（.g3d-canvas），认「没点中照片」即关闭
      var onItem = !!(e.target.closest && e.target.closest('.g-item'));
      if (e.target === plane || (mode3d && !onItem)) closeGallery();
    });
  }

  /* ---------- 鼠标移动 → 轻微视差（写在 .g-plane 上，由 .g-item 按 --z 深度继承） ---------- */
  var pend = null;
  if (overlay) {
    overlay.addEventListener('mousemove', function (e) {
      if (pend) return;
      pend = window.requestAnimationFrame(function () {
        pend = null;
        if (!plane || mode3d) return;                 // V6.1：3D 下不做二维视差
        var r = overlay.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var nx = ((e.clientX - r.left) / r.width) * 2 - 1;
        var ny = ((e.clientY - r.top) / r.height) * 2 - 1;
        plane.style.setProperty('--par-x', nx.toFixed(3));
        plane.style.setProperty('--par-y', ny.toFixed(3));
      });
    });
  }

  /* ---------- ImageViewer：放大 / 上一张 / 下一张 / 查看原图 ---------- */
  function openViewer(i) {
    if (!viewer || !gallery[i]) return;
    current = i;
    var it = gallery[i];
    vImg.src = it.src;
    vImg.alt = it.title;
    vTitle.textContent = it.title;
    vDate.textContent = it.description + ' · ' + it.date;
    vOrig.href = it.src;
    if (vOrig.setAttribute) vOrig.setAttribute('download', '');
    viewer.classList.add('show');
  }
  function closeViewer() {
    if (!viewer) return;
    viewer.classList.remove('show');
    current = -1;
  }
  function step(delta) {
    if (current < 0 || gallery.length < 2) return;
    openViewer((current + delta + gallery.length) % gallery.length);
  }

  if (plane) {
    plane.addEventListener('click', function (e) {
      var item = e.target.closest && e.target.closest('.g-item');
      if (!item) return;
      openViewer(parseInt(item.getAttribute('data-i'), 10) || 0);
    });
  }
  if (vClose) vClose.addEventListener('click', closeViewer);
  if (vPrev) vPrev.addEventListener('click', function () { step(-1); });
  if (vNext) vNext.addEventListener('click', function () { step(1); });
  if (viewer) {
    viewer.addEventListener('click', function (e) { if (e.target === viewer) closeViewer(); });
  }

  /* ---------- GalleryOverlay 开关 ---------- */
  function openGallery() {
    if (!overlay) return;
    lastFocus = document.activeElement;
    build();
    overlay.classList.add('show');
    document.body.classList.add('overlay-open');
    resetPan();
    // V6.1：优先挂 3D 球体；依赖缺失 / 初始化报错都静默回落二维星空
    mode3d = false;
    var engine = g3d();
    if (plane && engine && engine.available && engine.available()) {
      try { mode3d = engine.mount(plane) === true; } catch (err) { mode3d = false; }
    }
    if (overlayClose) overlayClose.focus();
  }
  function closeGallery() {
    if (!overlay) return;
    closeViewer();
    // V6.1：暂停球体渲染（不销毁，下次打开沿用同一套照片节点）
    var engineOpen = g3d();
    if (engineOpen && engineOpen.isActive && engineOpen.isActive()) { try { engineOpen.suspend(); } catch (err) { /* 忽略 */ } }
    mode3d = false;
    overlay.classList.remove('show');
    document.body.classList.remove('overlay-open');
    resetPan();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (overlayClose) overlayClose.addEventListener('click', closeGallery);
  if (overlay) {
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeGallery(); });
  }

  /* ---------- VideoModal：站内播放（不跳转、不自动播放） ---------- */
  function selectEpisode(i, autoplay) {
    if (!player || !cycling[i]) return;
    var ep = cycling[i];
    if (ep.poster) player.setAttribute('poster', ep.poster);
    else player.removeAttribute('poster');
    player.setAttribute('src', ep.src);
    if (epList) {
      var btns = epList.querySelectorAll('.vm-ep');
      for (var k = 0; k < btns.length; k++) {
        btns[k].classList.toggle('is-on', k === i);
        btns[k].setAttribute('aria-pressed', k === i ? 'true' : 'false');
      }
    }
    try { player.load(); } catch (err) { /* 老浏览器忽略 */ }
    if (autoplay) {
      var p = player.play();
      if (p && p.catch) p.catch(function () { /* 浏览器拦截自动播放时保持暂停，用户点播放即可 */ });
    }
  }
  function buildEpisodeList() {
    if (!epList || epList.children.length || !cycling.length) return;
    cycling.forEach(function (ep, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vm-ep';
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = ep.label;
      btn.addEventListener('click', function () { selectEpisode(i, true); });
      epList.appendChild(btn);
    });
  }
  function openVideo() {
    if (!modal) return;
    lastFocus = document.activeElement;
    buildEpisodeList();
    modal.classList.add('show');
    document.body.classList.add('overlay-open');
    selectEpisode(0, false);                     // spec 七：默认不自动播放
    if (modalClose) modalClose.focus();
  }
  function closeVideo() {
    if (!modal) return;
    modal.classList.remove('show');
    document.body.classList.remove('overlay-open');
    if (player) { try { player.pause(); } catch (err) { /* 忽略 */ } }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (modalClose) modalClose.addEventListener('click', closeVideo);
  if (modal) {
    modal.addEventListener('click', function (e) { if (e.target === modal) closeVideo(); });
  }

  /* ---------- 入口卡片：首页两个卡片 + #ride 里的两个按钮共用 data-open ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!el) return;
    var what = el.getAttribute('data-open');
    if (what === 'gallery') {
      e.preventDefault();
      if (overlay && gallery.length) {
        if (overlay.classList.contains('show')) closeGallery();
        else openGallery();
      }
    } else if (what === 'cycling') {
      e.preventDefault();
      openVideo();
    }
  });

  /* ---------- 键盘：ESC 关闭（先 viewer 后 overlay）、查看器里左右切换 ---------- */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    var galleryOpen = !!overlay && overlay.classList.contains('show');
    var viewerOpen = !!viewer && viewer.classList.contains('show');
    var videoOpen = !!modal && modal.classList.contains('show');

    if (e.key === 'Escape') {
      if (videoOpen) { closeVideo(); return; }
      if (viewerOpen) { closeViewer(); return; }
      if (galleryOpen) { closeGallery(); return; }
      return;
    }
    if (typing) return;                       // 不影响数字分身输入框
    if (viewerOpen && e.key === 'ArrowLeft') { step(-1); }
    if (viewerOpen && e.key === 'ArrowRight') { step(1); }
  });

  /* ---------- 启动：只同步一次数量文案，其余等用户点击再做 ---------- */
  syncCounts();
})();
