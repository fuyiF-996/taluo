/**
 * cabbage塔罗 · 管理后台 v2
 * 架构：Tab 分页 + Master-Detail 卡牌编辑 + 概览统计
 * -------------------------------------------------------
 * 4 个 Tab：📊 概览 / 🎴 卡牌编辑 / ⚙️ 全局设置 / 🛠️ 开发者
 * 卡牌编辑器：左侧紧凑列表（缩略图+牌名+权重），右侧点选后完整表单
 */

/* ==================== 状态 ==================== */
let state = {
  cards: [],          // [{id, name, nameEn, weight, upright, reversed, keywords, element, advice, warning}]
  uprightRate: 50,
  selectedId: null,
  filterKey: "all",   // all / major / W / C / S / P
  searchKey: "",
};

const $ = s => document.querySelector(s);


/* ==================== 启动 ==================== */
document.addEventListener("DOMContentLoaded", async () => {

  // 退出
  $("#logout-btn")?.addEventListener("click", () => {
    sessionStorage.removeItem("tarot_admin_logged");
    sessionStorage.removeItem("tarot_admin_role");
    location.reload();
  });

  // Tab 切换
  document.querySelectorAll(".admin-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      document.querySelectorAll(".admin-tab-content").forEach(el => {
        el.style.display = el.dataset.tabContent === tab ? "" : "none";
      });
    });
  });

  // 登录检查
  if (sessionStorage.getItem("tarot_admin_logged") === "1") {
    showAdmin();
  } else {
    bindLogin();
  }
});


/* ==================== 登录 ==================== */
function bindLogin() {
  const pwdInput = $("#login-password");
  const btn = $("#login-btn");
  pwdInput.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
  btn.addEventListener("click", doLogin);
}

async function doLogin() {
  const pwd = $("#login-password").value.trim();
  if (!pwd) { toast("请输入密码", "error"); return; }

  const btn = $("#login-btn");
  btn.disabled = true; btn.textContent = "验证中...";

  try {
    const resp = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd }),
    });
    const data = await resp.json();
    if (resp.ok && data.ok) {
      sessionStorage.setItem("tarot_admin_logged", "1");
      if (data.role) sessionStorage.setItem("tarot_admin_role", data.role);
      showAdmin();
    } else {
      toast(data.error || "密码错误", "error");
    }
  } catch (err) {
    toast("网络错误：" + err.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "登录";
  }
}


/* ==================== 进入后台 ==================== */
async function showAdmin() {
  $("#login-page").style.display = "none";
  $("#admin-page").style.display = "block";

  // 初始化 state.cards（从 TAROT_DECK 克隆）
  state.cards = TAROT_DECK.map(c => ({
    id: c.id,
    name: c.name,
    nameEn: c.nameEn,
    imageUrl: c.imageUrl || "",
    weight: 1,
    upright: c.upright,
    reversed: c.reversed,
    keywords: c.keywords || "",
    element: c.element || "",
    advice: c.advice || "",
    warning: c.warning || "",
  }));

  // 概览快捷按钮
  $("#ov-save").addEventListener("click", saveToCloud);
  $("#ov-redirect").addEventListener("click", () => {
    document.querySelector('.admin-tab[data-tab="cards"]').click();
  });

  // 顶部工具栏
  $("#load-btn").addEventListener("click", () => loadFromCloud(true));
  $("#export-btn").addEventListener("click", exportJson);
  $("#import-btn").addEventListener("click", () => $("#import-file").click());
  $("#import-file").addEventListener("change", importJson);

  // 全局设置 Tab
  $("#save-btn").addEventListener("click", saveToCloud);
  $("#settings-load").addEventListener("click", () => loadFromCloud(true));
  $("#settings-export").addEventListener("click", exportJson);

  // 正位概率滑块
  const slider = $("#upright-rate");
  slider.addEventListener("input", () => {
    state.uprightRate = parseInt(slider.value, 10);
    $("#upright-rate-val").textContent = state.uprightRate;
  });

  // 批量操作按钮（data-batch）
  document.querySelectorAll("[data-batch]").forEach(btn => {
    btn.addEventListener("click", () => applyBatch(btn.dataset.batch));
  });

  // 卡牌编辑 Tab —— 搜索 + 筛选
  $("#card-search").addEventListener("input", e => {
    state.searchKey = e.target.value.trim().toLowerCase();
    renderCardList();
  });
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.filterKey = chip.dataset.chip;
      renderCardList();
    });
  });

  // developer 登录后渲染 dev panel（新位置：#dev-slot）
  if (sessionStorage.getItem("tarot_admin_role") === "developer") {
    window.TarotDev?.bindDev();
  } else {
    // 非 developer 隐藏 dev Tab
    const devTab = document.querySelector('.admin-tab[data-tab="dev"]');
    if (devTab) devTab.style.display = "none";
  }

  // 先渲染本地默认 + 尝试拉云端
  renderCardList();
  refreshOverview();
  await loadFromCloud(false);
}


/* ==================== Master-Detail: 左侧卡牌列表 ==================== */
function renderCardList() {
  const body = $("#card-list-body");
  body.innerHTML = "";

  const visible = state.cards.filter(c => {
    if (state.searchKey) {
      const h = (c.name + c.nameEn + c.id).toLowerCase();
      if (!h.includes(state.searchKey)) return false;
    }
    if (state.filterKey === "all") return true;
    if (state.filterKey === "major") return c.id.startsWith("M");
    return c.id.startsWith(state.filterKey);
  });

  visible.forEach(card => {
    const item = document.createElement("div");
    item.className = "card-item" + (card.id === state.selectedId ? " active" : "");
    item.innerHTML = `
      <img src="${card.imageUrl || ''}" onerror="this.style.background='rgba(255,255,255,0.06)'">
      <div class="info">
        <div class="name">${escapeHtml(card.name)}</div>
        <div class="en">${escapeHtml(card.nameEn)}</div>
      </div>
      <div class="wt">w${card.weight}</div>
    `;
    item.addEventListener("click", () => selectCard(card.id));
    body.appendChild(item);
  });

  // 重渲染后恢复 active 状态
  body.querySelectorAll(".card-item").forEach((el, i) => {
    const c = visible[i];
    if (c && c.id === state.selectedId) el.classList.add("active");
  });
}


/* ==================== Master-Detail: 右侧详情编辑 ==================== */
function selectCard(id) {
  state.selectedId = id;
  renderCardList();  // 更新列表 active 态

  const card = state.cards.find(c => c.id === id);
  if (!card) return;

  const detail = $("#card-detail");
  detail.innerHTML = `
    <div class="detail-header">
      <img src="${card.imageUrl || ''}" onerror="this.style.background='rgba(255,255,255,0.06)'">
      <div class="titles">
        <h2>${escapeHtml(card.name)}</h2>
        <h3>${escapeHtml(card.nameEn)} · ${card.id}</h3>
      </div>
    </div>

    <div class="detail-grid">
      <div class="detail-field half">
        <label>权重 (w)</label>
        <input type="number" min="0" max="999" step="0.1"
               data-field="weight" value="${card.weight}">
      </div>
      <div class="detail-field half">
        <label>元素</label>
        <input type="text" data-field="element" value="${escapeHtml(card.element || '')}" placeholder="火/水/风/土/以太">
      </div>

      <div class="detail-field full">
        <label>正位解读</label>
        <textarea rows="3" data-field="upright">${escapeHtml(card.upright)}</textarea>
      </div>
      <div class="detail-field full">
        <label>逆位解读</label>
        <textarea rows="3" data-field="reversed">${escapeHtml(card.reversed)}</textarea>
      </div>
      <div class="detail-field half">
        <label>关键词</label>
        <textarea rows="3" data-field="keywords">${escapeHtml(card.keywords || '')}</textarea>
      </div>
      <div class="detail-field half">
        <label>建议</label>
        <textarea rows="3" data-field="advice">${escapeHtml(card.advice || '')}</textarea>
      </div>
      <div class="detail-field full">
        <label>警示</label>
        <textarea rows="2" data-field="warning">${escapeHtml(card.warning || '')}</textarea>
      </div>
    </div>
  `;

  // 绑定 input → 同步到 state
  detail.querySelectorAll("input, textarea").forEach(el => {
    el.addEventListener("input", () => {
      const f = el.dataset.field;
      if (f === "weight") {
        card.weight = Number(el.value) || 1;
        // 只更新当前列表项的 .wt，不重建整个列表！
        const item = document.querySelector(`#card-list-body .card-item[data-id="${card.id}"] .wt`);
        // 列表项没有 data-id，换个方式：遍历找 active 的那个
        const activeItem = document.querySelector("#card-list-body .card-item.active .wt");
        if (activeItem) activeItem.textContent = "w" + card.weight;
      } else {
        card[f] = el.value;
      }
      refreshOverview();
    });
  });
}


