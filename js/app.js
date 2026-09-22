// cabbage塔罗 v3 —— 主应用逻辑
/**
 * ============================================================================
 * cabbage塔罗抽牌网页 —— 主应用逻辑
 * ============================================================================
 * 
 * v3 新增：
 * ✨ C1 每日一张卡 Daily Card
 * ✨ C3 月运 + 年运牌阵  
 * ✨ C5 液态玻璃 3D 视差
 * ✨ C9 翻牌光效升级版
 * ✨ C10 关键词点击跳转百科
 * ✨ 统计数据写入 localStorage（stats.html 消费）
 * ✨ PWA Service Worker 注册
 * 
 * 原有功能模块（v2）：
 * 1. 牌阵选择（6 种：单牌 / 三牌 / 是-否 / 关系 / 月运 / 年运）
 * 2. 洗牌/翻牌音效 + 振动反馈
 * 3. 加权抽牌 + 云端正位概率
 * 4. 卡牌 3D 翻转
 * 5. 结果解读（展开联想 / 分享图 / yesno 结论 / relationship 标签）
 * 6. 历史记录 localStorage
 * 7. 敏感词转译提示
 * 8. 云端牌阵开关 / AI 解读（可选）
 * ============================================================================
 */


/* ==================== 全局状态 ==================== */

const AppState = {
  currentSpread: 'single',      // 当前选中的牌阵：'single' | 'three' | 'yesno' | 'relationship'
  question: '',                 // 用户输入的问题
  drawnCards: [],               // 已抽取的牌数组
  phase: 'idle',                // 当前阶段：idle | shuffling | drawing | revealing | done
};


/* ==================== DOM 元素引用 ==================== */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  // 牌阵按钮
  spreadBtns: $$('.spread-btn'),
  
  // 问题输入
  questionInput: $('#question'),
  
  // 抽牌按钮
  startBtn: $('#start-btn'),
  resetBtn: $('#reset-btn'),
  
  // 抽牌区域
  tarotArea: $('#tarot-area'),
  deckArea: $('#deck-area'),
  cardsDisplay: $('#cards-display'),
  statusMessage: $('#status-message'),
  
  // 结果解读
  resultSection: $('#result-section'),
  resultContent: $('#result-content'),
};


/* ==================== 牌阵配置 ==================== */

const SPREAD_POSITIONS = {
  single: ['今日指引'],
  three: ['过去', '现在', '未来'],
  yesno: ['是/否'],
  relationship: ['我', 'TA', '我们', '过去', '现在', '未来'],
  // ✨ C3: 月运 6 张
  monthly: ['上月总结', '本月关键词', '事业', '感情', '财务', '月终建议'],
  // ✨ C3: 年运 14 张（12 月 + 年首 + 年尾）
  yearly: ['年度主题', '一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月', '年终总结'],
};

const SPREAD_COUNTS = {
  single: 1,
  three: 3,
  yesno: 1,
  relationship: 6,
  monthly: 6,
  yearly: 14,
};

// ✨ C3: 牌阵中文名映射（用于结果区域 + 历史记录）
const spreadNameMap = {
  single: '单牌日运', three: '三牌阵', yesno: '是/否',
  relationship: '关系六牌阵', monthly: '月运六牌阵', yearly: '年运十四牌阵',
};


/* ==================== 初始化 ==================== */

document.addEventListener('DOMContentLoaded', async () => {
  await init();
});

