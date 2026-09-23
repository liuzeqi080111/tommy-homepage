/* ==========================================================================
   site/gallery3d.js —— 图库「3D 球体照片空间」（V6.1）

   把图库浮层里原有的二维星空散点（.g-plane 上的 .g-item）提升为一个可以用鼠标 /
   手指拖动旋转的三维球体：28 张照片按斐波那契球面分布贴在一个不可见的球面上，
   每个照片卡片正面朝球外，拖动任意方向旋转整球，松手带惯性；滚轮 / 双指缩放。

   实现要点：
   - 依赖 site/vendor/three/ 下的 three.js r147（UMD）+ CSS3DRenderer（经典脚本）。
     这一版 CSS3DRenderer 会把元素的 transform 重置为
     `translate(-50%,-50%)` + 4x4 矩阵，也就是卡片天然以球面点为**中心**定位，
     不需要任何负 margin 修正。
   - 照片卡片本身仍是原来的 .g-item（<button>），只是被包进一层 .g3d-cell。
     这样点击放大、键盘可达性、查看器逻辑完全沿用 gallery.js，不需要重写。
   - 正/背面对比：.g3d-cell 用 backface-visibility: hidden —— 球背面的照片浏览器
     直接不绘制，既避免「镜像照片」的怪异观感，也省掉一半绘制量（手机端受益明显）。
   - 失败即降级：THREE 缺失、初始化抛错、尺寸为 0，一律 return false，
     图库保持原来的二维星空布局，功能不丢。

   对外接口（window.Gallery3D）：
     available()       -> bool    依赖是否就绪
     mount(planeEl)    -> bool    构建/恢复 3D（浮层打开后调用）
     suspend()                   暂停渲染（浮层关闭时调用，不销毁）
     unmount()                   完全拆掉 3D，把卡片还给二维布局
     isActive()        -> bool    当前是否处于 3D 模式
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- 常量 ---------- */

  var D2R = Math.PI / 180;
  var FOV = 54;                      // 相机视场角（度）：54° 让近/远卡片屏幕缩放比≈2.5（45° 只有≈2.0），纵深更强
  var GA = 2.399963;                 // 黄金角 ≈ π(3-√5)，斐波那契球面分布用
  var DRAG = 0.0052;                 // 每像素拖拽转角（弧度）
  var PITCH_MAX = 1.15;              // 俯仰夹紧（约 ±66°，避免翻到球底朝天）
  var DRIFT = 0.10;                  // 空闲自转角速度（弧度/秒）：≈5.7°/s，绕一圈约 63 秒
  var INERTIA = 0.93;                // 惯性衰减（每 1/60 秒）
  var ZOOM_MIN = 0.75;
  var ZOOM_MAX = 2.2;
  var SMALL_FPS_MS = 30;             // 小屏渲染帧率上限（≈30fps）
  var DRIFT_FPS_MS = 33;             // 纯自转时的出帧间隔上限（≈30fps，省电；拖拽/惯性不受限）
  var CELL_RATIO = 0.34;             // 卡片世界尺寸 / 球半径（≈相邻间距的 2/3）

  /* ---------- 状态 ---------- */

  var st = null;        // 运行态；null = 未构建
  var active = false;   // 浮层打开中
  var raf = 0;
  var lastT = 0;
  var lastPaint = 0;
  var yaw = 0.7;        // 初始朝向（不正好对着第一张，避免卡片完全重叠）
  var pitch = -0.16;
  var vYaw = 0;         // 惯性（弧度/帧@60fps）
  var vPitch = 0;
  var zoom = 1;
  var dragging = false;
  var moved = false;    // 本次手势是否发生过拖拽（用于吞掉拖拽后的 click）
  var hover = false;
  var pointers = {};    // pointerId -> {x,y}
  var pinch = null;     // { d, zoom }
  var resizeTimer = 0;

  /* ---------- 工具 ---------- */

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function clampPitch(v) { return clamp(v, -PITCH_MAX, PITCH_MAX); }

  function three() { return window.THREE || null; }

  function available() {
    var T = three();
    return !!(T && T.CSS3DRenderer && T.CSS3DObject && T.PerspectiveCamera && T.Scene);
  }

  function viewerOpen() {
    var v = document.getElementById('galleryViewer');
    if (v && v.classList && v.classList.contains('show')) return true;
    var m = document.getElementById('videoModal');
    return !!(m && m.classList && m.classList.contains('show'));
  }

  function countPointers() {
    var n = 0;
    for (var k in pointers) { if (pointers.hasOwnProperty(k)) n++; }
    return n;
  }

  function pinchDist() {
    var ids = [], x = [];
    for (var k in pointers) { if (pointers.hasOwnProperty(k)) { ids.push(k); x.push(pointers[k]); } }
    if (x.length < 2) return 0;
    var dx = x[0].x - x[1].x, dy = x[0].y - x[1].y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function pointerCount2() { return countPointers() >= 2; }

  /* ---------- 尺寸推算 ----------
     目标：不管屏幕多大，前排照片的「视觉宽度」保持在视口宽度的合理比例，
     球体整体不溢出画面。CSS3DRenderer 内部把 perspective 设为
         fov_px = projectionMatrix[5] * heightHalf = vh / (2 * tan(fov/2))
     元素在屏幕上的缩放系数 = fov_px / (相机距离 - 该点 z)，据此反推相机距离。 */

  function metrics(plane) {
    var vw = plane.clientWidth || window.innerWidth || 1024;
    var vh = plane.clientHeight || window.innerHeight || 768;
    var tanHalf = Math.tan(FOV * 0.5 * D2R);
    var P = vh / (2 * tanHalf);                       // 与 CSS3DRenderer 同源
    var small = vw <= 760 || vh <= 520;
    var R = Math.min(vw, vh) * (small ? 0.58 : 0.62);
    var W = R * CELL_RATIO;
    var target = Math.min(vw * (small ? 0.30 : 0.17), vh * 0.26);
    var D = R + (W * P) / Math.max(1, target);
    var limit = Math.min(vw, vh) * 0.49;   // 视觉半径上限（短边占比）：越大 → 相机越近、球越占画面、纵深越强
    var half = (R * P) / Math.sqrt(Math.max(1, D * D - R * R));
    if (half > limit) {                               // 装不下就整体后退
      D *= half / limit;
      half = (R * P) / Math.sqrt(Math.max(1, D * D - R * R));
    }
    return { vw: vw, vh: vh, P: P, R: R, W: W, D: D, half: half, small: small };
  }

  /* ---------- 构建 ---------- */

  function build(plane) {
    var T = three();
    var items = plane.querySelectorAll('.g-item');
    if (!items || !items.length) return false;

    var m = metrics(plane);
    if (m.vw < 2 || m.vh < 2) return false;

    var renderer = new T.CSS3DRenderer();
    renderer.setSize(m.vw, m.vh);
    var canvas = renderer.domElement;
    canvas.className = 'g3d-canvas';
    plane.appendChild(canvas);

    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(FOV, m.vw / m.vh, 1, 12000);
    camera.position.set(0, 0, m.D);
    camera.updateProjectionMatrix();
    scene.add(camera);

    var group = new T.Object3D();
    scene.add(group);

    var objs = [], cells = [], els = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var cell = document.createElement('div');
      cell.className = 'g3d-cell';
      cell.style.width = m.W + 'px';
      cell.style.animationDelay = (i * 14) + 'ms';
      plane.appendChild(cell);                 // 先入 DOM，再由 CSS3DObject 接管
      cell.appendChild(item);                  // 卡片搬进格子（保留全部原有类名/属性）
      var obj = new T.CSS3DObject(cell);
      group.add(obj);
      objs.push(obj);
      cells.push(cell);
      els.push(item);
    }

    st = {
      plane: plane, renderer: renderer, canvas: canvas, scene: scene,
      camera: camera, group: group, objs: objs, cells: cells, items: els,
      m: m, onKey: null, onResize: null
    };

    plane.classList.add('g3d-on');
    place();
    bind();
    return true;
  }

  /* ---------- 球面分布 ---------- */

  function place() {
    if (!st) return;
    var N = st.objs.length, R = st.m.R;
    var gx = st.group.rotation.x, gy = st.group.rotation.y, gz = st.group.rotation.z;
    // lookAt 走世界坐标：摆放时先把整球转回零位，摆完再还原
    st.group.rotation.set(0, 0, 0);
    st.group.updateMatrixWorld(true);
    for (var i = 0; i < N; i++) {
      var y = 1 - (i + 0.5) * 2 / N;
      var r = Math.sqrt(Math.max(0, 1 - y * y));
      var th = i * GA;
      var obj = st.objs[i];
      obj.position.set(Math.cos(th) * r * R, y * R, Math.sin(th) * r * R);
      // 朝球外：把位置向量放大两倍作为注视点（three.js 官方示例的惯用法）
      obj.lookAt(obj.position.x * 2, obj.position.y * 2, obj.position.z * 2);
    }
    st.group.rotation.set(gx, gy, gz);
    st.group.updateMatrixWorld(true);
  }

  function sizeCells(W) {
    if (!st) return;
    for (var i = 0; i < st.cells.length; i++) st.cells[i].style.width = W + 'px';
  }

  /* ---------- 渲染 ---------- */

  function applyRotation() {
    if (st) st.group.rotation.set(pitch, yaw, 0);
  }

  function render() {
    if (st) st.renderer.render(st.scene, st.camera);
  }

  function paint() {
    applyRotation();
    render();
  }

  function canDrift() {
    // 不再拿 hover 暂停自转：画布铺满整个图库，鼠标只要停在页面上就永远不自转
    //（站主实测「看不到它转」）。拖拽 / 标签页隐藏 / 查看器打开仍然暂停。
    return !dragging && !document.hidden && !viewerOpen();
  }

  function frame(t) {
    if (!active || !st) { raf = 0; return; }
    raf = window.requestAnimationFrame(frame);
    var dt = lastT ? (t - lastT) / 1000 : 0.016;
    lastT = t;
    if (dt > 0.05) dt = 0.05;
    if (dragging) return;                       // 拖拽期间由事件直接驱动
    var k = dt * 60;
    var need = false;
    var drifting = false;                       // 本帧是否只是「空闲自转」（不是拖拽/惯性）
    if (Math.abs(vYaw) > 0.00012 || Math.abs(vPitch) > 0.00012) {
      yaw += vYaw * k;
      pitch = clampPitch(pitch + vPitch * k);
      var dec = Math.pow(INERTIA, k);
      vYaw *= dec;
      vPitch *= dec;
      need = true;
    } else if (canDrift()) {
      vYaw = 0; vPitch = 0;
      yaw += DRIFT * dt;
      drifting = true;
      need = true;
    }
    if (!need) return;
    // 自转现在常驻运行，按 30fps 出帧省电；小屏同样 30fps；拖拽与惯性动画不受限。
    var minMs = st.m.small ? SMALL_FPS_MS : (drifting ? DRIFT_FPS_MS : 0);
    if (minMs && (t - lastPaint) < minMs) return;
    lastPaint = t;
    paint();
  }

  function start() {
    lastT = 0;
    lastPaint = 0;
    if (!raf) raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  }

  /* ---------- 交互 ---------- */

  function setZoom(z) {
    zoom = clamp(z, ZOOM_MIN, ZOOM_MAX);
    if (!st) return;
    st.camera.position.z = st.m.D * zoom;
    st.camera.updateMatrixWorld(true);
    paint();
  }

  function onDown(e) {
    if (!active || !st) return;
    // 按在照片卡片上：不旋转、也不抢指针（站主：无法点击放大图片）。
    // 一旦 setPointerCapture，浏览器会把后续 click 的 target 重定向到本容器，
    // 于是 gallery.js 里 e.target.closest('.g-item') 永远为 null → 查看器打不开，
    // 还会掉进「3D 下点空白 = 关闭图库」那条分支。
    if (e.target && e.target.closest && e.target.closest('.g-item')) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    try { st.canvas.setPointerCapture(e.pointerId); } catch (err) {}
    if (pointerCount2()) {                       // 双指：切到捏合缩放
      dragging = false;
      moved = true;                              // 捏合不应触发卡片点击
      pinch = { d: pinchDist(), zoom: zoom };
      vYaw = 0; vPitch = 0;
    } else {
      dragging = true;
      moved = false;
      vYaw = 0; vPitch = 0;
      st.canvas.classList.add('is-dragging');
      st.plane.classList.add('dragging');
      st.lastX = e.clientX;
      st.lastY = e.clientY;
    }
  }

  function onMove(e) {
    if (!active || !st || !Object.prototype.hasOwnProperty.call(pointers, e.pointerId)) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (pinch && pointerCount2()) {
      var nd = pinchDist();
      if (pinch.d > 0 && nd > 0) setZoom(pinch.zoom * (pinch.d / nd));
      return;
    }
    if (!dragging) return;
    var dx = e.clientX - st.lastX;
    var dy = e.clientY - st.lastY;
    st.lastX = e.clientX;
    st.lastY = e.clientY;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
    yaw += dx * DRAG;
    pitch = clampPitch(pitch + dy * DRAG * 0.8);
    vYaw = dx * DRAG;
    vPitch = dy * DRAG * 0.8;
    paint();
  }

  function onUp(e) {
    if (!st) return;
    if (Object.prototype.hasOwnProperty.call(pointers, e.pointerId)) delete pointers[e.pointerId];
    try { st.canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    if (countPointers() === 0) {
      dragging = false;
      pinch = null;
      st.canvas.classList.remove('is-dragging');
      st.plane.classList.remove('dragging');
    } else if (countPointers() === 1) {          // 从双指回到单指：重建拖拽基准
      pinch = null;
      dragging = true;
      moved = true;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      vYaw = 0; vPitch = 0;
    }
  }

  function onClick(e) {
    // 发生过拖拽/捏合的那次 click 直接吞掉，避免「转完球顺手放大了一张照片」
    if (moved) {
      moved = false;
      e.stopPropagation();
      e.preventDefault();
    }
  }

  function onWheel(e) {
    if (!active || !st) return;
    e.preventDefault();
    var step = e.deltaY > 0 ? 1.08 : (1 / 1.08);
    setZoom(zoom * step);
  }

  function onKey(e) {
    if (!active || !st) return;
    var s = 0.12, hit = true;
    if (e.key === 'ArrowLeft') yaw -= s;
    else if (e.key === 'ArrowRight') yaw += s;
    else if (e.key === 'ArrowUp') pitch = clampPitch(pitch - s * 0.7);
    else if (e.key === 'ArrowDown') pitch = clampPitch(pitch + s * 0.7);
    else hit = false;
    if (!hit) return;
    e.preventDefault();
    vYaw = 0; vPitch = 0;
    paint();
  }

  function onEnter() { hover = true; }
  function onLeave() { hover = false; }

  function bind() {
    var c = st.canvas;
    c.addEventListener('pointerdown', onDown);
    c.addEventListener('pointermove', onMove);
    c.addEventListener('pointerup', onUp);
    c.addEventListener('pointercancel', onUp);
    c.addEventListener('click', onClick, true);
    c.addEventListener('wheel', onWheel, { passive: false });
    c.addEventListener('pointerenter', onEnter);
    c.addEventListener('pointerleave', onLeave);
    st.plane.addEventListener('keydown', onKey);

    var pending = false;
    var onResize = function () {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(function () {
        pending = false;
        relayout();
      });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    st.onResize = onResize;
    st.onKey = onKey;
  }

  function relayout() {
    if (!st || !active) return;
    var m = metrics(st.plane);
    if (m.vw < 2 || m.vh < 2) return;
    st.m = m;
    st.camera.aspect = m.vw / m.vh;
    st.camera.updateProjectionMatrix();
    st.camera.position.z = m.D * zoom;
    st.camera.updateMatrixWorld(true);
    st.renderer.setSize(m.vw, m.vh);
    sizeCells(m.W);
    place();
    paint();
  }

  /* ---------- 装卸 ---------- */

  function destroy() {
    stop();
    if (!st) return;
    var s = st;
    st = null;
    active = false;
    dragging = false;
    moved = false;
    pinch = null;
    pointers = {};
    hover = false;
    s.canvas.removeEventListener('pointerdown', onDown);
    s.canvas.removeEventListener('pointermove', onMove);
    s.canvas.removeEventListener('pointerup', onUp);
    s.canvas.removeEventListener('pointercancel', onUp);
    s.canvas.removeEventListener('click', onClick, true);
    s.canvas.removeEventListener('wheel', onWheel);
    s.canvas.removeEventListener('pointerenter', onEnter);
    s.canvas.removeEventListener('pointerleave', onLeave);
    s.plane.removeEventListener('keydown', onKey);
    if (s.onResize) {
      window.removeEventListener('resize', s.onResize);
      window.removeEventListener('orientationchange', s.onResize);
    }
    // 先把手里的卡片搬回 .g-plane（CSS3DObject 被移除时会连带删掉自己的 element）
    for (var i = 0; i < s.items.length; i++) {
      if (s.items[i].parentNode !== s.plane) s.plane.appendChild(s.items[i]);
    }
    s.plane.classList.remove('g3d-on');
    s.plane.classList.remove('dragging');
    for (i = s.objs.length - 1; i >= 0; i--) s.group.remove(s.objs[i]);
    // 兜底：卡片搬回二维后，包着它们的 .g3d-cell 空壳一并清掉。
    // 渲染器正常会随对象移除自行摘掉 element，但这里不依赖库的内部行为，
    // 否则反复开关会在 .g-plane 里堆积大量死节点。
    for (i = 0; i < s.cells.length; i++) {
      if (s.cells[i].parentNode === s.plane) s.plane.removeChild(s.cells[i]);
    }
    if (s.canvas.parentNode) s.canvas.parentNode.removeChild(s.canvas);
  }

  /* ---------- 对外接口 ---------- */

  var api = {
    available: available,
    isActive: function () { return !!(st && active); },

    mount: function (plane) {
      if (!available() || !plane) return false;
      if (st && st.plane === plane) {           // 已构建：仅恢复渲染
        active = true;
        relayout();
        start();
        return true;
      }
      if (st) destroy();
      var ok = false;
      try { ok = build(plane); } catch (err) { ok = false; }
      if (!ok) { try { destroy(); } catch (err2) {} return false; }
      active = true;
      relayout();
      paint();
      start();
      return true;
    },

    suspend: function () {
      active = false;
      stop();
      dragging = false;
      pinch = null;
      pointers = {};
      vYaw = 0; vPitch = 0;
      if (st) {
        st.canvas.classList.remove('is-dragging');
        st.plane.classList.remove('dragging');
      }
    },

    unmount: function () { destroy(); }
  };

  window.Gallery3D = api;
})();
