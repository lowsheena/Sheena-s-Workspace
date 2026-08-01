// 追风工作台 · 云同步代理（Cloudflare Worker）
// 浏览器只跟这个 Worker 说话（带 x-phub-key 密码，不含任何 GitHub 凭据），
// Worker 在服务器端用你的 token 读写 GitHub 私有 Gist。
//
// 部署（免费，约 3 分钟）：
//   1. dash.cloudflare.com →「Workers 和 Pages」→「创建 Worker」→ 起名（如 phub-sync）
//   2. 用本文件整段覆盖代码编辑器 →「部署」
//   3. 该 Worker →「设置」→「变量」→ 添加两个【加密】环境变量：
//        GH_TOKEN    = 你的 GitHub classic token（只勾 gist 一项）
//        PASSPHRASE  = 任意密码，例如 phub888
//      （改完变量后记得点「保存并部署」让变量生效）
//   4.「触发器」复制 Worker 网址（https://phub-sync.xxx.workers.dev）
//   5. App 设置→云同步 填该网址 + 密码即可。
//
// 调试：浏览器打开 <Worker网址>/ping 应显示 pong（说明 Worker 可达）；
//       若 App 仍报错，Worker 现在会直接回显 GitHub 的真实错误信息。

const GH_API = 'https://api.github.com/gists';
const FILE = 'phub_state.json';

function ghHeaders(token) {
  return {
    'Authorization': 'Bearer ' + (token || '').trim(),   // trim 去掉复制时混入的空格/换行
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'phub-sync-worker',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

// 统一发请求 + 解析，GitHub 返回非 200 时直接抛出可读错误（不再崩溃）
async function ghJSON(token, method, url, body) {
  const res = await fetch(url, {
    method,
    headers: ghHeaders(token),
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch (e) { data = { __raw: await res.text().catch(() => '') }; }
  if (!res.ok) {
    const msg = (data && data.message) || ('HTTP ' + res.status + ' ' + JSON.stringify(data).slice(0, 160));
    throw new Error('GitHub 返回 ' + msg);
  }
  return data;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 心跳：用于确认 Worker 本身可达（与 GitHub 无关）
    if (url.pathname === '/ping' || url.searchParams.get('ping') !== null) {
      return new Response('pong', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'content-type,x-phub-key'
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const inKey = request.headers.get('x-phub-key') || '';
    if (inKey !== (env.PASSPHRASE || 'phub')) {
      return new Response('forbidden（密码不对，请确认 App 里的同步密码 = Worker 的 PASSPHRASE）', { status: 403, headers: cors });
    }
    const token = env.GH_TOKEN;
    if (!token) return new Response('未配置 GH_TOKEN（请在 Worker 设置里添加该环境变量）', { status: 500, headers: cors });

    try {
      if (request.method === 'GET') {
        const list = await ghJSON(token, 'GET', GH_API + '?per_page=100');
        if (!Array.isArray(list)) throw new Error('GitHub 返回异常（非数组）：' + JSON.stringify(list).slice(0, 160));
        const hit = list.find(g => g.files && g.files[FILE]);
        let content = '{}';
        if (hit) {
          const data = await ghJSON(token, 'GET', GH_API + '/' + hit.id);
          content = (data.files && data.files[FILE] && data.files[FILE].content) || '{}';
        } else {
          const created = await ghJSON(token, 'POST', GH_API, { description: 'phub sync', public: false, files: { [FILE]: { content: '{}' } } });
          content = (created.files && created.files[FILE] && created.files[FILE].content) || '{}';
        }
        return new Response(content, { headers: { ...cors, 'content-type': 'application/json' } });
      }

      if (request.method === 'POST') {
        const body = await request.text();
        try { JSON.parse(body); } catch (e) { return new Response('bad json', { status: 400, headers: cors }); }
        const list = await ghJSON(token, 'GET', GH_API + '?per_page=100');
        if (!Array.isArray(list)) throw new Error('GitHub 返回异常（非数组）：' + JSON.stringify(list).slice(0, 160));
        const hit = list.find(g => g.files && g.files[FILE]);
        if (hit) {
          await ghJSON(token, 'PATCH', GH_API + '/' + hit.id, { files: { [FILE]: { content: body } } });
        } else {
          await ghJSON(token, 'POST', GH_API, { description: 'phub sync', public: false, files: { [FILE]: { content: body } } });
        }
        return new Response('ok', { headers: cors });
      }
    } catch (e) {
      return new Response('worker error: ' + e.message, { status: 500, headers: cors });
    }
    return new Response('method not allowed', { status: 405, headers: cors });
  }
};
