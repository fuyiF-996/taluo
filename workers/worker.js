/**
 * ============================================================================
 * Cloudflare Workers — cabbage塔罗 API  v2（完整版）
 * ============================================================================
 * 
 * 部署方式：直接粘贴到 Cloudflare Workers 控制台（零依赖、单文件）
 * KV 绑定：变量名 TALUO_KV
 * 子域名：api.taluo996.top
 * 
 * 接口列表（13 个）：
 *   GET  /                      → 读取主配置（扩展版）
 *   GET  /snapshots             → 列出全部版本快照
 *   GET  /snapshots/:id        → 读某个快照内容
 *   GET  /audit                 → 读操作审计日志（最近 100 条）
 *   POST /login                 → 登录校验，返回 role: admin | developer
 *   POST /save                  → 普通管理员保存（卡牌/权重/正逆位概率）
 *   POST /dev/save              → 开发者保存（含全站开关/主题/关键词）
 *   POST /dev/snapshot          → 创建当前配置的版本快照
 *   POST /dev/rollback          → 回滚到某个快照
 *   POST /dev/change-password   → 热更新 admin 或 developer 密码
 *   OPTIONS *                   → CORS 预检
 * 
 * KV 键设计：
 *   tarot_config             ← 主配置 JSON（永久）
 *   tarot_config_v1..vN      ← 版本快照（永久，可手动删除）
 *   audit_log                ← JSON 数组，最多 100 条 FIFO
 *   admin_password           ← 管理员密码（可热更新）
 *   developer_password       ← 开发者密码（可热更新）
 * ============================================================================
 */


/* ==================== 硬编码：初始密码（部署后可热更新，不用再粘代码） ==================== */
// ⚠️  部署前请改成你自己的密码！
// 这两个是 FALLBACK 值：KV 里没有密码时用这两个；一旦调用 /dev/change-password 会写入 KV
const ADMIN_PASSWORD_FALLBACK = "1234567890";
const DEVELOPER_PASSWORD_FALLBACK = "developer123";


/* ==================== 允许的 Origin ==================== */
const ALLOWED_ORIGINS = [
  "https://taluo996.top",
  "https://www.taluo996.top",
  "http://localhost:8080",
];


/* ==================== 主入口 ==================== */
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};


/* ==================== 路由分发 ==================== */
async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";  // 去掉末尾 /
  const method = request.method.toUpperCase();
  const cors = buildCorsHeaders(request);

  // OPTIONS 预检
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  try {

    // ======== GET / ========
    if (method === "GET" && pathname === "/") {
      return handleGetConfig(env, cors);
    }

    // ======== GET /snapshots ========
    if (method === "GET" && pathname === "/snapshots") {
      return handleListSnapshots(env, cors);
    }

    // ======== GET /snapshots/:id ========
    const snapMatch = pathname.match(/^\/snapshots\/(.+)$/);
    if (method === "GET" && snapMatch) {
      return handleGetSnapshot(env, snapMatch[1], cors);
    }

    // ======== GET /audit ========
    if (method === "GET" && pathname === "/audit") {
      return handleGetAudit(env, cors);
    }

    // ======== POST /login ========
    if (method === "POST" && pathname === "/login") {
      return handleLogin(request, env, cors);
    }

    // ======== POST /save ========
    if (method === "POST" && pathname === "/save") {
      return handleSave(request, env, cors, "admin");
    }

    // ======== POST /dev/save ========
    if (method === "POST" && pathname === "/dev/save") {
      return handleSave(request, env, cors, "developer");
    }

    // ======== POST /dev/snapshot ========
    if (method === "POST" && pathname === "/dev/snapshot") {
      return handleSnapshot(request, env, cors);
    }

    // ======== POST /dev/rollback ========
    if (method === "POST" && pathname === "/dev/rollback") {
      return handleRollback(request, env, cors);
    }

    // ======== POST /dev/change-password ========
    if (method === "POST" && pathname === "/dev/change-password") {
      return handleChangePassword(request, env, cors);
    }

    // 其他 → 404
    return jsonResp({ ok: false, error: "Not Found" }, cors, 404);

  } catch (e) {
    console.error("[Worker Error]", e);
    return jsonResp({ ok: false, error: "Server Error: " + e.message }, cors, 500);
  }
}


/* ============================================================================
 *                                    接口实现
 * ============================================================================ */


/* ---------- GET / ---------- */
async function handleGetConfig(env, cors) {
  let config = null;
  try {
    const raw = await env.TALUO_KV.get("tarot_config");
    if (raw) config = JSON.parse(raw);
  } catch (e) { /* 返回 null */ }
  return jsonResp({ ok: true, config }, cors);
}


/* ---------- GET /snapshots ---------- */
async function handleListSnapshots(env, cors) {
  // Cloudflare KV list 返回前 1000 条；快照用 prefix 过滤
  const listed = await env.TALUO_KV.list({ prefix: "tarot_config_v" });
  const snapshots = listed.keys.map(k => ({
    id: k.name.replace("tarot_config_v", ""),
    key: k.name,
    // 读 value 里的 timestamp 字段（快照里会写）
  }));
  // 按 id 倒序（最新在前）
  snapshots.sort((a, b) => parseInt(b.id) - parseInt(a.id));
  return jsonResp({ ok: true, snapshots }, cors);
}


