# cabbage塔罗 v2 完整增强计划（13 项全功能）

## 总体架构

```
┌──────────────────────────────────────────────────────────────┐
│                    前端 Pages 静态部署                         │
│                                                              │
│  index.html ─┬─ app.js        (抽牌主流程 + 历史 + 主题切换)  │
│              ├─ config-sync.js (云端配置拉取)                  │
│              └─ settings.js   (设置面板：音效/振动/主题)        │
│                                                              │
│  admin.html ─┬─ admin.js      (卡牌编辑 + 批量 + 导入导出)    │
│              └─ dev.js        (开发者专用模块：快照/审计/密码) │
│                                                              │
│  library.html ── library.js   (牌意百科浏览页)                │
│  capsule.html ── capsule.js   (时间胶囊专页)                  │
│                                                              │
│  css/style.css (追加新 class，不动原有)                        │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼ HTTPS / api.taluo996.top
┌──────────────────────────────────────────────────────────────┐
│              Cloudflare Workers (改动)                         │
│                                                              │
│  KV 键：                                                      │
│    tarot_config          ← 主配置（卡牌 + 全局 + 主题 + 开关） │
│    tarot_config_v{1..N}  ← 版本快照                           │
│    audit_log             ← 操作审计日志（JSON 数组）           │
│    admin_password        ← 密码（支持热更新）                  │
│    developer_password    ← 开发者密码（热更新）                │
│                                                              │
│  接口（6 旧 + 7 新 = 13 个）：                                 │
│    GET  /                 读主配置                             │
│    GET  /snapshots        列出全部快照                         │
│    GET  /snapshots/:id    读某个快照                           │
│    GET  /audit            读审计日志                           │
│    POST /login            登录（返回 role: admin/dev）         │
│    POST /save             普通保存                             │
│    POST /dev/save         开发者保存（能写全站开关/关键词）    │
│    POST /dev/snapshot     创建快照                             │
│    POST /dev/rollback     回滚到某快照                         │
│    POST /dev/audit        追加审计日志                         │
│    POST /dev/change-password                              │
│    OPTIONS *              CORS 预检                           │
└──────────────────────────────────────────────────────────────┘
```

---

## Part A — 用户端 8 项新功能

### F1. 🕰️ 时间胶囊占卜

**玩法**：用户输入一个未来日期，抽到牌后结果 **上锁**，倒计时到了才能解锁。

| 项 | 说明 |
|---|---|
| 入口 | 首页新增"时间胶囊"按钮 → 跳转 `capsule.html` |
| 流程 | ① 选日期（日历控件）→ ② 输入问题 → ③ 抽牌 → ④ 结果被倒计时界面覆盖 |
| 上锁期间 | 只能看到 "🔒 还有 X 天 X 小时 X 分钟解锁" + 牌背缩略图 |
| 解锁后 | 完整解读自动弹出 |
| 存储 | localStorage `tarot_capsules`（数组，每条含 unlockAt / question / cards） |
| 多胶囊 | 可以同时存在多个，首页显示胶囊数量徽章 |
| Admin 可控 | 开关此功能（dev 级配置 `features.timeCapsule`） |

**改动文件**：新建 `capsule.html` + `js/capsule.js`；改 `index.html` 入口按钮；加 `css/style.css` 新 class

---

### F2. 📅 每日一签 + 月运势热力图

**玩法**：每天抽一张，自动生成月运势热力图。

| 项 | 说明 |
|---|---|
| 入口 | 首页按钮"今日指引" → 单牌快速抽完直接显示"今日提醒" |
| 日签到逻辑 | localStorage 存当天日期，同一天不能重复抽（或 Admin 关闭此限制） |
| 热力图 | 侧边栏 / 独立区域显示 30 格小方块，按花色着色：大阿卡那紫 / 权杖红 / 圣杯蓝 / 宝剑灰 / 钱币黄；正位亮色 / 逆位暗色 |
| 月度总结 | "本月抽到 8 张大阿卡那，3 张逆位圣杯…" 一句自动生成的总结 |
| Admin 可控 | 开关签到限制（`features.dailyLimit`） |

