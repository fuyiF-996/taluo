/**
 * cabbage塔罗 分享图生成 —— 纯 Canvas，零外部库
 */
(function() {

  /**
   * 生成 1080×1920 竖图
   * @param {Object} opts
   *   - question: string
   *   - spreadName: string
   *   - cards: [{name, nameEn, orientation, imageUrl, upright, reversed}, ...]
   */
  async function generate(opts) {
    const { question, spreadName, cards } = opts;
    const W = 1080, H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    // 背景：深色渐变
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0d0a1f");
    bg.addColorStop(0.5, "#1a0d3d");
    bg.addColorStop(1, "#0d0a1f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 星点（随机固定种子）
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    for (let i = 0; i < 80; i++) {
      const x = ((i * 137) % W);
      const y = ((i * 91 + 17) % H);
      ctx.fillRect(x, y, 2, 2);
    }

    // 顶部 LOGO 区
    ctx.textAlign = "center";
    ctx.fillStyle = "#d4af37";
    ctx.font = "bold 54px Georgia, serif";
    ctx.fillText("✦ cabbage塔罗 ✦", W / 2, 120);
    ctx.font = "22px Georgia, serif";
    ctx.fillStyle = "#a89cc0";
    ctx.fillText(spreadName || "神秘抽牌", W / 2, 160);

    // 分割线
    ctx.strokeStyle = "rgba(212,175,55,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(120, 190); ctx.lineTo(W - 120, 190);
    ctx.stroke();

    // 问题
    if (question) {
      ctx.fillStyle = "#a89cc0";
      ctx.font = "24px sans-serif";
      ctx.textAlign = "left";
      wrapText(ctx, question, 120, 240, W - 240, 34);
    }

    // 每张卡
    let y = 380;
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const orient = card.orientation ? "正位" : "逆位";

      // 位置标签（三牌阵时）
      if (cards.length === 3) {
        const posLabels = ["过去", "现在", "未来"];
        ctx.textAlign = "left";
        ctx.fillStyle = "#a89cc0";
        ctx.font = "20px sans-serif";
        ctx.fillText("📍 " + (posLabels[i] || ""), 120, y);
      } else if (cards.length === 6) {
        const posLabels = ["我", "TA", "我们", "过去", "现在", "未来"];
        ctx.textAlign = "left";
        ctx.fillStyle = "#a89cc0";
        ctx.font = "20px sans-serif";
        ctx.fillText("📍 " + (posLabels[i] || ""), 120, y);
      } else if (cards.length === 1) {
        ctx.textAlign = "left";
        ctx.fillStyle = "#a89cc0";
        ctx.font = "20px sans-serif";
        ctx.fillText("📍 今日指引", 120, y);
      }

      // 卡名 + 正逆位标签
      y += 30;
      ctx.textAlign = "left";
      ctx.font = "bold 34px Georgia, serif";
      ctx.fillStyle = "#f0e6ff";
      ctx.fillText(card.name, 120, y);
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = orient === "正位" ? "#4ade80" : "#f87171";
      ctx.fillText("[" + orient + "]", 120 + ctx.measureText(card.name).width + 12, y);

      // 解读
      y += 40;
      ctx.font = "22px sans-serif";
      ctx.fillStyle = "#d4af37";
      const meaning = card.orientation ? card.upright : card.reversed;
      wrapText(ctx, meaning, 120, y, W - 240, 30);
      y += ctx.measureText("").actualBoundingBoxAscent * 2 + 30 * (Math.ceil(ctx.measureText(meaning).width / (W - 240)) + 1);
      y += 40;
    }

    // 底部
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(168,156,192,0.5)";
    ctx.font = "18px sans-serif";
    ctx.fillText("✨ 占卜结果仅供参考 ✨", W / 2, H - 80);
    ctx.font = "16px sans-serif";
    ctx.fillText("taluo996.top", W / 2, H - 50);

    return canvas;
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    const chars = text.split("");
    let line = "";
    let yy = y;
    for (let i = 0; i < chars.length; i++) {
      const test = line + chars[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy);
        line = chars[i];
        yy += lineH;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, yy);
  }

  function downloadCanvas(canvas, filename) {
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = filename || "tarot-share.png";
    a.click();
  }

  window.TarotShare = { generate, downloadCanvas };
})();
