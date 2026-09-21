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

  // 暴露到 window 方便 admin.js 调用
  window.TarotDev = { bindDev };
})();
