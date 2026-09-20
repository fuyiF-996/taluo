/**
 * ============================================================================
 * 小应塔罗抽牌网页 —— 主应用逻辑
 * ============================================================================
 * 
 * 功能模块：
 * 1. 牌阵选择（单牌日运 / 三牌过去-现在-未来）
 * 2. 洗牌动画控制
 * 3. 随机抽牌（正/逆位自动决定）
 * 4. 卡牌3D翻转动画
 * 5. 结果解读渲染
 * 6. 重置/重新占卜
 * 
 * 所有随机逻辑在浏览器本地完成，不请求任何外部API
 * ============================================================================
 */


/* ==================== 全局状态 ==================== */

const AppState = {
  currentSpread: 'single',      // 当前选中的牌阵：'single' | 'three'
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

// 三牌阵的位置标签（会动态显示在结果解读中）
const SPREAD_POSITIONS = {
  single: ['今日指引'],
  three:  ['过去', '现在', '未来']
};

// 每种牌阵需要抽取的牌数
const SPREAD_COUNTS = {
  single: 1,
  three: 3
};


/* ==================== 初始化 ==================== */

document.addEventListener('DOMContentLoaded', () => {
  init();
});

function init() {
  bindEvents();
  console.log('[塔罗] 页面已初始化，牌组数量:', TAROT_DECK.length);
}


/* ==================== 事件绑定 ==================== */

function bindEvents() {
  
  // 1. 牌阵选择
  dom.spreadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (AppState.phase !== 'idle' && AppState.phase !== 'done') return;
      
      dom.spreadBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.currentSpread = btn.dataset.spread;
      
      // 三牌阵时给 cards-display 加个 class 方便样式调整
      dom.cardsDisplay.classList.remove('single-spread', 'three-spread');
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
}


/* ==================== 开始占卜主流程 ==================== */

async function startDivination() {
  
  // 防止重复点击
  if (AppState.phase !== 'idle' && AppState.phase !== 'done') return;
  
  // 记录问题
  AppState.question = dom.questionInput.value.trim();
  if (!AppState.question) {
    // 没输入问题也能继续，只是给个提示
    console.log('[塔罗] 用户未输入问题，使用通用占卜');
  }
  
  // 重置之前的结果
  clearPreviousResult();
  
  // ========== 阶段1: 洗牌动画 ==========
  AppState.phase = 'shuffling';
  showDeckForShuffling();
  dom.statusMessage.textContent = '✨ 正在洗牌，请静心冥想你的问题...';
  dom.startBtn.disabled = true;
  
  // 洗牌动画持续 2.5 秒
  await sleep(2500);
  
  // ========== 阶段2: 抽牌 ==========
  AppState.phase = 'drawing';
  dom.statusMessage.textContent = '🎴 命运正在为你选牌...';
  
  // 隐藏牌堆，准备显示抽到的牌
  hideDeck();
  
  // 抽牌
  const count = SPREAD_COUNTS[AppState.currentSpread];
  AppState.drawnCards = drawCards(count);
  
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
  }
  
  // 等最后一张翻完，再渲染解读
  await sleep(800);
  
  // ========== 阶段4: 结果解读 ==========
  AppState.phase = 'done';
  renderReadingResult();
  dom.statusMessage.textContent = '🌟 占卜完成';
  dom.startBtn.disabled = false;
  dom.startBtn.textContent = '🔮 再次占卜';
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


/* ==================== 渲染结果解读 ==================== */

function renderReadingResult() {
  
  const positions = SPREAD_POSITIONS[AppState.currentSpread];
  
  // 构建 HTML
  let html = '';
  
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
    
    html += `
      <div class="reading-card">
        <div class="position-label">📍 ${position}</div>
        <div class="card-title">
          ${card.name}
          <span class="orientation-tag ${orientationClass}">${orientationLabel}</span>
        </div>
        <div class="meaning">${meaning}</div>
      </div>
    `;
  });
  
  dom.resultContent.innerHTML = html;
  dom.resultSection.classList.remove('hidden');
  
  // 滚动到结果区
  dom.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  
  // 重置按钮
  dom.startBtn.disabled = false;
  dom.startBtn.textContent = '🔮 开始占卜';
  dom.statusMessage.textContent = '选择牌阵，输入问题，点击开始';
  
  // 滚动回顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


/* ==================== 工具函数 ==================== */

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
