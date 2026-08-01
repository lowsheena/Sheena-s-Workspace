/* =========================================================
   core.js — 工具 / 存储 / 照片库 / 通用 UI 组件
   ========================================================= */

/* ---------------- 工具 ---------------- */
const U = {
  uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); },
  pad(n){ return String(n).padStart(2,'0'); },
  /** Date -> 'YYYY-MM-DD'（本地时区） */
  ds(d){ d = d || new Date(); return d.getFullYear()+'-'+U.pad(d.getMonth()+1)+'-'+U.pad(d.getDate()); },
  today(){ return U.ds(new Date()); },
  /** 'YYYY-MM-DD' -> Date（本地 00:00） */
  pd(s){ if(!s) return null; const p = String(s).slice(0,10).split('-').map(Number); return new Date(p[0],p[1]-1,p[2]); },
  addDays(s, n){ const d = typeof s === 'string' ? U.pd(s) : new Date(s); d.setDate(d.getDate()+n); return U.ds(d); },
  /** b - a，单位天 */
  diffDays(a, b){
    const A = typeof a==='string'?U.pd(a):a, B = typeof b==='string'?U.pd(b):b;
    return Math.round((B - A) / 86400000);
  },
  /** 距今天多少天（负数=已过） */
  fromToday(s){ return U.diffDays(U.today(), s); },
  weekdayCN: ['周日','周一','周二','周三','周四','周五','周六'],
  wd(s){ const d = typeof s==='string'?U.pd(s):s; return U.weekdayCN[d.getDay()]; },
  fmtDate(s, withWd){
    const d = typeof s==='string'?U.pd(s):s; if(!d) return '';
    const t = (d.getMonth()+1)+'月'+d.getDate()+'日';
    return withWd ? t+' '+U.wd(d) : t;
  },
  relDate(s){
    const n = U.fromToday(s);
    if(n === 0) return '今天';
    if(n === 1) return '明天';
    if(n === 2) return '后天';
    if(n === -1) return '昨天';
    if(n < 0) return '逾期'+Math.abs(n)+'天';
    if(n <= 7) return n+'天后';
    return U.fmtDate(s);
  },
  monthKey(s){ return String(s).slice(0,7); },
  num(v, d){ const n = parseFloat(v); return isFinite(n) ? n : (d===undefined?0:d); },
  money(v, cur){
    const sym = cur === 'SGD' ? 'S$' : '¥';
    const n = U.num(v);
    return sym + n.toLocaleString('zh-CN', {minimumFractionDigits:2, maximumFractionDigits:2});
  },
  round(v, p){ const m = Math.pow(10, p||0); return Math.round(U.num(v)*m)/m; },
  clamp(v, a, b){ return Math.min(b, Math.max(a, v)); },
  esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
  min2str(m){ return U.pad(Math.floor(m/60))+':'+U.pad(m%60); },
  str2min(s){ if(!s) return 0; const p = String(s).split(':').map(Number); return (p[0]||0)*60 + (p[1]||0); },
  sortBy(arr, fn){ return arr.slice().sort((a,b)=>{ const x=fn(a), y=fn(b); return x<y?-1:x>y?1:0; }); },
  /** 本月第一天 */
  monthStart(d){ d=d||new Date(); return U.ds(new Date(d.getFullYear(), d.getMonth(), 1)); },
  download(name, text, type){
    const blob = new Blob([text], {type: type||'application/json;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }
};

/* ---------------- 照片库（IndexedDB） ---------------- */
const Photos = {
  _db: null,
  open(){
    if(this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      const rq = indexedDB.open('phub_photos', 1);
      rq.onupgradeneeded = e => { const db = e.target.result; if(!db.objectStoreNames.contains('p')) db.createObjectStore('p'); };
      rq.onsuccess = e => { this._db = e.target.result; res(this._db); };
      rq.onerror = () => rej(rq.error);
    });
  },
  async put(id, dataUrl){
    const db = await this.open();
    return new Promise((res, rej) => {
      const tx = db.transaction('p','readwrite'); tx.objectStore('p').put(dataUrl, id);
      tx.oncomplete = () => res(id); tx.onerror = () => rej(tx.error);
    });
  },
  async get(id){
    if(!id) return null;
    const db = await this.open();
    return new Promise(res => {
      const rq = db.transaction('p','readonly').objectStore('p').get(id);
      rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null);
    });
  },
  async del(id){
    if(!id) return;
    const db = await this.open();
    return new Promise(res => { const tx = db.transaction('p','readwrite'); tx.objectStore('p').delete(id); tx.oncomplete = res; tx.onerror = res; });
  },
  async all(){
    const db = await this.open();
    return new Promise(res => {
      const out = {}; const tx = db.transaction('p','readonly').objectStore('p').openCursor();
      tx.onsuccess = e => { const c = e.target.result; if(c){ out[c.key] = c.value; c.continue(); } else res(out); };
      tx.onerror = () => res(out);
    });
  },
  /** 压缩图片为 dataURL */
  compress(file, maxSide, quality){
    maxSide = maxSide || 1400; quality = quality || 0.8;
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width:w, height:h } = img;
          const scale = Math.min(1, maxSide / Math.max(w, h));
          w = Math.round(w*scale); h = Math.round(h*scale);
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          res(cv.toDataURL('image/jpeg', quality));
        };
        img.onerror = rej; img.src = fr.result;
      };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  },
  /** 异步把 <img data-photo="id"> 填充上 */
  hydrate(root){
    (root || document).querySelectorAll('img[data-photo]:not([data-loaded])').forEach(async el => {
      el.setAttribute('data-loaded','1');
      const d = await Photos.get(el.getAttribute('data-photo'));
      if(d) el.src = d; else el.style.display = 'none';
    });
  }
};

