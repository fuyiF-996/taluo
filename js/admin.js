/**
 * ============================================================================
 * 小应塔罗 · 管理后台 主逻辑
 * ============================================================================
 * 
 * 流程：
 * 1. 检查 sessionStorage 里是否已登录（localStorage 也会记一份密码摘要）
 * 2. 未登录 → 显示登录页 → POST /login → 成功后切换到后台
 * 3. 登录后拉云端现有配置（GET /），没有就用 TAROT_DECK 初始化
 * 4. 渲染 78 行编辑表格（权重 + 正/逆位文字）
 * 5. 保存时 POST /save（带密码）
 * 6. 导出 JSON 下载本地文件
 * ============================================================================
 */


/* ==================== API 地址 ==================== */
// 使用 config-sync.js 挂到 window 的值（如果 admin.html 也引入了 config-sync.js）
// admin.html 里同时引入 config-sync.js 和 admin.js，API_BASE 已经在 config-sync.js 里声明过了


/* ==================== 页面状态 ==================== */
let state = {
  loggedIn: false,
  cards: [],          // [{id, name, nameEn, weight, upright, reversed}]
  uprightRate: 50,
  currentFilter: "all",
  searchKey: "",
};


/* ==================== DOM 快捷引用 ==================== */
const $ = sel => document.querySelector(sel);


/* ==================== 启动 ==================== */
document.addEventListener("DOMContentLoaded", async () => {
  
  // 检查 sessionStorage
  if (sessionStorage.getItem("tarot_admin_logged") === "1") {
    state.loggedIn = true;
    showAdmin();
  } else {
    bindLogin();
  }
  
  // 退出按钮
  $("#logout-btn")?.addEventListener("click", () => {
    sessionStorage.removeItem("tarot_admin_logged");
    location.reload();
  });
});


/* ==================== 登录 ==================== */
function bindLogin() {
  const pwdInput = $("#login-password");
  const btn = $("#login-btn");
  
  // 回车登录
  pwdInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });
  btn.addEventListener("click", doLogin);
}

async function doLogin() {
  const pwd = $("#login-password").value.trim();
  if (!pwd) {
    toast("请输入密码", "error");
    return;
  }
  
  const btn = $("#login-btn");
  btn.disabled = true;
  btn.textContent = "验证中...";
  
  try {
    const resp = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd }),
    });
    const data = await resp.json();
    
    if (resp.ok && data.ok) {
      sessionStorage.setItem("tarot_admin_logged", "1");
      state.loggedIn = true;
      showAdmin();
    } else {
      toast(data.error || "密码错误", "error");
    }
  } catch (err) {
    toast("网络错误：" + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "登录";
  }
}


/* ==================== 进入后台 ==================== */
async function showAdmin() {
  $("#login-page").style.display = "none";
  $("#admin-page").style.display = "block";
  
  // 初始化 state.cards 为当前 TAROT_DECK 的拷贝
  state.cards = TAROT_DECK.map(card => ({
    id: card.id,
    name: card.name,
    nameEn: card.nameEn,
    weight: 1,           // 默认权重 1
    upright: card.upright,
    reversed: card.reversed,
  }));
  
  // 绑定筛选/搜索
  $("#search").addEventListener("input", (e) => {
    state.searchKey = e.target.value.trim().toLowerCase();
    renderTable();
  });
  document.querySelectorAll(".btn-filter").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.currentFilter = btn.dataset.filter;
      renderTable();
    });
  });
  
  // 全局概率滑块
  const slider = $("#upright-rate");
  const valSpan = $("#upright-rate-val");
  slider.addEventListener("input", () => {
    state.uprightRate = parseInt(slider.value, 10);
    valSpan.textContent = state.uprightRate;
  });
  
  // 加载/保存/导出
  $("#load-btn").addEventListener("click", loadFromCloud);
  $("#save-btn").addEventListener("click", saveToCloud);
  $("#export-btn").addEventListener("click", exportJson);
  
  // 先渲染一次（用本地默认值）
  renderTable();
  
  // 尝试从云端拉已有配置
  await loadFromCloud(false); // false = 静默模式，失败不弹窗
}