/* ==================== 概览统计 ==================== */
function refreshOverview() {
  const defaults = {};
  TAROT_DECK.forEach(c => { defaults[c.id] = c; });

  let modified = 0;
  state.cards.forEach(c => {
    const d = defaults[c.id];
    if (!d) return;
    if (c.weight !== 1) modified++;
    if (c.upright !== d.upright) modified++;
    if (c.reversed !== d.reversed) modified++;
    if ((c.keywords || "") !== (d.keywords || "")) modified++;
    if ((c.element || "") !== (d.element || "")) modified++;
    if ((c.advice || "") !== (d.advice || "")) modified++;
    if ((c.warning || "") !== (d.warning || "")) modified++;
  });

  $("#ov-total").textContent = state.cards.length;
  $("#ov-modified").textContent = modified;
  $("#ov-upright").textContent = state.uprightRate + "%";
}


/* ==================== 批量操作 ==================== */
function applyBatch(action) {
  const defaults = {};
  TAROT_DECK.forEach(c => { defaults[c.id] = c; });

  switch (action) {
    case "weight1":
      state.cards.forEach(c => c.weight = 1);
      toast("✅ 全部权重 = 1");
      break;
    case "reset-text": {
      let cnt = 0;
      state.cards.forEach(c => {
        const d = defaults[c.id];
        if (d) {
          if (c.upright !== d.upright) { c.upright = d.upright; cnt++; }
          if (c.reversed !== d.reversed) { c.reversed = d.reversed; cnt++; }
          if ((c.keywords || "") !== (d.keywords || "")) { c.keywords = d.keywords || ""; cnt++; }
          if ((c.element || "") !== (d.element || "")) { c.element = d.element || ""; cnt++; }
          if ((c.advice || "") !== (d.advice || "")) { c.advice = d.advice || ""; cnt++; }
          if ((c.warning || "") !== (d.warning || "")) { c.warning = d.warning || ""; cnt++; }
        }
      });
      toast(`✅ 已恢复 ${cnt} 条出厂变更`);
      break;
    }
    case "upright100":
      state.uprightRate = 100;
      $("#upright-rate").value = 100; $("#upright-rate-val").textContent = 100;
      toast("✅ 正位概率 → 100%");
      break;
    case "upright0":
      state.uprightRate = 0;
      $("#upright-rate").value = 0; $("#upright-rate-val").textContent = 0;
      toast("✅ 正位概率 → 0%");
      break;
    case "half-major":
      state.cards.forEach(c => { if (c.id.startsWith("M")) c.weight = (c.weight * 2) || 2; });
      toast("✅ 大阿卡那权重 ×2");
      break;
    case "half-minor":
      state.cards.forEach(c => { if (!c.id.startsWith("M")) c.weight = (c.weight * 2) || 2; });
      toast("✅ 小阿卡那权重 ×2");
      break;
  }

  if (state.selectedId) selectCard(state.selectedId);
  else renderCardList();
  refreshOverview();
}


/* ==================== 云端加载 ==================== */
async function loadFromCloud(showToast = true) {
  setApiStatus("loading", "加载中...");

  try {
    const resp = await fetch(`${API_BASE}/`, { headers: { Accept: "application/json" } });
    const data = await resp.json();

    if (resp.ok && data.ok && data.config) {
      const cfg = data.config;
      if (typeof cfg.globalUprightRate === "number") {
        state.uprightRate = cfg.globalUprightRate;
        $("#upright-rate").value = state.uprightRate;
        $("#upright-rate-val").textContent = state.uprightRate;
      }

      if (Array.isArray(cfg.cards)) {
        cfg.cards.forEach(cc => {
          const local = state.cards.find(c => c.id === cc.id);
          if (!local) return;
          if (typeof cc.weight === "number") local.weight = cc.weight;
          if (typeof cc.upright === "string") local.upright = cc.upright;
          if (typeof cc.reversed === "string") local.reversed = cc.reversed;
          if (typeof cc.keywords === "string") local.keywords = cc.keywords;
          if (typeof cc.element === "string") local.element = cc.element;
          if (typeof cc.advice === "string") local.advice = cc.advice;
          if (typeof cc.warning === "string") local.warning = cc.warning;
        });
      }

      renderCardList();
      refreshOverview();
      setApiStatus("ok", "云端已同步");
      if (showToast) toast("✅ 已从云端加载");
    } else {
      setApiStatus("ok", "云端暂无配置");
      if (showToast) toast("云端暂无配置，使用默认值");
    }
    $("#ov-api").textContent = "在线";
  } catch (err) {
    setApiStatus("err", "API 不可达");
    $("#ov-api").textContent = "离线";
    if (showToast) toast("加载失败：" + err.message, "error");
  }
}


/* ==================== 保存到云端 ==================== */
async function saveToCloud() {
  const isDev = sessionStorage.getItem("tarot_admin_role") === "developer";
  const savePath = isDev ? "/dev/save" : "/save";
  const pwd = prompt(isDev ? "请输入开发者密码确认保存：" : "请输入管理员密码确认保存：");
  if (!pwd) return;

  const config = {
    globalUprightRate: state.uprightRate,
    cards: state.cards.map(c => ({
      id: c.id,
      weight: Number(c.weight) || 1,
      upright: c.upright,
      reversed: c.reversed,
      keywords: c.keywords || "",
      element: c.element || "",
      advice: c.advice || "",
      warning: c.warning || "",
    })),
  };

  try {
    const resp = await fetch(`${API_BASE}${savePath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd, config }),
    });
    const data = await resp.json();

    if (resp.ok && data.ok) {
      toast("✅ 保存成功！所有访客立刻生效");
      setApiStatus("ok", "已保存到云端");
    } else {
      toast(data.error || "保存失败", "error");
    }
  } catch (err) {
    toast("网络错误：" + err.message, "error");
  }
}


/* ==================== 导出 JSON ==================== */
function exportJson() {
  const config = {
    exportedAt: new Date().toISOString(),
    globalUprightRate: state.uprightRate,
    cards: state.cards.map(c => ({
      id: c.id, name: c.name, weight: Number(c.weight) || 1,
      upright: c.upright, reversed: c.reversed,
      keywords: c.keywords || "", element: c.element || "",
      advice: c.advice || "", warning: c.warning || "",
    })),
  };
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tarot-config-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast("💾 已导出 JSON 备份");
}


/* ==================== 导入 JSON ==================== */
function importJson(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      const cards = Array.isArray(data.cards) ? data.cards : null;
      if (!cards) { toast("❌ 无效 JSON：缺少 cards 数组", "error"); return; }

      if (typeof data.globalUprightRate === "number") {
        state.uprightRate = data.globalUprightRate;
        $("#upright-rate").value = state.uprightRate;
        $("#upright-rate-val").textContent = state.uprightRate;
      }

      let cnt = 0;
      cards.forEach(src => {
        const local = state.cards.find(c => c.id === src.id);
        if (!local) return;
        if (typeof src.weight === "number") local.weight = src.weight;
        if (typeof src.upright === "string") local.upright = src.upright;
        if (typeof src.reversed === "string") local.reversed = src.reversed;
        if (typeof src.keywords === "string") local.keywords = src.keywords;
        if (typeof src.element === "string") local.element = src.element;
        if (typeof src.advice === "string") local.advice = src.advice;
        if (typeof src.warning === "string") local.warning = src.warning;
        cnt++;
      });

      renderCardList();
      refreshOverview();
      toast(`✅ 已导入 ${cnt} 张卡牌（请保存到云端）`);
    } catch (err) {
      toast("❌ 解析失败：" + err.message, "error");
    } finally {
      e.target.value = "";
    }
  };
  reader.readAsText(file);
}


/* ==================== 工具 ==================== */
function setApiStatus(type, text) {
  const el = $("#api-status");
  el.className = "api-status " + type;
  el.textContent = (type === "loading" ? "⏳ " : "") + text;
}

let toastTimer = null;
function toast(msg, type = "") {
  const el = $("#toast");
  el.textContent = msg;
  el.className = "toast " + type;
  requestAnimationFrame(() => el.classList.add("show"));
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
}

function escapeHtml(str) {
  if (!str) return "";
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}


/* ==================== ✨ v3 Admin A1: CSV 导入/导出 ==================== */
// CSV 导出
document.addEventListener("click", (e) => {
  if (e.target.id === "csv-export") {
    const headers = ["id","name","nameEn","upright","reversed","keywords","element","advice","warning","weight"];
    const rows = state.cards.map(c => headers.map(h => `"${String(c[h] ?? "").replace(/"/g,'""')}"`).join(","));
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");  // BOM 让 Excel 正常识别 UTF-8
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tarot-cards-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
    toast("📤 CSV 已导出");
  }

  if (e.target.id === "csv-import") {
    $("#csv-file").click();
  }

  if (e.target.id === "csv-file") {
    // 文件选择后触发（change 事件在下面绑定）
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const csvFile = $("#csv-file");
  if (csvFile) csvFile.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.replace(/\r/g,"").split("\n").filter(Boolean);
      const headers = lines[0].split(",").map(h => h.trim());
      let imported = 0;
      lines.slice(1).forEach(line => {
        const cols = line.match(/(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g)?.map(c => c.replace(/^,?/,"").replace(/^"|"$/g,"").replace(/""/g,'"')) || [];
        if (!cols.length) return;
        const id = cols[0];
        const existing = state.cards.find(c => c.id === id);
        if (!existing) return;
        headers.forEach((h, i) => {
          if (h === "weight") existing.weight = parseFloat(cols[i]) || 1;
          else if (cols[i] !== undefined && cols[i] !== "") existing[h] = cols[i];
        });
        imported++;
      });
      renderCardList(); selectCard(state.selectedId); refreshOverview();
      toast(`✅ CSV 导入 ${imported} 张（保存到云端生效）`);
    } catch (err) {
      toast("❌ CSV 解析失败：" + err.message, "error");
    }
  });
});