/* ---------------- 状态存储 ---------------- */
const DEFAULT_STATE = {
  v: 2,
  profile: { onboarded:false, name:'', gender:'female', age:20, height:165, weight:60, startWeight:60, targetWeight:52, activity:1.375, pace:'standard', goalNote:'', createdAt:'' },
  settings: { rate: 5.25, rateUpdated:'', defaultCurrency:'SGD', monthlyBudgetCNY: 3000, waterCup: 250, termStart:'', geminiKey:'', geminiModel:'gemini-2.0-flash', gistToken:'', gistId:'', autoSync:false, lastSync:'' },
  expenses: [], incomes: [], meals: [], water: [], workouts: [], weights: [],
  courses: [], tasks: [], works: [], cycles: [],
  accounts: [], savings: [], projects: [],
  cycleCfg: { avgCycle: 28, avgPeriod: 5, remindDays: 3 }
};

const Store = {
  KEY: 'phub_state_v1',
  d: null,
  load(){
    try{
      const raw = localStorage.getItem(this.KEY);
      this.d = raw ? Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), JSON.parse(raw)) : JSON.parse(JSON.stringify(DEFAULT_STATE));
      // 兜底：补齐缺失字段
      for(const k in DEFAULT_STATE){
        if(this.d[k] === undefined) this.d[k] = JSON.parse(JSON.stringify(DEFAULT_STATE[k]));
        else if(!Array.isArray(DEFAULT_STATE[k]) && typeof DEFAULT_STATE[k] === 'object')
          this.d[k] = Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE[k])), this.d[k]);
      }
    }catch(e){ this.d = JSON.parse(JSON.stringify(DEFAULT_STATE)); }
    return this.d;
  },
  save(){
    try{ localStorage.setItem(this.KEY, JSON.stringify(this.d)); }
    catch(e){ UI.toast('存储空间不足，建议清理旧照片'); }
    if(typeof Sync !== 'undefined' && Sync.auto && Sync.token) Sync.schedulePush();
  },
  add(list, obj){ obj.id = obj.id || U.uid(); this.d[list].unshift(obj); this.save(); return obj; },
  update(list, id, patch){ const it = this.d[list].find(x=>x.id===id); if(it){ Object.assign(it, patch); this.save(); } return it; },
  remove(list, id){
    const i = this.d[list].findIndex(x=>x.id===id);
    if(i>-1){ const it = this.d[list][i]; if(it.photo) Photos.del(it.photo); this.d[list].splice(i,1); this.save(); }
  },
  get(list, id){ return this.d[list].find(x=>x.id===id); }
};

