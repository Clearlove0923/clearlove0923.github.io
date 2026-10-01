/**
 * MD 维护文档后端 · Cloudflare Worker + KV
 * ------------------------------------------------------------
 * 给静态站（GitHub Pages）提供一个读写维护文档的接口：
 *   GET  /api/docs   任何人可读（访客看到最新内容）
 *   PUT  /api/docs   需要管理员口令（口令只以 SHA-256 哈希形式校验，明文不落任何地方）
 *   GET  /api/site   任何人可读：首页/全站文案（管理员在页面上直接改的那份）
 *   PUT  /api/site   需要管理员口令，写入首页文案
 *   GET  /api/verify 只校验口令对不对，不读不写数据（维护页/首页用它决定要不要进编辑模式）
 *   GET  /api/health 自检
 *
 * /api/docs 与 /api/site 共用同一个 KV 命名空间（DOCS_KV），落在两个不同的键上
 * （docs / site），互不影响。
 *
 * 部署步骤：
 * 1. Cloudflare 控制台 → Workers 和 Pages → 创建 Worker → 粘贴本文件 → 部署
 * 2. Worker → 设置 → 变量：
 *      KV 命名空间绑定：变量名填 DOCS_KV，值选一个 KV 命名空间（没有就先去「KV」页面新建一个）
 *      机密（加密的环境变量）：变量名 ADMIN_HASH，值填管理员口令的 SHA-256（64 位小写十六进制）
 *      口令哈希可以在维护页面点「生成口令哈希」得到，不要填明文口令
 * 3. 把 Worker 的访问地址（https://xxx.<subdomain>.workers.dev）填到维护页面的「设置」里
 *
 * 说明：如果你的访客主要在国内，workers.dev 偶尔会慢，可以在 Worker 的「域和路由」里
 *       绑定自己的域名，再把页面设置里的地址换成自己的域名。
 */

const ALLOWED_ORIGINS = [
  'https://zzy-max-09.github.io',
  'https://clearlove0923.github.io',
  'http://localhost:8787',
  'http://127.0.0.1:8787'
];

// 只接受自己的站点，避免别人拿你的 Worker 当免费存储
// localhost / 127.0.0.1 任意端口放行，方便本地预览调试（file:// 打开时 Origin 为 null，会被拒绝）
function isAllowed(origin) {
  if (ALLOWED_ORIGINS.indexOf(origin) >= 0) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function corsHeaders(origin) {
  const allow = isAllowed(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Hash',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign(
      { 'Content-Type': 'application/json; charset=utf-8' },
      corsHeaders(origin)
    )
  });
}

