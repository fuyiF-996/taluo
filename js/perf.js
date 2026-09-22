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
  var SAMPLE_MS = 1200;        // 静止采样时长（按时间采样，卡机也能尽快判定）
  var SCROLL_SAMPLE_MS = 900;  // 滚动采样时长
  var MIN_FRAMES = 6;          // 样本太少（标签页被节流）就不下结论
  var SLOW_FRAME_MS = 34;      // 中位帧间隔阈值 ≈ 低于 30fps
  var JANK_FRAME_MS = 50;      // 单帧超过它就算一次卡顿
  var JANK_RATIO = 0.2;        // 卡顿帧占比超过它 → 判定为「卡」
  var CHECK_DELAYS = [1200, 5000]; // 首屏后测两次（第二次能覆盖图片/字体加载完）
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

  /**
   * 按「时长」采样帧间隔（不是按帧数）。
   * 关键：按帧数采样时，卡机要攒够 70 帧得等好几秒，用户先卡了半天才降级；
   * 按时间采样，慢设备 1.2 秒只出 15~20 帧，也足够判定并立刻降级。
   * 同时统计长帧占比 —— 只看平均帧率会漏掉「40fps 但每隔几帧掉一次 80ms」。
   */
  function sampleFrames(maxMs, done) {
    var frames = [];
    var last = 0, t0 = 0, finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      var med = median(frames);
      var janky = 0;
      for (var i = 0; i < frames.length; i++) if (frames[i] > JANK_FRAME_MS) janky++;
      done(med, frames.length ? janky / frames.length : 0, frames.length);
    }

    function step(now) {
      if (!t0) t0 = now;
      if (last) frames.push(now - last);
      last = now;
      if (now - t0 < maxMs || frames.length < MIN_FRAMES) { raf(step); return; }
      finish();
    }
    raf(step);
  }

  function judge(med, jankRatio, tag) {
    if (med > SLOW_FRAME_MS) {
      degrade(tag + '中位帧间隔 ' + med.toFixed(1) + 'ms');
      return true;
    }
    if (jankRatio > JANK_RATIO) {
      degrade(tag + (jankRatio * 100).toFixed(0) + '% 的帧超过 ' + JANK_FRAME_MS + 'ms');
      return true;
    }
    return false;
  }

  function checkIdle() {
    if (document.visibilityState !== 'visible' || isLite()) return;
    sampleFrames(SAMPLE_MS, function (med, jankRatio) {
      judge(med, jankRatio, '静止');
    });
  }

  function onScroll() {
    if (scrollSampling || isLite() || scrollChecks >= MAX_SCROLL_CHECKS) return;
    scrollSampling = true;
    scrollChecks++;
    sampleFrames(SCROLL_SAMPLE_MS, function (med, jankRatio) {
      scrollSampling = false;
      judge(med, jankRatio, '滚动');
    });
  }

  var started = false;

  function start() {
    if (started) return;
    started = true;
    CHECK_DELAYS.forEach(function (delay) {
      setTimeout(function () {
        try { checkIdle(); } catch (e) {}
      }, delay);
    });
    try {
      window.addEventListener('scroll', onScroll, { passive: true });
    } catch (e) {}
  }

  if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', start, { once: true });
    // 兜底：万一有外部请求把 load 事件拖住（例如字体/第三方统计），
    // 1.5 秒后照样开始测量，不能让看门狗跟着一起卡住。
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(start, 1500);
    }, { once: true });
  }

  /* ========================================================================
   * 诊断面板（排障用，不影响正常访问）
   * 打开方式：网址后面加 ?perf=1
   *   https://taluo996.top/?perf=1
   * 会显示这个设备上的真实数据：首屏时间、资源体积、实时帧率、是否已降级。
   * 把这一屏截图/拍照发出来，就能精确定位「卡在哪」。
   * ====================================================================== */
  function mountDiagnostic() {
    if (!/(^|[?&])perf=1(&|$)/.test(window.location.search)) return;

    var box = document.createElement('div');
    box.id = 'tarot-perf-panel';
    box.style.cssText = [
      'position:fixed', 'left:6px', 'bottom:6px', 'z-index:2147483647',
      'max-width:94vw', 'max-height:70vh', 'overflow:auto',
      'background:rgba(0,0,0,0.86)', 'color:#7ef7c8',
      'font:12px/1.55 ui-monospace,Consolas,monospace',
      'padding:10px 12px', 'border:1px solid rgba(100,216,203,0.5)',
      'border-radius:8px', 'white-space:pre-wrap', 'word-break:break-all',
      'pointer-events:auto',
    ].join(';');
    box.textContent = '塔罗性能诊断加载中…';
    document.body.appendChild(box);

    var lcp = 0;
    try {
      new PerformanceObserver(function (l) {
        var es = l.getEntries();
        lcp = es[es.length - 1].startTime;
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {}

    function nav() { return performance.getEntriesByType('navigation')[0] || {}; }
    function fcp() {
      var ps = performance.getEntriesByType('paint');
      for (var i = 0; i < ps.length; i++) if (ps[i].name === 'first-contentful-paint') return ps[i].startTime;
      return 0;
    }
    function resources() {
      var rs = performance.getEntriesByType('resource');
      var bytes = 0, slowest = null;
      for (var i = 0; i < rs.length; i++) {
        bytes += rs[i].transferSize || 0;
        if (!slowest || rs[i].duration > slowest.duration) slowest = rs[i];
      }
      return { count: rs.length, kb: Math.round(bytes / 1024), slowest: slowest };
    }

    function render(fps) {
      var n = nav(), r = resources(), s = '';
      s += '时间 ' + new Date().toLocaleTimeString() + '   轻量模式: ' + (isLite() ? '已开启 ✓' : '未开启') + '\n';
      s += '设备: ' + (navigator.userAgent || '?').slice(0, 90) + '\n';
      s += '屏幕: ' + screen.width + 'x' + screen.height + '  DPR=' + (window.devicePixelRatio || 1) +
           '  核心=' + (navigator.hardwareConcurrency || '?') + '  内存=' + (navigator.deviceMemory || '?') + '\n';
      s += '—— 加载 ——\n';
      s += 'FCP 首次绘制 : ' + Math.round(fcp()) + ' ms\n';
      s += 'LCP 最大元素 : ' + Math.round(lcp) + ' ms\n';
      s += 'TTFB 首字节  : ' + Math.round(n.responseStart || 0) + ' ms\n';
      s += 'DOMContentLoaded: ' + Math.round(n.domContentLoadedEventEnd || 0) + ' ms\n';
      s += 'load 事件    : ' + Math.round(n.loadEventEnd || 0) + ' ms（0 = 被外部请求拖住还没触发）\n';
      s += '—— 资源 ——\n';
      s += '请求数 ' + r.count + ' 个，传输 ' + r.kb + ' KB\n';
      if (r.slowest) s += '最慢: ' + r.slowest.name.split('/').pop() + ' ' + Math.round(r.slowest.duration) + ' ms\n';
      s += '—— 渲染 ——\n';
      s += '实时帧率: ' + (fps ? fps.toFixed(0) + ' fps' : '测量中…') + '\n';
      s += 'ServiceWorker: ' + (navigator.serviceWorker && navigator.serviceWorker.controller ? '已接管（可能仍用旧缓存）' : '未接管') + '\n';
      s += '提示: 卡顿时看「实时帧率」，低于 30 就是真的掉帧\n';
      s += '可执行 TarotPerf.restore() / TarotPerf.degrade("手动") 对比';
      box.textContent = s;
    }

    render(0);
    setInterval(function () {
      // 每秒测一次实时帧率
      var frames = 0, t0 = performance.now();
      (function tick() {
        frames++;
        if (performance.now() - t0 < 1000) raf(tick);
        else render(frames * 1000 / (performance.now() - t0));
      })();
    }, 1000);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    try { mountDiagnostic(); } catch (e) {}
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      try { mountDiagnostic(); } catch (e) {}
    }, { once: true });
  }

  // 调试 / 手动切换
  window.TarotPerf = {
    degrade: degrade,
    isLite: isLite,
    /** 手动解除轻量模式（恢复完整体验；再卡会自动重新降级） */
    restore: function () { HTML.classList.remove('perf-lite'); scrollChecks = 0; },
  };
})();