/* ---------------- 云同步（GitHub Gist 当私有云盘） ---------------- */
const Sync = {
  API: 'https://api.github.com/gists',
  FILE: 'phub_state.json',
  get token(){ return this._clean((Store.d.settings && Store.d.settings.gistToken) || ''); },
  get gistId(){ return (Store.d.settings && Store.d.settings.gistId) || ''; },
  get auto(){ return !!(Store.d.settings && Store.d.settings.autoSync); },
  _t: null,
  /* 彻底清洗 token：GitHub token 仅含 [A-Za-z0-9_]，剔除所有不可见/多余字符
     （零宽空格、换行、智能引号等 .trim() 去不掉的东西，会导致 401 Bad credentials） */
  _clean(s){ return (s||'').replace(/[^A-Za-z0-9_]/g, ''); },
  _headers(){ return { 'Authorization': 'Bearer ' + this.token, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }; },
  _body(content){ return { description: '追风工作台云同步', public: false, files: { [this.FILE]: { content } } }; },

  /* 改动后防抖上传（自动同步用） */
  schedulePush(){
    clearTimeout(this._t);
    this._t = setTimeout(()=>{ this.upload().catch(()=>{}); }, 2500);
  },

  /* 上传本机数据到云端（有 gistId 则更新，否则新建；旧 gist 绑定失效时自动清空重试） */
  async upload(){
    if(!this.token) throw new Error('未配置 GitHub Token');
    if(!this.gistId){ const f = await this.findGist(); if(f) this._setGist(f); }
    const content = JSON.stringify(Store.d);
    let res;
    if(this.gistId){
      res = await fetch(this.API + '/' + this.gistId, { method:'PATCH', headers:this._headers(), body: JSON.stringify(this._body(content)) });
      if(res.status === 401 || res.status === 403 || res.status === 404){ this._clearGist(); res = null; }
    }
    if(!this.gistId){
      res = await fetch(this.API, { method:'POST', headers:this._headers(), body: JSON.stringify(this._body(content)) });
    }
    if(!res || !res.ok){
      let detail = '';
      try { const j = await res.json(); if(j && j.message) detail = '（' + j.message + '）'; } catch(e){}
      const len = this.token.length;
      const hint = (res && res.status===401)
        ? ('：请确认电脑与手机填的是【同一个】token、为 classic 且已勾选 gist、未被撤销。'
           + '（清洗后 token 长度为 ' + len + ' 位；github_pat_ 开头约 82 位、ghp_ 开头应为 40 位。若长度不对，说明复制时混入了隐藏字符，建议【手动重新输入】而非粘贴）')
        : (res && res.status===403 ? '（频率限制，稍后再试）' : '');
      throw new Error('GitHub 返回 ' + (res ? res.status : '?') + detail + hint);
    }
    const data = await res.json();
    if(data && data.id) this._setGist(data.id);
    return data;
  },

  /* 从云端拉取数据 */
  async download(){
    if(!this.token) throw new Error('未配置 GitHub Token');
    if(!this.gistId) throw new Error('尚未创建同步档案，请先上传一次');
    const res = await fetch(this.API + '/' + this.gistId, { headers:this._headers() });
    if(!res.ok) throw new Error('GitHub 返回 ' + res.status);
    const data = await res.json();
    const f = data.files && data.files[this.FILE];
    if(!f || !f.content) return null;
    return JSON.parse(f.content);
  },

  /* 查找同 token 下已有的同步 Gist（按文件名识别），实现多设备复用同一个云盘 */
  async findGist(){
    if(!this.token) return null;
    try{
      const res = await fetch(this.API + '?per_page=100', { headers:this._headers() });
      if(!res.ok) return null;
      const list = await res.json();
      const hit = (list||[]).find(g => g.files && g.files[this.FILE]);
      return hit ? hit.id : null;
    }catch(e){ return null; }
  },

  /* 合并同步：拉云端 + 本机合并（按 id 去重，取较新），再上传合并结果 */
  async sync(){
    const found = await this.findGist();
    if(found) this._setGist(found); else this._clearGist();
    let remote = null;
    try { remote = await this.download(); } catch(e){ /* 可能没有档案，稍后上传新建 */ }
    if(!remote){ await this.upload(); return { action:'uploaded' }; }
    const merged = this.merge(Store.d, remote);
    Store.d = merged;
    Store.save();
    await this.upload();
    return { action:'merged' };
  },

  _setGist(id){ Store.d.settings.gistId = id; Store.save(); },
  _clearGist(){ Store.d.settings.gistId = ''; Store.save(); },

  /* 合并两份状态：数组按 id 并集（较新优先），对象浅合并（云端补缺、本机优先），保护同步凭据 */
  merge(local, remote){
    const out = JSON.parse(JSON.stringify(local));
    for(const k in DEFAULT_STATE){
      const def = DEFAULT_STATE[k];
      if(Array.isArray(def)){
        out[k] = this.unionById(local[k] || [], remote[k] || []);
      } else if(def && typeof def === 'object'){
        out[k] = Object.assign({}, remote[k] || {}, local[k] || {});
      }
    }
    out.settings = out.settings || {};
    out.settings.gistToken = (local.settings && local.settings.gistToken) || out.settings.gistToken;
    out.settings.gistId = (local.settings && local.settings.gistId) || out.settings.gistId;
    return out;
  },
  unionById(a, b){
    const map = new Map();
    const push = it => {
      if(!it || it.id === undefined) return;
      const prev = map.get(it.id);
      if(!prev){ map.set(it.id, it); return; }
      if(this.tsOf(it) > this.tsOf(prev)) map.set(it.id, it);
    };
    (a||[]).forEach(push); (b||[]).forEach(push);
    return Array.from(map.values());
  },
  tsOf(o){ return U.num(o && o.ts) || U.num(o && o.updatedAt) || 0; }
};

