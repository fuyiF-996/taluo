/**
 * cabbage塔罗 设置面板 —— 主题切换 + 音效/振动/转译开关
 */
(function() {
  const STORAGE_KEY = "tarot_settings";
  const DEFAULT = {
    theme: "",              // "" = 跟随 CloudConfig.globalTheme
    sound: true,
    vibrate: true,
    keywordFilter: true,
  };

  function load() {
    try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
    catch { return { ...DEFAULT }; }
  }
  function save(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

  function getEffectiveTheme() {
    const s = load();
    if (s.theme) return s.theme;
    // 跟随云端配置
    if (window.CloudConfig && window.CloudConfig.globalTheme) return window.CloudConfig.globalTheme;
    return "dark";
  }

  // ---------- 液态玻璃鼠标跟随高光（Apple 签名效果） ----------
  let _mouseRaf = null;
  let _liquidActive = false;
  const GLASS_SELECTORS = ".glass-card, .lib-modal-card, .settings-panel, .history-drawer, .capsule-item, .lib-card";

  function startLiquidMouseGlow() {
    if (_liquidActive) return;
    _liquidActive = true;
    document.addEventListener("mousemove", _onMouse, { passive: true });
  }
  function stopLiquidMouseGlow() {
    _liquidActive = false;
    document.removeEventListener("mousemove", _onMouse);
  }
  function _onMouse(e) {
    if (_mouseRaf) return;
    _mouseRaf = requestAnimationFrame(() => {
      _mouseRaf = null;
      const el = e.target.closest(GLASS_SELECTORS);
      if (el) {
        const r = el.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * 100;
        const py = ((e.clientY - r.top) / r.height) * 100;
        el.style.setProperty("--mx", Math.max(0, Math.min(100, px)) + "%");
        el.style.setProperty("--my", Math.max(0, Math.min(100, py)) + "%");

        // ✨ C5: 3D 视差倾斜（液态玻璃专属）
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const tiltX = ((e.clientY - cy) / r.height) * -6;  // 最大 ±6°
        const tiltY = ((e.clientX - cx) / r.width) * 6;
        // 卡牌内部 .card-3d 不倾斜（保持翻牌功能），只有 glass-card / lib-card 等大容器
        if (el.classList.contains("glass-card") || el.classList.contains("lib-card") || el.classList.contains("lib-modal-card")) {
          el.style.setProperty("--tilt-x", tiltX.toFixed(2) + "deg");
          el.style.setProperty("--tilt-y", tiltY.toFixed(2) + "deg");
        }
      }
      document.body.style.setProperty("--mouse-x", e.clientX + "px");
      document.body.style.setProperty("--mouse-y", e.clientY + "px");
    });
  }

  function applyTheme(theme) {
    document.body.removeAttribute("data-theme");
    if (theme === "liquid") {
      document.body.setAttribute("data-theme", "liquid");
      startLiquidMouseGlow();
    } else {
      stopLiquidMouseGlow();
    }
  }

  window.TarotSettings = {
    load, save, applyTheme, getEffectiveTheme,
  };

  // DOM 就绪后挂载设置面板 HTML + 事件
  document.addEventListener("DOMContentLoaded", () => {
    // 确保只挂一次
    if (document.getElementById("settings-panel")) return;

    // 浮动按钮
    const fab = document.createElement("button");
    fab.className = "settings-fab";
    fab.id = "settings-fab";
    fab.textContent = "⚙";
    fab.title = "设置";
    document.body.appendChild(fab);

    // 设置面板
    const panel = document.createElement("div");
    panel.className = "settings-panel";
    panel.id = "settings-panel";
    panel.innerHTML = `
      <h3>⚙ 设置</h3>
      <div class="settings-row">
        <span>主题</span>
        <div class="theme-btns">
          <button class="theme-btn" data-t="dark">🌙 星空紫</button>
          <button class="theme-btn" data-t="liquid">💎 液态玻璃</button>
        </div>
      </div>
      <div class="settings-row">
        <span>🔊 翻牌音效</span>
        <label class="switch"><input type="checkbox" id="s-sound"><span class="slider"></span></label>
      </div>
      <div class="settings-row">
        <span>📳 翻牌振动</span>
        <label class="switch"><input type="checkbox" id="s-vibrate"><span class="slider"></span></label>
      </div>
      <div class="settings-row">
        <span>🛡️ 敏感词转译</span>
        <label class="switch"><input type="checkbox" id="s-kw"><span class="slider"></span></label>
      </div>
    `;
    document.body.appendChild(panel);

    const settings = load();

    // 主题按钮激活态
    const effective = getEffectiveTheme();
    panel.querySelectorAll(".theme-btn").forEach(b => {
      if (b.dataset.t === effective) b.classList.add("active");
      b.addEventListener("click", () => {
        const theme = b.dataset.t;
        settings.theme = theme;
        save(settings);
        applyTheme(theme);
        panel.querySelectorAll(".theme-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
      });
    });

    // 开关们
    const soundEl = panel.querySelector("#s-sound");
    const vibEl = panel.querySelector("#s-vibrate");
    const kwEl = panel.querySelector("#s-kw");
    soundEl.checked = settings.sound;
    vibEl.checked = settings.vibrate;
    kwEl.checked = settings.keywordFilter;
    soundEl.addEventListener("change", e => { settings.sound = e.target.checked; save(settings); });
    vibEl.addEventListener("change", e => { settings.vibrate = e.target.checked; save(settings); });
    kwEl.addEventListener("change", e => { settings.keywordFilter = e.target.checked; save(settings); });

    // FAB 开关面板
    fab.addEventListener("click", () => panel.classList.toggle("open"));

    // 点击面板外关闭
    document.addEventListener("click", (e) => {
      if (!panel.classList.contains("open")) return;
      if (panel.contains(e.target) || fab.contains(e.target)) return;
      panel.classList.remove("open");
    });

    // 初始应用主题
    applyTheme(effective);
  });
})();