**改动文件**：改 `index.html` + `js/app.js` + 加热力图相关 CSS class

---

### F3. ❓ 是/否 牌阵 + 💑 关系六牌阵 + Admin 开关

**新增两种牌阵**：

| 牌阵 | 牌数 | 位置 | 用途 |
|------|------|------|------|
| 是/否 | 1 | 直接判定 | 正位=是，逆位=否，大阿卡那 0 / 12 / 21 视为"待定" |
| 关系 | 6 | 我 / TA / 我们 / 过去 / 现在 / 未来 | 感情/合作/人际关系 |

**Admin 开关**：dev 级配置 `enabledSpreads: { single, three, yesno, relationship }`，勾掉的牌阵前端不显示。

**改动文件**：改 `index.html` 牌阵按钮区 + `js/app.js` 牌阵逻辑 + config-sync 读开关

---

### F4. 🌟 牌意联想扩展字段

每张牌新增 4 个可选字段，Admin 后台编辑：

| 字段 | 示例 |
|------|------|
| 关键词 keywords | 权杖皇后 → "热情、创造力、行动力" |
| 对应元素/星座 element | 圣杯二 → "水象 / 双子" |
| 建议行动 advice | 星币骑士 → "脚踏实地执行，别急于求成" |
| 警告提示 warning | 宝剑十逆位 → "别继续纠结，放手才能重生" |

前端抽牌结果里每张牌下方有个 "展开联想" 小按钮，点开看到这 4 个字段。

**改动文件**：Worker config 结构扩展；Admin 表格加 4 列；前端 renderReadingResult 加"展开"按钮

---

### F5. 🎨 3 套主题皮肤

CSS 变量驱动，一键切换：

| 主题 | 风格 | 主色 | 背景 |
|------|------|------|------|
| 🌙 星空紫（默认） | 当前默认 | 深紫 + 金 | 星空渐变 |
| ✨ 黑金华丽 | 赌场/仪式感 | 黑金 + 深金 | 纯黑 + 金色描边 |
| 🖌️ 水墨东方 | 宣纸风 | 朱砂红 + 墨黑 | 宣纸纹理底 |

- 用户选择存 localStorage `tarot_theme`
- Admin 可设全站默认（dev 配置 `globalTheme`）
- 用 `data-theme="dark|gold|ink"` 在 `<body>` 切换 CSS 变量

**改动文件**：`css/style.css` 追加 3 套主题变量；`js/app.js` 加主题切换逻辑；设置面板 UI

---

### F6. 📸 占卜结果生成长图分享

纯前端 canvas 绘制，不用任何外部库：

| 项 | 说明 |
|---|---|
| 触发 | 抽牌完后"📸 生成分享图"按钮 |
| 内容 | cabbage logo + 问题 + 抽到的牌（卡面缩略图旋转到正/逆位）+ 解读文字 |
| 尺寸 | 1080×1920 竖图（朋友圈/小红书友好） |
| 下载 | `canvas.toDataURL()` → 下载 PNG |
| 依赖 | 无。Canvas 2D 原生 API + 本地 images/ 里的卡面图用 Image 加载 drawImage |

**改动文件**：新建 `js/share-image.js`；`index.html` 加按钮；Worker 零改动

---

### F7. 🎵 翻牌音效 + 振动反馈

纯 Web Audio API 合成，零外部 mp3：

| 项 | 实现 |
|---|---|
| 翻牌声 | Oscillator 生成 "唰~" 类似塔罗翻牌的清脆滑音（0.8→0.2kHz，0.15s 衰减） |
| 洗牌声 | 3~4 秒内随机触发 8~12 次轻响，营造"卡片擦过"感 |
| 振动 | `navigator.vibrate([10, 20, 10])`，翻牌时短脉冲；手机 Chrome/Android 支持 |
| 开关 | 设置面板里 "🔊 音效" / "📳 振动" 分别开关；存 localStorage |

