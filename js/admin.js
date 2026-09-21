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
