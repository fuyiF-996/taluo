/**
 * cabbage塔罗 牌意百科页逻辑
 */
(function() {
  let filter = "all", search = "";
  const $ = s => document.querySelector(s);

  // 搜索
  $("#lib-search").addEventListener("input", e => {
    search = e.target.value.trim().toLowerCase();
    render();
  });
  // 筛选
  document.querySelectorAll(".lib-filter").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".lib-filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filter = btn.dataset.f;
      render();
    });
  });

  function matchesFilter(c) {
    if (filter === "all") return true;
    if (filter === "major") return c.id.startsWith("M");
    return c.id.startsWith(filter[0].toUpperCase()); // w->W, c->C, s->S, p->P
  }

  function render() {
    const grid = $("#lib-grid");
    grid.innerHTML = "";
    const cards = TAROT_DECK.filter(c => {
      if (!matchesFilter(c)) return false;
      if (search) {
        const hay = (c.name + c.nameEn + c.id).toLowerCase();
        return hay.includes(search);
      }
      return true;
    });

    if (!cards.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px;">没有匹配的卡牌</div>`;
      return;
    }

    cards.forEach(c => {
      const el = document.createElement("div");
      el.className = "lib-card";
      el.innerHTML = `
        <img src="${c.imageUrl}" loading="lazy" alt="${c.name}" onerror="this.style.background='linear-gradient(135deg,#2d1b4e,#1a0d3d)';this.height='180px';">
        <div class="lib-name">${c.name}<small>${c.nameEn}</small></div>
      `;
      el.addEventListener("click", () => showDetail(c));
      grid.appendChild(el);
    });
  }

  function showDetail(c) {
    const modal = $("#lib-modal");
    modal.innerHTML = `
      <div class="lib-modal-card">
        <span class="lib-close" onclick="document.getElementById('lib-modal').style.display='none'">✕</span>
        <img src="${c.imageUrl}" alt="${c.name}" onerror="this.style.background='var(--bg-mid)'">
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

  // 等云端配置合并完再渲染（这样正逆位文字是最新的）
  document.addEventListener("DOMContentLoaded", async () => {
    if (window.loadCloudConfig) await window.loadCloudConfig();
    render();
  });
})();
