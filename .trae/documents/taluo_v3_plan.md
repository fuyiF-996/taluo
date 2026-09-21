# cabbage塔罗 v3 —— 性能优化 + 10 个创新点实施计划

## Repository Research

### 当前架构
```
taluo/
├── index.html          主占卜页
├── library.html        牌意百科（78 张网格）
├── capsule.html        时间胶囊
├── admin.html          管理后台（4 Tab + Master-Detail）
├── css/style.css       约 1400 行，data-theme 驱动（dark / liquid）
├── images/             78 张 PNG，**300×527，20.88 MB**
├── js/
│   ├── tarot-data.js   TAROT_DECK 数据源
│   ├── config-sync.js  云端配置合并
│   ├── app.js          主占卜逻辑
│   ├── settings.js     主题切换 + 液态玻璃鼠标跟随
│   ├── feedback.js     音效 + 振动
│   ├── share-image.js  Canvas 分享图
│   ├── library.js      百科页渲染
│   ├── admin.js        后台核心
│   └── dev.js          开发者控制台
└── workers/worker.js   Cloudflare Workers + KV（13 个接口）
```

### 已知问题
| 问题 | 根因 | 影响 |
|------|------|------|
| 百科页图片加载慢 | `innerHTML=""` 重建 DOM 导致反复请求；PNG 21MB 不合理 | 用户体验差 |
| 液态玻璃翻牌 | backdrop-filter 创建 stacking context 破坏 preserve-3d | 已修（v3 前置条件） |

### 技术约束（不可改）
- Worker 单文件零外部依赖
- 不改变抽牌核心逻辑
- 主题切换：`body[data-theme="liquid"]`
- 密码硬编码 fallback + KV 热更新

---

## Phase 1 —— 性能优化（零风险，先做）

### P1. 图片懒加载重构
**根因**：`library.js` 第 31 行 `grid.innerHTML = ""` 每次筛选/搜索销毁全部 img DOM → 重新触发浏览器请求

**修复**：IntersectionObserver + DOM patch 模式
- `library.js`：不再 `innerHTML=""` 重建整个 grid，改为对 DOM 做增删（隐藏/显示已匹配元素 vs 移除不匹配元素 vs 创建新匹配元素）
- 图片改用 `data-src` + IntersectionObserver 真正懒加载，进入视口前不设置 `src`
- 模态框 `showDetail` 大图预加载：点击卡牌时先预加载，弹窗打开时直接显示
- 首屏立即加载前 6 张，其余按视口进入加载

### P2. PNG → WebP 批量转换（可选，高收益）
- 当前 78 张 PNG 300×527 = 20.88 MB
- WebP 无损同等画质 ≈ 50-70KB/张 → **总 ≈ 4 MB（减少 80%）**
- **新增文件**：`images-webp/` 目录存放转换后的 WebP，**不覆盖原图**
- 代码里 `imageUrl` 字段改成双格式引用：优先 `.webp`，fallback `.png`
- 用 PowerShell + System.Drawing 或外部工具批量转换

---

## Phase 2 —— 客户端创新点（10 个）

### C1. 🔮 每日一张卡 Daily Card
- **功能**：首页顶部显示"今日指引"，用日期哈希稳定映射一张牌（同一天抽到同一张，第二天自动换）
- **实现**：`app.js` 启动时计算 `dailyHash = hashCode(new Date().toDateString()) % 78` → 取该索引的牌
- **样式**：液态玻璃小卡片，点击查看详细解读 + 一键抽完整牌阵
- **Admin 可配置**：admin 可临时覆盖"今日卡"（比如节日限定）

### C2. 📊 个人塔罗数据看板
- **功能**：用户自己的塔罗行为统计面板
- **数据**（全部存在 localStorage `tarot_stats`）：
  - 总抽牌次数、各牌阵占比
  - 正逆位比例（是/否牌阵特别有用）
  - 高频卡牌 Top 10（哪些牌最常出现）
  - 常用关键词/问题类型
  - 每日活跃热力图（30 天）
- **实现**：`js/stats.js`（新建）+ 仪表盘 HTML 结构 + Chart.js（CDN 引入，仅约 100KB）
- **入口**：index.html 底部加 📊 我的塔罗 链接

