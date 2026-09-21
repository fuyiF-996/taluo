/**
 * cabbage塔罗 翻牌音效 + 振动 —— 纯 Web Audio API，零外部文件
 */
(function() {
  let ctx = null;
  function ensureCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function isSoundOn() {
    const s = getSettings();
    return s.sound !== false;
  }
  function isVibOn() {
    const s = getSettings();
    return s.vibrate !== false;
  }
  function getSettings() {
    try { return JSON.parse(localStorage.getItem("tarot_settings") || "{}"); }
    catch { return {}; }
  }

  /** 翻牌声：清脆滑音 */
  function playFlip() {
    if (!isSoundOn()) return;
    try {
      const ac = ensureCtx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(800, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.18);
      gain.gain.setValueAtTime(0.15, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
      osc.connect(gain).connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 0.22);
    } catch {}
    if (isVibOn() && navigator.vibrate) {
      try { navigator.vibrate([10, 20, 10]); } catch {}
    }
  }

  /** 洗牌声：随机多次轻响 */
  function playShuffle() {
    if (!isSoundOn()) return;
    try {
      const ac = ensureCtx();
      const n = 8 + Math.floor(Math.random() * 5);
      for (let i = 0; i < n; i++) {
        const t = ac.currentTime + (Math.random() * 2.5);
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(300 + Math.random() * 400, t);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain).connect(ac.destination);
        osc.start(t);
        osc.stop(t + 0.1);
      }
    } catch {}
  }

  window.TarotFeedback = { playFlip, playShuffle };
})();
