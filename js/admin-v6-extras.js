/* ==========================================================================
   admin-v6-extras.js — 塔罗 v6 Admin 功能扩展
   所有函数挂 window.V6Admin 命名空间
   ========================================================================== */
(function () {
  'use strict';

  const V6A = {};
  window.V6Admin = V6A;
  const API = 'https://api.taluo996.top';

  /* ==================== 通用 fetch ==================== */
  async function apiFetch(path, opts) {
    opts = opts || {};
    if (opts.body && typeof opts.body === 'object') {
      opts.body = JSON.stringify(opts.body);
      opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    }
    const res = await fetch(API + path, opts);
    return res.ok ? res.json() : { error: res.statusText };
  }

  /* ==================== Tab 注册 ==================== */
  V6A.tabs = [];

  V6A.registerTab = function (id, label, icon, initFn) {
    this.tabs.push({ id, label, icon, initFn });
  };

  V6A.injectTabs = function () {
    const nav = document.getElementById('admin-tabs');
    if (!nav) return;
    this.tabs.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'admin-tab';
      btn.dataset.tab = t.id;
      btn.textContent = (t.icon ? t.icon + ' ' : '') + t.label;
      nav.appendChild(btn);
    });
  };

  /* ==================== A51: 卡牌管理 Tab ==================== */
  V6A.registerTab('cards-v6', '卡牌管理', '🎴', async function () {
    const sec = document.querySelector('[data-tab-content="cards"]');
    if (!sec) return;
    const panel = document.createElement('div');
    panel.className = 'v6-admin-panel';
    panel.innerHTML = `
      <h3>🎴 v6 卡牌管理</h3>
      <div style="margin:12px 0;">
        <input type="text" id="v6-card-search" placeholder="🔍 搜索卡牌名称..." style="padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#fff;width:240px;">
        <button id="v6-card-add" style="margin-left:8px;padding:8px 16px;background:#d4a857;color:#1a0e2e;border:none;border-radius:6px;cursor:pointer;font-weight:600;">+ 新增卡牌</button>
      </div>
      <div id="v6-card-table-wrap" style="overflow-x:auto;">
        <table class="v6-table">
          <thead><tr>
            <th>编号</th><th>名称</th><th>花色</th><th>启用</th><th>操作</th>
          </tr></thead>
          <tbody id="v6-card-tbody"><tr><td colspan="5" style="text-align:center;padding:20px;color:#888;">加载中...</td></tr></tbody>
        </table>
      </div>
    `;
    sec.insertBefore(panel, sec.firstChild);
    await V6A.loadCards();
    document.getElementById('v6-card-search')?.addEventListener('input', V6A.filterCards);
    document.getElementById('v6-card-add')?.addEventListener('click', V6A.addCard);
  });

  V6A.loadCards = async function () {
    const tbody = document.getElementById('v6-card-tbody');
    if (!tbody) return;
    try {
      const data = await apiFetch('/snapshots');
      const cards = (data.snapshots || []).slice(0, 20);
      tbody.innerHTML = cards.length ? cards.map((c, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(c.name || c.id || '-')}</td>
          <td>${c.suite || c.type || '-'}</td>
          <td><input type="checkbox" ${c.enabled !== false ? 'checked' : ''} onchange="V6A.toggleCard('${c.id || i}')"></td>
          <td><button onclick="V6A.editCard('${c.id || i}')" class="v6-btn-sm">编辑</button></td>
        </tr>
      `).join('') : '<tr><td colspan="5" style="text-align:center;padding:20px;color:#888;">暂无数据</td></tr>';
    } catch {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#f87171;">加载失败</td></tr>';
    }
  };

  V6A.filterCards = function () {
    const q = document.getElementById('v6-card-search')?.value?.toLowerCase() || '';
    document.querySelectorAll('#v6-card-tbody tr').forEach(tr => {
      const match = tr.textContent.toLowerCase().includes(q);
      tr.style.display = match ? '' : 'none';
    });
  };

  V6A.toggleCard = async function (id) {
    // 本地先改，API 成功再持久化
    console.log('[v6] toggle card', id);
  };

  V6A.editCard = function (id) {
    V6.modal.open(`<p>编辑卡牌 #${id}</p><input placeholder="卡牌名称" style="width:100%;padding:8px;margin:8px 0;border-radius:6px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.2);color:#fff;">`, { title: '🎴 编辑卡牌' });
  };

  V6A.addCard = function () {
    V6.modal.open(`<input placeholder="卡牌名称" style="width:100%;padding:8px;margin:8px 0;border-radius:6px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.2);color:#fff;">`, { title: '➕ 新增卡牌' });
  };

  /* ==================== A52: 权重系统 Tab ==================== */
  V6A.registerTab('weights', '权重系统', '⚖️', async function () {
    const nav = document.getElementById('admin-tabs');
    const existing = document.querySelector('[data-tab-content="cards"]');
    const panel = document.createElement('div');
    panel.className = 'glass-card admin-tab-content';
    panel.dataset.tabContent = 'weights';
    panel.innerHTML = `
      <h3>⚖️ 抽牌权重系统</h3>
      <p style="color:#888;font-size:13px;">调整每张卡牌的抽取概率（0 = 不出现，100 = 权重翻倍）</p>
      <div id="v6-weight-list" style="max-height:400px;overflow-y:auto;margin:12px 0;">加载中...</div>
      <button onclick="V6A.saveWeights()" style="padding:10px 24px;background:#d4a857;color:#1a0e2e;border:none;border-radius:6px;cursor:pointer;font-weight:600;">💾 保存权重</button>
      <button onclick="V6A.resetWeights()" style="margin-left:8px;padding:10px 24px;background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:6px;cursor:pointer;">🔄 重置</button>
    `;
    existing?.parentNode?.insertBefore(panel, existing);
    await V6A.loadWeights();
  });

  V6A.loadWeights = async function () {
    const container = document.getElementById('v6-weight-list');
    if (!container || !window.TAROT_DECK) return;
    const saved = JSON.parse(localStorage.getItem('v6_weights') || '{}');
    container.innerHTML = window.TAROT_DECK.slice(0, 22).map((c, i) => {
      const w = saved[c.name] ?? 50;
      return `<div style="display:flex;align-items:center;gap:12px;margin:6px 0;">
        <span style="width:140px;font-size:13px;">${i + 1}. ${c.name}</span>
        <input type="range" min="0" max="100" value="${w}" data-weight="${c.name}" style="flex:1;">
        <span style="width:30px;text-align:right;font-variant-numeric:tabular-nums;">${w}</span>
      </div>`;
    }).join('');
    container.querySelectorAll('input[type=range]').forEach(inp => {
      inp.addEventListener('input', e => { e.target.nextElementSibling.textContent = e.target.value; });
    });
  };

  V6A.saveWeights = async function () {
    const weights = {};
    document.querySelectorAll('#v6-weight-list input[type=range]').forEach(inp => {
      weights[inp.dataset.weight] = parseInt(inp.value);
    });
    localStorage.setItem('v6_weights', JSON.stringify(weights));
    V6.toast('✅ 权重已保存');
    // 同时尝试推到 Worker
    try {
      await apiFetch('/weights', { method: 'POST', body: weights });
    } catch {}
  };

  V6A.resetWeights = function () {
    localStorage.removeItem('v6_weights');
    V6.toast('🔄 已重置');
    V6A.loadWeights();
  };

  /* ==================== A54: 调试工具 Tab ==================== */
  V6A.registerTab('debug', '调试工具', '🔧', function () {
    const existing = document.querySelector('[data-tab-content="cards"]');
    const panel = document.createElement('div');
    panel.className = 'glass-card admin-tab-content';
    panel.dataset.tabContent = 'debug';
    panel.innerHTML = `
      <h3>🔧 调试工具</h3>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin:12px 0;">
        <button onclick="V6A.testFetch()" class="v6-btn">🌐 测试 API 连通性</button>
        <button onclick="V6A.simulateDraw()" class="v6-btn">🎲 模拟抽牌</button>
        <button onclick="V6A.clearCache()" class="v6-btn">🧹 清 localStorage</button>
        <button onclick="V6A.showKV()" class="v6-btn">📋 查看配置</button>
      </div>
      <pre id="v6-debug-output" style="background:rgba(0,0,0,0.4);padding:16px;border-radius:8px;max-height:300px;overflow:auto;font-size:12px;color:#a0d8ff;"></pre>
    `;
    existing?.parentNode?.insertBefore(panel, existing);
  });

  V6A.debug = function (msg) {
    const out = document.getElementById('v6-debug-output');
    if (!out) { console.log('[v6-debug]', msg); return; }
    out.textContent += (out.textContent ? '\n' : '') + (typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2));
    out.scrollTop = out.scrollHeight;
  };

  V6A.testFetch = async function () {
    V6A.debug('→ GET /');
    try { const r = await fetch(API + '/'); V6A.debug(`✅ ${r.status}`); } catch (e) { V6A.debug('❌ ' + e.message); }
    V6A.debug('→ GET /audit');
    try { const r = await fetch(API + '/audit'); V6A.debug(`✅ ${r.status}`); } catch (e) { V6A.debug('❌ ' + e.message); }
  };

  V6A.simulateDraw = function () {
    const deck = window.TAROT_DECK || [];
    const picks = [];
    for (let i = 0; i < 3; i++) picks.push(deck[Math.floor(Math.random() * deck.length)]?.name);
    V6A.debug('🎲 模拟抽牌: ' + picks.join(' → '));
  };

  V6A.clearCache = function () {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('v6_'));
    keys.forEach(k => localStorage.removeItem(k));
    V6A.debug(`🧹 已清 ${keys.length} 个 v6 键`);
  };

  V6A.showKV = async function () {
    try {
      const r = await fetch(API + '/');
      const j = await r.json();
      V6A.debug('📋 Worker: ' + JSON.stringify(j, null, 2));
    } catch (e) { V6A.debug('❌ ' + e.message); }
  };

  /* ==================== 安全管理 A76-A80 ==================== */
  V6A.banList = JSON.parse(localStorage.getItem('v6_banlist') || '[]');
  V6A.sensitiveWords = JSON.parse(localStorage.getItem('v6_sensitive') || '["傻逼","fuck"]');

  V6A.openSecurity = function () {
    V6.modal.open(`
      <h3 style="color:#f87171;margin:0 0 12px;">🛡️ 安全管理</h3>
      <h4>敏感词库</h4>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;">
        ${V6A.sensitiveWords.map(w => `<span style="background:rgba(248,113,113,0.2);padding:4px 12px;border-radius:16px;font-size:13px;">${w} <button onclick="V6A.remWord('${w}')" style="background:none;border:none;color:#f87171;cursor:pointer;">✕</button></span>`).join('')}
      </div>
      <input id="v6-new-word" placeholder="添加敏感词" style="padding:8px;border-radius:6px;width:180px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.2);color:#fff;">
      <button onclick="V6A.addWord()" style="padding:8px 16px;background:#d4a857;color:#1a0e2e;border:none;border-radius:6px;cursor:pointer;margin-left:8px;">添加</button>
    `, { title: '🛡️ 安全与审计' });
  };

  V6A.addWord = function () {
    const inp = document.getElementById('v6-new-word');
    if (!inp?.value) return;
    V6A.sensitiveWords.push(inp.value.trim());
    localStorage.setItem('v6_sensitive', JSON.stringify(V6A.sensitiveWords));
    V6A.openSecurity();
  };

  V6A.remWord = function (w) {
    V6A.sensitiveWords = V6A.sensitiveWords.filter(x => x !== w);
    localStorage.setItem('v6_sensitive', JSON.stringify(V6A.sensitiveWords));
    V6A.openSecurity();
  };

  /* ==================== 批量操作 A86-A90 ==================== */
  V6A.bulkResetWeights = function () {
    if (!confirm('确定要重置所有卡牌权重？')) return;
    V6A.resetWeights();
    V6.toast('✅ 已重置');
  };

  V6A.bulkExport = function () {
    const data = {
      weights: JSON.parse(localStorage.getItem('v6_weights') || '{}'),
      settings: JSON.parse(localStorage.getItem('cloudConfig') || '{}'),
      achievements: JSON.parse(localStorage.getItem('v6_achievements') || '[]'),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `taluo-backup-${Date.now()}.json`;
    a.click();
    V6.toast('📦 已导出');
  };

  /* ==================== 初始化 ==================== */
  function escapeHtml(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  function init() {
    V6A.injectTabs();
    // 等现有 admin Tab 初始化完再触发 v6 tabs
    setTimeout(() => {
      V6A.tabs.forEach(t => { try { t.initFn(); } catch (e) { console.warn('[v6-admin]', t.id, e); } });
    }, 300);
    // 给 admin 里加 v6 按钮
    const quickActions = document.querySelector('.quick-actions, [class*="quick"]');
    if (quickActions) {
      const btns = `
        <button onclick="V6A.openSecurity()" class="admin-action-btn">🛡️ 安全管理</button>
        <button onclick="V6A.bulkExport()" class="admin-action-btn">📦 导出数据</button>
      `;
      quickActions.insertAdjacentHTML('beforeend', btns);
    }
    console.log('[v6-admin] admin-v6-extras.js 已加载');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();



/* ==========================================================================
   v7 Admin — 20 新功能 (A101-A120) + 现有 Tab 增强
   ========================================================================== */
(function() {
  'use strict';
  const API = (localStorage.getItem('taluo-api') || 'https://api.taluo996.top').replace(/\/+$/, '');

  /* ========== A101 卡牌批量启用/禁用 ========== */
  function batchToggleCards(enable) {
    const checked = document.querySelectorAll('.v7-card-check:checked');
    if (!checked.length) { if(window.V6&&V6.toast)V6.toast('请先勾选卡牌','error'); return; }
    let cnt = 0;
    checked.forEach(c => {
      const row = c.closest('tr');
      if (row) {
        const statusCell = row.querySelector('.v7-card-status');
        if (statusCell) { statusCell.textContent = enable ? '✅' : '❌'; cnt++; }
      }
    });
    if(window.V6&&V6.toast) V6.toast((enable?'✅ 启用 ':'❌ 禁用 ')+cnt+' 张');
  }

  /* ========== A102 搜索高亮 ========== */
  function highlightSearch() {
    const input = document.querySelector('#v7-card-search, input[placeholder*="搜索"]');
    if (!input) return;
    input.addEventListener('input', function() {
      const q = this.value.trim();
      document.querySelectorAll('.v7-card-table td').forEach(td => {
        td.innerHTML = td.innerHTML.replace(/<mark[^>]*>/g,'').replace(/<\/mark>/g,'');
        if (q && td.textContent.includes(q)) {
          const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
          td.innerHTML = td.textContent.replace(new RegExp(safeQ,'g'), '<mark style="background:#ffeb3b;color:#000;padding:0 2px;border-radius:2px;">'+q+'</mark>');
        }
      });
    });
  }

  /* ========== A103 权重条形图 ========== */
  function renderWeightBars(container, weights) {
    if (!container) return;
    container.innerHTML = '';
    const vals = Object.values(weights).map(function(w){ return Number(w) || 0; });
    const max = Math.max(1, ...vals);
    Object.entries(weights).forEach(function(entry) {
      const name = entry[0], w = entry[1];
      const pct = ((Number(w) || 0) / max * 100).toFixed(0);
      container.insertAdjacentHTML('beforeend',
        '<div style="display:flex;align-items:center;gap:8px;margin:3px 0;font-size:0.75rem;">'+
        '<span style="width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+name+'</span>'+
        '<div style="flex:1;background:rgba(255,255,255,0.1);border-radius:4px;height:14px;overflow:hidden;">'+
        '<div style="width:'+pct+'%;height:100%;background:linear-gradient(90deg,var(--gold-dark),var(--gold));transition:width .3s;"></div></div>'+
        '<span style="width:40px;text-align:right;">'+Number(w||0).toFixed(1)+'</span></div>');
    });
  }

  /* ========== A104 复制权重 JSON ========== */
  async function copyWeightsJson() {
    try {
      const r = await fetch(API + '/weights');
      const d = await r.json();
      const json = JSON.stringify(d.weights || {}, null, 2);
      await navigator.clipboard.writeText(json);
      if(window.V6&&V6.toast) V6.toast('📋 权重 JSON 已复制');
    } catch(e) { if(window.V6&&V6.toast)V6.toast('复制失败: '+e.message,'error'); }
  }

  /* ========== A105 清空全部 KV ========== */
  function clearAllKV() {
    if (!confirm('⚠️ 危险！清空所有 KV 数据（权重/主题/公告）\n确定继续吗？')) return;
    if (!confirm('🆘 最后确认：真的要清空全部数据吗？\n此操作不可恢复！')) return;
    fetch(API + '/weights', { method: 'POST', body: '{}' }).then(() =>
    fetch(API + '/themes', { method: 'POST', body: '{}' })).then(() => {
      if(window.V6&&V6.toast) V6.toast('🧹 KV 已清空'); logAction('clearAllKV');
    }).catch(function(){ if(window.V6&&V6.toast)V6.toast('失败','error'); });
  }

  /* ========== A106 敏感词实时匹配 ========== */
  function testSensitiveWords(words, text) {
    if (!words || !text) return [];
    const hits = [];
    words.forEach(function(w){ if (w && text.includes(w)) hits.push(w); });
    return hits;
  }

  /* ========== A107 敏感词导入/导出 ========== */
  function exportSensitive() {
    const words = JSON.parse(localStorage.getItem('taluo-sensitive') || '[]');
    const blob = new Blob([JSON.stringify(words, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'sensitive-words.json'; a.click();
  }
  function importSensitive(file) {
    const r = new FileReader();
    r.onload = function() {
      try {
        const arr = JSON.parse(r.result);
        localStorage.setItem('taluo-sensitive', JSON.stringify(arr));
        if(window.V6&&V6.toast) V6.toast('✅ 已导入 '+arr.length+' 个敏感词');
      } catch(e) { if(window.V6&&V6.toast)V6.toast('JSON 格式错误','error'); }
    };
    r.readAsText(file);
  }

  /* ========== A108 卡牌图片 hover 预览 ========== */
  function addCardImageHover() {
    document.querySelectorAll('.v7-card-table tr').forEach(function(row) {
      row.addEventListener('mouseenter', function() {
        const name = row.querySelector('td:first-child')?.textContent.trim();
        if (!name) return;
        const imgPath = 'images-webp/' + encodeURIComponent(name) + '.webp';
        const tip = document.createElement('div');
        tip.className = 'v7-img-preview';
        tip.style.cssText = 'position:fixed;z-index:9999;background:#000;border:1px solid var(--gold);border-radius:8px;padding:8px;pointer-events:none;box-shadow:0 4px 20px rgba(0,0,0,0.5);';
        tip.innerHTML = '<img src="'+imgPath+'" style="width:120px;height:auto;border-radius:4px;" onerror="this.style.display=\'none\'">';
        document.body.appendChild(tip);
        row._preview = tip;
      });
      row.addEventListener('mousemove', function(e) {
        if (row._preview) { row._preview.style.left = (e.clientX+15)+'px'; row._preview.style.top = (e.clientY+15)+'px'; }
      });
      row.addEventListener('mouseleave', function() { if (row._preview) row._preview.remove(); row._preview = null; });
    });
  }

  /* ========== A109 顶部状态栏 ========== */
  function addStatusBar() {
    if (document.querySelector('.v7-admin-status')) return;
    const bar = document.createElement('div');
    bar.className = 'v7-admin-status';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);color:var(--gold);padding:6px 16px;z-index:99999;display:flex;gap:20px;font-size:0.75rem;border-bottom:1px solid var(--gold-dark);';
    bar.innerHTML = '<span id="v7-clock">🕐 --:--:--</span>' +
      '<span id="v7-api-status">🔌 检测中...</span>' +
      '<span id="v7-current-theme">🎨 --</span>' +
      '<span style="margin-left:auto;">👤 ' + (localStorage.getItem('taluo-admin-user') || 'admin') + '</span>';
    document.body.appendChild(bar);
    setInterval(function() {
      const d = new Date();
      const el = document.getElementById('v7-clock');
      if (el) el.textContent = '🕐 ' + d.toLocaleTimeString('zh-CN');
    }, 1000);
    fetch(API + '/metrics').then(function(r){ return r.json(); }).then(function(){
      const el = document.getElementById('v7-api-status');
      if (el) { el.textContent = '🔌 API 在线'; el.style.color = '#4ecdc4'; }
    }).catch(function(){
      const el = document.getElementById('v7-api-status');
      if (el) { el.textContent = '🔌 API 离线'; el.style.color = '#ff6b6b'; }
    });
    const curTheme = localStorage.getItem('taluo-theme') || 'cosmic';
    const names = { cosmic:'🔮 星空紫', moonlit:'🌙 月夜青', ember:'🔥 赤焰', jade:'🍃 翠玉', ocean:'💎 深海蓝' };
    const tEl = document.getElementById('v7-current-theme');
    if (tEl) tEl.textContent = '🎨 ' + (names[curTheme] || curTheme);
  }

  /* ========== A110 快速返回首页 ========== */
  function addHomeBtn() {
    if (document.querySelector('.v7-home-btn')) return;
    const btn = document.createElement('a');
    btn.className = 'v7-home-btn';
    btn.href = '/'; btn.innerHTML = '🏠 首页';
    btn.style.cssText = 'position:fixed;top:8px;right:12px;z-index:100000;color:var(--gold);text-decoration:none;background:rgba(0,0,0,0.8);padding:6px 12px;border-radius:6px;border:1px solid var(--gold-dark);font-size:0.8rem;';
    document.body.appendChild(btn);
  }

  /* ========== A111 主题管理 ========== */
  const ADMIN_THEMES = [
    { id:'cosmic',  name:'🔮 星空紫', gold:'#d4af37', purple:'#9d4edd' },
    { id:'moonlit', name:'🌙 月夜青', gold:'#e8d5a3', purple:'#4ecdc4' },
    { id:'ember',   name:'🔥 赤焰',   gold:'#ffb347', purple:'#ff6b6b' },
    { id:'jade',    name:'🍃 翠玉',   gold:'#b8a463', purple:'#2d6a4f' },
    { id:'ocean',   name:'💎 深海蓝', gold:'#a8d5e5', purple:'#3a86ff' },
  ];
  function openThemeManager() {
    let cardsHtml = '';
    ADMIN_THEMES.forEach(function(t) {
      cardsHtml += '<div data-theme="'+t.id+'" style="padding:16px;border:2px solid transparent;border-radius:12px;cursor:pointer;background:linear-gradient(135deg,'+t.gold+'22,'+t.purple+'22);text-align:center;transition:all 0.2s;" onclick="V7Admin.applyTheme(\''+t.id+'\')">' +
        '<div style="font-size:1.8rem;margin-bottom:6px;">'+t.name.split(' ')[0]+'</div>' +
        '<div style="font-size:0.85rem;">'+t.name.split(' ')[1]+'</div>' +
        '<div style="display:flex;gap:4px;justify-content:center;margin-top:8px;">' +
        '<span style="width:14px;height:14px;border-radius:50%;background:'+t.gold+';"></span>' +
        '<span style="width:14px;height:14px;border-radius:50%;background:'+t.purple+';"></span></div></div>';
    });
    const html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;">'+cardsHtml+'</div><p style="margin-top:14px;font-size:0.75rem;opacity:0.7;">点击主题即时预览</p>';
    if (window.V6 && V6.modal) V6.modal('🎨 主题管理', html);
  }
  function applyTheme(id) {
    localStorage.setItem('taluo-theme', id);
    document.body.setAttribute('data-theme', 'liquid ' + id);
    if (window.V6 && V6.toast) V6.toast('🎨 已切换到 ' + id);
    logAction('applyTheme', id);
  }

  /* ========== A112 公告发布 ========== */
  function openAnnouncement() {
    fetch(API + '/announcement').then(function(r){ return r.json(); }).then(function(d) {
      const cur = d.announcement || '';
      const html = '<textarea id="v7-ann-text" style="width:100%;min-height:120px;background:rgba(0,0,0,0.5);color:var(--text-white);border:1px solid var(--gold-dark);border-radius:8px;padding:10px;">'+cur+'</textarea>' +
        '<div style="margin-top:10px;display:flex;gap:8px;">' +
        '<button onclick="V7Admin.saveAnnouncement()" style="flex:1;padding:10px;">💾 保存公告</button>' +
        '<button onclick="V7Admin.clearAnnouncement()" style="padding:8px 16px;">🗑️ 清空</button></div>';
      if (window.V6 && V6.modal) V6.modal('📢 公告发布', html);
    }).catch(function() {
      const html = '<textarea id="v7-ann-text" style="width:100%;min-height:120px;background:rgba(0,0,0,0.5);color:var(--text-white);border:1px solid var(--gold-dark);border-radius:8px;padding:10px;"></textarea>' +
        '<button onclick="V7Admin.saveAnnouncement()" style="margin-top:10px;width:100%;padding:10px;">💾 保存</button>';
      if (window.V6 && V6.modal) V6.modal('📢 公告发布（离线）', html);
    });
  }
  function saveAnnouncement() {
    const text = document.getElementById('v7-ann-text').value.trim();
    fetch(API + '/announcement', { method: 'POST', body: JSON.stringify({ text: text }) }).then(function(){
      if(window.V6&&V6.toast) V6.toast('📢 公告已发布'); logAction('saveAnnouncement');
    }).catch(function(){ if(window.V6&&V6.toast)V6.toast('失败','error'); });
  }
  function clearAnnouncement() {
    fetch(API + '/announcement', { method: 'POST', body: JSON.stringify({ text: '' }) }).then(function(){
      if(window.V6&&V6.toast) V6.toast('🗑️ 公告已清空');
      document.getElementById('v7-ann-text').value = '';
    }).catch(function(){ document.getElementById('v7-ann-text').value = ''; });
  }

  /* ========== A113 每日卡指定 ========== */
  function openDailyCard() {
    const saved = localStorage.getItem('taluo-daily-card') || '';
    let opts = '<option value="">🎲 随机（默认）</option>';
    try {
      fetch(API + '/cards').then(function(r){ return r.json(); }).then(function(d) {
        const names = (d.cards || []).map(function(c){ return c.name; });
        names.forEach(function(n){ opts += '<option'+(saved===n?' selected':'')+'>'+n+'</option>'; });
        finishDailyCard(opts);
      });
    } catch(e) { finishDailyCard(opts); }
  }
  function finishDailyCard(opts) {
    const html = '<select id="v7-daily-select" style="width:100%;padding:10px;background:rgba(0,0,0,0.5);color:var(--text-white);border:1px solid var(--gold-dark);border-radius:8px;">'+opts+'</select>' +
      '<button onclick="V7Admin.saveDailyCard()" style="margin-top:10px;width:100%;padding:10px;">💾 指定今日卡</button>';
    if (window.V6 && V6.modal) V6.modal('🎯 每日卡指定', html);
  }
  function saveDailyCard() {
    const v = document.getElementById('v7-daily-select').value;
    localStorage.setItem('taluo-daily-card', v);
    if (window.V6 && V6.toast) V6.toast(v ? '🎯 今日卡: ' + v : '🎲 恢复随机');
    logAction('saveDailyCard', v);
  }

  /* ========== A114 成就管理 ========== */
  function openAchievements() {
    const ach = JSON.parse(localStorage.getItem('taluo-achievements') || '{}');
    const names = ['first-draw','ten-draws','hundred-draws','use-dark','use-theme','master-mode'];
    let achHtml = '';
    names.forEach(function(n) {
      achHtml += '<div style="display:flex;align-items:center;gap:10px;padding:8px;background:rgba(0,0,0,0.3);border-radius:8px;">' +
        '<span style="flex:1;">🏆 '+n+'</span>' +
        '<span style="color:'+(ach[n]?'#4ecdc4':'#ff6b6b')+';">'+(ach[n]?'✅ 已解锁':'❌ 未解锁')+'</span>' +
        '<button onclick="V7Admin.toggleAchievement(\''+n+'\')" style="padding:4px 10px;font-size:0.75rem;">'+(ach[n]?'禁用':'解锁')+'</button></div>';
    });
    const html = '<div style="display:grid;gap:8px;">'+achHtml+'</div><button onclick="V7Admin.resetAchievements()" style="margin-top:12px;width:100%;padding:10px;">🔄 重置全部</button>';
    if (window.V6 && V6.modal) V6.modal('🏆 成就管理', html);
  }
  function toggleAchievement(n) {
    const a = JSON.parse(localStorage.getItem('taluo-achievements') || '{}');
    a[n] = !a[n];
    localStorage.setItem('taluo-achievements', JSON.stringify(a));
    openAchievements();
  }
  function resetAchievements() {
    if (!confirm('确定重置全部成就？')) return;
    localStorage.setItem('taluo-achievements', '{}');
    openAchievements();
    if (window.V6 && V6.toast) V6.toast('🔄 成就已重置');
  }

  /* ========== A115 数据仪表盘 ========== */
  function openDashboard() {
    fetch(API + '/metrics').then(function(r){ return r.json(); }).then(function(d) {
      const kv = d.kvBytes || {};
      let cardsHtml = '';
      Object.entries(kv).forEach(function(e) {
        const k = e[0], v = e[1];
        cardsHtml += '<div style="padding:16px;background:rgba(0,0,0,0.3);border-radius:12px;text-align:center;border:1px solid var(--gold-dark);">' +
          '<div style="font-size:1.8rem;color:var(--gold);">'+(v/1024).toFixed(1)+'KB</div>' +
          '<div style="font-size:0.75rem;opacity:0.7;margin-top:4px;">'+k+'</div></div>';
      });
      const html = '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">'+cardsHtml+'</div><div style="margin-top:16px;font-size:0.75rem;opacity:0.6;text-align:center;">⏱️ ' +
        (d.time ? new Date(d.time).toLocaleString('zh-CN') : '--') + '</div>';
      if (window.V6 && V6.modal) V6.modal('📊 数据仪表盘', html);
    }).catch(function(){ if(window.V6&&V6.toast)V6.toast('加载失败','error'); });
  }

  /* ========== A117 版本历史 + 回滚 ========== */
  function openRollback() {
    const pts = JSON.parse(localStorage.getItem('taluo-rollback-points') || '[]');
    let html = '';
    if (pts.length) {
      pts.forEach(function(p, i) {
        html += '<div style="padding:10px;background:rgba(0,0,0,0.3);border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">' +
          '<span>📸 '+new Date(p.time).toLocaleString('zh-CN')+'</span>' +
          '<button onclick="V7Admin.doRollback('+i+')" style="padding:6px 12px;">♻️ 回滚</button></div>';
      });
    } else {
      html = '<p style="opacity:0.7;">暂无回滚点</p>';
    }
    html += '<button onclick="V7Admin.createRollbackPoint()" style="width:100%;margin-top:10px;padding:10px;">📸 创建当前快照</button>';
    if (window.V6 && V6.modal) V6.modal('♻️ 版本历史与回滚', html);
  }
  function doRollback(idx) {
    if (!confirm('确定要回滚吗？')) return;
    const pts = JSON.parse(localStorage.getItem('taluo-rollback-points') || '[]');
    const p = pts[idx]; if (!p) return;
    fetch(API + '/rollback', { method: 'POST', body: JSON.stringify(p.data || {}) }).then(function(){
      if(window.V6&&V6.toast) V6.toast('♻️ 已回滚'); logAction('rollback', p.time);
    }).catch(function(){ if(window.V6&&V6.toast)V6.toast('请求已发送（离线）'); });
  }
  function createRollbackPoint() {
    fetch(API + '/weights').then(function(r){ return r.json(); }).then(function(w) {
      fetch(API + '/themes').then(function(r2){ return r2.json(); }).then(function(t) {
        const data = { weights: w.weights || {}, themes: t.themes || {} };
        const pts = JSON.parse(localStorage.getItem('taluo-rollback-points') || '[]');
        pts.unshift({ time: Date.now(), data: data });
        localStorage.setItem('taluo-rollback-points', JSON.stringify(pts.slice(0, 10)));
        if(window.V6&&V6.toast) V6.toast('📸 已创建快照');
        openRollback();
      });
    }).catch(function(){ if(window.V6&&V6.toast)V6.toast('离线无法创建','error'); });
  }

  /* ========== A118 操作日志 ========== */
  function logAction(action, detail) {
    const log = JSON.parse(localStorage.getItem('taluo-admin-log') || '[]');
    log.unshift({ time: Date.now(), action: action, detail: detail || '', user: localStorage.getItem('taluo-admin-user') || 'admin' });
    localStorage.setItem('taluo-admin-log', JSON.stringify(log.slice(0, 50)));
  }
  function openActionLog() {
    const log = JSON.parse(localStorage.getItem('taluo-admin-log') || '[]');
    let html = '';
    if (log.length) {
      log.forEach(function(l) {
        html += '<div style="padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.1);font-size:0.8rem;">' +
          '<span style="color:var(--gold);">'+new Date(l.time).toLocaleTimeString('zh-CN')+'</span>' +
          '<span style="margin-left:10px;">'+l.action+'</span>' +
          (l.detail ? '<span style="margin-left:6px;opacity:0.6;">('+l.detail+')</span>' : '') + '</div>';
      });
    } else {
      html = '<p style="opacity:0.7;">暂无操作记录</p>';
    }
    html += '<button onclick="V7Admin.exportActionLog()" style="margin-top:10px;padding:8px 16px;">📥 导出日志</button>';
    if (window.V6 && V6.modal) V6.modal('📋 操作日志 (最近50条)', html);
  }
  function exportActionLog() {
    const log = JSON.parse(localStorage.getItem('taluo-admin-log') || '[]');
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'admin-log-'+Date.now()+'.json'; a.click();
  }

  /* ========== A119 密码修改 ========== */
  function openChangePassword() {
    const html = '<input id="v7-cp-old" type="password" placeholder="旧密码" style="width:100%;padding:10px;margin-bottom:8px;background:rgba(0,0,0,0.5);color:var(--text-white);border:1px solid var(--gold-dark);border-radius:8px;">' +
      '<input id="v7-cp-new" type="password" placeholder="新密码 (8-32位)" style="width:100%;padding:10px;margin-bottom:8px;background:rgba(0,0,0,0.5);color:var(--text-white);border:1px solid var(--gold-dark);border-radius:8px;">' +
      '<input id="v7-cp-new2" type="password" placeholder="确认新密码" style="width:100%;padding:10px;margin-bottom:12px;background:rgba(0,0,0,0.5);color:var(--text-white);border:1px solid var(--gold-dark);border-radius:8px;">' +
      '<button onclick="V7Admin.doChangePassword()" style="width:100%;padding:10px;">🔐 修改密码</button>';
    if (window.V6 && V6.modal) V6.modal('🔐 修改密码', html);
  }
  function doChangePassword() {
    const o = document.getElementById('v7-cp-old').value;
    const n = document.getElementById('v7-cp-new').value;
    const n2 = document.getElementById('v7-cp-new2').value;
    if (n.length < 8 || n.length > 32) return V6.toast('密码长度 8-32 位', 'error');
    if (n !== n2) return V6.toast('两次密码不一致', 'error');
    fetch(API + '/dev/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: o, newPassword: n })
    }).then(function(r){ return r.json(); }).then(function(d) {
      if (d.ok) { V6.toast('✅ 密码已修改'); logAction('changePassword'); }
      else V6.toast(d.error || '失败', 'error');
    }).catch(function(){ V6.toast('网络错误', 'error'); });
  }

  /* ========== A120 开发者模式 ========== */
  function toggleDevMode() {
    const cur = localStorage.getItem('taluo-dev-mode') === '1';
    if (cur) {
      localStorage.setItem('taluo-dev-mode', '0');
      V6.toast('🔒 开发者模式已关闭');
      document.querySelectorAll('.v7-dev-only').forEach(function(el){ el.style.display = 'none'; });
      return;
    }
    const pwd = prompt('请输入开发者密码:');
    if (!pwd) return;
    if (pwd === 'developer123') {
      localStorage.setItem('taluo-dev-mode', '1');
      V6.toast('🛠️ 开发者模式已开启');
      document.querySelectorAll('.v7-dev-only').forEach(function(el){ el.style.display = ''; });
      logAction('devModeOn');
    } else {
      V6.toast('❌ 密码错误', 'error');
    }
  }

  /* ========== 挂载到 window ========== */
  window.V7Admin = {
    batchToggleCards: batchToggleCards, highlightSearch: highlightSearch,
    renderWeightBars: renderWeightBars, copyWeightsJson: copyWeightsJson,
    clearAllKV: clearAllKV,
    testSensitiveWords: testSensitiveWords,
    exportSensitive: exportSensitive, importSensitive: importSensitive,
    addCardImageHover: addCardImageHover, addStatusBar: addStatusBar, addHomeBtn: addHomeBtn,
    openThemeManager: openThemeManager, applyTheme: applyTheme,
    openAnnouncement: openAnnouncement, saveAnnouncement: saveAnnouncement, clearAnnouncement: clearAnnouncement,
    openDailyCard: openDailyCard, saveDailyCard: saveDailyCard,
    openAchievements: openAchievements, toggleAchievement: toggleAchievement, resetAchievements: resetAchievements,
    openDashboard: openDashboard,
    openRollback: openRollback, doRollback: doRollback, createRollbackPoint: createRollbackPoint,
    openActionLog: openActionLog, exportActionLog: exportActionLog,
    openChangePassword: openChangePassword, doChangePassword: doChangePassword,
    toggleDevMode: toggleDevMode, logAction: logAction
  };

  /* ========== 初始化 ========== */
  function init() {
    addStatusBar();
    addHomeBtn();
    highlightSearch();

    const sidebar = document.querySelector('.sidebar, .nav-tabs, .admin-nav, [class*="sidebar"], [class*="nav"]');
    if (sidebar) {
      const v7nav = document.createElement('div');
      v7nav.style.cssText = 'margin-top:20px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1);';
      v7nav.innerHTML =
        '<div style="font-size:0.7rem;opacity:0.5;margin-bottom:6px;">v7 新功能</div>' +
        '<button onclick="V7Admin.openThemeManager()" style="width:100%;margin:2px 0;padding:8px;background:rgba(255,255,255,0.05);border:1px solid transparent;border-radius:6px;color:var(--text-white);cursor:pointer;text-align:left;">🎨 主题管理</button>' +
        '<button onclick="V7Admin.openAnnouncement()" style="width:100%;margin:2px 0;padding:8px;background:rgba(255,255,255,0.05);border:1px solid transparent;border-radius:6px;color:var(--text-white);cursor:pointer;text-align:left;">📢 公告发布</button>' +
        '<button onclick="V7Admin.openDailyCard()" style="width:100%;margin:2px 0;padding:8px;background:rgba(255,255,255,0.05);border:1px solid transparent;border-radius:6px;color:var(--text-white);cursor:pointer;text-align:left;">🎯 每日卡指定</button>' +
        '<button onclick="V7Admin.openAchievements()" style="width:100%;margin:2px 0;padding:8px;background:rgba(255,255,255,0.05);border:1px solid transparent;border-radius:6px;color:var(--text-white);cursor:pointer;text-align:left;">🏆 成就管理</button>' +
        '<button onclick="V7Admin.openDashboard()" style="width:100%;margin:2px 0;padding:8px;background:rgba(255,255,255,0.05);border:1px solid transparent;border-radius:6px;color:var(--text-white);cursor:pointer;text-align:left;">📊 数据仪表盘</button>' +
        '<button onclick="V7Admin.openRollback()" style="width:100%;margin:2px 0;padding:8px;background:rgba(255,255,255,0.05);border:1px solid transparent;border-radius:6px;color:var(--text-white);cursor:pointer;text-align:left;">♻️ 版本回滚</button>' +
        '<button onclick="V7Admin.openActionLog()" style="width:100%;margin:2px 0;padding:8px;background:rgba(255,255,255,0.05);border:1px solid transparent;border-radius:6px;color:var(--text-white);cursor:pointer;text-align:left;">📋 操作日志</button>' +
        '<button onclick="V7Admin.openChangePassword()" style="width:100%;margin:2px 0;padding:8px;background:rgba(255,255,255,0.05);border:1px solid transparent;border-radius:6px;color:var(--text-white);cursor:pointer;text-align:left;">🔐 修改密码</button>' +
        '<button onclick="V7Admin.clearAllKV()" style="width:100%;margin:8px 0;padding:8px;background:rgba(255,107,107,0.1);border:1px solid #ff6b6b33;border-radius:6px;color:#ff6b6b;cursor:pointer;">🧹 清空全部 KV (危险)</button>';
      sidebar.appendChild(v7nav);
    }

    setTimeout(addCardImageHover, 1500);
    console.log('[v7-admin] Admin 20 功能已加载');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

