/* ==========================================================================
   extras-v6.js — 塔罗 v6 客户端功能扩展
   所有函数挂 window.V6 命名空间，零污染全局
   ========================================================================== */
(function () {
  'use strict';

  const V6 = {};
  window.V6 = V6;

  /* ==================== A41: Toast 提示 ==================== */
  V6.toast = function (msg, type, dur) {
    let c = document.getElementById('v6-toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'v6-toast-container';
      document.body.appendChild(c);
    }
    const t = document.createElement('div');
    t.className = 'v6-toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), dur || 2000);
  };

  /* ==================== A42: Modal ==================== */
  V6.modal = {
    open: function (html, opts) {
      let m = document.getElementById('v6-modal-overlay');
      if (!m) {
        m = document.createElement('div');
        m.id = 'v6-modal-overlay';
        m.addEventListener('click', e => { if (e.target === m) V6.modal.close(); });
        document.body.appendChild(m);
      }
      opts = opts || {};
      const title = opts.title ? `<h2 style="margin:0 0 16px 0;color:var(--tarot-gold);font-family:'Cormorant Garamond',serif;">${opts.title}</h2>` : '';
      const closeBtn = '<button onclick="window.V6.modal.close()" style="float:right;background:none;border:none;color:var(--tarot-gold);font-size:20px;cursor:pointer;">✕</button>';
      m.innerHTML = `<div class="v6-modal-box">${closeBtn}${title}${html}</div>`;
      m.classList.add('active');
      return m;
    },
    close: function () {
      const m = document.getElementById('v6-modal-overlay');
      if (m) m.classList.remove('active');
    }
  };

  /* ==================== A72: Ctrl+Enter 快捷抽牌 ==================== */
  V6.setupShortcuts = function () {
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const btn = document.querySelector('.btn-draw, [data-action="draw"], button.primary');
        if (btn && !btn.disabled) { btn.click(); V6.toast('✨ 塔罗指引降临...'); }
      }
      if (e.key === 'Escape') V6.modal.close();
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey && document.activeElement === document.body) {
        V6.showShortcuts();
      }
    });
  };

  V6.showShortcuts = function () {
    V6.modal.open(`
      <div class="v6-shortcut-list">
        <kbd>Ctrl</kbd><span>+ Enter 开始抽牌</span>
        <kbd>Esc</kbd><span>关闭弹窗</span>
        <kbd>?</kbd><span>打开帮助</span>
      </div>
    `, { title: '⌨️ 键盘快捷键' });
  };

  /* ==================== A75: 字号切换 ==================== */
  V6.fontScale = function () {
    const saved = localStorage.getItem('v6-font-scale') || '1';
    document.documentElement.style.fontSize = (parseFloat(saved) * 16) + 'px';
  };

  /* ==================== A57: 每日一张卡 ==================== */
  V6.dailyCard = function () {
    const KEY = 'v6_daily_card';
    const today = new Date().toDateString();
    let data = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!data || data.date !== today) {
      const deck = window.TAROT_DECK || [];
      if (deck.length === 0) return null;
      const idx = Math.floor(Math.random() * deck.length);
      const reversed = Math.random() < 0.3;
      data = { date: today, card: deck[idx], reversed: reversed };
      localStorage.setItem(KEY, JSON.stringify(data));
    }
    return data;
  };

  V6.renderDailyCard = function () {
    const el = document.querySelector('.daily-card-widget') || document.getElementById('daily-card');
    if (!el) return;
    const dc = V6.dailyCard();
    if (!dc) { el.innerHTML = ''; return; }
    const label = dc.reversed ? dc.card.name + ' (逆位)' : dc.card.name;
    const img = `images-webp/${dc.card.image}.webp`;
    el.innerHTML = `
      <div class="daily-inner">
        <div class="daily-img"><img src="${img}" alt="${dc.card.name}" loading="lazy"></div>
        <div class="daily-info">
          <div class="daily-date">${todayZH()}</div>
          <div class="daily-name">${label}</div>
          <div class="daily-mean">${dc.reversed ? (dc.card.reversedMean || dc.card.meaning || '') : (dc.card.meaning || '')}</div>
        </div>
      </div>
    `;
  };

  function todayZH() {
    const d = new Date();
    const m = d.getMonth() + 1;
    return `${m}月${d.getDate()}日`;
  }

  /* ==================== A61: 成就徽章 ==================== */
  const ACHIEVEMENTS = [
    { id: 'first_draw', name: '🌙 初遇塔罗', desc: '完成第一次抽牌' },
    { id: 'ten_draws',  name: '⭐ 熟练寻问者', desc: '抽牌 10 次' },
    { id: 'fifty_draws', name: '🔮 塔罗有缘人', desc: '抽牌 50 次' },
    { id: 'daily_7',   name: '🗓️ 连续七日', desc: '连续 7 天查看每日卡' },
    { id: 'all_spreads', name: '🎴 牌阵探索者', desc: '尝试过所有牌阵' },
  ];

  V6.unlockAchievement = function (id) {
    const unlocked = JSON.parse(localStorage.getItem('v6_achievements') || '[]');
    if (unlocked.includes(id)) return false;
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach) return false;
    unlocked.push(id);
    localStorage.setItem('v6_achievements', JSON.stringify(unlocked));
    V6.toast(`🏅 成就解锁: ${ach.name}`, 'success', 3000);
    return true;
  };

  V6.checkAchievements = function () {
    const stats = JSON.parse(localStorage.getItem('v6_stats') || '{"drawCount":0,"dailyStreak":0}');
    if (stats.drawCount >= 1) V6.unlockAchievement('first_draw');
    if (stats.drawCount >= 10) V6.unlockAchievement('ten_draws');
    if (stats.drawCount >= 50) V6.unlockAchievement('fifty_draws');
    if (stats.dailyStreak >= 7) V6.unlockAchievement('daily_7');
  };

  V6.incrementDraw = function () {
    const stats = JSON.parse(localStorage.getItem('v6_stats') || '{"drawCount":0}');
    stats.drawCount = (stats.drawCount || 0) + 1;
    localStorage.setItem('v6_stats', JSON.stringify(stats));
    V6.checkAchievements();
  };

  /* ==================== A66: 白噪音 ==================== */
  V6.whiteNoise = {
    ctx: null, node: null, gain: null,
    start: function () {
      if (this.node) return;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        this.node = this.ctx.createBufferSource();
        this.node.buffer = noiseBuffer; this.node.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 400;
        this.gain = this.ctx.createGain();
        this.gain.gain.value = 0.05;
        this.node.connect(filter); filter.connect(this.gain); this.gain.connect(this.ctx.destination);
        this.node.start();
        V6.toast('🔊 白噪音已开启');
      } catch (e) { V6.toast('❌ 浏览器不支持 Web Audio', 'error'); }
    },
    stop: function () {
      if (this.node) { try { this.node.stop(); } catch(e){} this.node = null; }
      V6.toast('🔇 白噪音已关闭');
    },
    toggle: function () { this.node ? this.stop() : this.start(); }
  };

  /* ==================== A67: 私密模式 ==================== */
  V6.privateMode = {
    on: false,
    toggle: function () {
      this.on = !this.on;
      if (this.on) {
        const mask = document.createElement('div');
        mask.className = 'v6-private-mask';
        mask.id = 'v6-private-mask';
        mask.innerHTML = `<div style="text-align:center;"><div style="font-size:48px;margin-bottom:16px;">🌙</div><div style="margin-bottom:24px;">私密模式保护中</div><button onclick="window.V6.privateMode.toggle()">点击恢复</button></div>`;
        document.body.appendChild(mask);
      } else {
        document.getElementById('v6-private-mask')?.remove();
      }
    }
  };

  /* ==================== A69: 关键词联想 ==================== */
  const KEYWORD_SUGGESTIONS = [
    '事业', '感情', '财运', '健康', '学业', '人际', '家庭',
    '近期', '半年', '未来', '过去', '现在',
    '他', '她', '我们', '自己',
    '选择', '方向', '结果', '指引', '建议'
  ];

  V6.setupKeywordSuggest = function () {
    const input = document.querySelector('textarea, input[type="text"][data-v6-suggest]');
    if (!input) return;
    const datalistId = 'v6-suggest-list';
    let dl = document.getElementById(datalistId);
    if (!dl) {
      dl = document.createElement('datalist');
      dl.id = datalistId;
      KEYWORD_SUGGESTIONS.forEach(k => {
        const o = document.createElement('option');
        o.value = k; dl.appendChild(o);
      });
      document.body.appendChild(dl);
    }
    input.setAttribute('list', datalistId);
  };

  /* ==================== A70: 历史记录 ==================== */
  V6.addHistory = function (entry) {
    const KEY = 'v6_history';
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    list.unshift({ ...entry, time: Date.now() });
    while (list.length > 20) list.pop();
    localStorage.setItem(KEY, JSON.stringify(list));
  };

  V6.getHistory = function () {
    return JSON.parse(localStorage.getItem('v6_history') || '[]');
  };

  /* ==================== 主题切换 ==================== */
  V6.setTheme = function (name) {
    document.documentElement.setAttribute('data-theme', name || '');
    localStorage.setItem('v6_theme', name || '');
  };

  V6.getTheme = function () {
    return localStorage.getItem('v6_theme') || '';
  };

  /* ==================== 初始化 ==================== */
  function init() {
    V6.setupShortcuts();
    V6.fontScale();
    V6.renderDailyCard();
    V6.setupKeywordSuggest();
    V6.setTheme(V6.getTheme());
    V6.checkAchievements();

    // 把 V6 绑到 DOMContentLoaded 之后可安全调用的点
    document.addEventListener('DOMContentLoaded', function () {
      // 给卡牌容器加 ripple class
      document.querySelectorAll('.card-container').forEach(el => el.classList.add('card-ripple'));
      // 给结果卡加动画
      document.querySelectorAll('.result-card, .card-result').forEach(el => {
        el.classList.add('result-card');
        setTimeout(() => el.classList.add('visible'), 50);
      });
      // 正逆位 class
      document.querySelectorAll('[data-reversed="true"]').forEach(el => el.classList.add('card-reversed'));
    });

    console.log('[v6] extras-v6.js 已加载');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