async function init() {
  bindEvents();
  // 从云端拉配置（失败自动降级，不阻塞页面）
  if (window.loadCloudConfig) {
    await window.loadCloudConfig();
  }
  // v2：根据云端 enabledSpreads 禁用/隐藏牌阵按钮
  applySpreadButtons();

  // ✨ C1: 每日一张卡
  renderDailyCard();

  // ✨ C8: PWA Service Worker 注册
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // ✨ v3 新功能按钮绑定
  // 快捷键帮助 / 数据导出按钮（如果存在）
  document.getElementById('shortcut-help-btn')?.addEventListener('click', () => window.TarotExtras?.showShortcutHelp?.());
  document.getElementById('diary-entry-btn')?.addEventListener('click', () => {
    const today = new Date().toDateString();
    const hash = [...today].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
    const card = TAROT_DECK[Math.abs(hash) % TAROT_DECK.length];
    window.TarotExtras?.openDiaryModal?.(card);
  });
  document.getElementById('export-data-btn')?.addEventListener('click', () => {
    if (confirm('导出所有本地数据（历史/日记/打卡/情绪）到 JSON 文件？')) {
      window.TarotExtras?.exportAllData?.();
    }
  });

  // ✨ C18 全局：点击翻出的卡牌放大
  document.addEventListener('click', (e) => {
    const flipped = e.target.closest('.card-3d.flipped');
    if (!flipped) return;
    const front = flipped.querySelector('.card-front');
    if (!front) return;
    const img = front.querySelector('img');
    if (!img) return;
    const cardId = flipped.dataset.cardId || flipped.querySelector('[data-card-id]')?.dataset.cardId;
    const card = TAROT_DECK.find(c => c.id === cardId);
    if (card) window.TarotExtras?.openCardModal?.(card);
  });

  console.log('[塔罗] 页面已初始化，牌组数量:', TAROT_DECK.length);
}


/**
 * v2：根据 CloudConfig.enabledSpreads 处理牌阵按钮
 */
function applySpreadButtons() {
  if (!window.CloudConfig || !window.CloudConfig.enabledSpreads) return;
  dom.spreadBtns.forEach(btn => {
    const spread = btn.dataset.spread;
    if (window.CloudConfig.enabledSpreads[spread] === false) {
      btn.classList.add('disabled');
      btn.title = '此牌阵已被管理员禁用';
      btn.style.opacity = '0.4';
      btn.style.pointerEvents = 'none';
      // 如果当前选中的牌阵被禁用了，切回第一个可用的
      if (AppState.currentSpread === spread) {
        const first = [...dom.spreadBtns].find(b => !b.classList.contains('disabled'));
        if (first) {
          first.click();
        }
      }
    }
  });
}


/* ==================== 事件绑定 ==================== */

function bindEvents() {
  
  // 1. 牌阵选择
  dom.spreadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('disabled')) return;
      if (AppState.phase !== 'idle' && AppState.phase !== 'done') return;
      
      dom.spreadBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.currentSpread = btn.dataset.spread;
      
      // 给 cards-display 加个 class 方便样式调整
      dom.cardsDisplay.classList.remove('single-spread', 'three-spread', 'yesno-spread', 'relationship-spread');
      dom.cardsDisplay.classList.add(AppState.currentSpread + '-spread');
    });
  });
  
  // 2. 开始占卜按钮
  dom.startBtn.addEventListener('click', startDivination);
  
  // 3. 重置按钮
  dom.resetBtn.addEventListener('click', resetAll);
  
  // 4. 问题输入框 - 回车快捷提交（Ctrl+Enter 或 Enter）
  dom.questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      startDivination();
    }
  });

  // 5. v2：敏感词转译提示
  dom.questionInput.addEventListener('input', onQuestionInput);

  // ✨ C1: 每日卡"用这张卡开始"按钮
  const dcUse = document.getElementById('daily-use');
  if (dcUse) dcUse.addEventListener('click', () => {
    document.querySelector('.spread-btn[data-spread="single"]')?.click();
    document.getElementById('question')?.focus();
  });
}

/* ==================== ✨ C1: 每日一张卡 Daily Card ==================== */