/* ---------- GET /snapshots/:id ---------- */
async function handleGetSnapshot(env, id, cors) {
  const key = `tarot_config_v${id}`;
  const raw = await env.TALUO_KV.get(key);
  if (!raw) return jsonResp({ ok: false, error: "快照不存在" }, cors, 404);
  return jsonResp({ ok: true, snapshot: JSON.parse(raw) }, cors);
}


/* ---------- GET /audit ---------- */
async function handleGetAudit(env, cors) {
  const raw = await env.TALUO_KV.get("audit_log");
  let logs = [];
  if (raw) {
    try { logs = JSON.parse(raw); } catch { logs = []; }
  }
  // 倒序返回（最新在前）
  return jsonResp({ ok: true, logs: logs.slice().reverse() }, cors);
}


/* ---------- POST /login ---------- */
async function handleLogin(request, env, cors) {
  const body = await readBody(request);
  if (body === null) return jsonResp({ ok: false, error: "请求体必须是 JSON" }, cors, 400);

  const pwd = body.password;
  if (!pwd) return jsonResp({ ok: false, error: "请输入密码" }, cors, 400);

  // 读 KV 里的两个密码（没有就用硬编码 fallback）
  const [adminPwd, devPwd] = await Promise.all([
    env.TALUO_KV.get("admin_password"),
    env.TALUO_KV.get("developer_password"),
  ]);
  const realAdmin = adminPwd || ADMIN_PASSWORD_FALLBACK;
  const realDev = devPwd || DEVELOPER_PASSWORD_FALLBACK;

  if (pwd === realDev) {
    return jsonResp({ ok: true, role: "developer", message: "开发者登录成功" }, cors);
  }
  if (pwd === realAdmin) {
    return jsonResp({ ok: true, role: "admin", message: "管理员登录成功" }, cors);
  }
  return jsonResp({ ok: false, error: "密码错误" }, cors, 401);
}


/* ---------- POST /save 和 /dev/save ---------- */
async function handleSave(request, env, cors, requiredRole) {
  const body = await readBody(request);
  if (body === null) return jsonResp({ ok: false, error: "请求体必须是 JSON" }, cors, 400);

  // 校验密码 + 角色
  const auth = await verifyAuth(env, body.password);
  if (!auth.ok) return jsonResp(auth, cors, 401);
  // dev/save 必须 developer；save 允许 admin 或 developer
  if (requiredRole === "developer" && auth.role !== "developer") {
    return jsonResp({ ok: false, error: "需要开发者密码" }, cors, 403);
  }

  const cfg = body.config;
  if (!cfg || typeof cfg !== "object") {
    return jsonResp({ ok: false, error: "config 字段缺失" }, cors, 400);
  }

  // 写入 KV
  await env.TALUO_KV.put("tarot_config", JSON.stringify(cfg));

  // 追加审计日志
  await appendAudit(env, {
    action: requiredRole === "developer" ? "dev_save" : "save",
    actor: auth.role,
    summary: summarizeConfig(cfg),
  });

  return jsonResp({ ok: true, message: "保存成功" }, cors);
}


/* ---------- POST /dev/snapshot ---------- */
async function handleSnapshot(request, env, cors) {
  const body = await readBody(request);
  const auth = await verifyAuthRole(env, body?.password, "developer");
  if (!auth.ok) return jsonResp(auth, cors, 401);

  // 读当前配置
  const raw = await env.TALUO_KV.get("tarot_config");
  if (!raw) return jsonResp({ ok: false, error: "当前没有配置可快照" }, cors, 400);
  const cfg = JSON.parse(raw);

  // 找下一个 id：列出所有现有快照 → max + 1
  const listed = await env.TALUO_KV.list({ prefix: "tarot_config_v" });
  let maxId = 0;
  for (const k of listed.keys) {
    const n = parseInt(k.name.replace("tarot_config_v", ""));
    if (!isNaN(n) && n > maxId) maxId = n;
  }
  const newId = maxId + 1;

  const snapshotData = {
    id: newId,
    timestamp: Date.now(),
    savedAt: new Date().toISOString(),
    config: cfg,
  };
  await env.TALUO_KV.put(`tarot_config_v${newId}`, JSON.stringify(snapshotData));

  await appendAudit(env, {
    action: "snapshot",
    actor: auth.role,
    summary: `创建快照 v${newId}`,
  });

  return jsonResp({ ok: true, id: newId, message: `快照 v${newId} 创建成功` }, cors);
}


