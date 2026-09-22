/**
 * ============================================================================
 * cabbage塔罗 —— 性能看门狗（perf.js）
 * ============================================================================
 *
 * 为什么需要它：
 *   页面里最贵的是「毛玻璃 backdrop-filter + 无限循环动画」。
 *   高端机上是加分项，低端机 / 集显 / 省电模式上会让页面直接卡死。
 *
 * 做两件事：
 *   1. 首屏稳定后实测真实帧率；中位帧间隔超过 40ms（不到 25fps）就自动给
 *      <html> 加 .perf-lite，由 CSS 关掉毛玻璃和装饰动画（功能完全不受影响）。
 *   2. 滚动时同样采样一次：毛玻璃在滚动中要不停重新取样，这是第二大头号开销，
 *      只看「静止帧率」会漏掉这种情况。
 *
 * 保护措施：
 *   - 只在页面可见、且只测固定轮数，异常一律静默，绝不影响占卜主流程。
 *   - 只降级、不自动回升，避免视觉来回闪烁（手动恢复用 TarotPerf.restore()）。
 *   - 头部守卫已经判定为低端设备时，直接跳过测量。
 * ============================================================================
 */
(function () {
  'use strict';

  var HTML = document.documentElement;
  var IDLE_FRAMES = 70;        // 静止采样帧数（约 1.2s）
  var SCROLL_FRAMES = 40;      // 滚动采样帧数
  var SLOW_FRAME_MS = 40;      // 中位帧间隔阈值 = 低于 25fps
  var CHECK_DELAY_MS = 1200;   // 等首屏稳定后再测
  var MAX_SCROLL_CHECKS = 3;   // 最多检查 3 次滚动，避免长期占用

  var scrollChecks = 0;
  var scrollSampling = false;

  function isLite() { return HTML.classList.contains('perf-lite'); }

  function median(arr) {
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var mid = a.length >> 1;
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }

  function degrade(reason) {
    if (isLite()) return;
    HTML.classList.add('perf-lite');
    try { console.info('[塔罗] 检测到渲染卡顿（' + reason + '），已自动切换到轻量模式'); } catch (e) {}
  }

  var raf = window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : function (cb) { return setTimeout(function () { cb(Date.now()); }, 16); };

  /** 采样 n 帧，回调中位帧间隔（ms） */
  function sampleFrames(n, done) {
    var frames = [];
    var last = 0;
    function step(now) {
      if (last) frames.push(now - last);
      last = now;
      if (frames.length < n) { raf(step); return; }
      done(median(frames));
    }
    raf(step);
  }

  function checkIdle() {
    if (document.visibilityState !== 'visible' || isLite()) return;
    sampleFrames(IDLE_FRAMES, function (med) {
      if (med > SLOW_FRAME_MS) degrade('静止中位帧间隔 ' + med.toFixed(1) + 'ms');
    });
  }

  function onScroll() {
    if (scrollSampling || isLite() || scrollChecks >= MAX_SCROLL_CHECKS) return;
    scrollSampling = true;
    scrollChecks++;
    sampleFrames(SCROLL_FRAMES, function (med) {
      scrollSampling = false;
      if (med > SLOW_FRAME_MS) degrade('滚动中位帧间隔 ' + med.toFixed(1) + 'ms');
    });
  }

  function start() {
    setTimeout(function () {
      try { checkIdle(); } catch (e) {}
    }, CHECK_DELAY_MS);
    try {
      window.addEventListener('scroll', onScroll, { passive: true });
    } catch (e) {}
  }

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });

  // 调试 / 手动切换
  window.TarotPerf = {
    degrade: degrade,
    isLite: isLite,
    /** 手动解除轻量模式（恢复完整体验；再卡会自动重新降级） */
    restore: function () { HTML.classList.remove('perf-lite'); scrollChecks = 0; },
  };
})();