/* ---------------- 健康计算 ---------------- */
const Health = {
  PACE: { easy:{d:250,label:'轻松（约 0.25kg/周）'}, standard:{d:500,label:'标准（约 0.5kg/周）'}, fast:{d:750,label:'进取（约 0.7kg/周）'} },
  ACT: [
    {v:1.2,   label:'久坐（几乎不运动）'},
    {v:1.375, label:'轻度（每周 1-3 次）'},
    {v:1.55,  label:'中度（每周 3-5 次）'},
    {v:1.725, label:'高强度（每周 6-7 次）'}
  ],
  bmr(p){
    const base = 10*U.num(p.weight) + 6.25*U.num(p.height) - 5*U.num(p.age);
    return Math.round(p.gender === 'male' ? base + 5 : base - 161);
  },
  calc(p){
    const bmr = this.bmr(p);
    const tdee = Math.round(bmr * U.num(p.activity, 1.375));
    const pace = this.PACE[p.pace] || this.PACE.standard;
    const floor = p.gender === 'male' ? 1500 : 1200;
    const target = Math.max(floor, Math.round(tdee - pace.d));
    const realDeficit = tdee - target;
    const weeklyLoss = U.round(realDeficit * 7 / 7700, 2);
    const toLose = U.round(U.num(p.weight) - U.num(p.targetWeight), 1);
    const weeks = weeklyLoss > 0 ? Math.ceil(toLose / weeklyLoss) : 0;
    const bmi = U.round(U.num(p.weight) / Math.pow(U.num(p.height)/100, 2), 1);
    const targetBmi = U.round(U.num(p.targetWeight) / Math.pow(U.num(p.height)/100, 2), 1);
    const idealMin = U.round(18.5 * Math.pow(U.num(p.height)/100, 2), 1);
    const idealMax = U.round(23.9 * Math.pow(U.num(p.height)/100, 2), 1);
    return {
      bmr, tdee, target, deficit: realDeficit, weeklyLoss, toLose, weeks,
      finishDate: weeks > 0 ? U.addDays(U.today(), weeks*7) : '',
      bmi, bmiLabel: this.bmiLabel(bmi), targetBmi, idealMin, idealMax,
      protein: Math.round(U.num(p.targetWeight) * 1.6),
      carb: Math.round(target * 0.45 / 4),
      fat: Math.round(target * 0.25 / 9),
      water: U.clamp(Math.round(U.num(p.weight) * 35 / 50) * 50, 1500, 3500),
      burnTarget: Math.round(Math.min(400, Math.max(150, realDeficit * 0.4)))
    };
  },
  bmiLabel(b){ return b < 18.5 ? '偏瘦' : b < 24 ? '正常' : b < 28 ? '超重' : '肥胖'; },
  bmiColor(b){ return b < 18.5 ? 'blue' : b < 24 ? 'green' : b < 28 ? 'amber' : 'red'; }
};

