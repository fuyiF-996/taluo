/**
 * cabbage塔罗 牌意百科页逻辑 v2
 * 优化：IntersectionObserver 真正懒加载 + DOM patch（不重建）+ 骨架屏
 */
(function() {
  let filter = "all", search = "";
  const $ = s => document.querySelector(s);
  const CARD_HEIGHT_EST = 280;  // 每张卡 DOM 预估高度，用于计算首屏预加载数

  // ---------- IntersectionObserver 真正懒加载 ----------
  const io = new IntersectionObserver((entries, ob) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const img = e.target;
      if (img.dataset.src && !img.src.endsWith(img.dataset.src.split("/").pop())) {
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
        ob.unobserve(img);
      }
    });
  }, { rootMargin: "200px 0px", threshold: 0 });  // 进入视口前 200px 预取

  // ---------- 事件绑定 ----------
  $("#lib-search").addEventListener("input", e => {
    search = e.target.value.trim().toLowerCase();
    render();
  });
  document.querySelectorAll(".lib-filter").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".lib-filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filter = btn.dataset.f;
      render();
    });
  });

  // URL 参数：?card=00-TheFool → 自动弹窗
  const urlCardId = new URLSearchParams(location.search).get("card");

  function matchesFilter(c) {
    if (filter === "all") return true;
    if (filter === "major") return c.id.startsWith("M");
    return c.id.startsWith(filter[0].toUpperCase());
  }

  function matchesSearch(c) {
    if (!search) return true;
    const hay = (c.name + c.nameEn + c.id).toLowerCase();
    return hay.includes(search);
  }

  // ---------- DOM patch 渲染（核心：不 innerHTML=""）----------
  function render() {
    const grid = $("#lib-grid");
    const allCards = TAROT_DECK;

    // 预建 Map 方便查找
    const cardMap = new Map();
    allCards.forEach(c => cardMap.set(c.id, c));

    // 需要显示的卡牌 ID 集合
    const visibleIds = new Set(
      allCards.filter(c => matchesFilter(c) && matchesSearch(c)).map(c => c.id)
    );

    if (visibleIds.size === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px;">没有匹配的卡牌</div>`;
      return;
    }

    // 已存在的 DOM 元素 Map
    const existing = new Map();
    grid.querySelectorAll(".lib-card").forEach(el => existing.set(el.dataset.id, el));

    // 1. 移除不再需要的 DOM
    existing.forEach((el, id) => {
      if (!visibleIds.has(id)) {
        io.unobserve(el.querySelector("img"));
        el.remove();
      }
    });

    // 2. 按 visibleIds 顺序排列 DOM（先收集，再一次性排序）
    const orderMap = new Map();
    Array.from(grid.children).forEach((el, idx) => {
      if (el.classList?.contains("lib-card")) {
        const id = el.dataset.id;
        if (visibleIds.has(id)) orderMap.set(id, idx);
      }
    });

    // 3. 创建新 DOM 或移动已有 DOM 到正确位置
    const frag = document.createDocumentFragment();
    const newEls = [];

    // 先处理已有元素：从 grid 里摘出来，按新顺序排列
    existing.forEach(el => {
      if (visibleIds.has(el.dataset.id)) grid.removeChild(el);
    });

    // 按 visibleIds 顺序构建
    visibleIds.forEach(id => {
      const c = cardMap.get(id);
      let el = existing.get(id);
      if (!el) {
        // 创建新 DOM
        el = document.createElement("div");
        el.className = "lib-card card-card";
        el.dataset.id = id;
        // 用 data-src 做真正懒加载
        const cardPath = c.imageUrl || `images-webp/${c.id}.webp`;
        el.innerHTML = `
          <img data-src="${cardPath}" alt="${c.name}" loading="lazy">
          <div class="lib-name">${c.name}<small>${c.nameEn}</small></div>
        `;
        // onerror 处理（放 JS 里更干净）
        const img = el.querySelector("img");
        img.addEventListener("error", () => {
          img.style.background = "linear-gradient(135deg,#2d1b4e,#1a0d3d)";
          img.style.height = "180px";
          img.removeAttribute("data-src");
        });
        el.addEventListener("click", () => showDetail(c));
      } else {
        // 已有元素：确保 img 已加载
        const img = el.querySelector("img");
        if (img?.dataset.src && !img.src.endsWith(img.dataset.src.split("/").pop())) {
          // 之前可能被移除了 src，重新设置
          img.src = img.dataset.src;
          img.removeAttribute("data-src");
        }
      }
      frag.appendChild(el);
      newEls.push(el);
    });

    grid.innerHTML = "";  // 清空的只是已被摘出来的元素引用，不是销毁
    grid.appendChild(frag);

    // 4. 对所有新/重置的 img 启动 IntersectionObserver
    grid.querySelectorAll("img[data-src]").forEach(img => io.observe(img));
  }

  // ---------- 详情弹窗（点击时预加载）----------
  function showDetail(c) {
    const modal = $("#lib-modal");
    const imgSrc = c.imageUrl || `images-webp/${c.id}.webp`;

    // 预加载：先创建 Image 对象，加载完再显示弹窗（体验更流畅）
    const preload = new Image();
    preload.onload = () => openModal(c, imgSrc);
    preload.onerror = () => openModal(c, imgSrc);  // 失败也显示，让 onerror 处理
    preload.src = imgSrc;
  }

  function openModal(c, imgSrc) {
    const modal = $("#lib-modal");
    modal.innerHTML = `
      <div class="lib-modal-card">
        <span class="lib-close" onclick="document.getElementById('lib-modal').style.display='none'">✕</span>
        <img src="${imgSrc}" alt="${c.name}" onerror="this.style.background='var(--bg-mid)'">
        <h2>${c.name}</h2>
        <div style="color:var(--text-muted);font-size:0.85rem;margin-bottom:12px;font-style:italic;">${c.nameEn}</div>
        <div class="section"><h4>🌅 正位含义</h4><p>${c.upright || "—"}</p></div>
        <div class="section"><h4>🌙 逆位含义</h4><p>${c.reversed || "—"}</p></div>
        ${c.keywords ? `<div class="section"><h4>🏷️ 关键词</h4><p>${c.keywords}</p></div>` : ""}
        ${c.element ? `<div class="section"><h4>✨ 对应元素</h4><p>${c.element}</p></div>` : ""}
        ${c.advice ? `<div class="section"><h4>💡 建议行动</h4><p>${c.advice}</p></div>` : ""}
        ${c.warning ? `<div class="section"><h4>⚠️ 警告提示</h4><p>${c.warning}</p></div>` : ""}
      </div>
    `;
    modal.style.display = "flex";
    modal.addEventListener("click", onBgClick);
  }

  function onBgClick(e) {
    if (e.target.id === "lib-modal") {
      $("#lib-modal").style.display = "none";
      $("#lib-modal").removeEventListener("click", onBgClick);
    }
  }
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") $("#lib-modal").style.display = "none";
  });

  // ---------- 启动 ----------
  document.addEventListener("DOMContentLoaded", async () => {
    if (window.loadCloudConfig) await window.loadCloudConfig();
    render();

    // 如果 URL 带 ?card= 参数，首次渲染后自动弹窗
    if (urlCardId) {
      const card = TAROT_DECK.find(c => c.id === urlCardId);
      if (card) setTimeout(() => showDetail(card), 300);
    }
  });
})();
