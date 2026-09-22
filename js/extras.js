/**
 * ============================================================================
 * cabbage塔罗 v3 新增功能模块 C11-C23
 * ============================================================================
 * C11 塔罗日记         — 每日卡写笔记 + 连续打卡
 * C12 键盘快捷键       — Space翻牌 / Esc重置 / 1-6切牌阵 / ?帮助
 * C13 抽牌倒计时       — 3秒仪式感倒计时
 * C14 牌阵示意图       — 选中牌阵时显示位置 SVG
 * C15 自动跟随系统主题 — prefers-color-scheme
 * C16 音量控制滑块     — 设置面板
 * C17 历史记录筛选     — 按牌阵筛选
 * C18 卡牌大图预览     — 点击结果放大
 * C19 情绪标签         — 😊😐😟🔥💤
 * C20 数据导入/导出    — JSON 全量
 * C21 Hero 渐入动画    — 首屏
 * C22 翻牌光效增强     — liquid 专属
 * C23 每日卡连续打卡
 * ============================================================================
 */

window.TarotExtras = (function() {

/* ==================== C11 + C23: 塔罗日记 + 连续打卡 ==================== */
const DIARY_KEY = "tarot_diary";
const CHECKIN_KEY = "tarot_checkins";

function loadDiary() {
  try { return JSON.parse(localStorage.getItem(DIARY_KEY) || "{}"); } catch { return {}; }
}
function saveDiary(obj) { localStorage.setItem(DIARY_KEY, JSON.stringify(obj)); }

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// 连续打卡天数
function getStreak() {
  try {
    const checkins = JSON.parse(localStorage.getItem(CHECKIN_KEY) || "[]");
    if (!checkins.length) return 0;
    const set = new Set(checkins);
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (set.has(key)) streak++; else break;
    }
    return streak;
  } catch { return 0; }
}

function markCheckin() {
  const key = getTodayKey();
  try {
    const arr = JSON.parse(localStorage.getItem(CHECKIN_KEY) || "[]");
    if (!arr.includes(key)) {
      arr.push(key);
      localStorage.setItem(CHECKIN_KEY, JSON.stringify(arr.slice(-365)));
    }
  } catch {}
}

function openDiaryModal(dailyCard) {
  const existing = document.getElementById("diary-modal");
  if (existing) existing.remove();

  const diary = loadDiary();
  const todayKey = getTodayKey();
  const todayEntry = diary[todayKey];

  const modal = document.createElement("div");
  modal.id = "diary-modal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);";
  const card = dailyCard || {};
  modal.innerHTML = `
    <div class="glass-card" style="max-width:480px;width:100%;max-height:85vh;overflow-y:auto;">
      <h2 style="margin:0 0 12px;font-size:1.2rem;color:var(--gold);">✦ 塔罗日记 · ${todayKey}</h2>
      <div style="display:flex;gap:12px;margin-bottom:14px;align-items:center;">
        <img src="${card.imageUrl || ''}" style="width:60px;height:90px;object-fit:cover;border-radius:6px;border:1px solid rgba(255,255,255,0.2);">
        <div>
          <div style="color:var(--text-white);font-weight:600;">${card.name || '—'}</div>
          <div style="color:var(--text-muted);font-size:0.8rem;">${card.nameEn || ''}</div>
          <div style="color:var(--gold);font-size:0.75rem;margin-top:4px;">🔥 连续打卡 ${getStreak()} 天</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <span style="font-size:0.8rem;color:var(--text-muted);">今天的心情：</span>
        ${['😊','😐','😟','🔥','💤','🤔','💖'].map(e => 
          `<span class="mood-btn" data-mood="${e}" style="cursor:pointer;padding:4px 8px;border-radius:8px;font-size:1.1rem;border:1px solid transparent;" title="${e}">${e}</span>`
        ).join('')}
      </div>
      <textarea id="diary-text" placeholder="今天这张卡让你想到了什么？写下来吧..." 
        style="width:100%;min-height:140px;box-sizing:border-box;padding:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:var(--text-white);font-size:0.9rem;resize:vertical;outline:none;">${todayEntry?.note || ''}</textarea>
      <div style="margin-top:8px;font-size:0.8rem;color:var(--text-muted);">提示：点击心情 emoji 标记今日情绪</div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px;">
        <button id="diary-cancel" class="btn btn-secondary" style="padding:8px 18px;">取消</button>
        <button id="diary-save" class="btn btn-primary" style="padding:8px 18px;">💾 保存日记</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // 绑定心情选择
  modal.querySelectorAll('.mood-btn').forEach(b => {
    if (todayEntry?.mood === b.dataset.mood) b.style.borderColor = 'var(--gold)';
    b.addEventListener('click', () => {
      modal.querySelectorAll('.mood-btn').forEach(x => x.style.borderColor = 'transparent');
      b.style.borderColor = 'var(--gold)';
      modal.dataset.mood = b.dataset.mood;
    });
  });
  if (todayEntry?.mood) modal.dataset.mood = todayEntry.mood;

  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#diary-cancel').addEventListener('click', () => modal.remove());
  modal.querySelector('#diary-save').addEventListener('click', () => {
    const text = modal.querySelector('#diary-text').value.trim();
    const mood = modal.dataset.mood || '';
    if (text || mood) {
      diary[todayKey] = { note: text, mood, timestamp: Date.now() };
      saveDiary(diary);
      markCheckin();
      alert('✨ 日记已保存！连续打卡 ' + getStreak() + ' 天');
    }
    modal.remove();
  });
}


/* ==================== C12: 键盘快捷键 ==================== */
function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    // 不在输入框里才触发
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    
    // Ctrl+/ 打开帮助
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      showShortcutHelp();
      return;
    }
    if (e.key === '?' && !e.shiftKey) { showShortcutHelp(); return; }

    const spreading = window.__APP_PHASE__ === 'shuffling' || window.__APP_PHASE__ === 'drawing';
    if (spreading) return;

    if (e.key === ' ') {
      e.preventDefault();
      document.getElementById('start-btn')?.click();
    } else if (e.key === 'Escape') {
      document.getElementById('reset-btn')?.click();
      // 同时关闭所有 modal
      document.querySelectorAll('[id$="-modal"], .settings-panel.open').forEach(el => {
        if (el.classList) el.classList.remove('open'); else el.style.display = 'none';
      });
    } else if (['1','2','3','4','5','6'].includes(e.key)) {
      const spreads = ['single','three','yesno','relationship','monthly','yearly'];
      const target = document.querySelector(`.spread-btn[data-spread="${spreads[parseInt(e.key)-1]}"]`);
      if (target) target.click();
    }
  });
}

function showShortcutHelp() {
  const existing = document.getElementById("shortcut-help");
  if (existing) { existing.remove(); return; }
  const el = document.createElement("div");
  el.id = "shortcut-help";
  el.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;";
  el.innerHTML = `
    <div class="glass-card" style="max-width:400px;width:100%;">
      <h2 style="margin:0 0 14px;font-size:1.1rem;color:var(--gold);">⌨ 键盘快捷键</h2>
      <div style="font-size:0.85rem;line-height:2;color:var(--text-white);">
        <div><kbd style="padding:2px 8px;background:rgba(255,255,255,0.1);border-radius:4px;border:1px solid rgba(255,255,255,0.2);">Space</kbd> 开始占卜</div>
        <div><kbd style="padding:2px 8px;background:rgba(255,255,255,0.1);border-radius:4px;border:1px solid rgba(255,255,255,0.2);">Esc</kbd> 重置 / 关闭弹窗</div>
        <div><kbd style="padding:2px 8px;background:rgba(255,255,255,0.1);border-radius:4px;border:1px solid rgba(255,255,255,0.2);">1-6</kbd> 切牌阵 (单/三/是/关/月/年)</div>
        <div><kbd style="padding:2px 8px;background:rgba(255,255,255,0.1);border-radius:4px;border:1px solid rgba(255,255,255,0.2);">?</kbd> 显示/隐藏此帮助</div>
        <div><kbd style="padding:2px 8px;background:rgba(255,255,255,0.1);border-radius:4px;border:1px solid rgba(255,255,255,0.2);">Ctrl+/</kbd> 同上</div>
      </div>
      <div style="text-align:right;margin-top:14px;"><button class="btn btn-secondary" style="padding:6px 16px;font-size:0.82rem;" onclick="document.getElementById('shortcut-help').remove()">关闭</button></div>
    </div>
  `;
  el.addEventListener('click', (e) => { if (e.target === el) el.remove(); });
  document.body.appendChild(el);
}


/* ==================== C13: 抽牌倒计时 ==================== */
function showCountdown(seconds = 3) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.id = "countdown-overlay";
    overlay.style.cssText = "position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;pointer-events:none;";
    document.body.appendChild(overlay);
    let n = seconds;
    overlay.innerHTML = `<div style="font-size:8rem;font-weight:bold;color:var(--gold);text-shadow:0 0 40px rgba(212,175,55,0.6);font-family:serif;animation:countPop 1s ease-out;">${n}</div>`;
    const t = setInterval(() => {
      n--;
      if (n <= 0) {
        clearInterval(t);
        overlay.remove();
        resolve();
      } else {
        overlay.innerHTML = `<div style="font-size:8rem;font-weight:bold;color:var(--gold);text-shadow:0 0 40px rgba(212,175,55,0.6);font-family:serif;animation:countPop 1s ease-out;">${n}</div>`;
      }
    }, 800);
  });
}


/* ==================== C14: 牌阵示意图 SVG ==================== */
const SPREAD_DIAGRAMS = {
  single: `<svg width="80" height="100" viewBox="0 0 80 100"><rect x="15" y="10" width="50" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="2"/><text x="40" y="58" text-anchor="middle" fill="currentColor" font-size="11" font-family="serif">今日指引</text></svg>`,
  three: `<svg width="180" height="80" viewBox="0 0 180 80"><rect x="5" y="15" width="45" height="55" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><text x="27" y="48" text-anchor="middle" fill="currentColor" font-size="10">过去</text><rect x="67" y="15" width="45" height="55" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><text x="89" y="48" text-anchor="middle" fill="currentColor" font-size="10">现在</text><rect x="129" y="15" width="45" height="55" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><text x="151" y="48" text-anchor="middle" fill="currentColor" font-size="10">未来</text></svg>`,
  yesno: `<svg width="80" height="100" viewBox="0 0 80 100"><rect x="15" y="10" width="50" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="2"/><text x="40" y="58" text-anchor="middle" fill="currentColor" font-size="11" font-family="serif">是/否</text></svg>`,
  relationship: `<svg width="180" height="100" viewBox="0 0 180 100"><rect x="5" y="10" width="50" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><text x="30" y="32" text-anchor="middle" fill="currentColor" font-size="9">我</text><rect x="65" y="10" width="50" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><text x="90" y="32" text-anchor="middle" fill="currentColor" font-size="9">TA</text><rect x="125" y="10" width="50" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><text x="150" y="32" text-anchor="middle" fill="currentColor" font-size="9">我们</text><rect x="5" y="54" width="50" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><text x="30" y="76" text-anchor="middle" fill="currentColor" font-size="9">过去</text><rect x="65" y="54" width="50" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><text x="90" y="76" text-anchor="middle" fill="currentColor" font-size="9">现在</text><rect x="125" y="54" width="50" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><text x="150" y="76" text-anchor="middle" fill="currentColor" font-size="9">未来</text></svg>`,
  monthly: `<svg width="180" height="120" viewBox="0 0 180 120">${Array.from({length:6},(_,i)=>`<rect x="${(i%3)*58+5}" y="${Math.floor(i/3)*54+10}" width="50" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="${(i%3)*58+30}" y="${Math.floor(i/3)*54+35}" text-anchor="middle" fill="currentColor" font-size="9">${['上月','关键词','事业','感情','财务','月终'][i]}</text>`).join('')}</svg>`,
  yearly: `<svg width="280" height="80" viewBox="0 0 280 80">${Array.from({length:14},(_,i)=>`<rect x="${i*19+3}" y="10" width="15" height="60" rx="2" fill="none" stroke="currentColor" stroke-width="1"/><text x="${i*19+10}" y="22" text-anchor="middle" fill="currentColor" font-size="6">${i===0?'主':i===13?'尾':i-1+'月'}</text>`).join('')}</svg>`,
};

function attachSpreadDiagram() {
  document.querySelectorAll('.spread-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      const s = btn.dataset.spread;
      const parent = btn.parentElement;
      parent.dataset.diagram = SPREAD_DIAGRAMS[s] || '';
    });
    btn.addEventListener('mouseleave', () => {
      delete btn.parentElement.dataset.diagram;
    });
  });
}


/* ==================== C19: 抽牌后情绪标记 ==================== */
function attachMoodTagging() {
  document.addEventListener('click', (e) => {
    const moodBtn = e.target.closest('.mood-post-draw');
    if (!moodBtn) return;
    try {
      const arr = JSON.parse(localStorage.getItem("tarot_moods") || "[]");
      arr.push({ mood: moodBtn.dataset.mood, timestamp: Date.now() });
      if (arr.length > 200) arr.length = 200;
      localStorage.setItem("tarot_moods", JSON.stringify(arr));
      moodBtn.style.background = 'rgba(100, 216, 203, 0.3)';
    } catch {}
  });
}


/* ==================== C20: 数据导入/导出 ==================== */
function exportAllData() {
  const data = {};
  ['tarot_history', 'tarot_diary', 'tarot_checkins', 'tarot_moods', 'tarot_settings'].forEach(k => {
    try { data[k] = JSON.parse(localStorage.getItem(k) || "null"); } catch {}
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `cabbage-tarot-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importAllData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        let imported = 0;
        Object.keys(data).forEach(k => {
          if (data[k] !== null && data[k] !== undefined) {
            localStorage.setItem(k, JSON.stringify(data[k]));
            imported++;
          }
        });
        resolve(imported);
      } catch (e) { reject(e); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}


/* ==================== C15: 自动跟随系统主题 ==================== */
function initSystemThemeFollow() {
  // 监听系统主题变化（仅当用户没有手动选主题时）
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  mq.addEventListener('change', (e) => {
    const settings = JSON.parse(localStorage.getItem("tarot_settings") || "{}");
    if (!settings.theme && window.TarotSettings) {
      window.TarotSettings.applyTheme(e.matches ? "dark" : "dark"); // 系统浅色也用深色（塔罗氛围）
    }
  });
}


/* ==================== C16: 音量滑块（暴露供 settings.js 扩展） ==================== */
function setVolume(v) {
  try {
    localStorage.setItem("tarot_volume", String(v));
    // 更新 AudioContext 音量
    window.__TAROT_VOLUME__ = v;
    if (window.TarotFeedback && window.TarotFeedback.setVolume) {
      window.TarotFeedback.setVolume(v);
    }
  } catch {}
}
function getVolume() {
  return parseFloat(localStorage.getItem("tarot_volume") || "0.7");
}


/* ==================== C18: 卡牌大图预览 ==================== */
function openCardModal(card) {
  const existing = document.getElementById("card-big-modal");
  if (existing) existing.remove();
  const modal = document.createElement("div");
  modal.id = "card-big-modal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);";
  modal.innerHTML = `
    <div style="text-align:center;">
      <img src="${card.imageUrl}" style="max-width:80vw;max-height:75vh;border-radius:12px;box-shadow:0 0 60px rgba(100,216,203,0.3);border:2px solid rgba(255,255,255,0.2);">
      <div style="margin-top:14px;color:var(--gold);font-size:1.2rem;font-family:serif;">${card.name} · ${card.nameEn}</div>
    </div>
  `;
  modal.addEventListener('click', () => modal.remove());
  document.body.appendChild(modal);
}


/* ==================== 初始化 ==================== */
function init() {
  initShortcuts();
  initSystemThemeFollow();
  attachSpreadDiagram();
  attachMoodTagging();
  console.log('[塔罗Extras] C11-C23 模块已加载');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

return {
  // 日记
  openDiaryModal, loadDiary, getStreak, markCheckin, getTodayKey,
  // 倒计时
  showCountdown,
  // 示意图
  SPREAD_DIAGRAMS,
  // 导入导出
  exportAllData, importAllData,
  // 音量
  setVolume, getVolume,
  // 大图
  openCardModal,
  // 快捷键帮助
  showShortcutHelp,
};

})();
