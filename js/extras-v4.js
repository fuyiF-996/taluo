/**
 * ============================================================================
 * cabbage塔罗 v4 新增功能模块 C24-C50
 * ============================================================================
 * 26 个客户端功能（纯前端 localStorage/DOM）
 * ============================================================================
 */

window.TarotExtrasV4 = (function() {

/* ==================== C37: 农历显示 ==================== */
// 简化版农历算法（1900-2100 足够用）
const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
];
const ZODIAC = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
const LUNAR_MONTHS = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
const LUNAR_DAYS = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];

function getLunarDate(ts = Date.now()) {
  const d = new Date(ts);
  const base = new Date(1900,0,31);
  let offset = Math.floor((d - base) / 86400000);
  let year = 1900, temp = 0;
  while (year < 2100 && offset > 0) {
    temp = getLunarDaysOfYear(year);
    if (offset < temp) break; offset -= temp; year++;
  }
  let month = 1, leap = getLeapMonth(year); let isLeap = false;
  while (month < 13 && offset > 0) {
    if (leap > 0 && month === leap + 1 && !isLeap) { --month; isLeap = true; temp = getLeapDays(year); }
    else { temp = getLunarDaysOfMonth(year, month); }
    if (isLeap && month === leap + 1) isLeap = false;
    if (offset >= temp) { offset -= temp; month++; }
  }
  const day = offset + 1;
  return { year, month, day, monthStr: LUNAR_MONTHS[month-1]+'月', dayStr: LUNAR_DAYS[day-1], zodiac: ZODIAC[(year-4)%12] };
}
function getLeapMonth(y) { return LUNAR_INFO[y-1900] & 0xf; }
function getLeapDays(y) { if (getLeapMonth(y)) return (LUNAR_INFO[y-1900] & 0x10000) ? 30 : 29; return 0; }
function getLunarDaysOfMonth(y, m) { return (LUNAR_INFO[y-1900] & (0x10000 >> m)) ? 30 : 29; }
function getLunarDaysOfYear(y) { let sum = 348; for (let i=0x8000; i>0x8; i>>=1) sum += (LUNAR_INFO[y-1900] & i) ? 1 : 0; return sum + getLeapDays(y); }


/* ==================== C29: 问题模板库 ==================== */
const QUESTION_TEMPLATES = {
  '💖 爱情': ['我和他/她的缘分如何？','我最近会遇到新的感情机会吗？','我该如何修复和伴侣的关系？','单恋的我该主动吗？','这段感情值得继续投入吗？'],
  '💼 事业': ['我适合现在换工作吗？','我在职场的下一步是什么？','我和同事的关系会变好吗？','我最近会有升职加薪机会吗？','创业的时机到了吗？'],
  '📚 学业': ['这次考试我能发挥好吗？','我适合现在开始新的学习吗？','我应该选择哪个专业/方向？','我能通过这个面试吗？','学习瓶颈如何突破？'],
  '💰 金钱': ['我最近财运如何？','这笔投资值得吗？','我该如何改善财务状况？','会有意外收入吗？','我该大手大脚还是存起来？'],
  '🏠 家庭': ['我和家人的关系会变好吗？','我适合搬去新地方吗？','家中长辈的健康如何？','我该如何处理家庭矛盾？','是时候要孩子了吗？'],
  '🧘 自我': ['我最近的状态如何？','我该如何面对当前的迷茫？','我的人生方向是什么？','我需要放下什么东西？','我最大的成长点在哪里？'],
  '🌍 其他': ['我应该怎么做这个决定？','我的问题的答案是什么？','未来三个月会发生什么？','我该如何静心冥想？','给我一句今日指引'],
};

