/**
 * cabbage塔罗 Service Worker —— PWA 离线支持
 * 策略：stale-while-revalidate 缓存静态资源；network-first 缓存 API
 */
const CACHE_NAME = "tarot-v4";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./library.html",
  "./capsule.html",
  "./stats.html",
  "./admin.html",
  "./css/style.css",
  "./js/tarot-data.js",
  "./js/config-sync.js",
  "./js/settings.js",
  "./js/feedback.js",
  "./js/share-image.js",
  "./js/library.js",
  "./js/stats.js",
  "./js/app.js",
  "./manifest.webmanifest",
  // 预缓存 4 张大阿卡那常用卡（确保首屏体验）
  "./images-webp/00-TheFool.webp",
  "./images-webp/21-TheWorld.webp",
];

// 安装 → 预缓存静态资源
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

// 激活 → 清理旧版本缓存
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// 请求拦截 → 缓存策略
self.addEventListener("fetch", e => {
  const req = e.request;

  // POST 请求直接透传（不缓存写操作）
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // API 请求 → network-first（优先在线数据）
  if (url.hostname.includes("api.taluo996.top")) {
    e.respondWith(
      fetch(req).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return resp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // 图片 → stale-while-revalidate（WebP + PNG）
  if (/\.(webp|png|jpg|jpeg|svg|gif)$/i.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(cached => {
        // 后台更新缓存
        fetch(req).then(resp => {
          if (resp.ok) caches.open(CACHE_NAME).then(c => c.put(req, resp));
        }).catch(() => {});
        return cached || fetch(req);
      })
    );
    return;
  }

  // 静态 HTML/CSS/JS → stale-while-revalidate
  e.respondWith(
    caches.match(req).then(cached => {
      fetch(req).then(resp => {
        if (resp.ok) caches.open(CACHE_NAME).then(c => c.put(req, resp));
      }).catch(() => {});
      return cached || fetch(req);
    })
  );
});
