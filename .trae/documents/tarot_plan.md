# 韦特塔罗抽牌网页 实现计划

## Repository Research
当前工作目录 `d:\traeprogram\taluo` 为空目录，这是一个全新的项目。用户要求开发纯静态前端的韦特塔罗抽牌网页，不使用任何后端或前端框架，所有逻辑在浏览器本地完成，最终产物可直接上传静态托管部署。

## 文件结构
```
taluo/
├── index.html                    # 主HTML页面
├── css/
│   └── style.css                 # 全部样式（含动画、响应式）
└── js/
    ├── tarot-data.js             # 78张塔罗牌完整数据
    └── app.js                    # 主交互逻辑（抽牌、动画、牌阵）
```

## 核心设计决策

### 1. 78张塔罗牌数据 (js/tarot-data.js)
- 每张牌包含字段：`id`、`name`（中文名称）、`nameEn`（英文名）、`upright`（正位含义）、`reversed`（逆位含义）、`imageUrl`（CDN图片地址）
- 22张大阿卡那 + 56张小阿卡那（权杖、圣杯、宝剑、钱币各14张）
- 数据以数组形式导出，方便 `app.js` 引用

### 2. CDN 图片源选择
- **首选方案**：使用 Wikipedia 上的 Rider-Waite 塔罗牌图片
  - URL 格式：`https://upload.wikimedia.org/wikipedia/commons/thumb/.../.../220px-...`
  - 优点：稳定、无需自建CDN、免费
  - 备选：如 Wikipedia URL 不稳定，可使用 GitHub 上的 tarot deck 资源
- **牌背图案**：使用统一的暗紫金色几何图案，通过 CSS 渐变 + SVG 生成，不依赖外部图片

### 3. 动画方案
- **3D翻转动画**：使用 CSS `transform-style: preserve-3d` + `backface-visibility: hidden`，卡牌初始显示背面，点击后 `rotateY(180deg)` 翻转显示正面
- **洗牌动画**：使用 CSS `@keyframes` 定义多张牌的错位抖动效果，通过 JS 控制动画时长和节奏
- **抽牌动画**：选中的牌从牌堆中"飞出"到展示区域，使用 CSS transition

### 4. 响应式布局
- 使用 Flexbox + CSS Grid 自适应
- 断点：`768px` 为移动端分界
- 移动端：卡牌纵向排列，字体缩小，动画简化
- 桌面端：卡牌横向排列，三牌阵并排展示

### 5. 交互流程
```
首页介绍 → 选择牌阵 → 输入问题 → 点击开始 → 洗牌动画(约2秒) 
→ 点击抽牌区域/自动发牌 → 3D翻转卡牌 → 显示解读 
→ 可重置重新占卜
```

## Implementation Steps（依赖顺序）

1. **创建 index.html**
   - 引入 css/style.css 和 js/tarot-data.js、js/app.js
   - 页面结构：header（标题介绍）→ 牌阵选择区 → 问题输入区 → 抽牌区域（牌堆+卡牌展示位）→ 结果解读区

2. **创建 js/tarot-data.js**
   - 完整78张韦特塔罗数据
   - 每张牌包含中英文名称、正逆位含义、图片URL

3. **创建 css/style.css**
   - 深色星空背景（CSS渐变 + 星点动画）
   - 暗紫 + 金色配色方案
   - 毛玻璃卡片效果（`backdrop-filter: blur`）
   - 3D翻转动画样式
   - 洗牌动画 keyframes
   - 响应式媒体查询

4. **创建 js/app.js**
   - 牌堆生成与洗牌逻辑（Fisher-Yates 算法）
   - 牌阵选择逻辑（单牌/三牌）
   - 抽牌与随机正逆位逻辑
   - 动画触发控制
   - 结果解读渲染

## Dependencies and Considerations
- **浏览器兼容性**：目标为现代浏览器（Chrome/Firefox/Safari/Edge 最新版），无需兼容 IE
- **3D CSS**：`transform-style: preserve-3d` 和 `backface-visibility: hidden` 在主流浏览器均支持
- **毛玻璃效果**：`backdrop-filter` 在 Safari 和 Chromium 内核浏览器支持良好
- **图片加载**：所有图片来自 Wikipedia CDN，可能存在加载慢的情况，需要在 UI 上给加载中的占位符

## Validation
- 启动本地 HTTP 服务器预览页面
- 验证：
  - [ ] 78张牌数据完整无遗漏
  - [ ] 洗牌动画正常播放
  - [ ] 卡牌3D翻转动画流畅
  - [ ] 正位/逆位随机正确
  - [ ] 两种牌阵正常切换
  - [ ] 移动端显示正常
  - [ ] 重置功能正常
  - [ ] 无外部 API 请求
  - [ ] 无明显 JS 报错

## Risks and Handling

| 风险 | 处理方案 |
|------|----------|
| Wikipedia 图片 URL 可能失效 | 备选方案：使用 CSS/SVG 绘制简化版塔罗牌正面，或改用其他 CDN（如 GitHub raw） |
| 洗牌/翻转动画卡顿 | 简化动画复杂度，使用 `transform` 和 `opacity`（触发 GPU 加速），避免 layout 属性动画 |
| 移动端性能问题 | 减少同时运行的动画数量，使用 CSS 媒体查询关闭部分装饰性动画 |
| 用户不知道如何部署 | 最终给出清晰的部署说明（上传至 GitHub Pages / Vercel / Netlify / 阿里云 OSS 等） |
| 78张牌数据量较大 | 确保 tarot-data.js 格式清晰易读，每张牌有注释，方便用户自行修改 |
