/**
 * cabbage塔罗 admin 开发者模块 —— 快照 / 审计 / 密码热更新 / 全站开关
 * 只在 developer 登录后才渲染
 */
(function() {
  const $ = s => document.querySelector(s);

  function isDev() {
    return sessionStorage.getItem("tarot_admin_role") === "developer";
  }

  function bindDev() {
    if (!isDev()) return;
    renderDevPanel();
  }

  function renderDevPanel() {
    const existing = document.getElementById("dev-panel");
    if (existing) return;

    // 清空占位符，挂到 Tab 4 的容器里
    const slot = document.getElementById("dev-slot");
    if (!slot) return;
    slot.innerHTML = "";

    const panel = document.createElement("section");
    panel.className = "glass-card";
    panel.id = "dev-panel";
    panel.style.marginTop = "0";
    panel.innerHTML = `
      <h2 class="section-title"><span>🛠️</span>开发者控制台</h2>
      <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:16px;">
        仅开发者密码可访问，以下操作立刻对所有访客生效。
      </p>

      <!-- 全站开关 -->
      <div class="dev-block">
        <h3>⚙️ 全站配置</h3>
        <div class="dev-grid">
          <label>默认主题
            <select id="d-theme">
              <option value="dark">🌙 星空紫（默认）</option>
              <option value="liquid">💎 液态玻璃</option>
            </select>
          </label>
        </div>
        <div class="dev-checks" id="d-spreads">
          <label><input type="checkbox" data-spread="single"> 单牌日运</label>
          <label><input type="checkbox" data-spread="three"> 三牌阵</label>
          <label><input type="checkbox" data-spread="yesno"> 是/否</label>
          <label><input type="checkbox" data-spread="relationship"> 关系六牌阵</label>
        </div>
        <button class="btn btn-secondary" id="d-save-config" style="margin-top:10px;">💾 保存全站配置</button>
      </div>

      <!-- 敏感词库 -->
      <div class="dev-block" style="margin-top:20px;">
        <h3>🛡️ 敏感词转译</h3>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:6px;">每行一条，格式：原词→替换词</div>
        <textarea id="d-kw" rows="6" placeholder="傻逼→笨蛋"></textarea>
      </div>

      <!-- 快照 -->
      <div class="dev-block" style="margin-top:20px;">
        <h3>📸 版本快照</h3>
        <button class="btn btn-primary" id="d-snapshot">📸 创建当前快照</button>
        <div id="d-snapshots" style="margin-top:12px;"></div>
      </div>

      <!-- 审计日志 -->
      <div class="dev-block" style="margin-top:20px;">
        <h3>📜 操作审计</h3>
        <button class="btn btn-secondary" id="d-refresh-audit">🔄 刷新</button>
        <div id="d-audit" style="margin-top:10px;max-height:300px;overflow-y:auto;"></div>
      </div>

      <!-- 密码热更新 -->
      <div class="dev-block" style="margin-top:20px;">
        <h3>🔐 密码热更新</h3>
        <div style="display:flex;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
          <select id="d-pwd-role">
            <option value="admin">管理员密码</option>
            <option value="developer">开发者密码</option>
          </select>
          <input type="password" id="d-pwd-current" placeholder="当前密码">
          <input type="password" id="d-pwd-new" placeholder="新密码 (≥4位)">
        </div>
        <button class="btn btn-secondary" id="d-pwd-change">🔄 修改密码</button>
      </div>
    `;

    slot.appendChild(panel);

    // 加载当前全局配置
    loadDevConfig();

    // 事件绑定
    $("#d-save-config").addEventListener("click", saveDevConfig);
    $("#d-snapshot").addEventListener("click", createSnapshot);
    $("#d-refresh-audit").addEventListener("click", loadAudit);
    $("#d-pwd-change").addEventListener("click", changePassword);

    // 初始加载快照列表和审计日志
    loadSnapshots();
    loadAudit();
  }

  async function loadDevConfig() {
    try {
      const resp = await fetch(`${window.API_BASE}/`);
      const data = await resp.json();
      if (!data.ok || !data.config) return;
      const cfg = data.config;

      $("#d-theme").value = cfg.globalTheme || "dark";
      const spreads = cfg.enabledSpreads || {};
      document.querySelectorAll("#d-spreads input[type=checkbox]").forEach(cb => {
        cb.checked = spreads[cb.dataset.spread] !== false;
      });
      const rules = cfg.keywordRules || [];
      $("#d-kw").value = rules.map(r => r.from + "→" + r.to).join("\n");
    } catch {}
  }

  async function saveDevConfig() {
    const pwd = prompt("请输入开发者密码确认保存全站配置：");
    if (!pwd) return;

    const enabledSpreads = {};
    document.querySelectorAll("#d-spreads input[type=checkbox]").forEach(cb => {
      enabledSpreads[cb.dataset.spread] = cb.checked;
    });
    const kwText = $("#d-kw").value.trim();
    const keywordRules = kwText.split("\n").filter(Boolean).map(line => {
      const [from, to] = line.split("→").map(s => (s || "").trim());
      return { from: from || "", to: to || "" };
    }).filter(r => r.from && r.to);

    // 先读当前 config（避免覆盖 admin 的常规设置）
    const resp = await fetch(`${window.API_BASE}/`);
    const data = await resp.json();
    const baseCfg = (data.ok && data.config) ? data.config : {};

    const newCfg = {
      ...baseCfg,
      globalTheme: $("#d-theme").value,
      enabledSpreads,
      keywordRules,
    };

    const saveResp = await fetch(`${window.API_BASE}/dev/save`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd, config: newCfg }),
    });
    const saveData = await saveResp.json();
    if (saveData.ok) { toast("✅ 全站配置已保存"); }
    else { toast(saveData.error || "保存失败", "error"); }
  }

  async function createSnapshot() {
    const pwd = prompt("请输入开发者密码创建快照：");
    if (!pwd) return;
    const resp = await fetch(`${window.API_BASE}/dev/snapshot`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd }),
    });
    const data = await resp.json();
    if (data.ok) { toast(`✅ 快照 v${data.id} 创建成功`); loadSnapshots(); }
    else toast(data.error || "失败", "error");
  }

  async function loadSnapshots() {
    try {
      const resp = await fetch(`${window.API_BASE}/snapshots`);
      const data = await resp.json();
      if (!data.ok) return;
      const list = data.snapshots || [];
      const box = $("#d-snapshots");
      if (!list.length) { box.innerHTML = `<div style="color:var(--text-muted);font-size:0.8rem;">暂无快照</div>`; return; }
      box.innerHTML = list.map(s => {
        const date = new Date(Number(s.id) || 0); // 快照列表只给 id，展示友好名
        return `<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-top:1px dashed var(--glass-border);">
          <span style="color:var(--gold);font-weight:600;">v${s.id}</span>
          <span style="color:var(--text-muted);font-size:0.8rem;flex:1;"></span>
          <button class="btn btn-secondary" data-rollback="${s.id}" style="padding:4px 10px;font-size:0.75rem;">回滚</button>
        </div>`;
      }).join("");
      box.querySelectorAll("[data-rollback]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.rollback;
          const pwd = prompt(`确认回滚到 v${id}？请输入开发者密码：`);
          if (!pwd) return;
          const r = await fetch(`${window.API_BASE}/dev/rollback`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: pwd, id: Number(id) }),
          });
          const d = await r.json();
          if (d.ok) toast(`✅ 已回滚到 v${id}`); else toast(d.error, "error");
        });
      });
    } catch {}
  }

  async function loadAudit() {
    try {
      const resp = await fetch(`${window.API_BASE}/audit`);
      const data = await resp.json();
      if (!data.ok) return;
      const logs = data.logs || [];
      const box = $("#d-audit");
      if (!logs.length) { box.innerHTML = `<div style="color:var(--text-muted);font-size:0.8rem;">暂无审计记录</div>`; return; }
      box.innerHTML = logs.map(l => {
        const date = new Date(l.timestamp).toLocaleString();
        return `<div style="padding:6px 0;border-top:1px dashed var(--glass-border);font-size:0.78rem;">
          <span style="color:var(--text-muted);">${date}</span>
          <span style="color:var(--gold);margin:0 6px;">[${l.actor}·${l.action}]</span>
          <span style="color:var(--text-white);">${l.summary || ""}</span>
        </div>`;
      }).join("");
    } catch {}
  }

  async function changePassword() {
    const pwd = $("#d-pwd-current").value.trim();
    const npwd = $("#d-pwd-new").value.trim();
    const role = $("#d-pwd-role").value;
    if (!pwd || !npwd) { toast("填完整", "error"); return; }

    const resp = await fetch(`${window.API_BASE}/dev/change-password`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPwd: pwd, newPwd: npwd, role }),
    });
    const data = await resp.json();
    if (data.ok) { toast(`✅ ${role} 密码已更新`); $("#d-pwd-current").value = ""; $("#d-pwd-new").value = ""; }
    else toast(data.error, "error");
  }

  /* ==================== ✨ v3 Admin A3: 快照 diff 对比 ==================== */
  // 在快照列表底部加 diff 按钮
  function renderSnapshotDiffUI() {
    const list = document.getElementById("d-snapshots-list");
    if (!list || list.querySelector(".diff-ui")) return;
    const ui = document.createElement("div");
    ui.className = "diff-ui";
    ui.style.cssText = "margin-top:14px;padding:12px;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.3);border-radius:8px;";
    ui.innerHTML = `
      <div style="font-size:0.85rem;color:var(--gold);margin-bottom:8px;">🔍 快照对比（选两个快照看差异）</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <select id="diff-snap-a" style="flex:1;padding:6px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:var(--text-white);min-width:140px;"></select>
        <span style="align-self:center;color:var(--text-muted);">vs</span>
        <select id="diff-snap-b" style="flex:1;padding:6px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:var(--text-white);min-width:140px;"></select>
        <button id="diff-run" style="padding:6px 14px;background:var(--gold);color:#1a0d3d;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">对比</button>
      </div>
      <div id="diff-result" style="margin-top:10px;font-size:0.8rem;max-height:200px;overflow-y:auto;"></div>
    `;
    list.appendChild(ui);

    ui.querySelector("#diff-run").addEventListener("click", async () => {
      const aId = ui.querySelector("#diff-snap-a").value;
      const bId = ui.querySelector("#diff-snap-b").value;
      if (!aId || !bId) { ui.querySelector("#diff-result").textContent = "请先加载快照列表"; return; }
      try {
        const [ra, rb] = await Promise.all([
          fetch(`${window.API_BASE}/snapshots/${aId}`).then(r => r.json()),
          fetch(`${window.API_BASE}/snapshots/${bId}`).then(r => r.json()),
        ]);
        const diff = deepDiff(ra.config || ra, rb.config || rb);
        const result = ui.querySelector("#diff-result");
        if (Object.keys(diff).length === 0) {
          result.innerHTML = `<span style="color:#64d8cb;">✅ 两个快照完全相同</span>`;
        } else {
          result.innerHTML = `<pre style="white-space:pre-wrap;color:#ff8a80;">${JSON.stringify(diff, null, 2)}</pre>`;
        }
      } catch (err) {
        ui.querySelector("#diff-result").textContent = "❌ 对比失败：" + err.message;
      }
    });
  }

  // 简单深 diff
  function deepDiff(a, b, path = "") {
    const out = {};
    if (typeof a !== "object" || typeof b !== "object") {
      if (a !== b) out[path] = { old: a, new: b };
      return out;
    }
    const keys = new Set([...Object.keys(a||{}), ...Object.keys(b||{})]);
    for (const k of keys) {
      const p = path ? path + "." + k : k;
      if (!(k in a)) out[p] = { old: undefined, new: b[k] };
      else if (!(k in b)) out[p] = { old: a[k], new: undefined };
      else Object.assign(out, deepDiff(a[k], b[k], p));
    }
    return out;
  }

  // 包装 loadSnapshots 在渲染完列表后追加 diff UI
  const _origLoadSnapshots = loadSnapshots;
  loadSnapshots = async function() {
    await _origLoadSnapshots();
    renderSnapshotDiffUI();
    // 填充 select
    const selA = document.getElementById("diff-snap-a");
    const selB = document.getElementById("diff-snap-b");
    if (selA && window.__lastSnapshots) {
      selA.innerHTML = selB.innerHTML = window.__lastSnapshots.map(s => `<option value="${s.id}">${s.id.slice(-8)} · ${new Date(s.timestamp).toLocaleString('zh-CN')}</option>`).join("");
    }
  };

  // 暴露到 window 方便 admin.js 调用
  window.TarotDev = { bindDev };

  /* ========== v5 Admin: A25b 快照按日期分组 + A26b 审计 CSV 导出 ========== */

  // A25b: 包装 loadSnapshots — 按日期分组渲染
  const _origLoadSnapshots2 = loadSnapshots;
  loadSnapshots = async function() {
    await _origLoadSnapshots2();
    try {
      const listEl = document.getElementById("d-snapshots") || document.querySelector(".snapshot-list");
      if (!listEl) return;
      const snapshots = window.__lastSnapshots || [];
      if (!snapshots.length || listEl.dataset.v5grouped === '1') return;

      // 按日期分组
      const groups = {};
      snapshots.forEach(s => {
        const d = new Date(s.timestamp || s.createdAt || Date.now());
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
      });

      // 重新渲染分组标题
      listEl.dataset.v5grouped = '1';
      const htmlParts = Object.entries(groups).sort((a,b) => b[0].localeCompare(a[0])).map(([date, snaps]) => {
        const items = snaps.map(s => {
          const ts = new Date(s.timestamp || s.createdAt || Date.now());
          const timeStr = ts.toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit' });
          return `<div class="snap-item" style="padding:6px 10px;border-left:2px solid var(--gold);margin:2px 0;background:rgba(212,175,55,0.05);border-radius:4px;">
            <code style="color:var(--gold);font-size:0.75rem;">v${s.id?.slice(-4) || s.id}</code>
            <span style="color:var(--text-muted);font-size:0.7rem;margin-left:8px;">${timeStr}</span>
            <button data-restore="${s.id}" style="float:right;font-size:0.65rem;padding:2px 8px;border-radius:8px;background:rgba(212,175,55,0.15);color:var(--gold);border:1px solid var(--gold);cursor:pointer;">恢复</button>
          </div>`;
        }).join('');
        return `<div style="margin-top:10px;"><div style="color:var(--gold);font-size:0.72rem;font-weight:600;border-bottom:1px dashed rgba(212,175,55,0.3);padding-bottom:3px;margin-bottom:4px;">📅 ${date} · ${snaps.length} 个快照</div>${items}</div>`;
      }).join('');

      // 用 fragment 替换现有列表内容（保留 diff select 区域）
      const existingDiff = listEl.querySelector('#diff-tools, [id*="diff"]');
      listEl.innerHTML = htmlParts;
      if (existingDiff) listEl.appendChild(existingDiff);

      // 绑定恢复按钮
      listEl.querySelectorAll('[data-restore]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('恢复这个快照？当前配置会被覆盖。')) return;
          try {
            const r = await fetch(`${API_BASE}/dev/rollback`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: btn.dataset.restore, role: sessionStorage.getItem('tarot_admin_role'), pwd: sessionStorage.getItem('tarot_admin_pwd') })
            });
            const data = await r.json();
            if (data.ok) toast('✅ 恢复成功', 'success');
            else toast('❌ ' + (data.error || '失败'), 'error');
          } catch(e) { toast('❌ ' + e.message, 'error'); }
        });
      });
    } catch(e) { console.warn('[v5] snap grouping err', e); }
  };

  // A26b: 包装 loadAudit — 追加 CSV 导出按钮
  const _origLoadAudit = loadAudit;
  let _cachedAuditLogs = [];
  loadAudit = async function() {
    await _origLoadAudit();
    try {
      // 缓存日志用于 CSV 导出（从 DOM 反查太麻烦，这里重新 fetch 一次）
      const auditEl = document.getElementById("d-audit") || document.querySelector(".audit-list");
      if (!auditEl || auditEl.dataset.v5csv === '1') return;
      auditEl.dataset.v5csv = '1';
      // 注入导出按钮
      const csvBtn = document.createElement('button');
      csvBtn.id = 'v5-audit-csv';
      csvBtn.textContent = '📋 导出 CSV';
      csvBtn.style.cssText = 'margin-bottom:8px;padding:4px 12px;font-size:0.72rem;border-radius:10px;background:rgba(212,175,55,0.15);color:var(--gold);border:1px solid var(--gold);cursor:pointer;';
      csvBtn.addEventListener('click', async () => {
        try {
          const r = await fetch(`${API_BASE}/audit`);
          const data = await r.json();
          const logs = data.logs || [];
          if (!logs.length) { toast('⚠ 暂无日志', ''); return; }
          const header = ['时间', '操作', '角色', 'IP', '详情'];
          const rows = logs.map(l => [
            new Date(l.timestamp || l.ts || Date.now()).toLocaleString('zh-CN'),
            (l.action || l.type || '').toString().replace(/"/g,'""'),
            (l.role || '').toString().replace(/"/g,'""'),
            (l.ip || l.ua || '').toString().replace(/"/g,'""'),
            JSON.stringify(l.detail || l.data || {}).replace(/"/g,'""')
          ].map(v => `"${v}"`).join(','));
          const csv = '\ufeff' + [header.join(','), ...rows].join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `audit_${new Date().toISOString().slice(0,10)}.csv`;
          a.click(); URL.revokeObjectURL(url);
          toast('✅ CSV 已下载', 'success');
        } catch(e) { toast('❌ ' + e.message, 'error'); }
      });
      auditEl.prepend(csvBtn);
    } catch(e) { console.warn('[v5] audit csv err', e); }
  };

})();