function renderDailyCard() {
  const el = document.getElementById('daily-card');
  if (!el || !window.TAROT_DECK) return;

  // 日期哈希稳定映射：同一天 = 同一张卡
  const today = new Date().toDateString();
  const hash = [...today].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
  const idx = Math.abs(hash) % TAROT_DECK.length;
  const card = TAROT_DECK[idx];

  document.getElementById('daily-date').textContent = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  document.getElementById('daily-name').textContent = `${card.name} · ${card.nameEn}`;
  document.getElementById('daily-advice').textContent = card.advice || card.upright?.slice(0, 40) + '...' || '静心冥想，让今日指引为你指明方向。';
  const img = document.getElementById('daily-img');
  if (img) {
    img.src = card.imageUrl || `images-webp/${card.id}.webp`;
    img.onerror = () => { img.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 80 120%22><rect width=%2280%22 height=%22120%22 fill=%22%232d1b4e%22 rx=%228%22/><text x=%2240%22 y=%2270%22 text-anchor=%22middle%22 font-size=%2240%22 fill=%22%2364d8cb%22>✦</text></svg>'; };
  }

  // ✨ C23 连续打卡徽章
  const streak = window.TarotExtras?.getStreak?.() || 0;
  const rightCol = document.querySelector('#daily-card .dc-right');
  if (rightCol && streak > 0 && !rightCol.querySelector('.streak-badge')) {
    const badge = document.createElement("div");
    badge.className = "streak-badge";
    badge.textContent = `🔥 连续打卡 ${streak} 天`;
    rightCol.insertBefore(badge, rightCol.querySelector('#daily-advice').nextSibling);
  }

  // ✨ C11 日记按钮绑定
  document.getElementById('daily-diary')?.addEventListener('click', () => {
    window.TarotExtras?.openDiaryModal?.(card);
  });
  // ✨ C18 大图预览按钮
  document.getElementById('daily-big')?.addEventListener('click', () => {
    window.TarotExtras?.openCardModal?.(card);
  });
  // 图片本身也能点大图
  img?.addEventListener('click', () => window.TarotExtras?.openCardModal?.(card));
  if (img) img.style.cursor = 'zoom-in';

  el.style.display = '';
}


/* ==================== v2：敏感词转译 ==================== */

function onQuestionInput() {
  if (!window.TarotSettings) return;
  const settings = window.TarotSettings.load();
  if (!settings.keywordFilter) return;

  const rules = (window.CloudConfig && window.CloudConfig.keywordRules) || [];
  if (!rules.length) return;

  const text = dom.questionInput.value;
  if (!text.trim()) {
    removeKeywordTip();
    return;
  }

  // 找到第一条命中的规则（逐次检查）
  let hit = null;
  for (const rule of rules) {
    if (rule.from && rule.to && text.includes(rule.from)) {
      hit = rule;
      break;
    }
  }

  if (!hit) {
    removeKeywordTip();
    return;
  }

  // 显示提示条
  let tip = document.getElementById('keyword-tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'keyword-tip';
    tip.style.cssText = 'font-size:0.8rem;margin-top:6px;padding:6px 10px;background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.4);border-radius:6px;color:#d4af37;display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
    // 插入到 questionInput 后面（在它的下一个兄弟节点之前）
    const hintP = dom.questionInput.nextElementSibling;
    if (hintP && hintP.tagName === 'P') {
      hintP.parentNode.insertBefore(tip, hintP);
    } else {
      dom.questionInput.parentNode.appendChild(tip);
    }
  }
  tip.innerHTML = '';
  const textNode = document.createElement('span');
  textNode.textContent = `🛡️ 已自动转译：${hit.from} → ${hit.to}`;
  tip.appendChild(textNode);

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = '确认替换';
  confirmBtn.style.cssText = 'font-size:0.75rem;padding:2px 10px;background:#d4af37;color:#1a0d3d;border:none;border-radius:4px;cursor:pointer;';
  confirmBtn.addEventListener('click', () => {
    dom.questionInput.value = dom.questionInput.value.split(hit.from).join(hit.to);
    removeKeywordTip();
  });
  tip.appendChild(confirmBtn);

  const skipBtn = document.createElement('button');
  skipBtn.textContent = '保持原样';
  skipBtn.style.cssText = 'font-size:0.75rem;padding:2px 10px;background:transparent;color:#d4af37;border:1px solid #d4af37;border-radius:4px;cursor:pointer;';
  skipBtn.addEventListener('click', () => removeKeywordTip());
  tip.appendChild(skipBtn);
}

function removeKeywordTip() {
  const tip = document.getElementById('keyword-tip');
  if (tip) tip.remove();
}


/* ==================== 开始占卜主流程 ==================== */

async function startDivination() {
  
  // 防止重复点击
  if (AppState.phase !== 'idle' && AppState.phase !== 'done') return;
  
  // ✨ C42 敏感词软屏蔽
  let rawQuestion = dom.questionInput.value.trim();
  AppState.question = rawQuestion;
  if (rawQuestion && window.TarotExtrasV4) {
    const sanitized = window.TarotExtrasV4.sanitizeQuestion(rawQuestion);
    if (sanitized !== rawQuestion) {
      AppState.question = sanitized;
      toast('🛡 问题已自动净化处理');
    }
  }
  if (!AppState.question) {
    console.log('[塔罗] 用户未输入问题，使用通用占卜');
  }

  // ✨ C26 呼吸引导（每次占卜前 3 秒）
  if (window.TarotExtrasV4) {
    await window.TarotExtrasV4.breathingGuide(6);
  }
  // ✨ C34 星尘召唤粒子效果
  if (window.TarotExtrasV4) {
    window.TarotExtrasV4.stardustSummon();
  }

  // 重置之前的结果
  clearPreviousResult();
  
  // ========== 阶段1: 洗牌动画 ==========
  AppState.phase = 'shuffling';
  showDeckForShuffling();
  dom.statusMessage.textContent = '✨ 正在洗牌，请静心冥想你的问题...';
  dom.startBtn.disabled = true;

  // v2：洗牌音效
  if (window.TarotFeedback && typeof window.TarotFeedback.playShuffle === 'function') {
    window.TarotFeedback.playShuffle();
  }
  
  // 洗牌动画持续 2.5 秒
  await sleep(2500);
  
  // ========== 阶段2: 抽牌 ==========
  AppState.phase = 'drawing';
  dom.statusMessage.textContent = '🎴 命运正在为你选牌...';
  
  // 隐藏牌堆，准备显示抽到的牌
  hideDeck();
  
  // 抽牌（优先使用云端配置加权抽牌，降级到原始随机）
  const count = SPREAD_COUNTS[AppState.currentSpread];
  AppState.drawnCards = (typeof window.drawCardsByConfig === 'function')
    ? window.drawCardsByConfig(count)
    : drawCards(count);
  
  // 生成卡牌 DOM 元素（背面朝上）
  renderCardBacks(AppState.drawnCards);
  
  await sleep(800);
  
  // ========== 阶段3: 翻转揭示 ==========
  AppState.phase = 'revealing';
  dom.statusMessage.textContent = '翻开卡牌，聆听宇宙的讯息...';
  
  // 依次翻转每张牌（间隔 0.6s）
  const cardElements = $$('.card-3d');
  for (let i = 0; i < cardElements.length; i++) {
    await sleep(600);
    cardElements[i].classList.add('flipped');
    // v2：翻牌音效
    if (window.TarotFeedback && typeof window.TarotFeedback.playFlip === 'function') {
      window.TarotFeedback.playFlip();
    }
  }
  
  // 等最后一张翻完，再渲染解读
  await sleep(800);
  
  // ========== 阶段4: 结果解读 ==========
  AppState.phase = 'done';
  renderReadingResult();
  dom.statusMessage.textContent = '🌟 占卜完成';
  dom.startBtn.disabled = false;
  dom.startBtn.textContent = '🔮 再次占卜';

  // v2：保存到历史
  saveToHistory();
}


/* ==================== 洗牌动画显示 ==================== */

function showDeckForShuffling() {
  // 创建 5 张牌叠放的牌堆效果
  dom.deckArea.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const card = document.createElement('div');
    card.className = 'deck-card';
    dom.deckArea.appendChild(card);
  }
  
  // 激活洗牌动画
  dom.deckArea.classList.add('shuffling');
  
  // 隐藏卡牌展示区
  dom.cardsDisplay.innerHTML = '';
}