/* ==================== 从云端加载已有配置 ==================== */
async function loadFromCloud(showToast = true) {
  setApiStatus("loading", "加载中...");
  
  try {
    const resp = await fetch(`${API_BASE}/`, {
      headers: { "Accept": "application/json" },
    });
    const data = await resp.json();
    
    if (resp.ok && data.ok && data.config) {
      const cfg = data.config;
      
      // 全局概率
      if (typeof cfg.globalUprightRate === "number") {
        state.uprightRate = cfg.globalUprightRate;
        $("#upright-rate").value = state.uprightRate;
        $("#upright-rate-val").textContent = state.uprightRate;
      }
      
      // 每张牌覆盖
      if (Array.isArray(cfg.cards)) {
        cfg.cards.forEach(cloudCard => {
          const local = state.cards.find(c => c.id === cloudCard.id);
          if (!local) return;
          if (typeof cloudCard.weight === "number") local.weight = cloudCard.weight;
          if (typeof cloudCard.upright === "string") local.upright = cloudCard.upright;
          if (typeof cloudCard.reversed === "string") local.reversed = cloudCard.reversed;
        });
      }
      
      renderTable();
      setApiStatus("ok", "云端配置已同步");
      if (showToast) toast("已从云端加载配置 ✓");
    } else {
      // 没有配置或 KV 为空
      setApiStatus("ok", "云端暂无配置（使用默认值）");
      if (showToast) toast("云端暂无配置，已用默认值填充");
    }
  } catch (err) {
    setApiStatus("err", "API 不可达");
    if (showToast) toast("加载失败：" + err.message, "error");
  }
}


/* ==================== 保存到云端 ==================== */
async function saveToCloud() {
  const pwd = prompt("请输入管理员密码以确认保存：");
  if (!pwd) return;
  
  // 收集当前 state 为 config 格式
  const config = {
    globalUprightRate: state.uprightRate,
    cards: state.cards.map(c => ({
      id: c.id,
      weight: Number(c.weight) || 1,
      upright: c.upright,
      reversed: c.reversed,
    })),
  };
  
  const btn = $("#save-btn");
  btn.disabled = true;
  btn.textContent = "保存中...";
  
  try {
    const resp = await fetch(`${API_BASE}/save`, {
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
  } finally {
    btn.disabled = false;
    btn.textContent = "💾 保存到云端";
  }
}


/* ==================== 导出 JSON 本地备份 ==================== */
function exportJson() {
  const config = {
    exportedAt: new Date().toISOString(),
    globalUprightRate: state.uprightRate,
    cards: state.cards.map(c => ({
      id: c.id,
      name: c.name,
      weight: Number(c.weight) || 1,
      upright: c.upright,
      reversed: c.reversed,
    })),
  };
  
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  a.href = url;
  a.download = `tarot-config-${ts}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  toast("💾 已导出备份 JSON");
}


/* ==================== 渲染卡牌表格 ==================== */
function renderTable() {
  const tbody = $("#card-tbody");
  tbody.innerHTML = "";
  
  // 筛选 + 搜索
  const visibleCards = state.cards.filter(c => {
    // 搜索
    if (state.searchKey) {
      const haystack = (c.name + c.nameEn + c.id).toLowerCase();
      if (!haystack.includes(state.searchKey)) return false;
    }
    // 分类筛选
    if (state.currentFilter === "all") return true;
    if (state.currentFilter === "major") return c.id.startsWith("M");
    if (state.currentFilter === "wands") return c.id.startsWith("W");
    if (state.currentFilter === "cups") return c.id.startsWith("C");
    if (state.currentFilter === "swords") return c.id.startsWith("S");
    if (state.currentFilter === "pents") return c.id.startsWith("P");
    return true;
  });
  
  $("#card-count").textContent = `显示 ${visibleCards.length} / ${state.cards.length}`;
  
  visibleCards.forEach(card => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="card-name">
        ${escapeHtml(card.name)}
        <small>${escapeHtml(card.nameEn)}</small>
      </td>
      <td class="wtd">
        <input type="number" min="0" max="999" step="0.1" value="${card.weight}"
               data-id="${card.id}" data-field="weight">
      </td>
      <td>
        <textarea rows="2" data-id="${card.id}" data-field="upright">${escapeHtml(card.upright)}</textarea>
      </td>
      <td>
        <textarea rows="2" data-id="${card.id}" data-field="reversed">${escapeHtml(card.reversed)}</textarea>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  // 绑定所有 input / textarea 的修改 → 直接同步到 state
  tbody.querySelectorAll("input, textarea").forEach(el => {
    el.addEventListener("input", () => {
      const id = el.dataset.id;
      const field = el.dataset.field;
      const target = state.cards.find(c => c.id === id);
      if (target) {
        if (field === "weight") {
          target.weight = Number(el.value) || 1;
        } else {
          target[field] = el.value;
        }
      }
    });
  });
}


/* ==================== API 状态指示 ==================== */
function setApiStatus(type, text) {
  const el = $("#api-status");
  el.className = "api-status " + type;
  el.textContent = "API: " + text;
}


/* ==================== Toast 通知 ==================== */
let toastTimer = null;
function toast(msg, type = "") {
  const el = $("#toast");
  el.textContent = msg;
  el.className = "toast " + type;
  requestAnimationFrame(() => el.classList.add("show"));
  
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 2500);
}


/* ==================== 工具 ==================== */
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
