/**
 * ============================================================================
 * 云端配置同步模块
 * ============================================================================
 * 
 * 职责：
 * 1. 从 api.taluo996.top 拉取管理员保存的塔罗配置
 * 2. 把云端配置合并进全局 TAROT_DECK
 * 3. 暴露 drawCardsByConfig() 替代原来的 drawCards()
 *    —— 正逆位判定用云端 globalUprightRate
 *    —— 抽牌权重用每张牌的 weight
 * 
 * 设计原则：API 不可用时自动降级，不影响正常占卜
 * ============================================================================
 */


/* ==================== API 地址 ==================== */
// 生产环境：部署后用这个
// 本地调试时如果 API 还没部署，保持默认（请求会失败，但静默降级）
const API_BASE = "https://api.taluo996.top";
// 同时暴露到 window，避免多个 script 块重复声明时冲突
window.API_BASE = API_BASE;


/* ==================== 云端配置缓存 ==================== */
const CloudConfig = {
  // 原始 KV 配置对象（拿到就存一份，后台导出用）
  raw: null,
  // 每张牌的抽取权重映射 { id: number }
  weights: {},
  // 全局正位概率（0~100，默认 50）
  uprightRate: 50,
  // 加载状态
  loaded: false,
};


/**
 * 异步拉取云端配置并合并到 TAROT_DECK
 * 这个函数会在 index.html 的 DOMContentLoaded 里 await 调用
 * 即使 API 挂了也不报错，自动 fallback 到内置数据
 */
async function loadCloudConfig() {
  try {
    const resp = await fetch(`${API_BASE}/`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    
    if (!resp.ok) {
      throw new Error(`API 返回 ${resp.status}`);
    }
    
    const data = await resp.json();
    if (!data.ok || !data.config) {
      // KV 为空或者没有配置，用默认值
      console.log("[塔罗] 云端暂无配置，使用内置默认值");
      return;
    }
    
    applyCloudConfig(data.config);
    CloudConfig.loaded = true;
    console.log("[塔罗] 云端配置已加载 ✓");
    
  } catch (err) {
    // API 不可达（没部署 / 网络问题 / CORS），静默降级
    console.warn("[塔罗] 无法连接云端 API，使用内置默认值：", err.message);
  }
}


/**
 * 把云端 config 合并进全局状态
 * config 结构约定（和 Workers /save 接口一致）：
 * {
 *   globalUprightRate: number(0-100),
 *   cards: [ { id, weight, upright, reversed }, ... ]
 * }
 */
function applyCloudConfig(config) {
  CloudConfig.raw = config;
  
  // 全局正位概率
  if (typeof config.globalUprightRate === "number") {
    CloudConfig.uprightRate = config.globalUprightRate;
  }
  
  // 遍历每张牌的覆盖项
  if (Array.isArray(config.cards)) {
    config.cards.forEach(cloudCard => {
      // 在全局 TAROT_DECK 中找到同 id 的牌
      const localCard = TAROT_DECK.find(c => c.id === cloudCard.id);
      if (!localCard) return;
      
      // 覆盖权重
      if (typeof cloudCard.weight === "number") {
        CloudConfig.weights[cloudCard.id] = cloudCard.weight;
      }
      
      // 覆盖正位解读
      if (typeof cloudCard.upright === "string" && cloudCard.upright.trim()) {
        localCard.upright = cloudCard.upright;
      }
      
      // 覆盖逆位解读
      if (typeof cloudCard.reversed === "string" && cloudCard.reversed.trim()) {
        localCard.reversed = cloudCard.reversed;
      }
    });
  }
}


/* ==================== 新的抽牌接口 ==================== */

/**
 * 带权重的随机抽一张牌
 * 权重从 CloudConfig.weights[id] 读取，缺省为 1
 * @returns {object} 一张牌的数据（含 orientation 字段）
 */
function weightedDrawOne() {
  const deck = TAROT_DECK;
  
  // 计算总权重
  let totalWeight = 0;
  const weightList = deck.map(card => {
    const w = CloudConfig.weights[card.id] ?? 1;
    totalWeight += w;
    return { card, w };
  });
  
  // 按权重随机
  let r = Math.random() * totalWeight;
  for (const { card, w } of weightList) {
    r -= w;
    if (r <= 0) return card;
  }
  return weightList[weightList.length - 1].card;
}

/**
 * 正逆位判定（用 CloudConfig.uprightRate）
 */
function decideOrientation() {
  const rate = CloudConfig.uprightRate / 100;
  return Math.random() < rate;
}

/**
 * 抽取 N 张不同的牌
 * 调用这个替代原来的 window.drawCards(count)
 */
function drawCardsByConfig(count) {
  const drawn = [];
  const usedIds = new Set();
  
  let safety = 0;
  while (drawn.length < count && safety < count * 100) {
    const card = weightedDrawOne();
    if (!usedIds.has(card.id)) {
      usedIds.add(card.id);
      drawn.push({
        ...card,
        orientation: decideOrientation(),
      });
    }
    safety++;
  }
  
  // 如果因权重太偏导致抽不到 N 张，fallback 到原始随机
  if (drawn.length < count) {
    const fallback = window.drawCards(count - drawn.length);
    fallback.forEach(c => {
      if (!usedIds.has(c.id)) {
        usedIds.add(c.id);
        drawn.push(c);
      }
    });
  }
  
  return drawn;
}


/* ==================== 暴露到全局 ==================== */
window.loadCloudConfig = loadCloudConfig;
window.drawCardsByConfig = drawCardsByConfig;
window.CloudConfig = CloudConfig;
