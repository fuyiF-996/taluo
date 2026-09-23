/* ============================================================
 * extras-v8.js —— 30 UI 创新点 JS 配套
 * 挂 window.V8 命名空间，零污染
 * 限制：≤ 1000 行
 * ============================================================ */
(function() {
  'use strict';

  const V8 = {};

  // ---------- U17 Toast ----------
  const toastQueue = [];
  function showToast(msg, type = 'info', duration = 3000) {
    let wrap = document.querySelector('.v8-toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'v8-toast-wrap';
      document.body.appendChild(wrap);
    }
    const icons = { success: '✅', warn: '⚠️', error: '❌', info: '💬' };
    const el = document.createElement('div');
    el.className = 'v8-toast ' + type;
    el.textContent = (icons[type] || '') + ' ' + msg;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'v8-toast-out 0.3s forwards';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }
  V8.toast = showToast;

  // ---------- U18/U19 Modal ----------
  function showModal(html, opts = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'v8-modal-overlay';
    overlay.innerHTML = `<div class="v8-modal" role="dialog" aria-modal="true" style="position:relative;">
      ${opts.title ? `<h3>${opts.title}</h3>` : ''}
      ${opts.close !== false ? '<button class="v8-modal-close" aria-label="关闭">✕</button>' : ''}
      <div>${html}</div>
    </div>`;
    document.body.appendChild(overlay);
    const close = () => {
      overlay.style.animation = 'v8-fade-in 0.15s reverse forwards';
      setTimeout(() => overlay.remove(), 150);
    };
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.v8-modal-close')?.addEventListener('click', close);
    document.addEventListener('keydown', function escClose(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escClose); }
    });
    return { el: overlay, close };
  }
  V8.modal = showModal;

  // ---------- U20 Ctrl+Enter ----------
  function setupShortcuts() {
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const btn = document.querySelector('#draw-btn, .draw-btn, button[onclick*="draw"]');
        if (btn && !btn.disabled) { btn.click(); e.preventDefault(); }
      }
      if (e.key === 'Escape') {
        const closeBtn = document.querySelector('.v8-modal-close');
        if (closeBtn) closeBtn.click();
      }
      if (e.key === 'p' && (e.ctrlKey || e.metaKey)) {
        V8.togglePrivate(); e.preventDefault();
      }
    });
  }

  // ---------- U16 涟漪 ----------
  function setupRipple() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('button, .btn, #draw-btn');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'v8-ripple';
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top  = (e.clientY - rect.top - size / 2) + 'px';
      btn.style.position = btn.style.position || 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  }

  // ---------- U10 水晶球光晕（鼠标跟随） ----------
  function setupMouseGlow() {
    document.addEventListener('mousemove', e => {
      document.documentElement.style.setProperty('--mx', (e.clientX / window.innerWidth * 100) + '%');
      document.documentElement.style.setProperty('--my', (e.clientY / window.innerHeight * 100) + '%');
    }, { passive: true });
  }

  // ---------- U9 滚动透明度 ----------
  function setupScrollHeader() {
    const header = document.querySelector('header, .header, .page-header, .hero-section');
    if (!header) return;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      header.style.opacity = Math.max(0.3, 1 - y / 400);
    }, { passive: true });
  }

  // ---------- U21 每日一张卡 ----------
  function dailyCard() {
    const today = new Date().toDateString();
    const last = localStorage.getItem('v8_daily_date');
    if (last === today) {
      showToast('今日已抽过每日卡 ✨', 'info');
      return;
    }
    localStorage.setItem('v8_daily_date', today);
    const cardEl = document.querySelector('.card-3d, .glass-card .card-back');
    if (cardEl) {
      cardEl.classList.add('v8-trail');
      setTimeout(() => cardEl.classList.remove('v8-trail'), 500);
    }
    V8.stats.dailyStreak = (V8.stats.dailyStreak || 0) + 1;
    localStorage.setItem('v8_stats', JSON.stringify(V8.stats));
    V8.checkAchievements();
    showToast('✨ 每日卡已抽取', 'success');
  }

  // ---------- U22 成就徽章（4 枚） ----------
  V8.ACHIEVEMENTS = [
    { id: 'first_draw',   name: '初次占卜', desc: '完成第一次抽牌',   check: s => s.drawCount >= 1 },
    { id: 'ten_draws',    name: '占卜学徒', desc: '累计抽牌 10 次',  check: s => s.drawCount >= 10 },
    { id: 'fifty_draws',  name: '塔罗行者', desc: '累计抽牌 50 次',  check: s => s.drawCount >= 50 },
    { id: 'daily_streak', name: '每日修行', desc: '连续 7 天每日卡', check: s => (s.dailyStreak || 0) >= 7 },
  ];

  V8.stats = JSON.parse(localStorage.getItem('v8_stats') || '{"drawCount":0,"dailyStreak":0,"unlocked":[]}');

  V8.checkAchievements = function() {
    const unlocked = new Set(V8.stats.unlocked || []);
    V8.ACHIEVEMENTS.forEach(a => {
      if (!unlocked.has(a.id) && a.check(V8.stats)) {
        unlocked.add(a.id);
        showToast('🏆 成就解锁：' + a.name, 'success', 4000);
      }
    });
    V8.stats.unlocked = [...unlocked];
    localStorage.setItem('v8_stats', JSON.stringify(V8.stats));
  };

  V8.renderAchievements = function(container) {
    if (!container) return;
    container.className = 'v8-achievements';
    const unlocked = new Set(V8.stats.unlocked || []);
    container.innerHTML = V8.ACHIEVEMENTS.map(a =>
      `<span class="v8-badge ${unlocked.has(a.id) ? '' : 'locked'}" title="${a.desc}">
        ${unlocked.has(a.id) ? '🏆' : '🔒'} ${a.name}
      </span>`
    ).join('');
  };

  // ---------- 抽牌后计数器 + 成就检查 ----------
  function hookDrawButton() {
    const btn = document.querySelector('#draw-btn, .draw-btn');
    if (!btn) { setTimeout(hookDrawButton, 500); return; }
    btn.addEventListener('click', () => {
      V8.stats.drawCount = (V8.stats.drawCount || 0) + 1;
      localStorage.setItem('v8_stats', JSON.stringify(V8.stats));
      setTimeout(V8.checkAchievements, 1500);
      setTimeout(updateCounter, 200);
    });
  }

  // ---------- U24 抽牌计数挂件 ----------
  function updateCounter() {
    let c = document.querySelector('.v8-counter');
    if (!c) return;
    c.innerHTML = `🔮 已累计抽牌 <b>${V8.stats.drawCount || 0}</b> 次`;
  }
  function createCounter() {
    if (document.querySelector('.v8-counter')) return;
    const c = document.createElement('div');
    c.className = 'v8-counter';
    document.body.appendChild(c);
    updateCounter();
  }

  // ---------- U23 私密模式 ----------
  V8.togglePrivate = function() {
    const is = document.body.classList.toggle('v8-private');
    localStorage.setItem('v8_private', is ? '1' : '0');
    showToast(is ? '🔒 私密模式已开启' : '🔓 私密模式已关闭', is ? 'warn' : 'success');
  };

  // ---------- 注入每日卡按钮 + 私密模式开关到页面 ----------
  function injectTools() {
    // 每日卡按钮
    const cardArea = document.querySelector('.card-area, .deck-section, .glass-card:first-of-type');
    if (cardArea && !document.querySelector('.v8-daily-btn')) {
      const btn = document.createElement('button');
      btn.className = 'v8-daily-btn';
      btn.textContent = '✨ 今日一张';
      btn.style.marginTop = '12px';
      btn.addEventListener('click', dailyCard);
      cardArea.parentElement.insertBefore(btn, cardArea.nextSibling);
    }
    // 私密模式按钮（在设置区或底部）
    const footer = document.querySelector('.footer, .copyright, [class*="foot"]');
    if (footer && !document.querySelector('.v8-private-btn')) {
      const btn = document.createElement('button');
      btn.className = 'v8-private-btn';
      btn.textContent = '🔒 私密模式';
      btn.style.cssText = 'background:none;border:1px solid var(--gold);color:var(--gold);padding:4px 12px;border-radius:12px;font-size:12px;cursor:pointer;margin-left:8px;';
      btn.addEventListener('click', V8.togglePrivate);
      footer.appendChild(btn);
    }
    // 恢复私密模式
    if (localStorage.getItem('v8_private') === '1') document.body.classList.add('v8-private');
  }

  // ---------- 初始化 ----------
  function init() {
    // U8 顶部光带
    const strip = document.createElement('div');
    strip.className = 'v8-light-strip';
    document.body.appendChild(strip);

    // U30 跳过链接
    if (!document.querySelector('.skip-link')) {
      const skip = document.createElement('a');
      skip.className = 'skip-link'; skip.href = '#main'; skip.textContent = '跳到主内容';
      document.body.prepend(skip);
      const main = document.querySelector('main, .main, #app');
      if (main) main.id = main.id || 'main';
    }

    setupShortcuts();
    setupRipple();
    setupMouseGlow();
    setupScrollHeader();
    createCounter();
    V8.checkAchievements();

    // 延迟注入（等 DOM 就绪）
    setTimeout(injectTools, 800);
    setTimeout(hookDrawButton, 1200);

    console.log('[v8] extras-v8.js 已加载 | Ctrl+Enter=抽牌 | Ctrl+P=私密 | Esc=关弹窗');
  }

  window.V8 = V8;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