### C3. 🌙 月运牌阵 + 年运牌阵
- **功能**：新增两种牌阵，针对月度/年度运势
  - **月运**：6 张（上月总结 / 本月关键词 / 事业 / 感情 / 财务 / 建议）
  - **年运**：12 张（每月一张 + 年终总结 + 主题卡）
- **实现**：`app.js` 加 `monthly-spread` / `yearly-spread` 两个 spread 逻辑
- **Admin 可开关**：`enabledSpreads` 里加 `monthly` / `yearly`

### C4. 🎨 用户自定义牌阵编辑器
- **功能**：用户可以自己创建牌阵，定义：名称、描述、位置数、每个位置的含义文字
- **存储**：localStorage `tarot_custom_spreads`，最多存 5 个
- **渲染**：在抽牌区动态生成对应数量的 card-slot
- **Admin 可预置**：dev 配置里可以放"官方推荐自定义牌阵"，所有用户可见

### C5. 🌈 液态玻璃鼠标 3D 视差
- **功能**：卡片跟随鼠标位置产生微弱的 3D 倾斜，卡片内部高光同时偏移
- **实现**：`settings.js` 的现有 mousemove 监听扩展，同时计算 tilt 角度
  ```
  tiltX = (clientY - rect.centerY) / rect.height * -8deg
  tiltY = (clientX - rect.centerX) / rect.width * 8deg
  card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
  ```
- **强度**：最大 8°，CSS transition 0.15s 平滑回弹
- **安全**：仅在 hover 时生效，离开立即复位

### C6. 💬 AI 解读增强（可选开关）
- **功能**：抽牌结果底部加 ✨ "AI 深度解读"按钮
- **实现**：两种模式（Admin 可切换）
  - **模式 A（推荐）**：Cloudflare AI 直接在 Worker 里跑（免费额度）→ `POST /api/ai-interpret`
  - **模式 B**：Admin 填自己的 OpenRouter API Key → Worker 转发请求
- **Prompt 模板**：Admin 可编辑 prompt 模板，含变量占位符 `{{cards}}` `{{question}}` `{{spread}}`
- **降级**：AI 不可用时按钮隐藏，不影响原有本地解读

### C7. 🔔 每日提醒（PWA）
- **功能**：用户可选择"每天定时推送今日卡提醒"
- **实现**：
  - Service Worker（`sw.js`）处理 Push 事件
  - manifest.json 声明 PWA 能力
  - Notification API 请求权限
  - Cloudflare Cron Trigger 每天 8:00 触发 Worker → 推送
- **前提**：Chrome/Safari 桌面端支持，移动端 iOS 16.4+ 支持

### C8. 📱 PWA 离线支持
- **功能**：安装到桌面/手机主屏幕 + 离线基本可用
- **实现**：
  - `manifest.webmanifest` 声明 name/icons/主题色/启动 URL
  - Service Worker 缓存策略：stale-while-revalidate 缓存 CSS/JS/图片；network-first 缓存 API
  - 离线降级：显示已缓存的上一次抽牌结果 + 百科网格
- **图标**：生成 192×192 和 512×512 两个 PNG 图标

### C9. 🌊 抽牌动画升级版
- **当前**：简单 CSS `rotateY` 翻转
- **升级**：
  1. 洗牌动画：5 张牌快速交错上下跳动（当前已有，优化时序）
  2. 抽牌入场：从牌堆飞出 → 悬浮 → 渐显牌面（用 `@keyframes flyIn`）
  3. 翻牌光效：翻到正面时一道光从上到下扫过（`::before` + `linear-gradient` + `animation`）
- **实现**：纯 CSS keyframes + JS 控制时序，不加外部库

### C10. 🎯 结果解读：关键词点击跳转百科
- **功能**：抽牌结果里每张牌的"正位/逆位/关键词"变成可点击的 chip，点击 → 跳转到 library.html 的对应卡牌并高亮
- **实现**：
  - index.html 链接：`<a href="library.html?card=00-TheFool" class="lib-link">愚者</a>`
  - library.js：URL 参数解析，自动定位到该卡 + 弹窗打开详情
