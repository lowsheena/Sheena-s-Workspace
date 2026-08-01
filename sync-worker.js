// 追风工作台 · 云同步代理（Cloudflare Worker）
// 作用：浏览器不再直接连 GitHub，而是连这个 Worker；
//       Worker 在服务器端用你设置的 token 去读写 GitHub 私有 Gist。
// 这样 GitHub Token 从不出你的浏览器，规避"浏览器发 GitHub 请求被改坏"的问题。
//
// 部署方式（只需一次，约 3 分钟，免费）：
//   1. 注册/登录 https://dash.cloudflare.com/ （免费，无需信用卡）
//   2. 左侧「Workers 和 Pages」→「创建」→「创建 Worker」→ 起个名字（如 phub-sync）
//   3. 把本文件全部内容粘贴覆盖到代码编辑器，点「部署」
//   4. 部署后，进入该 Worker →「设置」→「变量」→ 添加两个「环境变量」（选"加密"）：
//        GH_TOKEN    = 你的 GitHub classic token（只勾 gist 权限）
//        PASSPHRASE  = 任意一串你记得住的密码，例如 phub888
//      保存后，回到「设置」→「触发器」复制 Worker 的网址（形如 https://phub-sync.xxx.workers.dev ）
//   5. 把那个网址 + 你设的 PASSPHRASE 填进 App 的「云同步」卡片即可。
//
// 两个接口：
//   GET  <worker>/   -> 返回云盘里的 JSON（没有则自动建空档案）
//   POST <worker>/   -> 把请求体（JSON 字符串）写入云盘

const GH_API = 'https://api.github.com/gists';
const FILE = 'phub_state.json';

function ghHeaders(token) {
  return {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'phub-sync-worker',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'content-type,x-phub-key'
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    // 简单密码保护：只有带对的 x-phub-key 才放行，避免路人读到你的云盘
    const inKey = request.headers.get('x-phub-key') || '';
    if (inKey !== (env.PASSPHRASE || 'phub')) {
      return new Response('forbidden', { status: 403, headers: cors });
    }
    const token = env.GH_TOKEN;
    if (!token) return new Response('GH_TOKEN not configured', { status: 500, headers: cors });

    try {
      if (request.method === 'GET') {
        const list = await (await fetch(GH_API + '?per_page=100', { headers: ghHeaders(token) })).json();
        const hit = (list || []).find(g => g.files && g.files[FILE]);
        let content = '{}';
        if (hit) {
          const data = await (await fetch(GH_API + '/' + hit.id, { headers: ghHeaders(token) })).json();
          content = (data.files && data.files[FILE] && data.files[FILE].content) || '{}';
        } else {
          const created = await (await fetch(GH_API, {
            method: 'POST', headers: ghHeaders(token),
            body: JSON.stringify({ description: 'phub sync', public: false, files: { [FILE]: { content: '{}' } } })
          })).json();
          content = (created.files && created.files[FILE] && created.files[FILE].content) || '{}';
        }
        return new Response(content, { headers: { ...cors, 'content-type': 'application/json' } });
      }

      if (request.method === 'POST') {
        const body = await request.text();
        try { JSON.parse(body); } catch (e) { return new Response('bad json', { status: 400, headers: cors }); }
        const list = await (await fetch(GH_API + '?per_page=100', { headers: ghHeaders(token) })).json();
        const hit = (list || []).find(g => g.files && g.files[FILE]);
        let res;
        if (hit) {
          res = await fetch(GH_API + '/' + hit.id, {
            method: 'PATCH', headers: ghHeaders(token),
            body: JSON.stringify({ files: { [FILE]: { content: body } } })
          });
        } else {
          res = await fetch(GH_API, {
            method: 'POST', headers: ghHeaders(token),
            body: JSON.stringify({ description: 'phub sync', public: false, files: { [FILE]: { content: body } } })
          });
        }
        if (!res.ok) {
          const t = await res.text();
          return new Response('github error ' + res.status + ' ' + t.slice(0, 200), { status: 502, headers: cors });
        }
        return new Response('ok', { headers: cors });
      }
    } catch (e) {
      return new Response('worker error: ' + e.message, { status: 500, headers: cors });
    }
    return new Response('method not allowed', { status: 405, headers: cors });
  }
};
