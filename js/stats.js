/**
 * cabbage塔罗 · 个人数据看板 v3
 * 数据源：localStorage tarot_history + tarot_stats
 */
(function() {
  const HIST_KEY = "tarot_history";  // [{cards, question, spread, timestamp}]
  const STATS_KEY = "tarot_stats";    // { totalDraws, spreads: {}, cards: {}, positions: {}, dates: {} }

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); }
    catch { return []; }
  }

  function getStats() {
    try { return JSON.parse(localStorage.getItem(STATS_KEY) || "null"); }
    catch { return null; }
  }

  function refreshStats() {
    const history = getHistory();
    const s = {
      totalDraws: history.length,
      spreads: {},       // { single: 12, three: 5, ... }
      cards: {},         // { 'M00': 3, 'W14': 2, ... } 高频卡牌
      orientations: { upright: 0, reversed: 0 },
      dates: {},         // { '2026-09-21': 3 } 每日活跃度
      keywords: {},      // 问题关键词
      lastUpdated: Date.now(),
    };

    history.forEach(entry => {
      s.spreads[entry.spreadName || entry.spread] = (s.spreads[entry.spreadName || entry.spread] || 0) + 1;
      const d = new Date(entry.timestamp);
      const day = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      s.dates[day] = (s.dates[day] || 0) + 1;

      (entry.cards || []).forEach(c => {
        if (c.id) s.cards[c.id] = (s.cards[c.id] || 0) + 1;
        if (c.orientation === true) s.orientations.upright++;
        else if (c.orientation === false) s.orientations.reversed++;
      });

      // 关键词提取（简单分词）
      if (entry.question) {
        const words = entry.question.replace(/[^\u4e00-\u9fa5\w]/g, " ").split(/\s+/).filter(w => w.length >= 2);
        words.forEach(w => { s.keywords[w] = (s.keywords[w] || 0) + 1; });
      }
    });

    localStorage.setItem(STATS_KEY, JSON.stringify(s));
    return s;
  }

  window.TarotStats = { refreshStats, getHistory, getStats };
})();
