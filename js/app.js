/* =========================================================
   app.js — 启动 / 锁屏 / 引导 / 路由
   ========================================================= */
const ICONS = {
  dashboard:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.8V20a1 1 0 0 0 1 1h3.5v-6h5v6H18a1 1 0 0 0 1-1V9.8"/>',
  finance:'<rect x="2.5" y="6" width="19" height="13" rx="2.5"/><path d="M2.5 10h19"/><path d="M7 15h3"/>',
  health:'<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1z"/>',
  study:'<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H19v18H5.5A2.5 2.5 0 0 1 3 18.5z"/><path d="M8 3v18"/>',
  work:'<rect x="2.5" y="7" width="19" height="13" rx="2.5"/><path d="M8.5 7V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2"/>',
  cycle:'<path d="M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10z"/>',
  settings:'<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 4.6V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 21 11h.1a2 2 0 1 1 0 4H21z"/>'
};
const svg = k => `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`;

const App = {
  page: 'dashboard',
  pages: {
    dashboard: Dashboard, finance: Finance, health: HealthPage,
    study: Study, work: Work, cycle: Cycle, settings: Settings
  },
  // 桌面侧边栏（完整）
  navList: [
    ['dashboard','首页'], ['finance','记账'], ['health','减肥'],
    ['study','学业'], ['work','工作'], ['cycle','经期'], ['settings','设置']
  ],
  // 手机底部导航（6 个主流 + 设置在顶部栏）
  tabList: [['dashboard','首页'], ['finance','记账'], ['health','减肥'], ['study','学业'], ['work','工作'], ['cycle','经期']],

  init(){
    Store.load();
    this.buildNav();
    this.bindLock();
    this.clock();
    setInterval(()=>this.clock(), 1000);
    if('serviceWorker' in navigator && location.protocol.startsWith('http')){
      // 新版本 Service Worker 接管后自动刷新一次，确保拿到最新代码
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if(!refreshing){ refreshing = true; location.reload(); }
      });
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    }
    document.getElementById('lockBtn').addEventListener('click', ()=>this.lock());
    document.getElementById('settingsBtn').addEventListener('click', ()=>this.go('settings'));
    document.addEventListener('visibilitychange', ()=>{ if(!document.hidden && !document.getElementById('app').classList.contains('hidden')) this.refresh(); });
  },

  /* ---------- 锁屏 ---------- */
  bindLock(){
    const lock = document.getElementById('lockScreen');
    const enter = () => this.unlock();
    document.getElementById('enterBtn').addEventListener('click', enter);
    let y0 = null;
    lock.addEventListener('touchstart', e=>{ y0 = e.touches[0].clientY; }, {passive:true});
    lock.addEventListener('touchend', e=>{
      if(y0 !== null && y0 - e.changedTouches[0].clientY > 70) enter();
      y0 = null;
    });
    lock.addEventListener('wheel', e=>{ if(e.deltaY > 40) enter(); }, {passive:true});
    document.addEventListener('keydown', e=>{
      if(!document.getElementById('lockScreen').classList.contains('hidden') &&
         (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowUp')) enter();
    });
  },
  lock(){
    const lock = document.getElementById('lockScreen');
    lock.classList.remove('hidden','leaving');
    document.getElementById('app').classList.add('hidden');
    this.clock();
  },
  unlock(){
    const lock = document.getElementById('lockScreen');
    lock.classList.add('leaving');
    setTimeout(()=>{
      lock.classList.add('hidden'); lock.classList.remove('leaving');
      if(!Store.d.profile.onboarded) Onboard.start();
      else { document.getElementById('app').classList.remove('hidden'); this.refresh(); }
    }, 520);
  },
  clock(){
    const t = document.getElementById('lockTime');
    if(t && !document.getElementById('lockScreen').classList.contains('hidden')){
      const n = new Date();
      t.textContent = U.pad(n.getHours())+':'+U.pad(n.getMinutes());
      document.getElementById('lockDate').textContent = (n.getMonth()+1)+' 月 '+n.getDate()+' 日  '+U.wd(n);
      const sub = document.getElementById('lockSub');
      const alerts = (Store.d && Store.d.profile.onboarded) ? Dashboard.alerts().length : 0;
      sub.textContent = alerts ? '有 '+alerts+' 件事在等你处理' : '今天也要好好生活';
    }
    if(!document.getElementById('app').classList.contains('hidden') && this.page === 'dashboard') Dashboard.tick();
  },

  /* ---------- 导航 ---------- */
  buildNav(){
    const side = document.getElementById('sideNav');
    side.innerHTML = this.navList.map(([k,l])=>`<button class="side-item" data-p="${k}">${svg(k)}<span>${l}</span><span class="badge hidden" data-badge="${k}"></span></button>`).join('');
    side.addEventListener('click', e=>{ const b = e.target.closest('[data-p]'); if(b) this.go(b.dataset.p); });

    const tab = document.getElementById('tabbar');
    tab.innerHTML = this.tabList.map(([k,l])=>`<button class="tab" data-p="${k}">${svg(k)}<span>${l}</span><span class="badge hidden" data-badge2="${k}"></span></button>`).join('');
    tab.addEventListener('click', e=>{
      const b = e.target.closest('[data-p]'); if(!b) return;
      this.go(b.dataset.p);
    });
  },
  go(p){
    if(!this.pages[p]) return;
    this.page = p;
    document.getElementById('view').scrollTop = 0;
    window.scrollTo({top:0, behavior:'instant'});
    this.refresh();
  },
  refresh(){
    const page = this.pages[this.page];
    document.getElementById('pageTitle').textContent = page.title;
    document.getElementById('brandUser').textContent = Store.d.profile.name ? Store.d.profile.name+' 的一天' : '我的一天';
    // 高亮
    document.querySelectorAll('[data-p]').forEach(b=> b.classList.toggle('on', b.dataset.p === this.page));
    // 角标
    const counts = {
      study: Study.upcoming(7).length,
      work: Work.upcoming(7).length,
      dashboard: Dashboard.alerts().length,
      cycle: Cycle.stats().toNext !== null && Cycle.stats().toNext <= U.num(Store.d.cycleCfg.remindDays,3) ? 1 : 0
    };
    Object.keys(counts).forEach(k=>{
      document.querySelectorAll(`[data-badge="${k}"],[data-badge2="${k}"]`).forEach(b=>{
        if(counts[k] > 0){ b.textContent = counts[k]; b.classList.remove('hidden'); } else b.classList.add('hidden');
      });
    });
    const sub = document.getElementById('pageSub');
    sub.textContent = '';
    page.render(document.getElementById('view'));
  }
};

/* ===================== 首次引导（仅称呼） ===================== */
const Onboard = {
  start(){ document.getElementById('onboard').classList.remove('hidden'); this.render(); },
  render(){
    const el = document.getElementById('onboard');
    el.innerHTML = `<div class="ob-wrap">
      <div style="text-align:center;padding:34px 0 26px">
        <div style="width:72px;height:72px;border-radius:24px;margin:0 auto 18px;display:grid;place-items:center;font-size:30px;color:#fff;background:linear-gradient(135deg,#6366f1,#a855f7 55%,#ec4899);box-shadow:0 10px 28px rgba(99,102,241,.32)">廷</div>
        <h1 style="margin:0;font-size:27px;letter-spacing:-.6px">欢迎来到你的工作台</h1>
        <p style="color:var(--text-2);margin:10px 0 0;font-size:14.5px;line-height:1.7">
          记账（人民币 / 新币）· 减肥 · 课表作业 · 工作待办 · 经期<br>全部在一个地方，数据只存在你自己的设备上
        </p>
      </div>
      <div class="ob-card">
        <div class="field"><label>先告诉我怎么称呼你</label>
          <input class="inp" id="obName" placeholder="例：小雨"></div>
      </div>
      <div style="margin-top:18px;background:var(--surface-2);border-radius:14px;padding:16px;font-size:13.5px;color:var(--text-2);line-height:1.85">
        💡 <b>小提示：</b>进入「减肥」后可以设置身高体重，系统会自动帮你算好每日热量目标、蛋白质和饮水量。<br>
        进入「记账」可以添加你的各个账户余额和存钱目标。
      </div>
      <div class="ob-actions"><button class="btn btn-primary btn-block" id="obDone">开始使用 →</button></div>
    </div>`;
    el.querySelector('#obName').addEventListener('keydown', e=>{ if(e.key==='Enter') el.querySelector('#obDone').click(); });
    el.querySelector('#obDone').addEventListener('click', ()=>{
      const name = el.querySelector('#obName').value.trim();
      Store.d.profile.onboarded = true; Store.d.profile.name = name; Store.save();
      el.classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      App.refresh();
      UI.toast('欢迎，'+(name||'朋友')+'！🎉', 2600);
    });
    el.scrollTop = 0;
  }
};

document.addEventListener('DOMContentLoaded', ()=>App.init());