**改动文件**：新建 `js/feedback.js`；设置面板 UI

---

### F8. 🛡️ 敏感关键词自动转译

| 项 | 说明 |
|---|---|
| Admin 后台 | dev 级配置 `keywordRules: [{ from: "死", to: "结束与重生" }, ...]` 最多 50 条 |
| 前端实时替换 | 用户输入问题时，oninput 监听 → 正则匹配 → 替换后在输入框里显示并标注（灰色小字"已自动转译"） |
| 预设 | 默认内置 10 条常见敏感词（死/分手/前任/出轨/失业/破产/抑郁症…） |
| 可关闭 | 设置面板里"🛡️ 智能转译"开关 |

**改动文件**：Worker config 加 `keywordRules`；Admin dev 模块可编辑；前端 input 监听替换

---

## Part B — Admin 开发者权限扩展（5 项）

### A1. 双密码机制

```
ADMIN_PASSWORD    → 普通管理员（卡牌内容 / 权重 / 正逆位概率 / 批量操作）
DEVELOPER_PASSWORD → 开发者（admin 全部权限 + 全站开关 + 快照 + 审计 + 密码热更新）
```

POST /login 返回：`{ ok: true, role: "admin" | "developer" }`
前端 admin 登录后根据 role 解锁 UI：
- admin 登录 → 隐藏 dev 模块按钮
- developer 登录 → 全部解锁

### A2. Worker 级配置（dev 专属）

新增/可配置项：
| 配置 | 字段名 | 默认值 |
|------|--------|--------|
| 全站默认主题 | globalTheme | "dark" |
| 可见牌阵 | enabledSpreads | `{single:true, three:true, yesno:true, relationship:true}` |
| 功能开关 | features | `{timeCapsule:true, dailyLimit:true, themeSwitch:true, shareImage:true, sound:true, keywordFilter:true}` |
| 敏感词规则 | keywordRules | 默认 10 条 |
| 每日签到上限 | dailyMaxDraws | 3 |

### A3. 操作审计日志

每次 POST /save 或 /dev/save 时 Worker 追加一条：
```json
{
  timestamp: 1727000000,
  action: "save" | "dev_save" | "snapshot" | "rollback",
  actor: "admin" | "developer",
  summary: "改了 globalUprightRate 50→80, 12 张权重变化"
}
```
存 KV `audit_log`（JSON 数组，最多保留 100 条，FIFO）
admin 后台新增"📜 审计日志"按钮查看。

### A4. 版本快照 + 回滚

| 操作 | Worker 接口 |
|------|------------|
| 创建快照 | `POST /dev/snapshot` → Worker 读当前 `tarot_config` → 存 `tarot_config_v{N}` → 返回 { id, timestamp, summary } |
| 列出快照 | `GET /snapshots` → 返回 `[{id, timestamp, summary}, ...]` |
| 回滚 | `POST /dev/rollback` → 读快照 → 写回 `tarot_config` → 追加审计日志 |

### A5. 密码热更新

| 操作 | Worker 接口 |
|------|------------|
| 改密码 | `POST /dev/change-password` Body: { currentPwd, newPwd, role: "admin" | "developer" } |
| 校验 | 先查 KV 里现有密码（或硬编码 fallback），成功则 KV.put 更新 |

这样用户以后想改密码 **不用再粘贴 Worker 代码**，直接在 admin 后台改。

---

## Worker 完整改动清单

### 新增接口（7 个）：
```
GET  /snapshots           ← 列出快照
GET  /snapshots/:id       ← 读某个快照
GET  /audit               ← 读审计日志
POST /dev/save            ← 开发者保存（含全站开关）
POST /dev/snapshot        ← 创建快照
POST /dev/rollback        ← 回滚
POST /dev/change-password ← 密码热更新
```