/* ==================== ✨ v3 Admin A2: 主题色自定义 ==================== */
const DEFAULT_THEME = { gold: "#d4af37", purple: "#9d4edd", teal: "#64d8cb", glassAlpha: 0.10, glassBlur: 2 };

function applyThemeToPreview(t) {
  const r = document.documentElement.style;
  if (t.gold) r.setProperty("--gold", t.gold);
  if (t.purple) r.setProperty("--purple-primary", t.purple);
  if (t.teal) r.setProperty("--teal", t.teal);
  if (t.glassAlpha !== undefined) r.setProperty("--glass-alpha", String(t.glassAlpha));
  if (t.glassBlur !== undefined) r.setProperty("--glass-blur", String(t.glassBlur));
}

document.addEventListener("DOMContentLoaded", () => {
  const gold = $("#theme-gold"), pur = $("#theme-purple"), tea = $("#theme-teal"),
        ga = $("#theme-glass-alpha"), gb = $("#theme-glass-blur");
  if (!gold) return;

  // 从已保存的主题（如果有）恢复
  try {
    const saved = JSON.parse(localStorage.getItem("tarot_admin_theme") || "null");
    if (saved) {
      gold.value = saved.gold || DEFAULT_THEME.gold;
      pur.value = saved.purple || DEFAULT_THEME.purple;
      tea.value = saved.teal || DEFAULT_THEME.teal;
      ga.value = saved.glassAlpha ?? DEFAULT_THEME.glassAlpha;
      gb.value = saved.glassBlur ?? DEFAULT_THEME.glassBlur;
    }
  } catch {}

  $("#theme-apply")?.addEventListener("click", () => {
    applyThemeToPreview({ gold: gold.value, purple: pur.value, teal: tea.value, glassAlpha: parseFloat(ga.value), glassBlur: parseInt(gb.value) });
    toast("🎨 主题已应用（预览）");
  });
  $("#theme-reset")?.addEventListener("click", () => {
    gold.value = DEFAULT_THEME.gold; pur.value = DEFAULT_THEME.purple; tea.value = DEFAULT_THEME.teal;
    ga.value = DEFAULT_THEME.glassAlpha; gb.value = DEFAULT_THEME.glassBlur;
    applyThemeToPreview(DEFAULT_THEME);
    toast("↩ 已恢复默认主题");
  });
  $("#theme-save")?.addEventListener("click", () => {
    const t = { gold: gold.value, purple: pur.value, teal: tea.value, glassAlpha: parseFloat(ga.value), glassBlur: parseInt(gb.value) };
    localStorage.setItem("tarot_admin_theme", JSON.stringify(t));
    // 合并到 state 里供 Worker 保存
    state.theme = state.theme || {};
    Object.assign(state.theme, t);
    applyThemeToPreview(t);
    toast("💾 主题已保存（记得点「保存到云端」）");
  });
});


/* ==================== ✨ v3 Admin A4: 批量随机权重 ==================== */
document.addEventListener("DOMContentLoaded", () => {
  $("#batch-random-weight")?.addEventListener("click", () => {
    if (!confirm("🎲 确定要给全部 78 张卡随机权重（0.2~3.0）吗？")) return;
    state.cards.forEach(c => { c.weight = Math.round((0.2 + Math.random() * 2.8) * 100) / 100; });
    renderCardList(); selectCard(state.selectedId); refreshOverview();
    toast("🎲 已随机所有权重");
  });
  $("#batch-reset-weight")?.addEventListener("click", () => {
    if (!confirm("↩ 确定要把所有权重重置为 1 吗？")) return;
    state.cards.forEach(c => { c.weight = 1; });
    renderCardList(); selectCard(state.selectedId); refreshOverview();
    toast("↩ 权重已全部重置");
  });
});


/* ==================== ✨ v3 Admin A5: 卡牌禁用/黑名单 ==================== */
// selectCard 里自动读取 disabled 状态并加一个开关
const _origSelectCard = typeof selectCard === "function" ? selectCard : null;
// 我们通过事件委托在 selectCard 渲染后追加禁用 checkbox
document.addEventListener("click", (e) => {
  const toggle = e.target.closest("#card-detail .card-disabled-toggle");
  if (!toggle) return;
  const cardId = toggle.closest("#card-detail")?.dataset?.currentId;
  const card = state.cards.find(c => c.id === cardId);
  if (!card) return;
  card.disabled = toggle.checked;
  toast(card.disabled ? `🚫 ${card.name} 已禁用` : `✅ ${card.name} 已启用`);
  renderCardList();
});

// 重写 selectCard 末尾追加禁用开关
if (typeof selectCard === "function") {
  // monkey-patch: 包装 selectCard
  const _renderSelectCard = selectCard;
  selectCard = function(id) {
    _renderSelectCard(id);
    const detail = $("#card-detail");
    const card = state.cards.find(c => c.id === id);
    if (!detail || !card) return;
    // 加 data-currentId
    detail.dataset.currentId = id;
    // 如果还没禁用开关，加一个
    if (!detail.querySelector(".card-disabled-toggle-wrap")) {
      const wrap = document.createElement("div");
      wrap.className = "card-disabled-toggle-wrap";
      wrap.style.cssText = "margin-top:14px;padding:10px 14px;background:rgba(255,80,80,0.08);border:1px solid rgba(255,80,80,0.25);border-radius:8px;display:flex;align-items:center;gap:10px;font-size:0.85rem;color:#ff8a80;";
      wrap.innerHTML = `
        <label style="flex:1;">🚫 禁用此卡牌（抽牌时不会出现）</label>
        <input type="checkbox" class="card-disabled-toggle" style="width:20px;height:20px;accent-color:#ff5252;">
      `;
      detail.appendChild(wrap);
    }
    const toggle = detail.querySelector(".card-disabled-toggle");
    if (toggle) toggle.checked = !!card.disabled;
    // 列表里给禁用卡加灰色
    document.querySelectorAll(".card-item").forEach(el => {
      const cid = el.dataset.id;
      const c = state.cards.find(x => x.id === cid);
      if (c?.disabled) { el.style.opacity = "0.45"; el.style.textDecoration = "line-through"; }
      else { el.style.opacity = ""; el.style.textDecoration = ""; }
    });
  };
} else {
  // 如果 selectCard 还没定义，等 DOMContentLoaded 里 admin.js 定义完再说
  document.addEventListener("DOMContentLoaded", () => {
    // admin.js 已定义 selectCard，上面的 monkey-patch 应该已经生效
  });
}


/* ==================== ✨ v4 Admin A6-A17 ==================== */