function hideDeck() {
  dom.deckArea.classList.remove('shuffling');
  setTimeout(() => {
    dom.deckArea.innerHTML = '';
  }, 300);
}


/* ==================== 渲染卡牌背面（等待翻转） ==================== */

function renderCardBacks(cards) {
  dom.cardsDisplay.innerHTML = '';
  
  cards.forEach((card, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'card-3d';
    if (!card.orientation) wrapper.classList.add('reversed'); // 逆位标记
    wrapper.dataset.index = index;
    
    wrapper.innerHTML = `
      <!-- 背面（默认显示） -->
      <div class="card-face card-back"></div>
      
      <!-- 正面（翻转后显示） -->
      <div class="card-face card-front">
        <img 
          src="${card.imageUrl}" 
          alt="${card.name}" 
          loading="lazy"
          onerror="this.style.display='none'" />
        <div class="card-name-cn">${card.name}</div>
        <div class="card-name-en">${card.nameEn}</div>
      </div>
    `;
    
    dom.cardsDisplay.appendChild(wrapper);
  });
}


/* ==================== v2：yes/no 答案判定 ==================== */

/**
 * yesno 牌阵的规则：
 *   - 抽到 大阿卡那 0(愚者) / 12(倒吊人) / 21(世界) → 答案待定
 *   - 正位（除待定外）→ 是
 *   - 逆位（除待定外）→ 否
 */