### KV 新增键（5 个）：
```
admin_password        ← 可热更新的管理员密码（初始值等于原硬编码值）
developer_password    ← 开发者密码（需硬编码初始值）
audit_log             ← JSON 数组，最多 100 条
tarot_config_v1...vN  ← 版本快照
```

### 现有接口改动：
- `POST /login` → 校验两个密码，返回 `{ ok, role }`
- `POST /save` → 追加审计日志
- `GET /` → config 里扩展 `globalTheme / enabledSpreads / features / keywordRules`
- `tarot_config` 结构扩展：cards 每张加 `keywords / element / advice / warning` 4 个可选字段

---

## Implementation Steps（依赖顺序）

1. **写新 Worker 代码** — 所有接口 / KV 结构一次性改好
2. **扩展 tarot-data.js 默认结构** — 给 78 张牌加 keywords/element/advice/warning 初始空字段
3. **改 config-sync.js** — 解析新字段、enabledSpreads、features、globalTheme
4. **改 css/style.css** — 追加 3 套主题变量 + 新 UI 组件样式
5. **改 index.html + app.js** — 新牌阵、历史、主题切换、设置面板、分享图按钮、关键词转译
6. **新建 library.html + library.js** — 牌意百科
7. **新建 capsule.html + capsule.js** — 时间胶囊
8. **改 admin.html + admin.js** — 批量操作、导入 JSON、缩略图、新字段编辑、开发者模块 UI
9. **新建 dev.js（admin 子模块）** — 快照/审计/密码热更新/全站开关
10. **新建 js/share-image.js + js/feedback.js** — 分享图 + 音效振动
11. **自测** — 本地完整跑一遍所有新功能

---

## Validation Checklist

### 用户端
- [ ] 4 种牌阵都能正常抽牌
- [ ] 是/否牌阵正位=是、逆位=否 判定正确
- [ ] 关系六牌阵 6 张位置正确
- [ ] 时间胶囊上锁期间倒计时运行、到点自动解锁
- [ ] 每日一签同一天第二次抽被阻止
- [ ] 月运势热力图 30 格按花色着色
- [ ] 牌意"展开联想"看到 keywords/element/advice/warning
- [ ] 主题切换后所有组件跟着变
- [ ] 分享图下载打开后正确显示
- [ ] 翻牌音效和振动正常
- [ ] 敏感词自动转译 + 标注
- [ ] 历史抽屉有记录、可回看、可清空
- [ ] 牌意百科 78 张网格 + 筛选 + 搜索 + 详情

### Admin
- [ ] 批量操作全部权重 → 1
- [ ] 批量恢复出厂文字
- [ ] JSON 导入从备份恢复
- [ ] 缩略图 78 张全部加载
- [ ] 普通管理员密码登录后看不到 dev 模块
- [ ] 开发者密码登录后全部解锁
- [ ] 创建快照成功、列表显示
- [ ] 回滚快照后主配置恢复
- [ ] 审计日志每次 save 后追加
- [ ] 密码热更新成功

### 不回归
- [ ] 原有抽牌 / 洗牌 / 翻牌动画
- [ ] 云端 config 加载 / 降级
- [ ] 移动端响应式

---

## Risks & Handling

| 风险 | 处理 |
|------|------|
| Worker 改动多、用户要重新粘贴 | 代码里加详细注释 + 部署清单，只粘 1 次 |
| 用户已有 localStorage 旧版数据 | 新版首次访问自动检测、兼容空字段 |
| Canvas 分享图字体跨域 | 用系统字体 + Emoji，避免加载跨域字体 |
| 音效在某些浏览器自动播放被阻止 | 首次翻牌时才初始化 AudioContext（用户手势触发） |
| KV 快照数量无限增长 | dev 模块加"删除快照"功能，默认只保留最近 10 个 |
