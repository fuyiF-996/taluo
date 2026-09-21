/**
 * ============================================================================
 * Cloudflare Workers — cabbage塔罗 API
 * ============================================================================
 * 
 * 部署方式：直接粘贴到 Cloudflare Workers 控制台（零依赖、单文件）
 * KV 绑定：把 KV 命名空间绑定到变量名 TALUO_KV
 * 子域名：api.taluo996.top
 * 
 * 接口列表：
 *   GET  /         → 读取全部塔罗配置（给前端占卜页用）
 *   POST /save     → 管理员保存配置到 KV（admin 后台用）
 *                     Body: JSON { password, config }
 *                     config: { globalUprightRate, cards: [{id, weight, upright, reversed}] }
 *   POST /login    → 管理员密码校验（admin 登录页用）
 *                     Body: JSON { password }
 * 
 * KV 键设计：
 *   "tarot_config"  → 完整配置 JSON（全局概率 + 每张牌权重 + 正逆位文字）
 *   KV 不存在时返回 null，前端会使用内置默认值
 * ============================================================================
 */

// ==================== 管理员密码（硬编码） ====================
// 部署前请修改为你自己的密码！
const ADMIN_PASSWORD = "1234567890";


// ==================== 允许的 Origin ====================
// 只允许主站域名 + 自己（开发时可以临时放开 localhost）
const ALLOWED_ORIGINS = [
  "https://taluo996.top",
  "https://www.taluo996.top",
  // 开发时放开本地，上线后可注释掉
  "http://localhost:8080",
];


// ==================== 主入口 ====================
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};


async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method.toUpperCase();
  
  // 组装 CORS 响应头（用 new Headers() + set，避免对象展开问题）
  const corsHeaders = buildCorsHeaders(request);
  
  // OPTIONS 预检请求直接返回
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  // ===== GET / → 读取配置 =====
  if (method === "GET" && (pathname === "/" || pathname === "/config")) {
    let config = null;
    try {
      const raw = await env.TALUO_KV.get("tarot_config");
      if (raw) {
        config = JSON.parse(raw);
      }
    } catch (e) {
      // KV 不存在或解析失败，返回 null，前端会用内置值
      console.error("读取 KV 失败:", e);
    }
    
    return jsonResponse({ ok: true, config }, corsHeaders);
  }
  
  // ===== POST /login → 管理员登录校验 =====
  if (method === "POST" && pathname === "/login") {
    const body = await readJsonBody(request);
    if (body === null) {
      return jsonResponse({ ok: false, error: "请求体必须是 JSON" }, corsHeaders, 400);
    }
    
    if (body.password !== ADMIN_PASSWORD) {
      return jsonResponse({ ok: false, error: "密码错误" }, corsHeaders, 401);
    }
    
    return jsonResponse({ ok: true, message: "登录成功" }, corsHeaders);
  }
  
  // ===== POST /save → 保存配置 =====
  if (method === "POST" && pathname === "/save") {
    const body = await readJsonBody(request);
    if (body === null) {
      return jsonResponse({ ok: false, error: "请求体必须是 JSON" }, corsHeaders, 400);
    }
    
    // 先校验密码
    if (body.password !== ADMIN_PASSWORD) {
      return jsonResponse({ ok: false, error: "密码错误，保存被拒绝" }, corsHeaders, 401);
    }
    
    // 校验 config 结构
    const cfg = body.config;
    if (!cfg || typeof cfg !== "object") {
      return jsonResponse({ ok: false, error: "config 字段缺失" }, corsHeaders, 400);
    }
    
    // 写入 KV（TTL 0 = 永久）
    try {
      await env.TALUO_KV.put("tarot_config", JSON.stringify(cfg));
    } catch (e) {
      console.error("写入 KV 失败:", e);
      return jsonResponse({ ok: false, error: "存储失败" }, corsHeaders, 500);
    }
    
    return jsonResponse({ ok: true, message: "保存成功" }, corsHeaders);
  }
  
  // 其他路径 → 404
  return jsonResponse({ ok: false, error: "Not Found" }, corsHeaders, 404);
}


// ==================== 辅助函数 ====================

/**
 * 构造 CORS 响应头
 */
function buildCorsHeaders(request) {
  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  // 根据请求 Origin 决定是否允许
  const origin = request.headers.get("Origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  } else {
    // 不匹配时默认放开主域名（方便直接访问）
    headers.set("Access-Control-Allow-Origin", "https://taluo996.top");
  }
  
  return headers;
}

/**
 * 读取 JSON 请求体
 */
async function readJsonBody(request) {
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

/**
 * 构造 JSON 响应
 */
function jsonResponse(data, headers, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}