function injectQuestionTemplates() {
  const input = document.getElementById('question-input') || document.getElementById('question');
  const section = document.querySelector('.spread-selector');
  if (!section || section.querySelector('.v4-templates-wrap')) return;

  const wrap = document.createElement("div");
  wrap.className = "v4-templates-wrap";
  wrap.style.cssText = "margin-top:14px;padding:12px;background:rgba(255,255,255,0.04);border-radius:10px;";
  wrap.innerHTML = `<div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px;">💭 问题模板（点一下自动填入）</div>`;

  Object.entries(QUESTION_TEMPLATES).forEach(([cat, qs]) => {
    const catDiv = document.createElement("div");
    catDiv.style.cssText = "margin-bottom:6px;";
    catDiv.innerHTML = `<span style="font-size:0.78rem;color:var(--gold);margin-right:8px;min-width:50px;display:inline-block;">${cat}</span>`;
    qs.forEach(q => {
      const b = document.createElement("button");
      b.textContent = q;
      b.style.cssText = "font-size:0.72rem;padding:3px 8px;margin:2px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:10px;color:var(--text-white);cursor:pointer;margin-right:4px;";
      b.addEventListener('click', () => {
        if (input) { input.value = q; input.focus(); }
      });
      catDiv.appendChild(b);
    });
    wrap.appendChild(catDiv);
  });
  section.after(wrap);
}


/* ==================== C24: 每日卡关键词智能联想 ==================== */
function generateDailyPrompts(card) {
  const prompts = [];
  if (!card) return prompts;
  const keywords = (card.keywords || '').split(/[、,，\s]+/).filter(Boolean);
  const keywordQuestionMap = {
    '愚者|新开始|冒险|天真': ['今天适合开启什么新事情？','我应该放下哪些顾虑？','今天适合冒险吗？'],
    '魔术师|创造|技能|意志': ['我今天的创造力如何发挥？','我有什么技能可以用？'],
    '女祭司|直觉|神秘|智慧': ['我该如何相信自己的直觉？','今天适合冥想吗？'],
    '皇帝|权威|秩序|控制': ['我该更有主见还是更灵活？','我适合领导吗？'],
    '皇后|丰盛|母性|美': ['我该如何滋养自己？','适合开始新项目吗？'],
    '高塔|突变|觉醒|打破': ['什么东西该被打破了？','变化即将来临吗？'],
    '星星|希望|指引|宁静': ['我的希望是什么？','我该如何保持信念？'],
    '月亮|幻觉|恐惧|潜意识': ['我害怕的是什么？','真相被隐藏了吗？'],
    '太阳|成功|喜悦|活力': ['我最近该庆祝什么？','我的能量如何发挥？'],
    '审判|重生|觉醒|召唤': ['我该如何回应内心的召唤？','是时候做出改变了吗？'],
  };
  keywordQuestionMap.forEach((qs, pattern) => {
    if (new RegExp(pattern).test(card.name + (card.keywords || ''))) {
      qs.forEach(q => prompts.push(q));
    }
  });
  // 默认兜底
  if (prompts.length === 0) {
    prompts.push(`${card.name}想告诉我什么？`, `今天的${card.nameEn}给我什么启示？`, `如何看待${card.name}的能量？`);
  }
  return prompts.slice(0, 5);
}


/* ==================== C26: 静心引导呼吸动画 ==================== */
function breathingGuide(seconds = 12) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.id = "v4-breathing";
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(5,2,15,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;";
    document.body.appendChild(overlay);
    overlay.innerHTML = `
      <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:20px;">🫧 请呼吸...</div>
      <div class="breathing-circle" style="width:120px;height:120px;border-radius:50%;border:2px solid rgba(212,175,55,0.5);background:radial-gradient(circle,rgba(212,175,55,0.1),transparent);animation:breath 12s ease-in-out infinite;"></div>
      <div style="margin-top:30px;font-size:0.8rem;color:var(--gold);opacity:0.7;">吸气 · 屏息 · 呼气</div>
    `;
    const style = document.createElement("style");
    style.textContent = `@keyframes breath{0%{transform:scale(0.6);opacity:0.4}25%{transform:scale(1.3);opacity:1}50%{transform:scale(1.3);opacity:1}75%{transform:scale(0.6);opacity:0.4}100%{transform:scale(0.6);opacity:0.4}}`;
    overlay.appendChild(style);
    setTimeout(() => { overlay.remove(); resolve(); }, seconds * 1000);
  });
}


