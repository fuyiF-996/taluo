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