/* ---------- POST /dev/rollback ---------- */
async function handleRollback(request, env, cors) {
  const body = await readBody(request);
  const auth = await verifyAuthRole(env, body?.password, "developer");
  if (!auth.ok) return jsonResp(auth, cors, 401);

  const snapId = body?.id;
  if (!snapId) return jsonResp({ ok: false, error: "缺少快照 id" }, cors, 400);

  const raw = await env.TALUO_KV.get(`tarot_config_v${snapId}`);
  if (!raw) return jsonResp({ ok: false, error: "快照不存在" }, cors, 404);
  const snap = JSON.parse(raw);

  // 把快照里的 config 写回主配置
  await env.TALUO_KV.put("tarot_config", JSON.stringify(snap.config));

  await appendAudit(env, {
    action: "rollback",
    actor: auth.role,
    summary: `回滚到 v${snapId}（${snap.savedAt}）`,
  });

  return jsonResp({ ok: true, message: `已回滚到快照 v${snapId}` }, cors);
}


/* ---------- POST /dev/change-password ---------- */
async function handleChangePassword(request, env, cors) {
  const body = await readBody(request);
  if (body === null) return jsonResp({ ok: false, error: "请求体必须是 JSON" }, cors, 400);

  const { currentPwd, newPwd, role } = body;
  if (!currentPwd || !newPwd || !role) {
    return jsonResp({ ok: false, error: "需要 currentPwd / newPwd / role" }, cors, 400);
  }
  if (!["admin", "developer"].includes(role)) {
    return jsonResp({ ok: false, error: "role 必须是 admin 或 developer" }, cors, 400);
  }
  if (newPwd.length < 4) {
    return jsonResp({ ok: false, error: "新密码至少 4 位" }, cors, 400);
  }

  // 校验当前密码（对应角色的）
  const kvKey = role === "admin" ? "admin_password" : "developer_password";
  const fallback = role === "admin" ? ADMIN_PASSWORD_FALLBACK : DEVELOPER_PASSWORD_FALLBACK;
  const realCurrent = (await env.TALUO_KV.get(kvKey)) || fallback;

  if (currentPwd !== realCurrent) {
    return jsonResp({ ok: false, error: "当前密码错误" }, cors, 401);
  }

  // 写入新密码
  await env.TALUO_KV.put(kvKey, newPwd);

  await appendAudit(env, {
    action: "change_password",
    actor: role,
    summary: `修改 ${role} 密码`,
  });

  return jsonResp({ ok: true, message: `${role} 密码已更新` }, cors);
}


/* ============================================================================
 *                               辅助函数
 * ============================================================================ */

/** 校验密码并返回角色（admin 或 developer 都可通过） */
async function verifyAuth(env, password) {
  if (!password) return { ok: false, error: "缺少密码" };
  const [a, d] = await Promise.all([
    env.TALUO_KV.get("admin_password"),
    env.TALUO_KV.get("developer_password"),
  ]);
  const adminReal = a || ADMIN_PASSWORD_FALLBACK;
  const devReal = d || DEVELOPER_PASSWORD_FALLBACK;
  if (password === devReal) return { ok: true, role: "developer" };
  if (password === adminReal) return { ok: true, role: "admin" };
  return { ok: false, error: "密码错误" };
}

/** 校验必须是指定角色 */
async function verifyAuthRole(env, password, requiredRole) {
  const r = await verifyAuth(env, password);
  if (!r.ok) return r;
  if (r.role !== requiredRole) return { ok: false, error: "需要" + requiredRole + "密码" };
  return r;
}

/** 追加审计日志到 KV audit_log（JSON 数组，最多 100 条 FIFO） */
async function appendAudit(env, entry) {
  entry = {
    timestamp: Date.now(),
    savedAt: new Date().toISOString(),
    ...entry,
  };
  let logs = [];
  const raw = await env.TALUO_KV.get("audit_log");
  if (raw) {
    try { logs = JSON.parse(raw); } catch { logs = []; }
  }
  logs.push(entry);
  if (logs.length > 100) logs = logs.slice(-100);  // FIFO 保留 100 条
  await env.TALUO_KV.put("audit_log", JSON.stringify(logs));
}

/** 生成 config 变更摘要（简单版，对比一下关键字段） */
function summarizeConfig(cfg) {
  const parts = [];
  if (typeof cfg.globalUprightRate === "number") {
    parts.push(`正位概率 ${cfg.globalUprightRate}%`);
  }
  if (cfg.globalTheme) parts.push(`主题 ${cfg.globalTheme}`);
  if (Array.isArray(cfg.cards)) {
    const nonDefault = cfg.cards.filter(c => c.weight && c.weight !== 1);
    if (nonDefault.length) parts.push(`${nonDefault.length} 张权重非默认`);
  }
  return parts.join(", ") || "配置已更新";
}

/** 构造 CORS 响应头 */
function buildCorsHeaders(request) {
  const h = new Headers();
  h.set("Content-Type", "application/json; charset=utf-8");
  h.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  const origin = request.headers.get("Origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Access-Control-Allow-Credentials", "true");
  } else {
    h.set("Access-Control-Allow-Origin", "https://taluo996.top");
  }
  return h;
}

/** 读 JSON 请求体 */
async function readBody(request) {
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** 构造 JSON 响应 */
function jsonResp(data, headers, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}