- **增强**：history drawer 里的历史记录也可以点卡名跳转

---

## Phase 3 —— Admin 端创新点（配套客户端）

### A1. 🎨 自定义牌阵管理面板
- Admin 可以"官方发布"自定义牌阵 → 所有用户可见
- Master-Detail 布局：左侧列表（官方/自定义），右侧编辑（位置数、每个位置名称/含义）
- Worker 扩展：`POST /dev/spread-save` / `GET /spreads`

### A2. 🔮 每日卡配置
- 概览 Tab 加"今日卡"面板：Admin 可以
  - 手动指定今天显示哪张卡（节日限定）
  - 开启/关闭"每日卡自动轮换"
- Worker 扩展：`GET /daily-card`（返回今日卡信息）

### A3. ✨ AI 解读控制台
- Admin 端新 Tab 或子区块：
  - AI 开关 + 模式选择（Cloudflare AI / OpenRouter）
  - Prompt 模板编辑器（实时预览 `{{cards}}` 等变量）
  - 测试按钮（输入测试牌组 → 实时看 AI 输出）
  - Token 用量统计（Worker 记录到 KV）

### A4. 📜 用户行为审计增强
- 当前：只记录 admin 登录/save
- 扩展：可选记录访客行为（可开关）
  - 抽牌次数/时间/牌阵类型（匿名聚合）
  - 高频问题关键词（帮助 Admin 优化敏感词库）
- Worker 扩展：`GET /analytics`（聚合统计）

### A5. 🎨 主题素材管理
- Admin 可以上传：
  - 自定义主题背景图
  - 液态玻璃主色调整（取色器 `--gold` / `--purple-primary`）
- Admin 可设置："全局强制主题" vs "用户自选优先"

---

## Files and Modules

### Phase 1 —— 性能优化
| 文件 | 改动 |
|------|------|
| `js/library.js` | DOM patch 模式 + IntersectionObserver 懒加载 + data-src |
| `images/` / `images-webp/` | WebP 转换（新目录，不覆盖原图） |
| `js/tarot-data.js` | imageUrl 改为双格式 fallback |
| `css/style.css` | 加 lib-card placeholder shimmer 骨架屏 |

### Phase 2 —— 客户端创新点
| 创新点 | 新建/改文件 |
|--------|-----------|
| C1 每日卡 | 改 `index.html` 顶部 + `js/app.js` + 改 `css/style.css` |
| C2 数据看板 | 新建 `js/stats.js` + `stats.html`（页面） |
| C3 月运/年运 | 改 `index.html` 牌阵按钮 + 改 `js/app.js` 加两个 spread |
| C4 自定义牌阵 | 新建 `js/custom-spread.js` |
| C5 鼠标 3D 视差 | 改 `js/settings.js`（扩展现有 mousemove） |
| C6 AI 解读 | 改 `js/app.js` 加按钮 + 改 `workers/worker.js` 加 AI 路由 |
| C7 推送 | 新建 `sw.js` |
| C8 PWA | 新建 `manifest.webmanifest` + 改所有 HTML 加 manifest 链接 |
| C9 抽牌动画 | 改 `css/style.css` 加 keyframes + 改 `js/app.js` 时序 |
| C10 关键词跳转 | 改 `js/app.js` renderReadingResult 加链接 + 改 `js/library.js` URL 解析 |

### Phase 3 —— Admin 端
| 创新点 | 新建/改文件 |
|--------|-----------|
| A1 自定义牌阵面板 | 改 `admin.html` Tab + 改 `js/admin.js` + 改 `workers/worker.js` |
| A2 每日卡配置 | 改 `admin.html` + 改 `workers/worker.js` |
| A3 AI 控制台 | 改 `admin.html` Tab + 改 `workers/worker.js` |
| A4 行为审计 | 改 `workers/worker.js`（记录逻辑） + 改 `admin.html` |
| A5 主题素材 | 改 `admin.html` + 改 `workers/worker.js` |

---

## Implementation Steps（依赖排序）