/* --- A6: Dashboard 统计扩展 --- */
function renderDashboard() {
  const ov = document.querySelector('[data-tab-content="overview"]');
  if (!ov) return;
  const total = state.cards.length;
  const disabled = state.cards.filter(c => c.disabled).length;
  const enabled = total - disabled;
  const major = state.cards.filter(c => c.id?.startsWith('M')).length;
  const minor = total - major;
  const avgWeight = (state.cards.reduce((s,c) => s + (c.weight || 1), 0) / total).toFixed(2);
  const stdDev = Math.sqrt(state.cards.reduce((s,c) => s + Math.pow((c.weight||1) - avgWeight, 2), 0) / total).toFixed(2);

  // 权重分布直方图
  const buckets = [0,0,0,0,0,0];
  state.cards.forEach(c => {
    const w = c.weight || 1;
    const idx = Math.min(5, Math.max(0, Math.floor(w / 0.5)));
    buckets[idx]++;
  });
  const maxB = Math.max(...buckets, 1);
  const hist = buckets.map((cnt, i) => {
    const lo = (i*0.5).toFixed(1), hi = ((i+1)*0.5).toFixed(1);
    return `<div style="display:flex;align-items:center;gap:6px;font-size:0.72rem;"><span style="width:45px;color:var(--text-muted);">${lo}-${hi}</span><div style="flex:1;height:10px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;"><div style="height:100%;width:${cnt/maxB*100}%;background:linear-gradient(90deg,var(--gold),var(--purple-primary));border-radius:3px;"></div></div><span style="width:24px;text-align:right;color:var(--gold);">${cnt}</span></div>`;
  }).join('');

  const div = document.createElement("div");
  div.style.cssText = "margin-top:14px;padding:14px;background:rgba(255,255,255,0.04);border-radius:10px;";
  div.innerHTML = `
    <div style="font-size:0.82rem;color:var(--gold);margin-bottom:10px;">📊 权重分布直方图</div>
    ${hist}
    <div style="margin-top:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:0.8rem;">
      <div>总卡牌: <b>${total}</b></div>
      <div>启用: <b style="color:#64d8cb;">${enabled}</b></div>
      <div>禁用: <b style="color:#ff8a80;">${disabled}</b></div>
      <div>大调: <b>${major}</b></div>
      <div>小调: <b>${minor}</b></div>
      <div>权重σ: <b>${stdDev}</b></div>
    </div>
  `;
  const existing = ov.querySelector('.v4-dashboard');
  if (existing) existing.replaceWith(div);
  else ov.appendChild(div);
  div.classList.add('v4-dashboard');
}

