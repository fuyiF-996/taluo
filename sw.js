/**
 * ============================================================================
 * cabbage塔罗 Service Worker —— PWA 离线支持  v7
 * ============================================================================
 *
 * v7 性能 / 正确性修复（针对「打开很慢、白屏、像卡死」）：
 *
 * 1. HTML 从 stale-while-revalidate 改成 network-first
 *    旧策略会把上一次的 index.html 直接吐给用户，然后才在后台更新 —— 
 *    部署新版本后，用户可能拿到「旧 HTML + 新 JS」这种错配组合，
 *    页面卡在初始化或者白屏，刷新多少次都一样（要第二次访问才恢复）。
 *    现在导航请求优先走网络（4s 超时），失败才用缓存兜底。
 *
 * 2. 只接管同源请求
 *    旧版本把 fonts.googleapis.com / 第三方请求也拦下来缓存，
 *    既拖慢了字体加载，又可能把异常响应写进缓存。跨域一律直接放行。
 *
 * 3. 预缓存不再「一个 404 就整体失败」
 *    旧版本用 addAll()，任何一个资源 404 都会让 install 失败 →
 *    SW 永远装不上、旧 SW 的旧缓存永远留着。现在逐个 allSettled。
 *
 * 4. 缓存版本号 v6 → v7，激活时清掉所有旧缓存，让上面这些修复立即生效。
 *
 * 策略总览：
 *   · 导航 / HTML        → network-first（4s 超时 → 缓存 → 离线兜底）
 *   · CSS / JS           → network-first（3s 超时 → 缓存）
 *   · 图片               → stale-while-revalidate（首屏不等待网络）
 *   · 跨域 / 非 GET      → 不拦截，交给浏览器
 * ============================================================================
 */

const CACHE_NAME = "tarot-v7";
const PRECACHE_TIMEOUT_MS = 15000;

/** 预缓存清单（全部是同源相对路径，SW 在站点根目录，子路径部署也适用） */
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./library.html",
  "./capsule.html",
  "./stats.html",
  "./calendar.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/tarot-data.js",
  "./js/config-sync.js",
  "./js/settings.js",
  "./js/feedback.js",
  "./js/share-image.js",
  "./js/library.js",
  "./js/stats.js",
  "./js/app.js",
  "./js/extras.js",
  "./js/extras-v4.js",
  "./js/perf.js",
  // 首屏体验：预缓存 2 张大阿卡那（不预缓存全部 78 张，避免拖慢安装）
  "./images-webp/00-TheFool.webp",
  "./images-webp/21-TheWorld.webp",
];

/* ==================== 安装：逐个预缓存，允许个别失败 ==================== */
self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const results = await Promise.allSettled(
      STATIC_ASSETS.map(async (url) => {
        // 单个资源加超时，避免某个请求挂住整个安装过程
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), PRECACHE_TIMEOUT_MS);
        try {
          const resp = await fetch(new Request(url, { cache: "reload" }), { signal: ctrl.signal });
          if (resp && resp.ok && resp.type !== "opaque") await cache.put(url, resp);
        } finally {
          clearTimeout(timer);
        }
      })
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) console.warn(`[SW] 预缓存有 ${failed} 个资源失败，其余照常可用`);
    await self.skipWaiting();
  })());
});

/* ==================== 激活：清掉旧版本缓存，立即接管 ==================== */
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

/* ==================== 工具函数 ==================== */

/** 带超时的 fetch；超时返回 null，让调用方走缓存 */
async function fetchWithTimeout(request, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(request, { signal: ctrl.signal });
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function putIfCacheable(cache, request, resp) {
  // 只缓存同源、成功、非 opaque 的响应
  if (!resp || !resp.ok || resp.type === "opaque") return;
  try { await cache.put(request, resp.clone()); } catch (e) { /* 配额满等情况忽略 */ }
}

/** 网络优先，失败/超时用缓存；返回 null 表示彻底没有可用响应 */
async function networkFirst(request, timeoutMs) {
  const cache = await caches.open(CACHE_NAME);
  const resp = await fetchWithTimeout(request, timeoutMs);

  if (resp) {
    await putIfCacheable(cache, request, resp);
    return resp;
  }

  const cached = await cache.match(request);
  return cached || null;
}

/** 图片等静态资源：有缓存先用缓存（首屏不等网络），后台静默更新 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const network = fetch(request).then(async (resp) => {
    await putIfCacheable(cache, request, resp);
    return resp;
  }).catch(() => null);

  if (cached) return cached;               // 命中缓存：立即返回，网络在后台更新
  const resp = await network;              // 未命中：只能等网络
  return resp || Response.error();
}

/* ==================== 请求拦截 ==================== */
self.addEventListener("fetch", (e) => {
  const req = e.request;

  // 只处理 GET
  if (req.method !== "GET") return;

  // 只处理同源请求：跨域（字体 / 第三方 API）一律不拦截、不缓存
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  // Range 请求（视频/大文件分片）不要碰
  if (req.headers.has("range")) return;

  // 1. 页面导航 / HTML：network-first，保证永远先拿到最新版本
  if (req.mode === "navigate" || req.destination === "document") {
    e.respondWith((async () => {
      const resp = await networkFirst(req, 4000);
      if (resp) return resp;

      // 离线兜底：返回缓存的首页（相对 SW 作用域解析，支持子路径部署）
      const cache = await caches.open(CACHE_NAME);
      const fallback = await cache.match(new URL("./index.html", self.registration.scope).href)
        || await cache.match("./index.html")
        || await cache.match("./");
      return fallback || Response.error();
    })());
    return;
  }

  // 2. CSS / JS：network-first（3s），避免新旧版本错配把页面卡死
  if (/\.(css|js|mjs)$/i.test(url.pathname)) {
    e.respondWith((async () => {
      const resp = await networkFirst(req, 3000);
      return resp || Response.error();
    })());
    return;
  }

  // 3. 图片 / 字体 / 图标：stale-while-revalidate，首屏不等网络
  if (/\.(webp|png|jpg|jpeg|svg|gif|ico|woff2?|ttf|otf)$/i.test(url.pathname)) {
    e.respondWith(staleWhileRevalidate(req));
    return;
  }

  // 4. 其他同源请求（manifest 等）：network-first
  e.respondWith((async () => {
    const resp = await networkFirst(req, 3000);
    return resp || Response.error();
  })());
});
