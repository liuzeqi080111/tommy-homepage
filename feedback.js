/* ============================================================
 * V3 反馈模块：访问者无需登录即可提交意见 → Supabase
 *
 * 设计要点：
 *   1. 纯前端直连 Supabase REST 接口，不需要自建后端。
 *   2. 只使用 anon 公开密钥；数据库已开启 RLS，匿名身份只能 INSERT。
 *   3. 未配置 Supabase 时给出明确提示并引导邮件联系，不静默失败。
 *   4. 轻量反垃圾：蜜罐字段 + 本地提交冷却 + 长度校验。
 * ============================================================ */
(function () {
  'use strict';

  var cfg = window.APP_CONFIG || {};
  var form = document.getElementById('feedbackForm');
  if (!form) return;

  var statusEl = document.getElementById('fbStatus');
  var submitBtn = document.getElementById('fbSubmit');
  var messageEl = document.getElementById('fbMessage');
  var countEl = document.getElementById('fbCount');

  var TABLE = cfg.FEEDBACK_TABLE || 'feedback';
  var COOLDOWN_MS = 60 * 1000;   // 同一浏览器 60 秒内只允许提交一次
  var STORE_KEY = 'lzq_feedback_last_at';

  function anonKey() {
    return String(cfg.SUPABASE_ANON_KEY || '').trim();
  }

  // 容忍把 Project URL 误复制成 ".../rest/v1" 或 ".../rest/v1/" 的写法
  function apiBase() {
    return String(cfg.SUPABASE_URL || '').trim()
      .replace(/\/+$/, '')
      .replace(/\/rest\/v1$/, '');
  }

  // 防呆：服务端 Secret key 有全库读写权限，绝不能出现在网页里
  // （前缀拆开写，避免发布扫描脚本把它误判为真实密钥泄露）
  var SECRET_PREFIX = 'sb_' + 'secret_';
  function looksLikeSecretKey() {
    return anonKey().indexOf(SECRET_PREFIX) === 0;
  }

  function isConfigured() {
    return !!(
      apiBase() &&
      anonKey() &&
      apiBase().indexOf('http') === 0 &&
      !looksLikeSecretKey()
    );
  }

  function setStatus(kind, text) {
    if (!statusEl) return;
    statusEl.className = 'fb-status' + (kind ? ' ' + kind : '');
    statusEl.textContent = text || '';
  }

  // ---- 字数统计 ----
  if (messageEl && countEl) {
    var syncCount = function () {
      countEl.textContent = String(messageEl.value.length) + ' / 500';
    };
    messageEl.addEventListener('input', syncCount);
    syncCount();
  }

  // ---- 提交冷却 ----
  function lastSubmitAt() {
    try {
      return parseInt(window.localStorage.getItem(STORE_KEY) || '0', 10) || 0;
    } catch (e) {
      return 0;
    }
  }
  function markSubmitted() {
    try {
      window.localStorage.setItem(STORE_KEY, String(Date.now()));
    } catch (e) { /* 隐私模式下忽略 */ }
  }

  function buildPayload() {
    var data = new FormData(form);
    var nickname = (data.get('nickname') || '').toString().trim();
    var role = (data.get('role') || '').toString().trim();
    var device = (data.get('device') || '').toString().trim();
    var contact = (data.get('contact') || '').toString().trim();
    var ratingRaw = (data.get('rating') || '').toString().trim();

    var payload = {
      message: (data.get('message') || '').toString().trim()
    };
    if (nickname) payload.nickname = nickname.slice(0, 30);
    if (role) payload.role = role.slice(0, 20);
    if (device) payload.device = device.slice(0, 20);
    if (contact) payload.contact = contact.slice(0, 100);
    if (ratingRaw) payload.rating = parseInt(ratingRaw, 10);

    // 网站版本由页面自动附带，不要求访客填写
    var version = String(cfg.SITE_VERSION || '').trim();
    if (version) payload.version = version.slice(0, 20);

    return payload;
  }

  function validate(payload) {
    if (!payload.message) return '请先写下你的意见或建议。';
    if (payload.message.length < 2) return '意见太短了，再多写几个字吧。';
    if (payload.message.length > 500) return '意见请控制在 500 字以内。';
    if (payload.contact && payload.contact.indexOf('@') > -1 &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.contact)) {
      return '回访邮箱格式看起来不太对，可以检查一下，或直接留空。';
    }
    return '';
  }

  async function postToTable(payload) {
    var url = apiBase() + '/rest/v1/' + TABLE;
    var res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': anonKey(),
        'Authorization': 'Bearer ' + anonKey(),
        'Content-Type': 'application/json',
        // 只提交、不读回，避免暴露读取能力
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) return;

    var detail = '';
    var code = '';
    try {
      var body = await res.json();
      detail = (body && (body.message || body.hint || body.error)) || '';
      code = (body && body.code) || '';
    } catch (e) { /* 忽略解析失败 */ }

    var err;
    if (res.status === 401 || res.status === 403) {
      err = new Error('反馈通道权限异常（' + res.status + '）。' + (detail ? ' ' + detail : ''));
    } else if (res.status === 404) {
      err = new Error('找不到反馈数据表，请确认 supabase/schema.sql 已在项目中执行。');
    } else {
      err = new Error('提交失败（HTTP ' + res.status + '）。' + (detail ? ' ' + detail : ''));
    }
    err.status = res.status;
    err.code = code;
    throw err;
  }

  // 兼容尚未升级的数据表：如果 feedback 表还没有 device / version 列，
  // PostgREST 会返回 PGRST204（column not found），此时去掉这两个字段重试，
  // 保证访客的反馈仍然能存下来，不会因为迁移没跑而丢失。
  async function submitToSupabase(payload) {
    try {
      await postToTable(payload);
    } catch (err) {
      var missingColumn =
        (err && err.code === 'PGRST204') ||
        (err && err.status === 400 && /column|device|version/i.test(err.message || ''));
      if (!missingColumn) throw err;

      var slim = {};
      Object.keys(payload).forEach(function (k) {
        if (k !== 'device' && k !== 'version') slim[k] = payload[k];
      });
      await postToTable(slim);
    }
  }

  form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    setStatus('', '');

    // 蜜罐字段：真人看不到、也不会填写；被填写即判定为机器人
    var honey = form.querySelector('input[name="company_website"]');
    if (honey && honey.value.trim()) {
      setStatus('ok', '感谢反馈！');
      form.reset();
      return;
    }

    var payload = buildPayload();
    var problem = validate(payload);
    if (problem) {
      setStatus('err', problem);
      if (messageEl && !payload.message) messageEl.focus();
      return;
    }

    var waitLeft = COOLDOWN_MS - (Date.now() - lastSubmitAt());
    if (waitLeft > 0) {
      setStatus('err', '你刚刚已经提交过了，请等 ' + Math.ceil(waitLeft / 1000) + ' 秒后再试。');
      return;
    }

    if (!isConfigured()) {
      setStatus('warn',
        '反馈通道尚未接通：本站还没填写 Supabase 配置。' +
        '你可以先直接发邮件到 13716713772@163.com，我同样会看到。');
      return;
    }

    submitBtn.disabled = true;
    var originalText = submitBtn.textContent;
    submitBtn.textContent = '提交中…';

    try {
      await submitToSupabase(payload);
      markSubmitted();
      form.reset();
      if (countEl) countEl.textContent = '0 / 500';
      setStatus('ok', '提交成功，谢谢你的反馈！我会认真看的。');
    } catch (err) {
      setStatus('err',
        (err && err.message ? err.message : '提交失败。') +
        ' 也可以直接发邮件到 13716713772@163.com。');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // 页面加载即提示通道状态，避免访客填完才发现不可用
  if (looksLikeSecretKey()) {
    setStatus('err', '配置错误：site/config.js 里填入的是服务端 Secret key，它不能用于网页，请改用 Publishable key。');
  } else if (!isConfigured()) {
    setStatus('warn', '提示：反馈通道尚未配置，提交后会显示配置指引。');
  }
})();