// 常量时间比较，避免通过响应时间猜哈希
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default {
  async fetch(request, env) {
    var origin = request.headers.get('Origin') || '';
    var url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // 只接受自己的站点，避免别人拿你的 Worker 当免费存储
    // 浏览器地址栏直接访问时没有 Origin 头（origin 为空），这种请求放行 GET；
    // 带 Origin 的必须来自白名单站点；PUT 写入始终需要口令
    if (origin && !isAllowed(origin)) {
      return json({ error: 'origin not allowed: ' + origin }, 403, origin);
    }

    if (url.pathname === '/api/health') {
      return json({ ok: true, hasAdminHash: !!(env.ADMIN_HASH) }, 200, origin);
    }

    // 只校验口令，不读也不写任何数据：维护页用它决定「要不要显示管理界面」
    if (url.pathname === '/api/verify') {
      var vExpected = (env && env.ADMIN_HASH) ? String(env.ADMIN_HASH).toLowerCase() : '';
      if (!vExpected) return json({ error: 'Worker 未配置 ADMIN_HASH' }, 500, origin);
      var vGot = (request.headers.get('X-Admin-Hash') || '').toLowerCase();
      if (!safeEqual(vGot, vExpected)) return json({ ok: false, error: '口令不正确' }, 401, origin);
      return json({ ok: true }, 200, origin);
    }

    // 首页/全站文案：访客读，管理员写。结构 { content: { key: '文字', ... }, updatedAt }
    if (url.pathname === '/api/site') {
      if (request.method === 'GET') {
        var sraw = null;
        try { sraw = await env.DOCS_KV.get('site'); } catch (e) {
          return json({ error: 'KV 读取失败，检查 DOCS_KV 绑定', content: {}, updatedAt: null }, 500, origin);
        }
        if (!sraw) return json({ content: {}, updatedAt: null }, 200, origin);
        return new Response(sraw, {
          status: 200,
          headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, corsHeaders(origin))
        });
      }

      if (request.method === 'PUT') {
        var sExpected = (env && env.ADMIN_HASH) ? String(env.ADMIN_HASH).toLowerCase() : '';
        if (!sExpected) return json({ error: 'Worker 未配置 ADMIN_HASH' }, 500, origin);

        var sGot = (request.headers.get('X-Admin-Hash') || '').toLowerCase();
        if (!safeEqual(sGot, sExpected)) return json({ error: '口令不正确' }, 401, origin);

        var stext = await request.text();
        if (stext.length > 400000) return json({ error: '内容过大（超过 400KB）' }, 413, origin);

        var sparsed;
        try { sparsed = JSON.parse(stext); } catch (e) {
          return json({ error: 'JSON 格式错误' }, 400, origin);
        }
        if (!sparsed || typeof sparsed.content !== 'object' || sparsed.content === null || Array.isArray(sparsed.content)) {
          return json({ error: '缺少 content 字段' }, 400, origin);
        }
        // 只接受「字符串 → 字符串」，避免把任意结构塞进 KV
        var clean = {};
        Object.keys(sparsed.content).forEach(function (k) {
          var v = sparsed.content[k];
          if (typeof v === 'string' && v.length <= 8000) clean[k] = v;
        });

        var spayload = JSON.stringify({ content: clean, updatedAt: new Date().toISOString() });
        try {
          await env.DOCS_KV.put('site', spayload);
        } catch (e) {
          return json({ error: 'KV 写入失败，检查 DOCS_KV 绑定' }, 500, origin);
        }
        return new Response(spayload, {
          status: 200,
          headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, corsHeaders(origin))
        });
      }

      return json({ error: 'method not allowed' }, 405, origin);
    }

    if (url.pathname === '/api/docs') {
      if (request.method === 'GET') {
        var raw = null;
        try { raw = await env.DOCS_KV.get('docs'); } catch (e) {
          return json({ error: 'KV 读取失败，检查 DOCS_KV 绑定', versions: {}, updatedAt: null }, 500, origin);
        }
        if (!raw) return json({ versions: {}, updatedAt: null }, 200, origin);
        return new Response(raw, {
          status: 200,
          headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, corsHeaders(origin))
        });
      }

      if (request.method === 'PUT') {
        var expected = (env && env.ADMIN_HASH) ? String(env.ADMIN_HASH).toLowerCase() : '';
        if (!expected) return json({ error: 'Worker 未配置 ADMIN_HASH' }, 500, origin);

        var got = (request.headers.get('X-Admin-Hash') || '').toLowerCase();
        if (!safeEqual(got, expected)) return json({ error: '口令不正确' }, 401, origin);

        var text = await request.text();
        if (text.length > 900000) return json({ error: '内容过大（超过 900KB）' }, 413, origin);

        var parsed;
        try { parsed = JSON.parse(text); } catch (e) {
          return json({ error: 'JSON 格式错误' }, 400, origin);
        }
        if (!parsed || typeof parsed.versions !== 'object' || parsed.versions === null) {
          return json({ error: '缺少 versions 字段' }, 400, origin);
        }

        var payload = JSON.stringify({
          versions: parsed.versions,
          updatedAt: new Date().toISOString()
        });
        try {
          await env.DOCS_KV.put('docs', payload);
        } catch (e) {
          return json({ error: 'KV 写入失败，检查 DOCS_KV 绑定' }, 500, origin);
        }
        return new Response(payload, {
          status: 200,
          headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, corsHeaders(origin))
        });
      }

      return json({ error: 'method not allowed' }, 405, origin);
    }

    return json({ error: 'not found' }, 404, origin);
  }
};