/* ---------------- 通用 UI ---------------- */
const UI = {
  toast(msg, ms){
    const r = document.getElementById('toastRoot');
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
    r.appendChild(el);
    setTimeout(()=>{ el.style.transition='opacity .3s,transform .3s'; el.style.opacity=0; el.style.transform='translateY(8px)'; setTimeout(()=>el.remove(), 320); }, ms || 1900);
  },

  closeModal(){ const r = document.getElementById('modalRoot'); r.innerHTML = ''; },

  /** 自定义内容弹窗 */
  modal({title, bodyHTML, okText, cancelText, onMount, onOk, wide}){
    const r = document.getElementById('modalRoot');
    r.innerHTML = `
      <div class="mask" data-close="1">
        <div class="modal" ${wide?'style="max-width:640px"':''}>
          <div class="modal-head"><h3>${U.esc(title||'')}</h3>
            <button class="mini-btn" data-close="1" style="font-size:17px">✕</button></div>
          <div class="modal-body">${bodyHTML||''}</div>
          ${okText===null?'':`<div class="modal-foot">
            <button class="btn btn-ghost" data-close="1">${U.esc(cancelText||'取消')}</button>
            <button class="btn btn-primary" id="mOk">${U.esc(okText||'保存')}</button>
          </div>`}
        </div>
      </div>`;
    r.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', e => { if(e.target === el) UI.closeModal(); }));
    const ok = r.querySelector('#mOk');
    if(ok && onOk) ok.addEventListener('click', () => onOk(r));
    if(onMount) onMount(r);
    Photos.hydrate(r);
    return r;
  },

  confirm(msg, onYes, danger){
    UI.modal({
      title:'确认', bodyHTML:`<p style="color:var(--text-2);margin:4px 0 14px;line-height:1.6">${U.esc(msg)}</p>`,
      okText: danger ? '删除' : '确定',
      onOk(){ UI.closeModal(); onYes && onYes(); }
    });
    const b = document.querySelector('#mOk');
    if(b && danger){ b.className = 'btn btn-danger'; }
  },

  viewImage(src){
    const d = document.createElement('div'); d.className = 'viewer';
    d.innerHTML = `<img src="${src}">`;
    d.addEventListener('click', ()=> d.remove());
    document.body.appendChild(d);
  },

  /* ---------- 表单引擎 ----------
     fields: {key,label,type,value,options,required,placeholder,hint,half,min,max,step}
     type: text | number | date | time | textarea | select | opts | photo | static | money
  */
  form({title, fields, okText, onSubmit, wide, extraHTML, onMount}){
    const state = {};
    fields.forEach(f => { state[f.key] = f.value !== undefined ? f.value : (f.type==='number'?'':''); });

    const fieldHTML = f => {
      const id = 'f_' + f.key;
      let inner = '';
      switch(f.type){
        case 'textarea': inner = `<textarea class="inp" id="${id}" placeholder="${U.esc(f.placeholder||'')}">${U.esc(state[f.key]||'')}</textarea>`; break;
        case 'select':   inner = `<select class="inp" id="${id}">${(f.options||[]).map(o=>`<option value="${U.esc(o.v)}" ${String(o.v)===String(state[f.key])?'selected':''}>${U.esc(o.l)}</option>`).join('')}</select>`; break;
        case 'opts':     inner = `<div class="opts" id="${id}">${(f.options||[]).map(o=>`<button type="button" class="opt ${String(o.v)===String(state[f.key])?'on':''}" data-v="${U.esc(o.v)}">${U.esc(o.l)}</button>`).join('')}</div>`; break;
        case 'photo':    inner = `<div class="photo-field" id="${id}">
              <label class="photo-btn"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                拍照 / 选择图片<input type="file" accept="image/*" style="display:none" data-cam></label>
              <div class="photo-prev ${state[f.key]?'':'hidden'}"><img data-photo="${U.esc(state[f.key]||'')}" src=""><button type="button" data-rm>✕</button></div>
            </div>`; break;
        case 'static':   inner = `<div style="padding:9px 0;font-size:14px;color:var(--text-2)">${f.html||U.esc(state[f.key])}</div>`; break;
        default:
          inner = `<input class="inp" id="${id}" type="${f.type==='number'?'number':f.type||'text'}" value="${U.esc(state[f.key]==null?'':state[f.key])}" placeholder="${U.esc(f.placeholder||'')}" ${f.step?`step="${f.step}"`:(f.type==='number'?'step="any"':'')} ${f.min!==undefined?`min="${f.min}"`:''} ${f.max!==undefined?`max="${f.max}"`:''} ${f.type==='number'?'inputmode="decimal"':''}>`;
      }
      return `<div class="field" style="${f.half?'':''}"><label>${U.esc(f.label)}${f.required?' <span style="color:var(--red)">*</span>':''}</label>${inner}${f.hint?`<div class="hint">${f.hint}</div>`:''}</div>`;
    };

    // 半宽字段两两组合
    let html = '', i = 0;
    while(i < fields.length){
      const f = fields[i];
      if(f.half && fields[i+1] && fields[i+1].half){
        html += `<div class="two">${fieldHTML(f)}${fieldHTML(fields[i+1])}</div>`; i += 2;
      } else { html += fieldHTML(f); i++; }
    }
    if(extraHTML) html += extraHTML;

    const root = UI.modal({
      title, bodyHTML: html, okText: okText || '保存', wide,
      onMount(r){
        fields.forEach(f => {
          const el = r.querySelector('#f_' + f.key);
          if(!el) return;
          if(f.type === 'opts'){
            el.addEventListener('click', e => {
              const b = e.target.closest('.opt'); if(!b) return;
              el.querySelectorAll('.opt').forEach(x=>x.classList.remove('on'));
              b.classList.add('on'); state[f.key] = b.dataset.v;
              if(f.onChange) f.onChange(state[f.key], state, r);
            });
          } else if(f.type === 'photo'){
            const input = el.querySelector('[data-cam]');
            const prev = el.querySelector('.photo-prev');
            const img = prev.querySelector('img');
            input.addEventListener('change', async e => {
              const file = e.target.files[0]; if(!file) return;
              UI.toast('正在处理照片…');
              const data = await Photos.compress(file);
              const pid = U.uid(); await Photos.put(pid, data);
              state[f.key] = pid; img.src = data; prev.classList.remove('hidden');
              UI.toast('照片已添加');
              if(f.onPhoto) f.onPhoto(data, state, r);
            });
            prev.querySelector('[data-rm]').addEventListener('click', () => { state[f.key] = ''; prev.classList.add('hidden'); input.value=''; });
          } else if(f.type !== 'static'){
            el.addEventListener('input', () => { state[f.key] = el.value; if(f.onChange) f.onChange(el.value, state, r); });
            el.addEventListener('change', () => { state[f.key] = el.value; if(f.onChange) f.onChange(el.value, state, r); });
          }
        });
        if(onMount) onMount(r, state);
      },
      onOk(r){
        for(const f of fields){
          if(f.required && (state[f.key] === '' || state[f.key] == null)){ UI.toast('请填写「'+f.label+'」'); return; }
        }
        const res = onSubmit(state, r);
        if(res !== false) UI.closeModal();
      }
    });
    return root;
  },

  closeSheet(){ document.getElementById('sheetRoot').innerHTML = ''; },
  sheet({title, sub, bodyHTML, onMount}){
    const r = document.getElementById('sheetRoot');
    r.innerHTML = `<div class="sheet-mask" data-close="1"><div class="sheet">
        <div class="sheet-head">
          <div><h3 style="margin:0;font-size:19px;font-weight:700">${U.esc(title||'')}</h3>
          ${sub?`<div style="font-size:12.5px;color:var(--text-3);margin-top:3px">${sub}</div>`:''}</div>
          <button class="mini-btn" data-close="1" style="font-size:17px">✕</button>
        </div>
        <div class="sheet-body">${bodyHTML||''}</div>
      </div></div>`;
    r.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', e => { if(e.target === el) UI.closeSheet(); }));
    if(onMount) onMount(r);
    Photos.hydrate(r);
    return r;
  },

  ring(pct, val, label, color){
    const R = 48, C = 2*Math.PI*R, p = U.clamp(pct, 0, 1);
    const cmap = { brand:['#6366f1','#a855f7'], green:['#10b981','#34d399'], blue:['#3b82f6','#60a5fa'], amber:['#f59e0b','#fbbf24'], pink:['#ec4899','#f472b6'], red:['#ef4444','#f87171'] };
    const c = cmap[color||'brand'];
    const gid = 'g'+Math.random().toString(36).slice(2,7);
    return `<div class="ring"><svg width="112" height="112" viewBox="0 0 112 112">
        <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs>
        <circle cx="56" cy="56" r="${R}" fill="none" stroke="#eceef7" stroke-width="10"/>
        <circle cx="56" cy="56" r="${R}" fill="none" stroke="url(#${gid})" stroke-width="10" stroke-linecap="round"
          stroke-dasharray="${C}" stroke-dashoffset="${C*(1-p)}" style="transition:stroke-dashoffset .7s cubic-bezier(.4,0,.2,1)"/>
      </svg><div class="ring-txt"><b>${val}</b><span>${label}</span></div></div>`;
  },

  empty(text, ico){ return `<div class="empty"><span class="e-ico">${ico||'📭'}</span>${U.esc(text)}</div>`; }
};

/* 全局图片点击放大 */
document.addEventListener('click', e => {
  const t = e.target;
  if(t.tagName === 'IMG' && t.classList.contains('thumb') && t.src) UI.viewImage(t.src);
});