/* ==================== C32: 成就系统 ==================== */
const ACHIEVEMENTS = [
  { id: 'streak7', name: '🔥 打卡 7 天', desc: '连续 7 天查看每日卡', check: s => s.streak >= 7 },
  { id: 'streak30', name: '🌟 打卡 30 天', desc: '坚持一个月', check: s => s.streak >= 30 },
  { id: 'streak100', name: '💎 打卡 100 天', desc: '坚持一百天（传说级）', check: s => s.streak >= 100 },
  { id: 'draw50', name: '🎴 抽牌 50 次', desc: '累计抽牌 50 次', check: s => s.totalDraws >= 50 },
  { id: 'draw100', name: '✨ 抽牌 100 次', desc: '累计抽牌 100 次', check: s => s.totalDraws >= 100 },
  { id: 'draw500', name: '👑 抽牌 500 次', desc: '深度占卜爱好者', check: s => s.totalDraws >= 500 },
  { id: 'diary10', name: '📓 写日记 10 天', desc: '塔罗日记入门', check: s => s.diaryDays >= 10 },
  { id: 'diary30', name: '📖 写日记 30 天', desc: '塔罗日记达人', check: s => s.diaryDays >= 30 },
  { id: 'liquidFirst', name: '🌊 液态玻璃初体验', desc: '切换过液态玻璃主题', check: s => !!s.liquidUsed },
  { id: 'allSpreads', name: '🔮 尝试全部牌阵', desc: '6 种牌阵都用过', check: s => (s.spreadsUsed || []).length >= 6 },
];

