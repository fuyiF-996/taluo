/**
 * ============================================================================
 * 云端配置同步模块  v2（完整版）
 * ============================================================================
 * 
 * 职责：
 * 1. 从 api.taluo996.top 拉取管理员保存的塔罗配置
 * 2. 把云端配置合并进全局 TAROT_DECK
 * 3. 暴露 drawCardsByConfig() —— 加权抽牌 + 云端正位概率
 * 4. 暴露 CloudConfig 里的主题/牌阵开关/功能开关/关键词
 * 
 * 设计原则：API 不可用时自动降级，不影响正常占卜
 * ============================================================================
 */


/* ==================== API 地址 ==================== */
const API_BASE = "https://api.taluo996.top";
window.API_BASE = API_BASE;


/* ==================== 云端配置缓存（扩展版） ==================== */
const CloudConfig = {
  raw: null,                          // 完整原始 config
  weights: {},                        // 每张牌权重 { id: number }
  uprightRate: 50,                    // 全局正位概率
  loaded: false,

  // ===== v2 新增 =====
  globalTheme: "dark",                // 全站默认主题
  enabledSpreads: { single: true, three: true, yesno: true, relationship: true },
  features: {                         // 功能开关
    timeCapsule: true,
    dailyLimit: true,
    dailyMaxDraws: 3,
    themeSwitch: true,
    shareImage: true,
    sound: true,
    keywordFilter: true,
  },
  keywordRules: [],                   // [{from, to}] 敏感词转译规则
};


/**
 * 异步拉取云端配置并合并到 TAROT_DECK
 */
async function loadCloudConfig() {
  try {
    const resp = await fetch(`${API_BASE}/`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    if (!resp.ok) throw new Error(`API 返回 ${resp.status}`);

    const data = await resp.json();
    if (!data.ok || !data.config) {
      console.log("[塔罗] 云端暂无配置，使用内置默认值");
      return;
    }

    applyCloudConfig(data.config);
    CloudConfig.loaded = true;
    console.log("[塔罗] 云端配置已加载 ✓");

  } catch (err) {
    console.warn("[塔罗] 无法连接云端 API，使用内置默认值：", err.message);
  }
}


/**
 * 把云端 config 合并进全局状态
 */
function applyCloudConfig(config) {
  CloudConfig.raw = config;

  // ===== 全局正位概率 =====
  if (typeof config.globalUprightRate === "number") {
    CloudConfig.uprightRate = config.globalUprightRate;
  }

  // ===== v2：全站默认主题 =====
  if (config.globalTheme) CloudConfig.globalTheme = config.globalTheme;

  // ===== v2：牌阵可见开关 =====
  if (config.enabledSpreads && typeof config.enabledSpreads === "object") {
    CloudConfig.enabledSpreads = { ...CloudConfig.enabledSpreads, ...config.enabledSpreads };
  }

  // ===== v2：功能开关 =====
  if (config.features && typeof config.features === "object") {
    CloudConfig.features = { ...CloudConfig.features, ...config.features };
  }

  // ===== v2：敏感词规则 =====
  if (Array.isArray(config.keywordRules)) {
    CloudConfig.keywordRules = config.keywordRules;
  }

  // ===== 每张牌覆盖 =====
  if (Array.isArray(config.cards)) {
    config.cards.forEach(cloudCard => {
      const localCard = TAROT_DECK.find(c => c.id === cloudCard.id);
      if (!localCard) return;

      if (typeof cloudCard.weight === "number") {
        CloudConfig.weights[cloudCard.id] = cloudCard.weight;
      }

      // 正/逆位解读
      if (typeof cloudCard.upright === "string" && cloudCard.upright.trim()) {
        localCard.upright = cloudCard.upright;
      }
      if (typeof cloudCard.reversed === "string" && cloudCard.reversed.trim()) {
        localCard.reversed = cloudCard.reversed;
      }

      // v2：牌意联想 4 字段
      if (typeof cloudCard.keywords === "string" && cloudCard.keywords.trim()) {
        localCard.keywords = cloudCard.keywords;
      }
      if (typeof cloudCard.element === "string" && cloudCard.element.trim()) {
        localCard.element = cloudCard.element;
      }
      if (typeof cloudCard.advice === "string" && cloudCard.advice.trim()) {
        localCard.advice = cloudCard.advice;
      }
      if (typeof cloudCard.warning === "string" && cloudCard.warning.trim()) {
        localCard.warning = cloudCard.warning;
      }
    });
  }
}


/* ==================== 加权抽牌接口 ==================== */

function weightedDrawOne() {
  const deck = TAROT_DECK;
  let totalWeight = 0;
  const weightList = deck.map(card => {
    const w = CloudConfig.weights[card.id] ?? 1;
    totalWeight += w;
    return { card, w };
  });
  let r = Math.random() * totalWeight;
  for (const { card, w } of weightList) {
    r -= w;
    if (r <= 0) return card;
  }
  return weightList[weightList.length - 1].card;
}

function decideOrientation() {
  const rate = CloudConfig.uprightRate / 100;
  return Math.random() < rate;
}

function drawCardsByConfig(count) {
  const drawn = [];
  const usedIds = new Set();
  let safety = 0;
  while (drawn.length < count && safety < count * 100) {
    const card = weightedDrawOne();
    if (!usedIds.has(card.id)) {
      usedIds.add(card.id);
      drawn.push({ ...card, orientation: decideOrientation() });
    }
    safety++;
  }
  if (drawn.length < count && typeof window.drawCards === "function") {
    const fallback = window.drawCards(count - drawn.length);
    fallback.forEach(c => {
      if (!usedIds.has(c.id)) { usedIds.add(c.id); drawn.push(c); }
    });
  }
  return drawn;
}


/* ==================== WebP 自动降级（性能优化） ==================== */
/**
 * 检测浏览器 WebP 支持 → 把 TAROT_DECK 的 imageUrl 从 .png 换成 .webp
 * images-webp/ 目录已由 sharp 批量转换（78张 20.88MB → 4.03MB，省80%）
 * 不支持 WebP 的浏览器（极旧版）保持 .png 不变
 */
(function enableWebPFallback() {
  const webpSupport = document.createElement("canvas").toDataURL("image/webp").indexOf("data:image/webp") === 0;
  if (!webpSupport) {
    console.log("[塔罗] 浏览器不支持 WebP，使用 PNG 原图");
    return;
  }
  let converted = 0;
  TAROT_DECK.forEach(c => {
    if (c.imageUrl && c.imageUrl.endsWith(".png")) {
      // images/xxx.png → images-webp/xxx.webp
      c.imageUrl = c.imageUrl.replace(/^images\//, "images-webp/").replace(/\.png$/, ".webp");
      converted++;
    }
  });
  if (converted) console.log(`[塔罗] WebP 优化已启用：${converted} 张图从 PNG 切换到 WebP`);
})();


/* ==================== 暴露到全局 ==================== */
window.loadCloudConfig = loadCloudConfig;
window.drawCardsByConfig = drawCardsByConfig;
window.CloudConfig = CloudConfig;