function getYesNoAnswer(card) {
  const majorNum = card.id.startsWith('M') ? parseInt(card.id.slice(1), 10) : null;
  if (majorNum !== null && (majorNum === 0 || majorNum === 12 || majorNum === 21)) {
    return '🌟 答案：待定（中性大阿卡那：愚者/倒吊人/世界）';
  }
  return card.orientation
    ? '🌟 答案：是（正位）'
    : '🌟 答案：否（逆位）';
}


/* ==================== 渲染结果解读 ==================== */

function renderReadingResult() {
  
  const positions = SPREAD_POSITIONS[AppState.currentSpread];
  const currentSpreadName = spreadNameMap[AppState.currentSpread] || '';
  
  // 构建 HTML
  let html = '';

  // v2：yesno 牌阵额外在顶部显示答案
  if (AppState.currentSpread === 'yesno' && AppState.drawnCards.length > 0) {
    html += `
      <div id="yesno-answer" style="margin-bottom:18px;padding:14px 18px;background:linear-gradient(135deg,rgba(212,175,55,0.18),rgba(168,156,192,0.12));border:1px solid rgba(212,175,55,0.5);border-radius:10px;text-align:center;font-size:1.05rem;color:var(--gold);font-weight:bold;">
        ${getYesNoAnswer(AppState.drawnCards[0])}
      </div>
    `;
  }
  
  // 如果有问题，显示问题
  if (AppState.question) {
    html += `
      <div class="question-display" style="margin-bottom:18px;padding:12px 16px;background:rgba(212,175,55,0.08);border-left:2px solid var(--gold);border-radius:0 6px 6px 0;">
        <span style="color:var(--text-muted);font-size:0.8rem;">你问的是：</span>
        <div style="color:var(--text-white);margin-top:4px;font-size:0.95rem;">"${escapeHtml(AppState.question)}"</div>
      </div>
    `;
  }
  
  // 每张牌的解读
  AppState.drawnCards.forEach((card, i) => {
    const position = positions[i] || '';
    const orientation = card.orientation; // true=正位, false=逆位
    const meaning = orientation ? card.upright : card.reversed;
    const orientationClass = orientation ? 'orientation-upright' : 'orientation-reversed';
    const orientationLabel = orientation ? '正位' : '逆位';

    // v2：relationship 牌阵在每张牌前显示对应位置标签（用不同的 emoji 区分）
    let posLabel = position;
    if (AppState.currentSpread === 'relationship') {
      const emojiMap = { '我': '🪞', 'TA': '💗', '我们': '🕊️', '过去': '🕰️', '现在': '🌿', '未来': '🌅' };
      posLabel = (emojiMap[position] || '📍') + ' ' + position;
    } else {
      posLabel = '📍 ' + position;
    }

    // v2：展开联想区（默认隐藏）
    const extraBlocks = [];
    if (card.keywords && card.keywords.trim()) extraBlocks.push(`<div class="联想-row"><span class="联想-label">关键词</span><span>${escapeHtml(card.keywords)}</span></div>`);
    if (card.element && card.element.trim()) extraBlocks.push(`<div class="联想-row"><span class="联想-label">元素</span><span>${escapeHtml(card.element)}</span></div>`);
    if (card.advice && card.advice.trim()) extraBlocks.push(`<div class="联想-row"><span class="联想-label">建议</span><span>${escapeHtml(card.advice)}</span></div>`);
    if (card.warning && card.warning.trim()) extraBlocks.push(`<div class="联想-row"><span class="联想-label">警示</span><span>${escapeHtml(card.warning)}</span></div>`);

    const uniqueId = 'expand-' + i;
    
    html += `
      <div class="reading-card">
        <div class="position-label">${posLabel}</div>
        <div class="card-title">
          <a href="library.html?card=${card.id}" style="color:inherit;text-decoration:none;border-bottom:1px dashed var(--gold);" title="点击查看牌意百科">${card.name}</a>
          <span class="orientation-tag ${orientationClass}">${orientationLabel}</span>
        </div>
        <div class="meaning">${meaning}</div>
        ${window.TarotExtrasV4 ? (() => {
          const e = window.TarotExtrasV4.getCardEnergy({...card, orientation});
          const color = orientation ? '#64d8cb' : '#ff8a80';
          return `<div style="margin:8px 0 4px;font-size:0.72rem;color:var(--text-muted);display:flex;align-items:center;gap:8px;">
            <span>能量 ${e}%</span>
            <div style="flex:1;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
              <div style="height:100%;width:${e}%;background:${color};border-radius:3px;transition:width .5s;"></div>
            </div>
          </div>`;
        })() : ''}
        ${extraBlocks.length > 0 ? `
          <button class="联想-toggle" data-expand="${uniqueId}" style="margin-top:10px;font-size:0.8rem;padding:4px 12px;background:transparent;color:var(--gold);border:1px solid var(--gold);border-radius:4px;cursor:pointer;">展开联想 ▾</button>
          <div id="${uniqueId}" class="联想-panel" style="display:none;margin-top:10px;padding:10px 14px;background:rgba(168,156,192,0.08);border-left:2px solid var(--gold);border-radius:0 6px 6px 0;font-size:0.85rem;">
            ${extraBlocks.join('')}
          </div>
        ` : ''}
      </div>
    `;
  });

  // v3：情绪标记行
  html += `
    <div class="mood-row" style="margin-top:20px;">
      <span style="font-size:0.82rem;color:var(--text-muted);margin-right:4px;align-self:center;">这次抽牌的感受：</span>
      ${['😊开心','😐平静','😟担忧','🔥兴奋','💤疲惫','🤔深思','💖感恩'].map(m => {
        const [emoji, label] = m.split('');
        return `<button class="mood-quick-tag" data-mood="${emoji}" title="标记此情绪">${emoji} ${label}</button>`;
      }).join('')}
    </div>
  `;

  // v2：底部分享按钮
  html += `
    <div id="share-area" style="margin-top:24px;text-align:center;">
      <button id="generate-share-btn" style="font-size:0.95rem;padding:10px 28px;background:linear-gradient(135deg,#d4af37,#a89cc0);color:#1a0d3d;border:none;border-radius:20px;cursor:pointer;font-weight:bold;transition:transform .2s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
        📸 生成分享图
      </button>
      <canvas id="share-canvas" style="display:none;"></canvas>
    </div>
  `;
  
  dom.resultContent.innerHTML = html;
  dom.resultSection.classList.remove('hidden');

  // ✨ v4：正念提示卡（80% 概率显示，避免每次打扰）
  if (Math.random() < 0.8 && window.TarotExtrasV4) {
    setTimeout(() => window.TarotExtrasV4.showMindfulnessCard(), 500);
  }
  // ✨ v4：检查成就
  if (window.TarotExtrasV4) {
    try {
      const hist = JSON.parse(localStorage.getItem("tarot_history") || "[]");
      const diary = JSON.parse(localStorage.getItem("tarot_diary") || "{}");
      const streaks = JSON.parse(localStorage.getItem("tarot_checkins") || "[]");
      window.TarotExtrasV4.checkAndAwardAchievements({
        totalDraws: hist.length,
        diaryDays: Object.keys(diary).length,
        streak: window.TarotExtras?.getStreak?.() || 0,
        spreadsUsed: [...new Set(hist.map(h => h.spreadName || h.spread))],
        liquidUsed: document.body.getAttribute('data-theme') === 'liquid',
      });
    } catch {}
  }

  // v2：绑定展开联想点击事件（事件委托）
  dom.resultContent.addEventListener('click', onExpandToggle);

  // v2：绑定分享图按钮
  const shareBtn = document.getElementById('generate-share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      shareBtn.disabled = true;
      shareBtn.textContent = '生成中...';
      try {
        if (window.TarotShare && typeof window.TarotShare.generate === 'function') {
          const canvas = await window.TarotShare.generate({
            question: AppState.question,
            spreadName: currentSpreadName,
            cards: AppState.drawnCards.map(c => ({
              name: c.name,
              nameEn: c.nameEn,
              orientation: c.orientation,
              imageUrl: c.imageUrl,
              upright: c.upright,
              reversed: c.reversed,
            })),
          });
          if (typeof window.TarotShare.downloadCanvas === 'function') {
            window.TarotShare.downloadCanvas(canvas, `tarot-${Date.now()}.png`);
          }
        } else {
          alert('分享图模块未加载');
        }
      } catch (err) {
        console.error('[塔罗] 分享图生成失败', err);
        alert('生成失败，请稍后重试');
      } finally {
        shareBtn.disabled = false;
        shareBtn.textContent = '📸 生成分享图';
      }
    });
  }
  
  // 滚动到结果区
  dom.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * v2：展开联想面板的事件处理器（事件委托，避免闭包）
 */