/* --- A7: 主题色预设 --- */
const THEME_PRESETS = [
  { name: '星空', gold:'#d4af37', purple:'#9d4edd', teal:'#64d8cb', a:0.10, b:2 },
  { name: '极光', gold:'#ffd166', purple:'#06d6a0', teal:'#ef476f', a:0.12, b:3 },
  { name: '暖金', gold:'#ff9f1c', purple:'#c9184a', teal:'#ffb703', a:0.08, b:1 },
  { name: '冷紫', gold:'#a78bfa', purple:'#6d28d9', teal:'#22d3ee', a:0.12, b:3 },
  { name: '薄荷', gold:'#84cc16', purple:'#10b981', teal:'#34d399', a:0.09, b:2 },
];
function injectThemePresets() {
  const t = document.getElementById('theme-gold');
  if (!t || t.closest('.v4-presets-injected')) return;
  const row = t.closest('section');
  if (!row) return;
  const wrap = document.createElement("div");
  wrap.className = 'v4-presets-injected';
  wrap.style.cssText = "margin-top:12px;";
  wrap.innerHTML = `<div style="font-size:0.78rem;color:var(--gold);margin-bottom:8px;">🎨 快速预设</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
    ${THEME_PRESETS.map((p,i) => `<button data-preset="${i}" style="padding:6px 12px;font-size:0.75rem;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:12px;color:var(--text-white);cursor:pointer;">
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.gold};margin-right:4px;"></span>${p.name}</button>`).join('')}
    </div>`;
  row.insertBefore(wrap, row.lastElementChild);
  wrap.querySelectorAll('[data-preset]').forEach(b => {
    b.addEventListener('click', () => {
      const p = THEME_PRESETS[parseInt(b.dataset.preset)];
      document.getElementById('theme-gold').value = p.gold;
      document.getElementById('theme-purple').value = p.purple;
      document.getElementById('theme-teal').value = p.teal;
      document.getElementById('theme-glass-alpha').value = p.a;
      document.getElementById('theme-glass-blur').value = p.b;
      // 直接应用预览
      applyThemeToPreview({ gold: p.gold, purple: p.purple, teal: p.teal, glassAlpha: p.a, glassBlur: p.b });
      toast(`🎨 已应用「${p.name}」主题`);
    });
  });
}

/* --- A8: 禁用原因下拉 --- */
const DISABLE_REASONS = ['重复内容','无意义卡牌','画面太暗','用户投诉','测试中','其他'];

/* --- A9: percentile 权重 --- */
document.addEventListener("DOMContentLoaded", () => {
  // 在卡牌 Tab 工具栏的 random/reset 旁边加 percentile
  const parent = document.querySelector('.v4-presets-injected');  // 找 admin Tab 附近
  // 更简单：直接在 batch-random-weight 旁边加
  const btn = document.getElementById('batch-random-weight');
  if (btn && !document.getElementById('batch-percentile')) {
    const row = btn.closest('div');
    if (row) {
      const b2 = document.createElement("button");
      b2.id = 'batch-percentile';
      b2.className = 'btn btn-secondary';
      b2.style.cssText = "font-size:0.8rem;padding:6px 12px;";
      b2.textContent = '📈 Percentile 划分';
      b2.title = '按权重排序，Top 10% 权重×3，Bottom 20% 权重×0.2';
      row.appendChild(b2);
      b2.addEventListener('click', () => {
        if (!confirm('Top 10% 权重×3 / Bottom 20% 权重×0.2？')) return;
        const sorted = [...state.cards].sort((a,b) => (a.weight||1) - (b.weight||1));
        const n = sorted.length;
        const top10 = sorted.slice(Math.floor(n*0.9));
        const bot20 = sorted.slice(0, Math.floor(n*0.2));
        top10.forEach(c => c.weight = Math.round((c.weight||1) * 3 * 100) / 100);
        bot20.forEach(c => c.weight = Math.round((c.weight||1) * 0.2 * 100) / 100);
        renderCardList(); refreshOverview();
        toast(`📈 Top 10% ×3 / Bottom 20% ×0.2`);
      });
    }
  }
});

/* --- A10: 智能查重 --- */
function detectDuplicates() {
  const sim = (a, b) => {
    if (!a || !b) return 0;
    const as = new Set(a.split(/[、,，\s]+/));
    const bs = new Set(b.split(/[、,，\s]+/));
    if (as.size === 0 || bs.size === 0) return 0;
    let inter = 0; as.forEach(x => { if (bs.has(x)) inter++; });
    return inter / Math.max(as.size, bs.size);
  };
  const dups = [];
  for (let i = 0; i < state.cards.length; i++) {
    for (let j = i+1; j < state.cards.length; j++) {
      const a = state.cards[i], b = state.cards[j];
      const sa = sim(a.upright, b.upright), sb = sim(a.reversed, b.reversed), sk = sim(a.keywords, b.keywords);
      const avg = (sa + sb + sk) / 3;
      if (avg > 0.7) dups.push({ a: a.name, b: b.name, score: (avg*100).toFixed(0) });
    }
  }
  if (dups.length === 0) toast('✅ 未发现相似度 >70% 的卡牌');
  else toast(`⚠ 发现 ${dups.length} 对可能重复（相似度 >70%）`);
  return dups;
}

/* --- A12: 登录 IP 提示 --- */
function adminLoginInfo() {
  // 显示当前环境信息
  const info = `
    🌐 User-Agent: ${navigator.userAgent.slice(0, 50)}...
    📱 设备: ${/mobile/i.test(navigator.userAgent) ? '移动' : '桌面'}
    🕐 时区: ${Intl.DateTimeFormat().resolvedOptions().timeZone}
    🕐 时间: ${new Date().toLocaleString('zh-CN')}
  `;
  toast('🔍 ' + info.replace(/\n/g, ' | '));
}

/* --- A13: 完整 JSON 导出 --- */
document.addEventListener("click", (e) => {
  if (e.target.id === 'settings-export-full') {
    const full = {
      exportedAt: new Date().toISOString(),
      cards: state.cards,
      globalUprightRate: state.globalUprightRate,
      enabledSpreads: state.enabledSpreads,
      features: state.features,
      theme: state.theme,
    };
    const blob = new Blob([JSON.stringify(full, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tarot-config-full-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    toast('📤 完整配置已导出');
  }
});

/* --- A14: 试抽模拟器 --- */
function trialDraw(n = 3) {
  if (state.cards.length === 0) return toast('先加载卡牌', 'error');
  const disabled = new Set(state.cards.filter(c => !c.disabled).map(c => c.id));
  const pool = state.cards.filter(c => disabled.has(c.id));
  // 权重抽
  const drawn = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const total = pool.reduce((s,c) => s + (c.weight || 1), 0);
    let r = Math.random() * total;
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].weight || 1;
      if (r <= 0) { drawn.push({ card: pool[j], ori: Math.random() < (state.globalUprightRate ?? 0.5) }); pool.splice(j,1); break; }
    }
  }
  const modal = document.createElement("div");
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(6px);padding:20px;";
  modal.innerHTML = `
    <div style="color:var(--gold);font-size:1rem;margin-bottom:16px;">🧪 试抽模拟器（权重生效）</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">
      ${drawn.map(d => `<div style="text-align:center;">
        <img src="${d.card.imageUrl}" style="width:100px;height:160px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,0.2);">
        <div style="font-size:0.82rem;color:var(--text-white);margin-top:6px;">${d.card.name}</div>
        <div style="font-size:0.72rem;color:${d.ori ? '#64d8cb' : '#ff8a80'};">${d.ori ? '正位' : '逆位'}</div>
        <div style="font-size:0.68rem;color:var(--gold);">权重 ${d.card.weight}</div>
      </div>`).join('')}
    </div>
    <button style="margin-top:20px;padding:8px 20px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:var(--text-white);border-radius:14px;cursor:pointer;font-size:0.85rem;" onclick="this.closest('div[style*=backdrop-filter]').remove()">关闭</button>
  `;
  document.body.appendChild(modal);
}

/* --- A17: 撤销上次保存 --- */
let _stateBackup = null;
document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => { _stateBackup = JSON.parse(JSON.stringify(state)); });
  }
  const undoBtn = document.getElementById('undo-last-save');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      if (!_stateBackup) return toast('没有可撤销的保存');
      if (!confirm('撤销到上次保存前的状态？')) return;
      Object.assign(state, _stateBackup); _stateBackup = null;
      renderCardList(); refreshOverview(); selectCard(state.selectedId);
      toast('↩ 已撤销');
    });
  }
});

/* --- A16: 操作记录时间线 --- */
function renderAuditTimeline(logs) {
  const list = document.getElementById('d-snapshots-list');
  if (!list) return;
  // 不自动插入，等 loadAudit 时被调用
}

/* --- 自动注入 Admin v4 功能按钮（DOMContentLoaded） --- */
document.addEventListener("DOMContentLoaded", () => {
  injectThemePresets();

  // 卡牌 Tab 顶部加查重 + 试抽按钮
  const csvExport = document.getElementById('csv-export');
  if (csvExport && !document.getElementById('batch-dedup')) {
    const row = csvExport.parentElement;
    const btn1 = document.createElement("button");
    btn1.id = 'batch-dedup'; btn1.className = 'btn btn-secondary';
    btn1.style.cssText = "font-size:0.8rem;padding:6px 12px;"; btn1.textContent = '🔍 智能查重';
    btn1.addEventListener('click', () => {
      const dups = detectDuplicates();
      if (dups.length > 0) {
        alert(dups.slice(0,10).map(d => `${d.a} ↔ ${d.b} 相似度 ${d.score}%`).join('\n'));
      }
    });
    row.appendChild(btn1);

    const btn2 = document.createElement("button");
    btn2.id = 'trial-draw'; btn2.className = 'btn btn-secondary';
    btn2.style.cssText = "font-size:0.8rem;padding:6px 12px;"; btn2.textContent = '🧪 试抽';
    btn2.title = '用当前配置（含权重/禁用）试抽 3 张';
    btn2.addEventListener('click', () => trialDraw(3));
    row.appendChild(btn2);
  }

  // 全局设置 Tab 保存区加完整导出 + 撤销
  const exportBtn = document.getElementById('settings-export');
  if (exportBtn && !document.getElementById('settings-export-full')) {
    const row = exportBtn.parentElement;
    const b = document.createElement("button");
    b.id = 'settings-export-full'; b.className = 'btn btn-secondary';
    b.style.cssText = "padding:14px 20px;font-size:0.9rem;"; b.textContent = '📤 完整 JSON';
    row.appendChild(b);
  }

  // 概览 Tab 自动渲染 Dashboard
  const checkTab = setInterval(() => {
    if (document.querySelector('.admin-tab[data-tab="overview"]')) {
      document.querySelector('.admin-tab[data-tab="overview"]').addEventListener('click', () => renderDashboard());
      renderDashboard();
      clearInterval(checkTab);
    }
  }, 200);

}); // ← 闭合 946 行的 DOMContentLoaded

/* =====================================================
   ✨ v5 Admin — 20 个新功能 (A18b ~ A37b)
   纯前端，零 Worker 路由改动
   ===================================================== */
(function adminV5() {
  // ======== A27b: Tab 切换记忆位置 ========
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const tabs = document.querySelectorAll('.admin-tab');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          localStorage.setItem('admin_last_tab', tab.dataset.tab || tab.textContent.trim());
        });
      });
      const last = localStorage.getItem('admin_last_tab');
      if (last) {
        const target = document.querySelector(`.admin-tab[data-tab="${last}"]`);
        if (target) target.click();
      }
    }, 500);
  });

  // ======== A18b: renderDashboard 扩展 — 10 指标徽章 + A24b 饼图 Canvas ========
  const _origRenderDashboard = typeof renderDashboard === 'function' ? renderDashboard : null;
  if (_origRenderDashboard) {
    renderDashboard = function() {
      _origRenderDashboard();
      try {
        if (!window.AdminState?.config) return;
        const cards = window.AdminState.config.cards || [];
        const enabled = cards.filter(c => !c.disabled).length;
        const disabled = cards.filter(c => c.disabled).length;
        const majors = cards.filter(c => c.id.startsWith('M')).length;
        const minors = cards.length - majors;
        const weights = cards.filter(c => !c.disabled).map(c => c.weight || 1);
        const avgW = weights.length ? (weights.reduce((a,b)=>a+b,0)/weights.length).toFixed(2) : '—';
        const mean = weights.length ? weights.reduce((a,b)=>a+b,0)/weights.length : 0;
        const sigma = weights.length ? Math.sqrt(weights.reduce((a,b)=>a+(b-mean)**2,0)/weights.length).toFixed(2) : '—';
        const allKWs = new Set();
        cards.forEach(c => (c.keywords||[]).forEach(k => allKWs.add(k)));
        const themes = new Set(cards.map(c => c.theme || c.element || 'unknown'));
        const lastSave = localStorage.getItem('admin_config_ts');
        const snapCount = (localStorage.getItem('admin_snapshots') || '[]').length ? JSON.parse(localStorage.getItem('admin_snapshots')).length : 0;

        // 在概览 Tab 末尾追加 10 个徽章 + 饼图
        const overviewContent = document.querySelector('.admin-tab-content[data-content="overview"], .admin-overview, #tab-overview');
        const target = overviewContent || document.querySelector('.admin-tab-content.active, .admin-tab-content');
        if (target && !document.getElementById('v5-metrics-row')) {
          const row = document.createElement('div');
          row.id = 'v5-metrics-row';
          row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;';
          const metrics = [
            ['✅ 启用', enabled, '#64d8cb'],
            ['🚫 禁用', disabled, '#ff6b6b'],
            ['🌀 大调', majors, '#9d4edd'],
            ['🔱 小调', minors, '#d4af37'],
            ['⚖️ 均权', avgW, '#64d8cb'],
            ['σ 标准差', sigma, '#ffd93d'],
            ['🏷 关键词', allKWs.size, '#a78bfa'],
            ['🎨 主题', themes.size, '#64d8cb'],
            ['⏰ 上次保存', lastSave ? new Date(parseInt(lastSave)).toLocaleString().slice(0,16) : '—', '#d4af37'],
            ['📸 快照', snapCount, '#ffd93d'],
          ];
          metrics.forEach(([label, val, color]) => {
            const chip = document.createElement('div');
            chip.style.cssText = `padding:6px 12px;background:rgba(255,255,255,0.06);border:1px solid ${color}50;border-radius:14px;font-size:0.75rem;color:${color};`;
            chip.textContent = `${label}: ${val}`;
            row.appendChild(chip);
          });
          target.appendChild(row);

          // A24b 权重分布饼图
          try {
            const enabledCards = cards.filter(c => !c.disabled);
            const buckets = [0,1,2,3,4,5];
            const counts = buckets.map(b => enabledCards.filter(c => Math.round(c.weight||1) === b).length);
            const canvas = document.createElement('canvas');
            canvas.width = 120; canvas.height = 120;
            canvas.style.cssText = 'margin-top:12px;border-radius:50%;';
            const ctx = canvas.getContext('2d');
            const total = counts.reduce((a,b)=>a+b,0) || 1;
            const pieColors = ['#64d8cb','#d4af37','#9d4edd','#ff6b6b','#a78bfa','#ffd93d'];
            let startAngle = -Math.PI/2;
            counts.forEach((cnt, i) => {
              if (cnt === 0) return;
              const sliceAngle = (cnt/total) * Math.PI * 2;
              ctx.beginPath();
              ctx.moveTo(60, 60);
              ctx.arc(60, 60, 50, startAngle, startAngle + sliceAngle);
              ctx.fillStyle = pieColors[i];
              ctx.fill();
              startAngle += sliceAngle;
            });
            // 中心圆（环形饼图）
            ctx.beginPath();
            ctx.arc(60, 60, 28, 0, Math.PI * 2);
            ctx.fillStyle = '#1a0d3d';
            ctx.fill();
            ctx.fillStyle = '#d4af37';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(`${total}`, 60, 58);
            ctx.font = '8px sans-serif'; ctx.fillStyle = '#a090c8';
            ctx.fillText('启用卡', 60, 72);
            row.parentElement.insertBefore(canvas, row.nextSibling);

            // 图例
            const legend = document.createElement('div');
            legend.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;font-size:0.7rem;';
            buckets.forEach((b, i) => {
              const span = document.createElement('span');
              span.style.cssText = `color:${pieColors[i]};`;
              span.textContent = `权重${b}×${counts[i]}`;
              legend.appendChild(span);
            });
            row.parentElement.insertBefore(legend, canvas.nextSibling);
          } catch(ce) { /* 忽略 canvas 错误 */ }
        }
      } catch(e) { console.warn('[v5] dashboard ext error', e); }
    };
  }

  // ======== A19b + A20b: renderCardList 排序 + 禁用筛选 ========
  const _origRenderList = typeof renderCardList === 'function' ? renderCardList : null;
  let v5SortDir = 'none';   // none | asc | desc
  let v5FilterDisabled = false;
  if (_origRenderList) {
    renderCardList = function() {
      // 先调用原始
      _origRenderList();
      try {
        if (!window.AdminState?.config) return;
        // 找到列表容器
        const container = document.getElementById('card-list') || document.querySelector('.admin-card-list');
        if (!container || container.dataset.v5enhanced === '1') return;
        // 在列表顶部插入排序/筛选栏
        const bar = document.createElement('div');
        bar.dataset.v5enhanced = '1';
        bar.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;align-items:center;';
        bar.innerHTML = `
          <span style="color:var(--text-muted);font-size:0.75rem;">排序:</span>
          <button data-sort="none" class="v5-sort-btn" style="padding:3px 10px;border-radius:10px;border:1px solid var(--gold);background:transparent;color:var(--gold);font-size:0.7rem;">默认</button>
          <button data-sort="asc" class="v5-sort-btn" style="padding:3px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:var(--text-muted);font-size:0.7rem;">权重↑</button>
          <button data-sort="desc" class="v5-sort-btn" style="padding:3px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:var(--text-muted);font-size:0.7rem;">权重↓</button>
          <span style="margin-left:10px;color:var(--text-muted);font-size:0.75rem;">筛选:</span>
          <button data-filter="disabled" class="v5-filter-btn" style="padding:3px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:var(--text-muted);font-size:0.7rem;">🚫 仅禁用</button>
          <button data-filter="all" class="v5-filter-btn" style="padding:3px 10px;border-radius:10px;border:1px solid var(--gold);background:transparent;color:var(--gold);font-size:0.7rem;">全部</button>
          <button data-filter="enabled" class="v5-filter-btn" style="padding:3px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:var(--text-muted);font-size:0.7rem;">✅ 仅启用</button>
        `;
        container.parentElement.insertBefore(bar, container);
        bar.querySelectorAll('.v5-sort-btn').forEach(b => {
          b.addEventListener('click', () => { v5SortDir = b.dataset.sort; renderCardList(); });
        });
        bar.querySelectorAll('.v5-filter-btn').forEach(b => {
          b.addEventListener('click', () => { v5FilterDisabled = b.dataset.filter; renderCardList(); });
        });

        // 应用排序/筛选到 DOM
        const cards = [...container.querySelectorAll('.card-item')];
        let filteredCards = cards;
        if (v5FilterDisabled === 'disabled') filteredCards = cards.filter(c => c.dataset.disabled === 'true');
        else if (v5FilterDisabled === 'enabled') filteredCards = cards.filter(c => c.dataset.disabled !== 'true');
        if (v5SortDir === 'asc') filteredCards.sort((a,b) => (parseFloat(a.dataset.weight||0) - parseFloat(b.dataset.weight||0)));
        else if (v5SortDir === 'desc') filteredCards.sort((a,b) => (parseFloat(b.dataset.weight||0) - parseFloat(a.dataset.weight||0)));
        filteredCards.forEach(c => container.appendChild(c));

        // 更新按钮 active 态
        bar.querySelectorAll('.v5-sort-btn').forEach(b => {
          b.style.borderColor = b.dataset.sort === v5SortDir ? 'var(--gold)' : 'rgba(255,255,255,0.2)';
          b.style.color = b.dataset.sort === v5SortDir ? 'var(--gold)' : 'var(--text-muted)';
        });
        bar.querySelectorAll('.v5-filter-btn').forEach(b => {
          b.style.borderColor = b.dataset.filter === v5FilterDisabled ? 'var(--gold)' : 'rgba(255,255,255,0.2)';
          b.style.color = b.dataset.filter === v5FilterDisabled ? 'var(--gold)' : 'var(--text-muted)';
        });
      } catch(e) { console.warn('[v5] cardlist ext error', e); }
    };
  }

  // ======== A21b: selectCard 大预览 ========
  const _origSelectCard = typeof selectCard === 'function' ? selectCard : null;
  if (_origSelectCard) {
    selectCard = function(id) {
      _origSelectCard(id);
      try {
        const imgEl = document.querySelector('.admin-card-detail img, .detail-image, .card-detail img');
        if (imgEl) {
          imgEl.style.cssText = 'width:180px;height:300px;object-fit:cover;border-radius:10px;border:1px solid rgba(212,175,55,0.4);transition:transform .3s;cursor:zoom-in;';
          if (!imgEl.dataset.v5enhanced) {
            imgEl.dataset.v5enhanced = '1';
            imgEl.addEventListener('mouseenter', () => imgEl.style.transform = 'scale(1.08)');
            imgEl.addEventListener('mouseleave', () => imgEl.style.transform = 'scale(1)');
          }
        }
      } catch(e) {}
    };
  }

  // ======== A22b: saveToCloud 进度环 ========
  const _origSave = typeof saveToCloud === 'function' ? saveToCloud : null;
  if (_origSave) {
    saveToCloud = async function() {
      const btn = document.getElementById('save-btn') || document.getElementById('ov-save');
      const origText = btn?.textContent;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:v5-spin 0.8s linear infinite;"></span> 保存中...';
        if (!document.getElementById('v5-spin-keyframes')) {
          const kf = document.createElement('style');
          kf.id = 'v5-spin-keyframes';
          kf.textContent = '@keyframes v5-spin { to { transform: rotate(360deg); } }';
          document.head.appendChild(kf);
        }
      }
      try {
        const result = await _origSave();
        if (btn) { btn.innerHTML = '✅ 保存成功'; btn.style.background = '#10b981'; setTimeout(() => { btn.textContent = origText; btn.style.background = ''; btn.disabled = false; }, 1500); }
        return result;
      } catch(e) {
        if (btn) { btn.innerHTML = '❌ 保存失败'; btn.style.background = '#ef4444'; setTimeout(() => { btn.textContent = origText; btn.style.background = ''; btn.disabled = false; }, 2000); }
        throw e;
      }
    };
  }

  // ======== A23b: 一键重置默认值 ========
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      // 在全局设置 Tab 注入重置按钮
      const tabSettings = document.querySelector('.admin-tab[data-tab="settings"], .admin-tab[data-target*="setting"]');
      const tabList = document.querySelector('.admin-tabs, .admin-tab-bar');
      if (tabList && !document.getElementById('v5-reset-btn')) {
        const resetBtn = document.createElement('button');
        resetBtn.id = 'v5-reset-btn';
        resetBtn.className = 'btn btn-secondary';
        resetBtn.style.cssText = 'margin-left:auto;background:rgba(239,68,68,0.2);border:1px solid #ef4444;color:#ef4444;';
        resetBtn.textContent = '↩ 重置默认值';
        resetBtn.addEventListener('click', () => {
          if (!confirm('⚠ 确定要把所有卡牌权重/禁用/正位率重置为默认值吗？\n\n（不会删除卡牌本身，只重置数值）')) return;
          try {
            const freshDeck = window.TAROT_DECK || [];
            const freshByID = {};
            freshDeck.forEach(c => freshByID[c.id] = c);
            if (window.AdminState?.config?.cards) {
              window.AdminState.config.cards = window.AdminState.config.cards.map(card => {
                const fresh = freshByID[card.id];
                if (!fresh) return card;
                return {
                  ...card,
                  weight: fresh.weight ?? card.weight,
                  uprightRate: fresh.uprightRate ?? card.uprightRate,
                  disabled: false,
                  keywords: [...(fresh.keywords||[])],
                };
              });
              window.AdminState.config.theme = { ...(freshByID.theme || { gold:'#d4af37', purple:'#9d4edd', teal:'#64d8cb' }) };
            }
            // 刷新 UI
            if (typeof renderCardList === 'function') renderCardList();
            if (typeof renderDashboard === 'function') renderDashboard();
            toast('✨ 已重置为默认值！', 'success');
            // 自动保存
            if (typeof saveToCloud === 'function') saveToCloud().catch(()=>{});
          } catch(e) { toast('❌ 重置失败: ' + e.message, 'error'); }
        });
        tabList.appendChild(resetBtn);
      }

      // A29b: 密码输入框眼睛
      const pwdInput = document.querySelector('#login-password, input[type="password"]');
      if (pwdInput && !document.getElementById('v5-pwd-eye')) {
        pwdInput.parentElement.style.position = 'relative';
        pwdInput.style.paddingRight = '36px';
        const eye = document.createElement('button');
        eye.id = 'v5-pwd-eye';
        eye.type = 'button';
        eye.innerHTML = '👁';
        eye.style.cssText = 'position:absolute;right:8px;top:50%;transform:translateY(-50%);background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:1rem;padding:2px;';
        eye.addEventListener('click', () => {
          const isPwd = pwdInput.type === 'password';
          pwdInput.type = isPwd ? 'text' : 'password';
          eye.innerHTML = isPwd ? '🙈' : '👁';
        });
        pwdInput.parentElement.appendChild(eye);
      }

      // A28b: 概览 Tab 悬浮快速操作栏
      if (!document.getElementById('v5-quick-bar')) {
        const bar = document.createElement('div');
        bar.id = 'v5-quick-bar';
        bar.style.cssText = 'position:fixed;right:16px;bottom:24px;display:flex;flex-direction:column;gap:6px;z-index:100;';
        bar.innerHTML = `
          <button class="v5-quick" data-tab="cards" title="卡牌编辑" style="width:44px;height:44px;border-radius:50%;border:1px solid rgba(212,175,55,0.5);background:rgba(26,13,61,0.85);backdrop-filter:blur(6px);color:var(--gold);font-size:1rem;cursor:pointer;">🎴</button>
          <button class="v5-quick" data-action="random" title="一键随机权重" style="width:44px;height:44px;border-radius:50%;border:1px solid rgba(157,78,221,0.5);background:rgba(26,13,61,0.85);backdrop-filter:blur(6px);color:#9d4edd;font-size:1rem;cursor:pointer;">🎲</button>
          <button class="v5-quick" data-tab="dev" title="开发者工具" style="width:44px;height:44px;border-radius:50%;border:1px solid rgba(100,216,203,0.5);background:rgba(26,13,61,0.85);backdrop-filter:blur(6px);color:#64d8cb;font-size:1rem;cursor:pointer;">🛠</button>
        `;
        document.body.appendChild(bar);
        bar.querySelectorAll('.v5-quick').forEach(b => {
          b.addEventListener('click', () => {
            const tab = b.dataset.tab;
            if (tab) {
              document.querySelector(`.admin-tab[data-tab="${tab}"]`)?.click();
            } else if (b.dataset.action === 'random') {
              if (!confirm('所有卡牌权重 → 0-3 随机？')) return;
              if (window.AdminState?.config?.cards) {
                window.AdminState.config.cards.forEach(c => { c.weight = Math.round(Math.random() * 3 * 100) / 100; });
                if (typeof renderCardList === 'function') renderCardList();
                toast('🎲 权重已随机！', 'success');
              }
            }
          });
        });
      }

      // A34b: Tab 徽章 (禁用 X 张 / 快照 N 个)
      const badgeTabs = document.querySelectorAll('.admin-tab');
      const cardsTab = [...badgeTabs].find(t => (t.dataset.tab === 'cards' || t.dataset.target?.includes('card')));
      if (cardsTab && !cardsTab.querySelector('.v5-badge')) {
        const badge = document.createElement('span');
        badge.className = 'v5-badge';
        badge.style.cssText = 'margin-left:6px;padding:1px 7px;border-radius:10px;background:rgba(239,68,68,0.2);color:#ef4444;font-size:0.65rem;display:inline-block;';
        badge.textContent = '🚫 0';
        cardsTab.appendChild(badge);
      }
      // 每 3 秒更新徽章
      setInterval(() => {
        if (window.AdminState?.config?.cards) {
          const disabled = window.AdminState.config.cards.filter(c => c.disabled).length;
          const tab = document.querySelector('.admin-tab .v5-badge');
          if (tab) tab.textContent = `🚫 ${disabled}`;
        }
      }, 3000);

    }, 800);
  });

  // ======== A31b: 主题预设实时预览 ========
  const _origInjectThemes = typeof injectThemePresets === 'function' ? injectThemePresets : null;
  if (_origInjectThemes) {
    injectThemePresets = function() {
      _origInjectThemes();
      try {
        const row = document.getElementById('theme-presets');
        if (!row || row.dataset.v5preview === '1') return;
        row.dataset.v5preview = '1';
        const THEMES = [
          { name:'星空', gold:'#d4af37', purple:'#9d4edd', teal:'#64d8cb' },
          { name:'极光', gold:'#ffd93d', purple:'#06d6a0', teal:'#118ab2' },
          { name:'暖金', gold:'#ff9f1c', purple:'#bc6c25', teal:'#2a9d8f' },
          { name:'冷紫', gold:'#c9ada7', purple:'#5a189a', teal:'#9d4edd' },
          { name:'薄荷', gold:'#e0aaff', purple:'#7b2cbf', teal:'#06d6a0' },
        ];
        // 在每个预设按钮旁加 mini 预览
        const btns = row.querySelectorAll('button, .theme-preset-btn');
        btns.forEach((btn, i) => {
          if (i >= THEMES.length) return;
          const theme = THEMES[i];
          const preview = document.createElement('div');
          preview.style.cssText = `position:absolute;top:-30px;left:50%;transform:translateX(-50%);width:40px;height:60px;border-radius:4px;background:linear-gradient(135deg,${theme.gold},${theme.purple});border:1px solid ${theme.gold};pointer-events:none;opacity:0;transition:opacity .2s;z-index:10;`;
          preview.innerHTML = `<div style="position:absolute;top:4px;left:4px;right:4px;height:4px;background:${theme.teal};border-radius:2px;"></div>`;
          btn.style.position = 'relative';
          btn.appendChild(preview);
          btn.addEventListener('mouseenter', () => preview.style.opacity = '1');
          btn.addEventListener('mouseleave', () => preview.style.opacity = '0');
        });
      } catch(e) {}
    };
  }

  // ======== A33b + A36b + trialDraw 扩展：选牌阵 + 显示权重 ========
  const _origTrialDraw = typeof trialDraw === 'function' ? trialDraw : null;
  if (_origTrialDraw) {
    trialDraw = function(n) {
      // 调用原始 trialDraw
      _origTrialDraw(n);
      try {
        // 给试抽输出卡片追加权重显示
        setTimeout(() => {
          document.querySelectorAll('.trial-card, .admin-trial-card').forEach(el => {
            if (el.dataset.v5weighted) return;
            const cardId = el.dataset.cardId;
            if (!cardId || !window.AdminState?.config?.cards) return;
            const card = window.AdminState.config.cards.find(c => c.id === cardId);
            if (!card) return;
            const weights = window.AdminState.config.cards.filter(c => !c.disabled).map(c => c.weight||1);
            const totalW = weights.reduce((a,b)=>a+b,0) || 1;
            const prob = ((card.weight||1) / totalW * 100).toFixed(1);
            const info = document.createElement('div');
            info.style.cssText = 'position:absolute;bottom:2px;left:2px;right:2px;font-size:0.6rem;color:var(--gold);background:rgba(0,0,0,0.6);border-radius:2px;padding:2px 4px;text-align:center;';
            info.textContent = `权重 ${card.weight || 1} · 概率 ${prob}%`;
            el.style.position = 'relative';
            el.appendChild(info);
            el.dataset.v5weighted = '1';
          });
        }, 100);
      } catch(e) {}
    };

    // 给试抽按钮注入牌阵下拉
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        const trialBtn = document.querySelector('[onclick*="trialDraw"], [data-action="trial"]');
        if (trialBtn && !document.getElementById('v5-trial-select')) {
          const select = document.createElement('select');
          select.id = 'v5-trial-select';
          select.style.cssText = 'margin-right:8px;padding:4px 10px;border-radius:6px;background:rgba(255,255,255,0.08);color:var(--gold);border:1px solid rgba(212,175,55,0.4);font-size:0.8rem;';
          select.innerHTML = `
            <option value="1">🎴 单牌 (1)</option>
            <option value="3" selected>🔱 三牌阵 (3)</option>
            <option value="5">⭐ 五牌阵 (5)</option>
            <option value="7">🌙 七牌阵 (7)</option>
          `;
          trialBtn.parentElement.insertBefore(select, trialBtn);
          trialBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const n = parseInt(select.value);
            trialDraw(n);
          }, { once: true }); // 覆盖原有绑定后重新绑定
        }
      }, 1200);
    });
  }

  // ======== A30b + A35b: 批量删除 + 撤销 5 步历史 ========
  let v5SaveHistory = [];
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      // 在卡牌列表加 checkbox 和批量按钮
      const listContainer = document.getElementById('card-list') || document.querySelector('.admin-card-list');
      if (listContainer && !listContainer.dataset.v5batch) {
        listContainer.dataset.v5batch = '1';
        // 给每个 card-item 加 checkbox（事件委托）
        listContainer.addEventListener('DOMNodeInserted', (e) => {
          if (e.target.classList?.contains('card-item') && !e.target.querySelector('.v5-chk')) {
            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.className = 'v5-chk';
            chk.style.cssText = 'position:absolute;top:4px;left:4px;width:14px;height:14px;accent-color:#d4af37;cursor:pointer;';
            chk.addEventListener('click', ev => ev.stopPropagation());
            e.target.style.position = 'relative';
            e.target.appendChild(chk);
          }
        });
        // 批量操作按钮
        const batchBar = document.createElement('div');
        batchBar.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';
        batchBar.innerHTML = `
          <button id="v5-batch-disable" class="btn btn-secondary" style="padding:6px 12px;font-size:0.75rem;background:rgba(239,68,68,0.15);border-color:#ef4444;color:#ef4444;">🚫 批量禁用</button>
          <button id="v5-batch-enable" class="btn btn-secondary" style="padding:6px 12px;font-size:0.75rem;background:rgba(16,185,129,0.15);border-color:#10b981;color:#10b981;">✅ 批量启用</button>
          <button id="v5-batch-none" class="btn btn-secondary" style="padding:6px 12px;font-size:0.75rem;">🔄 取消全选</button>
          <button id="v5-undo" class="btn btn-secondary" style="padding:6px 12px;font-size:0.75rem;background:rgba(212,175,55,0.2);border-color:#d4af37;color:#d4af37;">↩ 撤销 (0)</button>
        `;
        listContainer.parentElement.insertBefore(batchBar, listContainer);
        document.getElementById('v5-batch-disable').addEventListener('click', () => v5BatchToggle(true));
        document.getElementById('v5-batch-enable').addEventListener('click', () => v5BatchToggle(false));
        document.getElementById('v5-batch-none').addEventListener('click', () => listContainer.querySelectorAll('.v5-chk').forEach(c => c.checked = false));
        document.getElementById('v5-undo').addEventListener('click', () => v5Undo());
      }

      // A32b: 禁用卡自定义原因 textarea
      setTimeout(() => {
        const disabledToggle = document.querySelector('.admin-card-detail input[type="checkbox"], [data-disabled-toggle]');
        if (disabledToggle && !document.getElementById('v5-disable-reason')) {
          const reasonBox = document.createElement('div');
          reasonBox.id = 'v5-disable-reason';
          reasonBox.style.cssText = 'margin-top:6px;';
          reasonBox.innerHTML = `<textarea placeholder="禁用原因（可选）…" rows="2" style="width:100%;padding:6px;background:rgba(255,255,255,0.06);border:1px solid rgba(212,175,55,0.3);border-radius:6px;color:var(--text-white);font-size:0.78rem;resize:vertical;box-sizing:border-box;"></textarea>`;
          disabledToggle.parentElement.parentElement.appendChild(reasonBox);
        }
      }, 1500);
    }, 800);
  });

  function v5BatchToggle(disabled) {
    const ids = [...document.querySelectorAll('.v5-chk:checked')].map(c => c.closest('.card-item')?.dataset.id).filter(Boolean);
    if (!ids.length) { toast('⚠ 请先勾选卡牌', ''); return; }
    if (window.AdminState?.config?.cards) {
      ids.forEach(id => {
        const card = window.AdminState.config.cards.find(c => c.id === id);
        if (card) card.disabled = disabled;
      });
      // 保存历史（A35b）
      v5SaveHistory.push(JSON.stringify(window.AdminState.config));
      if (v5SaveHistory.length > 5) v5SaveHistory.shift();
      if (typeof renderCardList === 'function') renderCardList();
      toast(`${disabled ? '🚫 已禁用' : '✅ 已启用'} ${ids.length} 张卡`, 'success');
      // 更新撤销按钮计数
      const undoBtn = document.getElementById('v5-undo');
      if (undoBtn) undoBtn.textContent = `↩ 撤销 (${v5SaveHistory.length})`;
    }
  }

  function v5Undo() {
    if (!v5SaveHistory.length) { toast('⚠ 没有可撤销的操作', ''); return; }
    const prev = v5SaveHistory.pop();
    try {
      window.AdminState.config = JSON.parse(prev);
      if (typeof renderCardList === 'function') renderCardList();
      toast('↩ 已撤销上一步', 'success');
    } catch(e) { toast('❌ 撤销失败', 'error'); }
    const undoBtn = document.getElementById('v5-undo');
    if (undoBtn) undoBtn.textContent = `↩ 撤销 (${v5SaveHistory.length})`;
  }

  // A37b: CSV 导入自动修 webp
  const _origImportJson = typeof importJson === 'function' ? importJson : null;
  if (_origImportJson) {
    importJson = function(e) {
      // 预读文件内容，替换 .png → .webp
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          let text = reader.result;
          text = text.replace(/images\/([^"'\s,}]+\.png)/g, (_, fn) => `images-webp/${fn.replace('.png','.webp')}`);
          // 临时替换文件内容
          const fakeFile = new File([text], file.name, { type: 'application/json' });
          Object.defineProperty(e.target, 'files', { value: [fakeFile] });
          _origImportJson(e);
        };
        reader.readAsText(file);
        e.preventDefault();
        return;
      }
      _origImportJson(e);
    };
  }

  // ======== A35b: 保存时自动写入 5 步历史 ========
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      // monkey-patch 保存按钮的点击：先存快照再保存
      const saveBtn = document.getElementById('save-btn') || document.getElementById('ov-save');
      if (saveBtn) {
        const origClick = saveBtn.onclick;
        saveBtn.addEventListener('click', () => {
          if (window.AdminState?.config) {
            v5SaveHistory.push(JSON.stringify(window.AdminState.config));
            if (v5SaveHistory.length > 5) v5SaveHistory.shift();
            const undoBtn = document.getElementById('v5-undo');
            if (undoBtn) undoBtn.textContent = `↩ 撤销 (${v5SaveHistory.length})`;
          }
        }, { capture: true });
      }
    }, 1500);
  });

})();
/* ======== v5 Admin 结束 ======== */
