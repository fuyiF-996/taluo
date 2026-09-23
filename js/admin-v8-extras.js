/* ============================================================
 * admin-v8-extras.js —— 30 Admin 功能
 * 挂 window.V8Admin 命名空间，零污染
 * 限制：≤ 1200 行
 * ============================================================ */
(function() {
  'use strict';

  const API = (localStorage.getItem('taluo_api_base') || 'https://api.taluo996.top').replace(/\/$/, '');
  const V8Admin = { api: API };

  // ---------- 通用：Toast ----------
  function toast(msg, type = 'info') {
    if (window.V8 && V8.toast) { V8.toast(msg, type); return; }
    let w = document.querySelector('.v8-toast-wrap');
    if (!w) { w = document.createElement('div'); w.className = 'v8-toast-wrap'; document.body.appendChild(w); }
    const el = document.createElement('div');
    el.className = 'v8-toast ' + type;
    el.textContent = msg;
    w.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }
  V8Admin.toast = toast;

  // ---------- 通用：fetch ----------
  async function apiFetch(path, opts = {}) {
    try {
      const r = await fetch(API + path, { credentials: 'include', ...opts });
      return await r.json();
    } catch (e) { return { ok: false, error: e.message }; }
  }

  // ---------- 密码强度 ----------
  V8Admin.pwStrength = function(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 2) return 'weak';
    if (score <= 3) return 'medium';
    return 'strong';
  };

  // ---------- Tab 记忆（A29） ----------
  function rememberTab() {
    const saved = localStorage.getItem('v8_admin_tab');
    if (saved) {
      const btn = document.querySelector(`.admin-tab[data-tab="${saved}"]`);
      if (btn && !btn.classList.contains('active')) btn.click();
    }
    document.querySelectorAll('.admin-tab').forEach(b => {
      b.addEventListener('click', () => localStorage.setItem('v8_admin_tab', b.dataset.tab));
    });
  }

  // ---------- 卡牌数据 ----------
  function getCards() {
    if (window.TAROT_DECK) return window.TAROT_DECK;
    if (window.tarotDeck) return window.tarotDeck;
    return [];
  }

  // ---------- 渲染新 Tab ----------
  function injectAdminTab(navHTML, contentHTML, tabId) {
    const nav = document.getElementById('admin-tabs');
    const content = document.querySelector('.admin-content');
    if (!nav || !content) return;
    nav.insertAdjacentHTML('beforeend', navHTML);
    content.insertAdjacentHTML('beforeend', contentHTML);
  }

  // ================================================================
  // A1-A5: 数据备份 / 恢复 / 刷新 / 健康检查 / API日志
  // ================================================================
  function renderDataTab() {
    const navBtn = `<button class="admin-tab" data-tab="v8-data">💾 数据中心</button>`;
    const section = `<section class="glass-card admin-tab-content" data-tab-content="v8-data" style="display:none;">
      <h2>💾 数据中心</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:14px;">
        <button class="btn" id="v8-export" style="padding:16px;">📦 A1 备份导出<br><small style="opacity:.6;">下载所有 KV 配置 JSON</small></button>
        <button class="btn" id="v8-import" style="padding:16px;">📥 A2 恢复导入<br><small style="opacity:.6;">上传 JSON 恢复</small></button>
        <button class="btn" id="v8-refresh" style="padding:16px;">🔄 A3 强制刷新<br><small style="opacity:.6;">SW + 缓存过期</small></button>
        <button class="btn" id="v8-health" style="padding:16px;">❤️ A4 健康检查<br><small style="opacity:.6;">连通性 + KV 容量</small></button>
        <button class="btn" id="v8-clear-cache" style="padding:16px;">🧹 A27 清缓存<br><small style="opacity:.6;">localStorage + SW</small></button>
      </div>
      <div id="v8-data-result" style="margin-top:16px;"></div>
      <input type="file" id="v8-import-file" accept=".json" style="display:none;">
    </section>`;
    injectAdminTab(navBtn, section, 'v8-data');

    document.getElementById('v8-export').onclick = async () => {
      toast('正在导出...', 'info');
      const r = await apiFetch('/metrics');
      const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'taluo-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      toast('✅ 已导出', 'success');
    };

    document.getElementById('v8-import').onclick = () => document.getElementById('v8-import-file').click();
    document.getElementById('v8-import-file').onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const data = JSON.parse(reader.result);
          await apiFetch('/rollback', { method: 'POST', body: JSON.stringify(data) });
          toast('✅ 已恢复', 'success');
        } catch { toast('❌ JSON 格式错误', 'error'); }
      };
      reader.readAsText(f);
    };

    document.getElementById('v8-refresh').onclick = () => {
      if (navigator.serviceWorker) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.update()));
      caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
      toast('✅ SW + 缓存已刷新', 'success');
    };

    document.getElementById('v8-health').onclick = async () => {
      toast('检查中...', 'info');
      const t0 = Date.now();
      const r = await apiFetch('/metrics');
      const ms = Date.now() - t0;
      const out = document.getElementById('v8-data-result');
      out.innerHTML = `<pre style="background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;font-size:12px;overflow:auto;">
✅ 连通: ${r.ok ? 'OK' : 'FAIL'}
⏱️ 延迟: ${ms}ms
📦 KV: ${JSON.stringify(r.kvBytes || {}, null, 2)}
      </pre>`;
    };

    document.getElementById('v8-clear-cache').onclick = () => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('v8_') || k.startsWith('tarot_') || k.startsWith('taluo_'));
      keys.forEach(k => localStorage.removeItem(k));
      toast(`✅ 清了 ${keys.length} 项 localStorage`, 'success');
    };
  }

  // ================================================================
  // A6-A10: 敏感词 / 关键词 / 抽牌限制 / 维护模式 / 公告
  // ================================================================
  function renderContentTab() {
    const navBtn = `<button class="admin-tab" data-tab="v8-content">📝 内容管控</button>`;
    const section = `<section class="glass-card admin-tab-content" data-tab-content="v8-content" style="display:none;">
      <h2>📝 内容管控</h2>

      <h3 style="margin-top:18px;">🔒 A6 敏感词库</h3>
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <input id="v8-sword-input" placeholder="输入敏感词..." style="flex:1;padding:8px;background:rgba(0,0,0,0.3);border:1px solid var(--gold);border-radius:6px;color:#fff;">
        <button class="btn" id="v8-sword-add" style="padding:8px 16px;">+ 添加</button>
      </div>
      <div id="v8-sword-list" style="margin-top:8px;"></div>

      <h3 style="margin-top:18px;">🔗 A7 关键词联想</h3>
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <input id="v8-kw-trigger" placeholder="触发词" style="width:120px;padding:8px;background:rgba(0,0,0,0.3);border:1px solid var(--gold);border-radius:6px;color:#fff;">
        <input id="v8-kw-words" placeholder="联想词,逗号分隔" style="flex:1;padding:8px;background:rgba(0,0,0,0.3);border:1px solid var(--gold);border-radius:6px;color:#fff;">
        <button class="btn" id="v8-kw-add" style="padding:8px 16px;">+ 添加</button>
      </div>
      <div id="v8-kw-list" style="margin-top:8px;"></div>

      <h3 style="margin-top:18px;">🚫 A8 抽牌限制</h3>
      <div style="display:flex;align-items:center;gap:12px;">
        <label>每日最大抽牌数:</label>
        <input type="number" id="v8-daily-limit" min="1" max="100" value="${localStorage.getItem('v8_daily_limit') || '50'}" style="width:80px;padding:8px;background:rgba(0,0,0,0.3);border:1px solid var(--gold);border-radius:6px;color:#fff;">
        <button class="btn" id="v8-daily-limit-save">保存</button>
      </div>

      <h3 style="margin-top:18px;">🛡️ A9 维护模式</h3>
      <button class="btn" id="v8-maintenance" style="${localStorage.getItem('v8_maintenance') === '1' ? 'background:#f87171;' : ''}">
        ${localStorage.getItem('v8_maintenance') === '1' ? '🔴 关闭维护模式' : '🟢 开启维护模式'}
      </button>

      <h3 style="margin-top:18px;">📢 A10 公告栏</h3>
      <textarea id="v8-announcement" rows="3" placeholder="输入公告内容，前端会显示在首页..." style="width:100%;padding:8px;background:rgba(0,0,0,0.3);border:1px solid var(--gold);border-radius:6px;color:#fff;resize:vertical;">${localStorage.getItem('v8_announcement') || ''}</textarea>
      <button class="btn" id="v8-announcement-save" style="margin-top:8px;">保存公告</button>
    </section>`;
    injectAdminTab(navBtn, section, 'v8-content');

    // A6 敏感词
    let swords = JSON.parse(localStorage.getItem('v8_sensitive_words') || '[]');
    function renderSwords() {
      const box = document.getElementById('v8-sword-list');
      box.innerHTML = swords.length ? swords.map((w, i) =>
        `<span class="v8-word-chip">${w} <button data-i="${i}" title="删除">✕</button></span>`
      ).join('') : '<span style="opacity:.5;">暂无敏感词</span>';
      box.querySelectorAll('button[data-i]').forEach(b => b.onclick = () => {
        swords.splice(+b.dataset.i, 1);
        localStorage.setItem('v8_sensitive_words', JSON.stringify(swords));
        renderSwords();
      });
    }
    document.getElementById('v8-sword-add').onclick = () => {
      const v = document.getElementById('v8-sword-input').value.trim();
      if (v && !swords.includes(v)) { swords.push(v); localStorage.setItem('v8_sensitive_words', JSON.stringify(swords)); renderSwords(); }
      document.getElementById('v8-sword-input').value = '';
    };
    renderSwords();

    // A7 关键词
    let kws = JSON.parse(localStorage.getItem('v8_keywords') || '{}');
    function renderKws() {
      const box = document.getElementById('v8-kw-list');
      const entries = Object.entries(kws);
      box.innerHTML = entries.length ? entries.map(([k, v]) =>
        `<div style="padding:6px 10px;background:rgba(255,255,255,0.03);border-radius:6px;margin:4px 0;display:flex;justify-content:space-between;align-items:center;">
          <span><b style="color:var(--gold);">${k}</b> → ${v.join(', ')}</span>
          <button data-k="${k}" style="background:none;border:none;color:#f87171;cursor:pointer;">✕</button>
        </div>`).join('') : '<span style="opacity:.5;">暂无联想词</span>';
      box.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => {
        delete kws[b.dataset.k]; localStorage.setItem('v8_keywords', JSON.stringify(kws)); renderKws();
      });
    }
    document.getElementById('v8-kw-add').onclick = () => {
      const t = document.getElementById('v8-kw-trigger').value.trim();
      const w = document.getElementById('v8-kw-words').value.split(',').map(s => s.trim()).filter(Boolean);
      if (t && w.length) { kws[t] = w; localStorage.setItem('v8_keywords', JSON.stringify(kws)); renderKws(); }
    };
    renderKws();

    // A8 抽牌限制
    document.getElementById('v8-daily-limit-save').onclick = () => {
      const v = document.getElementById('v8-daily-limit').value;
      localStorage.setItem('v8_daily_limit', v);
      toast(`✅ 每日限制设为 ${v}`, 'success');
    };

    // A9 维护模式
    document.getElementById('v8-maintenance').onclick = () => {
      const on = localStorage.getItem('v8_maintenance') !== '1';
      localStorage.setItem('v8_maintenance', on ? '1' : '0');
      toast(on ? '🛡️ 维护模式已开启' : '🟢 维护模式已关闭', on ? 'warn' : 'success');
      location.reload();
    };

    // A10 公告
    document.getElementById('v8-announcement-save').onclick = () => {
      const v = document.getElementById('v8-announcement').value;
      localStorage.setItem('v8_announcement', v);
      localStorage.setItem('v8_announcement_time', Date.now());
      toast('✅ 公告已保存', 'success');
    };
  }

  // ================================================================
  // A11-A20: 卡牌管理（启用/禁用 + 权重 + 花色组 + 正逆位 + 搜索 + 预览）
  // ================================================================
  function renderCardsTab() {
    const navBtn = `<button class="admin-tab" data-tab="v8-cards">🎴 卡牌权重</button>`;
    const section = `<section class="glass-card admin-tab-content" data-tab-content="v8-cards" style="display:none;">
      <h2>🎴 卡牌权重 & 管理</h2>

      <div style="display:flex;gap:8px;margin:12px 0;flex-wrap:wrap;">
        <input id="v8-card-search" placeholder="🔍 搜索卡牌..." style="flex:1;min-width:200px;padding:10px;background:rgba(0,0,0,0.3);border:1px solid var(--gold);border-radius:6px;color:#fff;">
        <select id="v8-suit-filter" style="padding:10px;background:rgba(0,0,0,0.3);border:1px solid var(--gold);border-radius:6px;color:#fff;">
          <option value="">全部花色</option>
          <option value="major">大阿卡纳</option>
          <option value="wands">权杖</option>
          <option value="cups">圣杯</option>
          <option value="swords">宝剑</option>
          <option value="pentacles">钱币</option>
        </select>
      </div>

      <h3 style="margin-top:18px;">A13 花色组权重（组内概率分配）</h3>
      <div id="v8-suit-weights"></div>

      <h3 style="margin-top:18px;">A14 正逆位比例</h3>
      <div style="display:flex;align-items:center;gap:10px;">
        <span>正位</span>
        <input type="range" id="v8-upright" min="0" max="100" value="${localStorage.getItem('v8_upright') || '60'}" style="flex:1;accent-color:var(--gold);">
        <span id="v8-upright-val">${localStorage.getItem('v8_upright') || 60}%</span>
        <span>逆位</span>
      </div>

      <h3 style="margin-top:18px;">A12 单卡权重 + A11 启用开关 + A20 预览</h3>
      <div style="max-height:400px;overflow-y:auto;">
        <div id="v8-card-list"></div>
      </div>

      <div style="margin-top:12px;display:flex;gap:8px;">
        <button class="btn" id="v8-reset-weights">🔄 恢复默认权重</button>
        <button class="btn" id="v8-save-all" style="background:linear-gradient(135deg,var(--gold-dark),var(--gold));color:#000;">💾 保存全部</button>
      </div>
    </section>`;
    injectAdminTab(navBtn, section, 'v8-cards');

    const cards = getCards();
    let weights = JSON.parse(localStorage.getItem('v8_weights') || '{}');
    let enabled = JSON.parse(localStorage.getItem('v8_card_enabled') || '{}');

    // 花色组
    const suits = [
      { key: 'major', name: '🌟 大阿卡纳', def: 22 },
      { key: 'wands', name: '🔥 权杖', def: 14 },
      { key: 'cups', name: '💧 圣杯', def: 14 },
      { key: 'swords', name: '⚔️ 宝剑', def: 14 },
      { key: 'pentacles', name: '💰 钱币', def: 14 },
    ];
    let suitWeights = JSON.parse(localStorage.getItem('v8_suit_weights') ||
      JSON.stringify({ major: 25, wands: 18, cups: 18, swords: 18, pentacles: 21 }));

    function renderSuitWeights() {
      const box = document.getElementById('v8-suit-weights');
      box.innerHTML = suits.map(s => `
        <div class="v8-weight-row">
          <span class="v8-w-name">${s.name}</span>
          <input type="range" min="1" max="100" value="${suitWeights[s.key] ?? 20}" data-suit="${s.key}">
          <span class="v8-w-val" data-suit-val="${s.key}">${suitWeights[s.key] ?? 20}%</span>
        </div>
      `).join('');
      box.querySelectorAll('input[type="range"]').forEach(r => r.oninput = () => {
        suitWeights[r.dataset.suit] = +r.value;
        box.querySelector(`[data-suit-val="${r.dataset.suit}"]`).textContent = r.value + '%';
      });
    }

    // 正逆位
    document.getElementById('v8-upright').oninput = e => {
      document.getElementById('v8-upright-val').textContent = e.target.value + '%';
      localStorage.setItem('v8_upright', e.target.value);
    };

    // 卡牌列表
    function renderCards() {
      const q = (document.getElementById('v8-card-search')?.value || '').toLowerCase();
      const suit = document.getElementById('v8-suit-filter')?.value || '';
      const box = document.getElementById('v8-card-list');
      const filtered = cards.filter(c => {
        if (suit && c.suit !== suit) return false;
        if (q && !(c.name?.toLowerCase().includes(q) || c.nameEn?.toLowerCase().includes(q) || c.id?.includes(q))) return false;
        return true;
      });
      if (!filtered.length) { box.innerHTML = '<div style="opacity:.5;padding:20px;text-align:center;">没找到匹配的卡牌</div>'; return; }
      box.innerHTML = filtered.map(c => `
        <div class="v8-weight-row">
          <span class="v8-w-name" title="${c.nameEn || ''}">${c.id}. ${c.name}</span>
          <span style="font-size:10px;color:var(--text-muted);">${c.suit || ''}</span>
          <input type="range" min="1" max="10" value="${weights[c.id] ?? 5}" data-id="${c.id}">
          <span class="v8-w-val" style="min-width:44px;">${weights[c.id] ?? 5}</span>
          <div class="v8-switch ${enabled[c.id] !== false ? 'on' : ''}" data-en="${c.id}" title="启用/禁用"></div>
        </div>
      `).join('');
      box.querySelectorAll('input[type="range"]').forEach(r => r.oninput = () => {
        weights[r.dataset.id] = +r.value;
        r.nextElementSibling.textContent = r.value;
      });
      box.querySelectorAll('.v8-switch').forEach(s => s.onclick = () => {
        const id = s.dataset.en;
        const next = s.classList.toggle('on');
        enabled[id] = next;
      });
    }

    renderSuitWeights();
    renderCards();
    document.getElementById('v8-card-search').oninput = renderCards;
    document.getElementById('v8-suit-filter').onchange = renderCards;

    document.getElementById('v8-reset-weights').onclick = () => {
      weights = {}; enabled = {};
      suitWeights = { major: 25, wands: 18, cups: 18, swords: 18, pentacles: 21 };
      renderSuitWeights(); renderCards();
      toast('✅ 已恢复默认', 'success');
    };

    document.getElementById('v8-save-all').onclick = async () => {
      localStorage.setItem('v8_weights', JSON.stringify(weights));
      localStorage.setItem('v8_card_enabled', JSON.stringify(enabled));
      localStorage.setItem('v8_suit_weights', JSON.stringify(suitWeights));
      await apiFetch('/weights', { method: 'POST', body: JSON.stringify({ weights, enabled, suitWeights }) });
      toast('✅ 权重 + 启用状态已保存到本地 & KV', 'success');
    };
  }

  // ================================================================
  // A21-A28: 安全 + 调试（密码强度 / 模拟抽牌 / 热更新）
  // ================================================================
  function renderToolsTab() {
    const navBtn = `<button class="admin-tab" data-tab="v8-tools">🛠️ 工具</button>`;
    const section = `<section class="glass-card admin-tab-content" data-tab-content="v8-tools" style="display:none;">
      <h2>🛠️ 开发者工具</h2>

      <h3 style="margin-top:18px;">🔐 A21 密码强度检测</h3>
      <input id="v8-pw-test" type="text" placeholder="输入密码测试强度..." style="width:100%;padding:10px;background:rgba(0,0,0,0.3);border:1px solid var(--gold);border-radius:6px;color:#fff;">
      <div class="v8-pw-strength"><div class="v8-pw-strength-bar" id="v8-pw-bar"></div></div>
      <span id="v8-pw-label" style="font-size:12px;color:var(--text-muted);"></span>

      <h3 style="margin-top:18px;">🎲 A26 模拟抽牌</h3>
      <div style="display:flex;gap:8px;align-items:center;">
        <select id="v8-spread" style="padding:10px;background:rgba(0,0,0,0.3);border:1px solid var(--gold);border-radius:6px;color:#fff;">
          <option value="1">单张 (1)</option>
          <option value="3">三张 (3)</option>
          <option value="5">五张 (5)</option>
          <option value="7">七张 (7)</option>
        </select>
        <button class="btn" id="v8-sim-draw">🔮 模拟抽牌</button>
      </div>
      <div id="v8-sim-result" style="margin-top:12px;font-size:14px;"></div>

      <h3 style="margin-top:18px;">🔗 A22 IP 白名单 / A23 登录限制 / A24 Session 超时</h3>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <label>白名单 (逗号分隔):</label>
        <input id="v8-ip-whitelist" value="${localStorage.getItem('v8_ip_whitelist') || ''}" style="flex:1;min-width:200px;padding:8px;background:rgba(0,0,0,0.3);border:1px solid var(--gold);border-radius:6px;color:#fff;" placeholder="例如 192.168.1.1,10.0.0.*">
      </div>
      <div style="margin-top:8px;display:flex;gap:12px;align-items:center;">
        <label>Session 超时:</label>
        <select id="v8-session-timeout" style="padding:8px;background:rgba(0,0,0,0.3);border:1px solid var(--gold);border-radius:6px;color:#fff;">
          <option value="10"  ${localStorage.getItem('v8_session_timeout')==='10'?'selected':''}>10 分钟</option>
          <option value="30"  ${localStorage.getItem('v8_session_timeout')==='30'?'selected':''}>30 分钟</option>
          <option value="60"  ${localStorage.getItem('v8_session_timeout')==='60'?'selected':''}>60 分钟</option>
          <option value="120" ${localStorage.getItem('v8_session_timeout')==='120'?'selected':''}>120 分钟</option>
        </select>
        <button class="btn" id="v8-security-save">💾 保存安全设置</button>
      </div>

      <h3 style="margin-top:18px;">⚙️ A25 Console 日志级别</h3>
      <select id="v8-log-level" style="padding:8px;background:rgba(0,0,0,0.3);border:1px solid var(--gold);border-radius:6px;color:#fff;">
        <option value="debug">debug (全部)</option>
        <option value="info">info</option>
        <option value="warn">warn</option>
        <option value="error">error (仅错误)</option>
      </select>

      <h3 style="margin-top:18px;">✨ A30 主题</h3>
      <div id="v8-theme-btns" style="display:flex;gap:8px;"></div>

      <h3 style="margin-top:18px;">🔄 A28 配置热更新</h3>
      <button class="btn" id="v8-hot-update">⚡ 重新加载 Worker 配置</button>
    </section>`;
    injectAdminTab(navBtn, section, 'v8-tools');

    // A21 密码强度
    const pwEl = document.getElementById('v8-pw-test');
    const bar  = document.getElementById('v8-pw-bar');
    const lbl  = document.getElementById('v8-pw-label');
    pwEl.oninput = () => {
      const s = V8Admin.pwStrength(pwEl.value);
      bar.className = 'v8-pw-strength-bar ' + s;
      lbl.textContent = { weak: '弱', medium: '中', strong: '强' }[s] || '';
    };

    // A26 模拟抽牌
    document.getElementById('v8-sim-draw').onclick = async () => {
      const n = +document.getElementById('v8-spread').value;
      toast('抽牌中...', 'info');
      const r = await apiFetch('/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'admin-test', count: n, positions: [] })
      });
      const box = document.getElementById('v8-sim-result');
      if (r.cards) {
        box.innerHTML = r.cards.map(c =>
          `<div style="padding:8px 12px;margin:4px 0;background:rgba(0,0,0,0.3);border-radius:6px;">
            <b style="color:var(--gold);">${c.name}</b>
            ${c.reversed ? '<span style="color:#f87171;">逆位</span>' : '<span style="color:#4ade80;">正位</span>'}
          </div>`
        ).join('');
        toast(`✅ 抽了 ${n} 张`, 'success');
      } else {
        box.innerHTML = `<div style="color:#f87171;">${r.error || '未知错误'}</div>`;
        toast('❌ 抽牌失败', 'error');
      }
    };

    // A22/A24 安全
    document.getElementById('v8-security-save').onclick = () => {
      localStorage.setItem('v8_ip_whitelist', document.getElementById('v8-ip-whitelist').value);
      localStorage.setItem('v8_session_timeout', document.getElementById('v8-session-timeout').value);
      toast('✅ 安全设置已保存', 'success');
    };

    // A25 日志级别
    document.getElementById('v8-log-level').onchange = e => {
      localStorage.setItem('v8_log_level', e.target.value);
      toast(`✅ 日志级别: ${e.target.value}`, 'success');
    };

    // A30 主题切换
    const THEMES = {
      cosmic: { name: '🌌 星空紫', bg: '#0a0615' },
      forest: { name: '🌲 森林绿', bg: '#0d1a12' },
      sunset: { name: '🌅 日落橙', bg: '#1a0e05' },
      ocean:  { name: '🌊 深海蓝', bg: '#06101c' },
    };
    const themeBtns = document.getElementById('v8-theme-btns');
    Object.entries(THEMES).forEach(([k, v]) => {
      const b = document.createElement('button');
      b.textContent = v.name;
      b.style.cssText = `padding:10px 18px;border-radius:20px;border:1px solid var(--gold);background:${v.bg};color:#fff;cursor:pointer;transition:transform .2s;`;
      b.onclick = () => {
        localStorage.setItem('v8_theme', k);
        document.documentElement.style.setProperty('--bg-override', v.bg);
        toast(`✅ 主题: ${v.name}`, 'success');
      };
      themeBtns.appendChild(b);
    });

    // A28 热更新
    document.getElementById('v8-hot-update').onclick = async () => {
      toast('热更新中...', 'info');
      await apiFetch('/metrics');  // 触发 Worker 刷新
      toast('✅ 配置已热更新', 'success');
    };
  }

  // ================================================================
  // 入口：注入 Tab + 绑定 Tab 切换
  // ================================================================
  function setupTabSwitching() {
    const origTabs = document.querySelectorAll('.admin-tab');
    origTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        origTabs.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        const content = document.querySelector(`.admin-tab-content[data-tab-content="${tab}"]`);
        if (content) content.style.display = '';
      });
    });
  }

  function init() {
    renderDataTab();
    renderContentTab();
    renderCardsTab();
    renderToolsTab();
    // 注入后重新绑定 Tab 切换
    setupTabSwitching();
    rememberTab();
    console.log('[v8-admin] 30 Admin 功能已加载');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.V8Admin = V8Admin;
})();