function onExpandToggle(e) {
  const btn = e.target.closest('.联想-toggle');
  if (!btn) return;
  const id = btn.dataset.expand;
  const panel = document.getElementById(id);
  if (!panel) return;
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    btn.textContent = '收起联想 ▴';
  } else {
    panel.style.display = 'none';
    btn.textContent = '展开联想 ▾';
  }
}


/* ==================== v2：历史记录 ==================== */

function saveToHistory() {
  try {
    const arr = JSON.parse(localStorage.getItem("tarot_history") || "[]");
    arr.unshift({
      timestamp: Date.now(),
      question: AppState.question,
      spread: AppState.currentSpread,
      spreadName: spreadNameMap[AppState.currentSpread] || AppState.currentSpread,
      cards: AppState.drawnCards.map(c => ({
        id: c.id, name: c.name, orientation: c.orientation,
      })),
    });
    if (arr.length > 50) arr.length = 50;  // v3: 扩容到 50 条（stats.html 需要更多数据）
    localStorage.setItem("tarot_history", JSON.stringify(arr));
  } catch {}
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem("tarot_history") || "[]");
  } catch {
    return [];
  }
}


/* ==================== 清除之前的结果 ==================== */

function clearPreviousResult() {
  dom.resultSection.classList.add('hidden');
  dom.resultContent.innerHTML = '';
}


