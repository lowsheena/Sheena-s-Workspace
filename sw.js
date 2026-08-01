/* 离线缓存：装到手机主屏后没网也能打开
   策略：网络优先（network-first），离线/失败时才用缓存。
   这样每次部署更新后，用户刷新即可拿到最新代码。 */
const CACHE = 'phub-v14';
const ASSETS = [
  './', './index.html', './manifest.json',
  './css/style.css?v=14',
  './js/core.js?v=14', './js/charts.js?v=14', './js/dashboard.js?v=14', './js/finance.js?v=14',
  './js/health.js?v=14', './js/study.js?v=14', './js/work.js?v=14', './js/more.js?v=14', './js/app.js?v=14',
  './js/ocr/tesseract.min.js', './js/ocr/worker.min.js', './js/ocr/tesseract-core-lstm.wasm.js', './js/ocr/tesseract-core-lstm.wasm', './js/ocr/chi_sim.traineddata',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{})).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  // 网络优先：先去服务器拿最新；失败（离线）才回退缓存
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then(res => {
      if(res && res.status === 200 && res.type === 'basic'){
        caches.open(CACHE).then(c => c.put(req, res.clone())).catch(()=>{});
      }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || fetch(req)))
  );
});