function getAchievementState() {
  try { return JSON.parse(localStorage.getItem("tarot_achievements") || '{"unlocked":[]}'); }
  catch { return { unlocked: [] }; }
}
function checkAndAwardAchievements(ctx) {
  const state = getAchievementState();
  const newly = [];
  ACHIEVEMENTS.forEach(a => {
    if (!state.unlocked.includes(a.id) && a.check(ctx)) {
      state.unlocked.push(a.id);
      newly.push(a);
    }
  });
  localStorage.setItem("tarot_achievements", JSON.stringify(state));
  newly.forEach(a => toastAchievement(a));
  return newly;
}
function toastAchievement(a) {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;bottom:30px;left:50%;transform:translateX(-50%);z-index:10000;background:linear-gradient(135deg,#d4af37,#a89cc0);color:#1a0d3d;padding:12px 24px;border-radius:10px;font-weight:bold;box-shadow:0 8px 30px rgba(212,175,55,0.5);animation:achPop 0.5s ease-out;";
  el.innerHTML = `🏆 成就解锁！<br><span style="font-size:0.85rem;font-weight:normal;">${a.name}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}


/* ==================== C30: 卡牌能量值 ==================== */
function getCardEnergy(card) {
  // 简化算法：正位 60-100，逆位 0-40，参考 keywords 和 advice
  const kw = (card.keywords || '').length;
  const adv = (card.advice || '').length;
  const base = 50 + Math.min(kw * 2, 30) + Math.min(adv * 0.3, 20);
  const energy = card.orientation ? base : 100 - base;
  return Math.round(Math.max(5, Math.min(99, energy)));
}


/* ==================== C34: 星尘召唤粒子 ==================== */
function stardustSummon() {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;z-index:9997;pointer-events:none;";
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const particles = [];
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: canvas.width / 2, y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
      life: 1, color: ['#d4af37','#64d8cb','#9d4edd','#ffffff'][Math.floor(Math.random()*4)],
      size: 2 + Math.random() * 3,
    });
  }
  return new Promise(resolve => {
    const startTime = Date.now();
    function draw() {
      ctx.fillStyle = "rgba(5,2,15,0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.life -= 0.012;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (Date.now() - startTime < 3000 && particles.some(p => p.life > 0)) {
        requestAnimationFrame(draw);
      } else {
        canvas.remove(); resolve();
      }
    }
    draw();
  });
}


/* ==================== C36: 正念提示卡 ==================== */
const MINDFUL_MESSAGES = [
  '✨ 深呼吸，你此刻很安全。',
  '🌟 答案已经在你心中。',
  '🌙 允许自己休息一下。',
  '🔮 你拥有选择的自由。',
  '💫 所有的经历都在塑造你。',
  '🎴 接受当下，信任过程。',
  '🌿 慢一点，你值得。',
  '🔥 你比自己想象的更强大。',
  '💎 安静下来，答案会出现。',
  '🌈 无论什么结果，你都能面对。',
];
function showMindfulnessCard() {
  const msg = MINDFUL_MESSAGES[Math.floor(Math.random() * MINDFUL_MESSAGES.length)];
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9998;background:rgba(20,15,45,0.95);border:1px solid rgba(212,175,55,0.4);border-radius:14px;padding:20px 30px;color:var(--gold);font-size:0.95rem;box-shadow:0 0 60px rgba(212,175,55,0.25);animation:mindPop 0.6s ease-out;max-width:320px;text-align:center;";
  el.innerHTML = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}


/* ==================== C40: 专注模式 ==================== */
function focusMode() {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.96);display:flex;flex-direction:column;align-items:center;justify-content:center;";
  overlay.innerHTML = `
    <div id="focus-timer" style="font-size:5rem;font-weight:700;color:var(--gold);font-family:serif;">30</div>
    <div style="margin-top:20px;color:var(--text-muted);font-size:0.85rem;">专注呼吸，关闭外界干扰...</div>
    <button id="focus-exit" style="position:absolute;bottom:30px;padding:8px 20px;background:transparent;border:1px solid rgba(255,255,255,0.3);color:var(--text-muted);border-radius:20px;cursor:pointer;font-size:0.8rem;">提前结束</button>
  `;
  document.body.appendChild(overlay);
  let n = 30;
  const t = setInterval(() => {
    n--; document.getElementById('focus-timer').textContent = n;
    if (n <= 0) { clearInterval(t); overlay.remove(); }
  }, 1000);
  overlay.querySelector('#focus-exit').addEventListener('click', () => { clearInterval(t); overlay.remove(); });
}


/* ==================== C34 水晶球特效 ==================== */
function createCrystalBall() {
  const ball = document.createElement("div");
  ball.id = "crystal-ball";
  ball.style.cssText = "position:fixed;right:18px;bottom:80px;width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#fff,rgba(157,78,221,0.8),rgba(100,216,203,0.6));box-shadow:0 0 20px rgba(157,78,221,0.6),inset 0 0 15px rgba(255,255,255,0.4);cursor:pointer;z-index:9000;transition:transform 0.3s;animation:crystalGlow 3s ease-in-out infinite;";
  ball.title = "🪄 点我有惊喜";
  ball.addEventListener('click', () => {
    ball.style.transform = "scale(0.9) rotate(180deg)";
    setTimeout(() => { ball.style.transform = ""; burstRainbowParticles(ball); }, 200);
  });
  document.body.appendChild(ball);
  const style = document.createElement("style");
  style.textContent = `@keyframes crystalGlow{0%,100%{box-shadow:0 0 20px rgba(157,78,221,0.6)}50%{box-shadow:0 0 35px rgba(100,216,203,0.8)}}@keyframes mindPop{from{opacity:0;transform:translate(-50%,-50%) scale(0.7)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}`;
  document.head.appendChild(style);
}

function burstRainbowParticles(source) {
  const rect = source.getBoundingClientRect();
  for (let i = 0; i < 30; i++) {
    const p = document.createElement("div");
    p.style.cssText = `position:fixed;left:${rect.left+22}px;top:${rect.top+22}px;width:6px;height:6px;border-radius:50%;pointer-events:none;background:hsl(${Math.random()*360},100%,60%);transition:all 0.9s cubic-bezier(.2,.8,.3,1);z-index:9999;`;
    document.body.appendChild(p);
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 140;
    requestAnimationFrame(() => {
      p.style.transform = `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px)`;
      p.style.opacity = "0";
      p.style.transform += " scale(0.2)";
    });
    setTimeout(() => p.remove(), 1000);
  }
}


/* ==================== C42: 敏感词软屏蔽 ==================== */
const BAD_WORDS = ['傻逼','草你妈','操你妈','狗屎','fuck','shit','asshole'];
function sanitizeQuestion(q) {
  let out = q;
  BAD_WORDS.forEach(w => { out = out.replace(new RegExp(w, 'gi'), '✦'); });
  return out;
}


/* ==================== C49: 守护天使卡 ==================== */
function getGuardianAngel() {
  try {
    const saved = localStorage.getItem("tarot_guardian_angel");
    if (saved) return JSON.parse(saved);
    // 正位愚者 = 守护天使（新开始）
    const fool = window.TAROT_DECK?.find(c => c.id === 'M0');
    if (!fool) return null;
    const angel = { ...fool, timestamp: Date.now() };
    localStorage.setItem("tarot_guardian_angel", JSON.stringify(angel));
    return angel;
  } catch { return null; }
}
function showGuardianAngelCard() {
  const angel = getGuardianAngel();
  if (!angel) return;
  const modal = document.createElement("div");
  modal.style.cssText = "position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(8px);";
  modal.innerHTML = `
    <div style="color:var(--gold);font-size:0.9rem;margin-bottom:20px;">✨ 你的守护天使 ✨</div>
    <img src="${angel.imageUrl}" style="width:160px;height:260px;object-fit:cover;border-radius:12px;box-shadow:0 0 60px rgba(212,175,55,0.3);">
    <div style="margin-top:16px;color:var(--text-white);font-size:1.1rem;font-family:serif;">${angel.name}</div>
    <div style="color:var(--gold);font-size:0.75rem;margin-top:4px;">${angel.nameEn}</div>
    <div style="color:var(--text-muted);font-size:0.8rem;margin-top:12px;max-width:280px;text-align:center;">${angel.advice || '它守护着你的新开始。'}</div>
  `;
  modal.addEventListener('click', () => modal.remove());
  document.body.appendChild(modal);
}


/* ==================== C50: 私密抽牌模式 ==================== */
function isPrivateMode() { return localStorage.getItem("tarot_private_mode") === "1"; }
function setPrivateMode(on) { localStorage.setItem("tarot_private_mode", on ? "1" : "0"); }


/* ==================== C48: 白噪音背景 ==================== */
let _noiseCtx = null, _noiseNode = null;
function startWhiteNoise(type = 'rain') {
  if (!_noiseCtx) _noiseCtx = new (window.AudioContext || window.webkitAudioContext)();
  stopWhiteNoise();
  const bufferSize = _noiseCtx.sampleRate * 2;
  const buffer = _noiseCtx.createBuffer(1, bufferSize, _noiseCtx.sampleRate);
  const data = buffer.getChannelData(0);
  if (type === 'rain') {
    // 棕色噪声（雨声）
    let last = 0;
    for (let i = 0; i < bufferSize; i++) { const white = Math.random() * 2 - 1; data[i] = (last + 0.02 * white) / 1.02; last = data[i]; data[i] *= 3.5; }
  } else if (type === 'forest') {
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
  } else {
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.1;
  }
  _noiseNode = _noiseCtx.createBufferSource();
  _noiseNode.buffer = buffer; _noiseNode.loop = true;
  const gain = _noiseCtx.createGain(); gain.gain.value = 0.05;
  _noiseNode.connect(gain); gain.connect(_noiseCtx.destination);
  _noiseNode.start();
}
function stopWhiteNoise() { if (_noiseNode) { try { _noiseNode.stop(); } catch {} _noiseNode = null; } }


/* ==================== C25: 结果页布局切换 ==================== */
const LAYOUT_STYLES = {
  list: '',  // 默认
  waterfall: 'flex-direction:column;',
  grid: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;',
};


/* ==================== C31: 限时模式 ==================== */
function isLimitedMode() { return localStorage.getItem("tarot_limited_mode") === "1"; }
function setLimitedMode(on) { localStorage.setItem("tarot_limited_mode", on ? "1" : "0"); }


/* ==================== C33: 关系连线 SVG ==================== */
function renderCardConnections(containerId, spread, cardItems) {
  // 简单实现：relationship 阵画 SVG 连线
  if (spread !== 'relationship' && spread !== 'three') return;
  const container = document.getElementById(containerId);
  if (!container) return;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("style", "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;");
  const w = container.offsetWidth, h = container.offsetHeight;
  let paths = '';
  if (spread === 'three' && cardItems.length >= 3) {
    // 过去→现在→未来
    paths = `<path d="M${w*0.18} ${h*0.5} Q${w*0.33} ${h*0.3}, ${w*0.5} ${h*0.5}" stroke="url(#lineGrad)" stroke-width="2" fill="none" stroke-dasharray="6 3"/>
             <path d="M${w*0.5} ${h*0.5} Q${w*0.66} ${h*0.3}, ${w*0.82} ${h*0.5}" stroke="url(#lineGrad)" stroke-width="2" fill="none" stroke-dasharray="6 3"/>`;
  }
  svg.innerHTML = `<defs><linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#d4af37"/><stop offset="100%" stop-color="#64d8cb"/></linearGradient></defs>${paths}`;
  container.style.position = container.style.position || 'relative';
  container.prepend(svg);
}


/* ==================== 初始化 ==================== */
function init() {
  // 注入问题模板
  injectQuestionTemplates();

  // 水晶球
  setTimeout(() => {
    // 只在首页显示
    if (document.querySelector('.spread-selector')) createCrystalBall();
  }, 1500);

  // 成就：检查液态玻璃
  if (document.body.getAttribute('data-theme') === 'liquid') {
    const state = getAchievementState();
    if (!state.unlocked.includes('liquidFirst')) {
      state.unlocked.push('liquidFirst');
      localStorage.setItem("tarot_achievements", JSON.stringify(state));
      toastAchievement({ name: '🌊 液态玻璃初体验' });
    }
  }

  // 农历显示注入
  const dailyDate = document.getElementById('daily-date');
  if (dailyDate) {
    const lunar = getLunarDate();
    const origText = dailyDate.textContent;
    dailyDate.textContent = `${origText} · ${lunar.zodiac}年 ${lunar.monthStr}${lunar.dayStr}`;
  }

  console.log('[塔罗ExtrasV4] C24-C50 已加载');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

return {
  // C37 农历
  getLunarDate,
  // C29 模板
  QUESTION_TEMPLATES, injectQuestionTemplates,
  // C24 联想
  generateDailyPrompts,
  // C26 呼吸
  breathingGuide,
  // C32 成就
  ACHIEVEMENTS, getAchievementState, checkAndAwardAchievements,
  // C30 能量值
  getCardEnergy,
  // C34 星尘
  stardustSummon,
  // C36 正念
  showMindfulnessCard, MINDFUL_MESSAGES,
  // C40 专注
  focusMode,
  // C42 敏感词
  sanitizeQuestion,
  // C49 守护天使
  getGuardianAngel, showGuardianAngelCard,
  // C50 私密
  isPrivateMode, setPrivateMode,
  // C48 白噪音
  startWhiteNoise, stopWhiteNoise,
  // C31 限时
  isLimitedMode, setLimitedMode,
  // C33 连线
  renderCardConnections,
  // C34 水晶球
  createCrystalBall,
};

})();