### 批次 1：性能优化（前置条件，先做）
1. `library.js` DOM patch + IntersectionObserver
2. PNG → WebP 批量转换（新增 images-webp/）
3. tarot-data.js imageUrl 双格式 fallback
4. library.html CSS 骨架屏

### 批次 2：客户端（无 Admin 依赖）
5. C1 每日一张卡（独立功能，纯前端）
6. C5 鼠标 3D 视差（纯前端，改 settings.js）
7. C9 抽牌动画升级版（纯 CSS + JS 时序）
8. C10 关键词点击跳转（改 renderReadingResult 加链接）
9. C3 月运/年运牌阵（改 app.js 加两个 spread）
10. C2 个人数据看板（新建 stats.js + stats.html）
11. C4 自定义牌阵编辑器（纯前端 localStorage）
12. C8 PWA（manifest + service worker）

### 批次 3：需要 Admin 配套的客户端
13. C6 AI 解读（需要 Worker 路由 + Admin 配置 prompt）
14. C7 推送（需要 Worker Cron + Service Worker）

### 批次 4：Admin 端（依赖客户端已上线）
15. A2 每日卡配置（依赖 C1 已上线）
16. A1 自定义牌阵管理（依赖 C4 已上线）
17. A3 AI 控制台（依赖 C6 已上线）
18. A5 主题素材管理（依赖主题系统已稳定）
19. A4 行为审计增强（最后做，不影响主流程）

---

## Dependencies and Considerations

- **Cloudflare Worker AI**：免费额度 1000 次/天，用 Mistral 7B 模型 → 延迟 < 1s
- **Service Worker**：只能在 https 或 localhost 下注册，Pages 自动提供 HTTPS
- **Chart.js**：CDN 引入 `<script src="https://cdn.jsdelivr.net/npm/chart.js">`（约 100KB gzipped）
- **WebP 兼容**：Chrome 80+ / Safari 14.1+ / Firefox 79+ 全支持（2025 年可用率 > 95%）
- **图片 WebP 转换**：Windows 可用 `System.Drawing` 或 ImageMagick PowerShell 模块
- **PWA 推送**：需要 Cloudflare Worker Cron Trigger（免费套餐支持）
- **storage 限制**：localStorage 5MB，足够存自定义牌阵 + 统计数据

---

## Validation

| 批次 | 验证 |
|------|------|
| 性能优化 | Chrome DevTools Network 面板：百科页首屏请求数 ↓ 80%，总大小 ↓ 60% |
| C1 每日卡 | 同一天刷新浏览器显示同一张卡；第二天换卡 |
| C2 数据看板 | localStorage 有记录；Chart.js 渲染正常 |
| C5 鼠标视差 | 液态玻璃主题下鼠标移动时卡片轻微倾斜 |
| C6 AI 解读 | 点按钮 → AI 解读出现（不可用时按钮隐藏） |
| C8 PWA | Chrome → 安装到桌面；断网 → 显示缓存内容 |
| Admin 端 | 登录后对应 Tab 出现，配置保存 → 客户端立刻生效 |

---

## Risks

| 风险 | 概率 | 处理 |
|------|------|------|
| WebP 转换 PowerShell 模块缺失 | 中 | 提前安装 `Install-Module -Name Microsoft.PowerShell.Archive` 或用 ImageMagick |
| Chart.js CDN 被墙 | 低 | Cloudflare Pages 自带 CDN，或用国内 jsdelivr 镜像 |
| Service Worker 注册失败 | 低 | 降级处理：if ('serviceWorker' in navigator) { 注册 } |
| AI Token 用量超预算 | 低 | Worker 端加日限额检查 + Admin 实时统计 |
| renderReadingResult 改坏现有逻辑 | 低 | 先加新逻辑不改旧逻辑（加链接时不影响原文字渲染） |
| Worker AI 路由增加延迟 | 中 | AI 按钮异步调用，解读结果不阻塞本地解读渲染 |

---

## 不在本计划内（留给 v4）
- 图片有损压缩（不可逆改动，需要你单独确认）
- 新语言/多语言国际化
- 付费订阅/会员系统
- 后端存储用户账号/云端同步（当前全 localStorage + KV 匿名模式）
- 管理后台 React 重写（当前纯静态够用）