/* ==================== 重置所有状态 ==================== */

function resetAll() {
  
  // 重置状态
  AppState.phase = 'idle';
  AppState.drawnCards = [];
  AppState.question = '';
  
  // 清空输入框
  dom.questionInput.value = '';
  
  // 清空展示区
  dom.deckArea.innerHTML = '';
  dom.cardsDisplay.innerHTML = '';
  
  // 隐藏结果
  clearPreviousResult();

  // 解绑展开联想事件（clean up）
  dom.resultContent.removeEventListener('click', onExpandToggle);

  // 清除可能残留的关键词提示
  removeKeywordTip();
  
  // 重置按钮
  dom.startBtn.disabled = false;
  dom.startBtn.textContent = '🔮 开始占卜';
  dom.statusMessage.textContent = '选择牌阵，输入问题，点击开始';
  
  // 滚动回顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


/* ==================== 工具函数（保持原有实现不动） ==================== */

/**
 * 简易 sleep 函数（Promise 封装 setTimeout）
 * @param {number} ms - 毫秒数
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * HTML 转义，防止 XSS
 * @param {string} str 
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}


/* ==================== 调试辅助 ==================== */

// 在控制台暴露状态，方便调试
window.__TAROT_APP__ = AppState;
// v2：暴露历史读写接口
window.TarotHistory = { save: saveToHistory, load: loadHistory };
