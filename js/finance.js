/* =========================================================
   finance.js — 记账（人民币 / 新币双币种）+ 账户 + 存钱目标
   ========================================================= */
const Finance = {
  title: '记账',
  tab: 'overview',
  cats: [
    {k:'food',  l:'餐饮', i:'🍜', c:'#f59e0b'},
    {k:'trans', l:'交通', i:'🚇', c:'#3b82f6'},
    {k:'shop',  l:'购物', i:'🛍️', c:'#ec4899'},
    {k:'study', l:'学习', i:'📚', c:'#6366f1'},
    {k:'house', l:'住房', i:'🏠', c:'#14b8a6'},
    {k:'fun',   l:'娱乐', i:'🎮', c:'#8b5cf6'},
    {k:'med',   l:'医疗', i:'💊', c:'#ef4444'},
    {k:'pet',   l:'宠物', i:'🐾', c:'#a855f7'},
    {k:'phone', l:'通讯', i:'📱', c:'#0ea5e9'},
    {k:'gift',  l:'人情', i:'🎁', c:'#f43f5e'},
    {k:'other', l:'其他', i:'📦', c:'#94a3b8'}
  ],
  /* 收入分类 */
  incCats: [
    {k:'salary',   l:'工资/薪水', i:'💼', c:'#10b981'},
    {k:'part',     l:'兼职/外快', i:'🛠️', c:'#3b82f6'},
    {k:'scholar',  l:'奖学金',   i:'🎓', c:'#8b5cf6'},
    {k:'refund',   l:'报销/退款', i:'↩️', c:'#0ea5e9'},
    {k:'transfer', l:'转账/还款', i:'💱', c:'#f59e0b'},
    {k:'invest',   l:'理财/投资', i:'📈', c:'#14b8a6'},
    {k:'gift',     l:'红包/礼金', i:'🧧', c:'#ef4444'},
    {k:'other',    l:'其他收入', i:'📦', c:'#94a3b8'}
  ],
  ACCT_TYPES: [
    {k:'bank',  l:'银行卡', i:'🏦', c:'#3b82f6'},
    {k:'cash',  l:'现金', i:'💵', c:'#10b981'},
    {k:'ewallet',l:'电子钱包', i:'📱', c:'#8b5cf6'},
    {k:'credit',l:'信用卡', i:'💳', c:'#f59e0b'}
  ],
  range: 'month',
  expTab: 'expense',
  cat(k){ return this.cats.find(c=>c.k===k) || this.cats[this.cats.length-1]; },
  acctType(k){ return this.ACCT_TYPES.find(a=>a.k===k) || this.ACCT_TYPES[0]; },
  rate(){ return U.num(Store.d.settings.rate, 5.25) || 5.25; },

  /* ---- 换算 ---- */
  conv(amount, currency){
    const r = this.rate(), a = U.num(amount);
    return currency === 'SGD' ? { cny: U.round(a*r,2), sgd: U.round(a,2) } : { cny: U.round(a,2), sgd: U.round(a/r,2) };
  },

  /* 计入支出的支出（不计入统计的会被过滤掉） */
  list(){
    const all = Store.d.expenses.filter(e => e.counted !== false);
    if(this.range === 'all') return all;
    const now = new Date();
    if(this.range === 'month'){ const k = U.monthKey(U.today()); return all.filter(e=>U.monthKey(e.date)===k); }
    if(this.range === 'last'){
      const d = new Date(now.getFullYear(), now.getMonth()-1, 1);
      const k = d.getFullYear()+'-'+U.pad(d.getMonth()+1);
      return all.filter(e=>U.monthKey(e.date)===k);
    }
    if(this.range === 'week'){ const from = U.addDays(U.today(), -6); return all.filter(e=>e.date >= from); }
    return all;
  },
  /* 不计入支出统计的条目（转账等，只记录不进预算） */
  uncountedList(){
    const all = Store.d.expenses.filter(e => e.counted === false);
    if(this.range === 'all') return all;
    const now = new Date();
    if(this.range === 'month'){ const k = U.monthKey(U.today()); return all.filter(e=>U.monthKey(e.date)===k); }
    if(this.range === 'last'){
      const d = new Date(now.getFullYear(), now.getMonth()-1, 1);
      const k = d.getFullYear()+'-'+U.pad(d.getMonth()+1);
      return all.filter(e=>U.monthKey(e.date)===k);
    }
    if(this.range === 'week'){ const from = U.addDays(U.today(), -6); return all.filter(e=>e.date >= from); }
    return all;
  },
  sum(list){ return list.reduce((s,e)=>s+U.num(e.cny), 0); },
  monthExpense(){ return Store.d.expenses.filter(e => e.counted !== false && U.monthKey(e.date) === U.monthKey(U.today())); },
  monthIncome(){ return Store.d.incomes.filter(e => U.monthKey(e.date) === U.monthKey(U.today())); },
  incat(k){ return this.incCats.find(c=>c.k===k) || this.incCats[this.incCats.length-1]; },

  /* ---- 账户总览 ---- */
  accounts(){ return Store.d.accounts; },
  totalAssets(){
    let cny=0, sgd=0;
    Store.d.accounts.forEach(a => {
      if(a.currency==='SGD') sgd += U.num(a.balance);
      else cny += U.num(a.balance);
    });
    // SGD 部分也折成 CNY
    const r = this.rate();
    return {
      cny: U.round(cny + sgd * r, 2),
      sgd: U.round(cny / r + sgd, 2),
      byCurrency: { CNY: cny, SGD: sgd }
    };
  },

  /* ---- 存钱目标 ---- */
  savings(){ return Store.d.savings; },
  savedTotal(goalId){
    return (Store.d.savingsRecords || []).filter(r => r.goalId === goalId).reduce((s,r)=>s+U.num(r.amount), 0);
  },
  weeklyTarget(goal){
    const left = U.fromToday(goal.deadline);
    if(left <= 0) return goal.target - this.savedTotal(goal.id);
    const remaining = goal.target - this.savedTotal(goal.id);
    return Math.max(0, U.round(remaining / Math.ceil(left/7), 2));
  },

  /* =================== 记一笔（带账户选择） =================== */
  quickAdd(preset){
    const s = Store.d.settings;
    const cur = (preset && preset.currency) || s.defaultCurrency || 'SGD';
    const accts = Store.d.accounts;
    const startFlow = (preset && preset.flow) || 'expense';
    const acctOpts = [{v:'',l:'不关联账户'}].concat(accts.map(a=>({v:a.id, l:this.acctType(a.type).i+' '+a.name+' ('+U.money(a.balance,a.currency)+')'})));

    /* 根据类型显示/隐藏对应字段 */
    const applyFlow = (flow, r) => {
      const isInc = flow === 'income';
      const show = (key, on) => { const el = r.querySelector('#f_'+key); const w = el && el.closest('.field'); if(w) w.style.display = on ? '' : 'none'; };
      show('category', !isInc);
      show('accountId', !isInc);
      show('counted', !isInc);
      show('incat', isInc);
      show('accountId2', isInc);
    };

    UI.form({
      title: '记一笔',
      okText: '保存',
      fields: [
        { key:'flow', label:'类型', type:'opts', value:startFlow,
          options:[{v:'expense',l:'💸 支出'},{v:'income',l:'💰 收入'}],
          onChange(v, st, r){ applyFlow(v, r); } },
        { key:'currency', label:'币种', type:'opts', value:cur,
          options:[{v:'SGD',l:'🇸🇬 新币 SGD'},{v:'CNY',l:'🇨🇳 人民币 CNY'}],
          onChange(v, st, r){ Finance._preview(r, st); } },
        { key:'amount', label:'金额', type:'number', value:'', required:true, placeholder:'0.00',
          onChange(v, st, r){ Finance._preview(r, st); } },
        { key:'category', label:'支出分类', type:'opts', value:(preset&&preset.category)||'food',
          options: this.cats.map(c=>({v:c.k, l:c.i+' '+c.l})) },
        { key:'accountId', label:'从哪个账户扣款', type:'select', value:accts.length?accts[0].id:'',
          options: acctOpts },
        { key:'counted', label:'是否计入支出', type:'opts', value:'yes',
          options:[{v:'yes',l:'计入（影响本月支出 / 预算）'},{v:'no',l:'不计入（只记账，不进统计）'}] },
        { key:'incat', label:'收入来源', type:'opts', value:'salary',
          options: this.incCats.map(c=>({v:c.k, l:c.i+' '+c.l})) },
        { key:'accountId2', label:'存入哪个账户', type:'select', value:accts.length?accts[0].id:'',
          options: acctOpts },
        { key:'date', label:'日期', type:'date', value:U.today(), half:true },
        { key:'note', label:'备注', type:'text', value:'', placeholder:'例：食阁午饭', half:true },
        { key:'photo', label:'票据照片（可选）', type:'photo', value:'' }
      ],
      extraHTML: `<div id="convBox" class="card pad-s" style="background:var(--brand-soft);border:none;margin-bottom:6px">
          <div class="kv"><span>折合人民币</span><b id="cvCny">¥0.00</b></div>
          <div class="kv"><span>折合新币</span><b id="cvSgd">S$0.00</b></div>
          <div class="hint" style="margin-top:4px">按 1 SGD = ${this.rate()} CNY 换算 · 可在「账户」页修改汇率</div>
        </div>`,
      onMount(r){
        applyFlow(startFlow, r);
        Finance._preview(r, {amount:'', currency:cur});
      },
      onSubmit(st){
        const flow = st.flow;
        const c = Finance.conv(st.amount, st.currency);
        const amt = U.round(U.num(st.amount), 2);
        if(flow === 'income'){
          Store.add('incomes', {
            date: st.date || U.today(), amount: amt, currency: st.currency,
            rate: Finance.rate(), cny: c.cny, sgd: c.sgd,
            category: st.incat, note: st.note || '', photo: st.photo || '',
            accountId: st.accountId2 || '', ts: Date.now()
          });
          if(st.accountId2){
            const a = Store.get('accounts', st.accountId2);
            if(a){ a.balance = U.round(U.num(a.balance) + amt, 2); Store.save(); }
          }
          Store.d.settings.defaultCurrency = st.currency; Store.save();
          UI.toast('已记录收入 ' + U.money(amt, st.currency));
        } else {
          const counted = st.counted !== 'no';
          Store.add('expenses', {
            date: st.date || U.today(), amount: amt, currency: st.currency,
            rate: Finance.rate(), cny: c.cny, sgd: c.sgd,
            category: st.category, note: st.note || '', photo: st.photo || '',
            accountId: st.accountId || '', counted, ts: Date.now()
          });
          if(st.accountId){
            const a = Store.get('accounts', st.accountId);
            if(a){ a.balance = U.round(U.num(a.balance) - amt, 2); Store.save(); }
          }
          Store.d.settings.defaultCurrency = st.currency; Store.save();
          UI.toast('已记录 ' + U.money(amt, st.currency));
        }
        App.refresh();
      }
    });
    setTimeout(()=>Finance._preview(document.getElementById('modalRoot'), {amount:'', currency:cur}), 10);
  },
  _preview(r, st){
    if(!r) return;
    const cny = r.querySelector('#cvCny'), sgd = r.querySelector('#cvSgd');
    if(!cny) return;
    const amt = r.querySelector('#f_amount') ? r.querySelector('#f_amount').value : st.amount;
    const cur = (r.querySelector('#f_currency .opt.on') || {dataset:{v:st.currency}}).dataset.v;
    const c = Finance.conv(amt, cur);
    cny.textContent = U.money(c.cny, 'CNY'); sgd.textContent = U.money(c.sgd, 'SGD');
  },

  /* ---- 账户管理 ---- */
  addAccount(id){
    const a = id ? Store.get('accounts', id) : null;
    UI.form({
      title: id ? '编辑账户' : '添加账户',
      fields:[
        { key:'name', label:'名称', type:'text', value:a?a.name:'', required:true, placeholder:'例：DBS 储蓄卡 / 微信零钱' },
        { key:'type', label:'类型', type:'opts', value:a?a.type:'bank',
          options:this.ACCT_TYPES.map(t=>({v:t.k, l:t.i+' '+t.l})) },
        { key:'currency', label:'币种', type:'opts', value:a?a.currency:'SGD',
          options:[{v:'SGD',l:'🇸🇬 新币'},{v:'CNY',l:'🇨🇳 人民币'}] },
        { key:'balance', label:'当前余额', type:'number', value:a?U.num(a.balance):'', required:true, step:'0.01', placeholder:'0.00', half:true },
        { key:'color', label:'颜色标记', type:'opts', value:a?a.color:this.ACCT_TYPES[Store.d.accounts.length % 4].c,
          options:['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ec4899','#ef4444'].map(x=>({v:x,l:'●'})) },
        { key:'note', label:'备注', type:'text', value:a?a.note:'', placeholder:'银行后四位、用途等' }
      ],
      onSubmit(st){
        const data = { name:st.name, type:st.type, currency:st.currency, balance:U.round(U.num(st.balance),2), color:st.color, note:st.note||'' };
        if(id) Store.update('accounts', id, data); else Store.add('accounts', data);
        UI.toast(id?'已更新':'账户已添加'); App.refresh();
      }
    });
    setTimeout(()=>{
      document.querySelectorAll('#f_color .opt').forEach(b=>{ b.style.color=b.dataset.v; b.style.fontSize='19px'; b.style.padding='4px 9px'; });
    }, 20);
  },

  /* ---- 存钱目标 ---- */
  addGoal(id){
    const g = id ? Store.get('savings', id) : null;
    UI.form({
      title: id ? '编辑存钱目标' : '新建存钱目标',
      fields:[
        { key:'name', label:'目标名称', type:'text', value:g?g.name:'', required:true, placeholder:'例：毕业旅行基金 / 应急备用金' },
        { key:'target', label:'目标金额', type:'number', value:g?g.target:'', required:true, step:'0.01', half:true },
        { key:'currency', label:'币种', type:'opts', value:g?g.currency:'SGD',
          options:[{v:'SGD',l:'🇸🇬 新币'},{v:'CNY',l:'🇨🇳 人民币'}] },
        { key:'deadline', label:'截止日期', type:'date', value:g?g.deadline:'', half:true },
        { key:'icon', label:'图标 emoji', type:'text', value:g?g.icon:'✈️', half:true },
        { key:'note', label:'备注', type:'text', value:g?g.note:'' }
      ],
      onSubmit(st){
        const data = { name:st.name, target:U.round(U.num(st.target),2), currency:st.currency, deadline:st.deadline||'', icon:st.icon||'✈️', note:st.note||'' };
        if(id) Store.update('savings', id, data); else Store.add('savings', data);
        UI.toast(id?'已更新':'目标已创建'); App.refresh();
      }
    });
  },
  saveMoney(goalId){
    const g = Store.get('savings', goalId); if(!g) return;
    UI.form({
      title: '存入「'+g.name+'」',
      fields:[
        { key:'amount', label:'存入金额', type:'number', value:'', required:true, step:'0.01' },
        { key:'date', label:'日期', type:'date', value:U.today() },
        { key:'fromAcct', label:'从哪个账户转出', type:'select', value:'',
          options:[{v:'',l:'手动记录（不扣账户）'}].concat(
            Store.d.accounts.filter(a=>a.currency===g.currency).map(a=>({v:a.id, l:a.name+' ('+U.money(a.balance,a.currency)+')'}))
          ) },
        { key:'note', label:'备注', type:'text', value:'' }
      ],
      onSubmit(st){
        const amt = U.round(U.num(st.amount),2);
        if(!Store.d.savingsRecords) Store.d.savingsRecords = [];
        Store.d.savingsRecords.push({ id:U.uid(), goalId, amount:amt, date:st.date||U.today(), fromAcct:st.fromAcct||'', note:st.note||'', ts:Date.now() });
        // 扣账户
        if(st.fromAcct){
          const a = Store.get('accounts', st.fromAcct);
          if(a){ a.balance = U.round(U.num(a.balance)-amt, 2); Store.save(); }
        }
        Store.save(); UI.toast('已存入 '+U.money(amt,g.currency)); App.refresh();
      }
    });
  },

  /* ---- 汇率设置 ---- */
  editRate(){
    UI.form({
      title:'汇率与预算设置',
      fields:[
        { key:'rate', label:'1 新币 SGD = ? 人民币 CNY', type:'number', value:Store.d.settings.rate, required:true, hint:'可点下方按钮尝试联网获取实时汇率' },
        { key:'budget', label:'每月支出预算（人民币）', type:'number', value:Store.d.settings.monthlyBudgetCNY },
        { key:'defaultCurrency', label:'默认记账币种', type:'opts', value:Store.d.settings.defaultCurrency,
          options:[{v:'SGD',l:'🇸🇬 新币'},{v:'CNY',l:'🇨🇳 人民币'}] }
      ],
      extraHTML:`<button class="btn btn-soft btn-block" id="fetchRate" style="margin-bottom:6px">🌐 获取实时汇率</button>`,
      onSubmit(st){
        Store.d.settings.rate = U.round(U.num(st.rate, 5.25), 4);
        Store.d.settings.monthlyBudgetCNY = U.num(st.budget, 0);
        Store.d.settings.defaultCurrency = st.defaultCurrency;
        Store.d.settings.rateUpdated = U.today();
        Store.save(); UI.toast('已更新'); App.refresh();
      }
    });
    const btn = document.getElementById('fetchRate');
    if(btn) btn.addEventListener('click', async () => {
      btn.textContent = '获取中…';
      try{
        const res = await fetch('https://open.er-api.com/v6/latest/SGD');
        const j = await res.json();
        const v = j && j.rates && j.rates.CNY;
        if(v){ document.getElementById('f_rate').value = U.round(v,4); document.getElementById('f_rate').dispatchEvent(new Event('input')); UI.toast('实时汇率 1 SGD = '+U.round(v,4)+' CNY'); }
        else throw 0;
      }catch(e){ UI.toast('联网失败，请手动填写'); }
      btn.textContent = '🌐 获取实时汇率';
    });
  },

  /* =================== 页面 =================== */
  render(el){
    el.innerHTML = `
      <div class="seg" id="ftab" style="margin-bottom:16px">
        ${[['overview','总览'],['expenses','明细'],['accounts','账户'],['goals','存钱']].map(([k,l])=>`<button data-t="${k}" class="${this.tab===k?'on':''}">${l}</button>`).join('')}
      </div>
      <div id="fBody"></div>`;
    el.querySelector('#ftab').addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if(!b) return;
      this.tab = b.dataset.t; this.render(el);
    });
    const body = el.querySelector('#fBody');
    ({ overview:()=>this.renderOverview(body), expenses:()=>this.renderExpenses(body), accounts:()=>this.renderAccounts(body), goals:()=>this.renderGoals(body) })[this.tab]();
    Photos.hydrate(el);
  },

  renderOverview(el){
    const s = Store.d.settings;
    const list = U.sortBy(this.list(), e => e.date + ' ' + (e.ts||0)).reverse();
    const totalCny = this.sum(list), totalSgd = U.round(totalCny / this.rate(), 2);
    const budget = U.num(s.monthlyBudgetCNY, 0);
    const monthExps = this.monthExpense();
    const monthCny = this.sum(monthExps);
    const pct = budget > 0 ? U.clamp(monthCny/budget, 0, 1) : 0;
    const incomeMonth = this.monthIncome();
    const incomeCny = this.sum(incomeMonth);
    const incomeSgd = U.round(incomeCny / this.rate(), 2);

    // 预计算图表，避免模板内 IIFE 嵌套括号错误
    const last14Days = (() => { const days=[]; for(let i=13;i>=0;i--){ const d=U.addDays(U.today(),-i); days.push({label:d.slice(8),value:U.round(Store.d.expenses.filter(e=>e.date===d).reduce((s,e)=>s+U.num(e.cny),0),2)}); } return Charts.bars(days); })();
    const byCatMap = {}; list.forEach(e=>{ byCatMap[e.category]=(byCatMap[e.category]||0)+U.num(e.cny); });
    const catItems = Object.keys(byCatMap).map(k=>({label:this.cat(k).i+' '+this.cat(k).l,value:U.round(byCatMap[k],2),color:this.cat(k).c})).sort((a,b)=>b.value-a.value);
    const catChart = catItems.length ? Charts.breakdown(catItems.slice(0,6), v=>'¥'+v) : UI.empty('还没有支出记录','💸');

    // 资产
    const assets = this.totalAssets();
    const accts = Store.d.accounts;
    const goals = Store.d.savings;

    el.innerHTML = `
      <div class="grid g2" style="margin-bottom:16px">
        <div class="card" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;color:#fff">
          <div style="font-size:12.5px;opacity:.85">本月支出</div>
          <div style="font-size:32px;font-weight:700;letter-spacing:-1.2px;margin:4px 0 2px">¥${totalCny.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          <div style="font-size:13.5px;opacity:.9">≈ S$${totalSgd.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          <div style="font-size:12.5px;opacity:.9;margin-top:6px">本月收入 ¥${incomeCny.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})} <span style="opacity:.8">≈ S$${incomeSgd.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
          ${budget>0?`<div class="progress" style="margin-top:12px"><i style="width:${pct*100}%"></i></div><div style="font-size:11.5px;margin-top:6px;opacity:.85">预算 ¥${budget} · 已用 ${Math.round(pct*100)}%</div>`:''}
        </div>

        <div class="card" style="background:linear-gradient(135deg,#eef0ff,#fdeef6);border:none">
          <div style="font-size:12.5px;color:var(--text-2)">我的资产</div>
          <div style="font-size:28px;font-weight:700;letter-spacing:-1px;margin:4px 0 2px;color:var(--text)">
            ¥${assets.cny.toLocaleString()} <span style="font-size:15px;color:var(--text-2)">≈ S$${assets.sgd.toLocaleString()}</span>
          </div>
          ${accts.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;font-size:12px">${accts.map(a=>{
            const at = this.acctType(a.type);
            return `<span class="chip" style="background:${a.color}18;color:${a.color};border-color:${a.color}33">${at.i} ${U.esc(a.name)} ${U.money(a.balance,a.currency)}</span>`}).join('')}</div>`
          : `<div style="font-size:12.5px;color:var(--text-3);margin-top:8px">还没有添加账户，点「账户」去添加</div>`}
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" id="addExp">＋ 记一笔</button>
        <button class="btn btn-soft btn-sm" id="addInc">＋ 记收入</button>
        <button class="btn btn-ghost btn-sm" id="rateBtn">汇率 / 预算</button>
      </div>

      <!-- 账户卡片 -->
      <div class="sec-title"><h2>💰 我的账户 <span style="font-size:13px;color:var(--text-3);font-weight:500">${accts.length} 个</span></h2></div>
      ${accts.length ? `<div class="grid g3" style="margin-bottom:16px">${accts.map(a=>{
        const at = this.acctType(a.type);
        return `<div class="card pad-s" style="border-left:4px solid ${a.color}">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:20px">${at.i}</span>
            <div><div style="font-size:14px;font-weight:650">${U.esc(a.name)}</div>
              <div style="font-size:11.5px;color:var(--text-3)">${at.l}${a.note?' · '+U.esc(a.note):''}</div></div>
          </div>
          <b style="font-size:22px;letter-spacing:-.6px;color:var(--text)">${U.money(a.balance,a.currency)}</b>
          <div style="font-size:11.5px;color:var(--text-3);margin-top:3px">≈ ${a.currency==='SGD'?U.money(U.round(U.num(a.balance)*this.rate(),2),'CNY'):U.money(U.round(U.num(a.balance)/this.rate(),2),'SGD')}</div>
        </div>`;}).join('')}</div>`
      : `<div class="card" style="margin-bottom:16px">${UI.empty('还没有账户，点击下方添加','🏦')}</div>`}

      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button class="btn btn-soft btn-sm" id="addAcct" style="flex:1">＋ 添加账户</button>
        <button class="btn btn-ghost btn-sm" id="addGoal" style="flex:1">＋ 存钱目标</button>
      </div>

      <!-- 存钱目标 -->
      ${goals.length ? `<div class="sec-title"><h2>🎯 存钱目标</h2></div>
        <div class="grid g2" style="margin-bottom:16px">${goals.map(g=>{
          const saved = this.savedTotal(g.id);
          const pct = g.target > 0 ? U.clamp(saved/g.target, 0, 1) : 0;
          const wkTgt = this.weeklyTarget(g);
          const n = g.deadline ? U.fromToday(g.deadline) : null;
          return `<div class="card pad-s" style="border-left:4px solid ${pct>=1?'var(--green)':n!==null&&n<=30?'var(--amber)':'var(--brand)'}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div><span style="font-size:20px">${g.icon}</span> <b style="font-size:15px">${U.esc(g.name)}</b></div>
              <button class="btn-add" data-saveg="${g.id}" style="font-size:12px;padding:5px 10px;border-radius:9px;background:var(--green-soft);color:#0f8f6c">＋ 存入</button>
            </div>
            <div class="kv"><span>进度</span><b>${Math.round(pct*100)}%</b></div>
            <div class="progress green" style="margin:6px 0 8px"><i style="width:${pct*100}%"></i></div>
            <div class="kv"><span>${U.money(saved,g.currency)} / ${U.money(g.target,g.currency)}</span><b>还差 ${U.money(Math.max(0,g.target-saved),g.currency)}</b></div>
            ${wkTgt > 0 ? `<div class="hint" style="margin-top:6px">每周需存 ≈ ${U.money(wkTgt,g.currency)}${n!==null&&n>0?`（剩 ${n} 天）`:`（已过期）`}` : ''}
          </div>`;}).join('')}</div>` : ''}

      <!-- 近期趋势 -->
      <div class="grid g2" style="margin-bottom:16px">
        <div class="card">
          <div class="card-head"><h3>近 14 天</h3><span class="sub">单位：人民币</span></div>
          ${last14Days}
        </div>
        <div class="card">
          <div class="card-head"><h3>分类占比</h3><span class="sub">${this.rangeLabel()}</span></div>
          ${catChart}
        </div>
      </div>

      <div class="sec-title">
        <h2>最近支出 <span style="font-size:13px;color:var(--text-3);font-weight:500">${list.length} 笔</span></h2>
        <div class="seg" id="rangeSeg">
          ${[['week','近7天'],['month','本月'],['last','上月'],['all','全部']].map(([k,l])=>`<button data-r="${k}" class="${this.range===k?'on':''}">${l}</button>`).join('')}
        </div>
      </div>
      <div class="list" id="expList">
        ${list.length ? list.slice(0,15).map(e=>this.rowHTML(e)).join('') : UI.empty('这个时间段还没有记账','🧾')}
      </div>
      ${this.uncountedList().length ? `<div class="sec-title"><h2>不计入支出 <span style="font-size:13px;color:var(--text-3);font-weight:500">${this.uncountedList().length} 笔（不计预算）</span></h2></div>
        <div class="list">${this.uncountedList().slice(0,15).map(e=>this.rowHTML(e)).join('')}</div>` : ''}`;

    el.querySelector('#addExp').addEventListener('click', ()=>this.quickAdd());
    const addInc = el.querySelector('#addInc'); if(addInc) addInc.addEventListener('click', ()=>this.quickAdd({flow:'income'}));
    el.querySelector('#rateBtn').addEventListener('click', ()=>this.editRate());
    el.querySelector('#addAcct').addEventListener('click', ()=>this.addAccount());
    el.querySelector('#addGoal').addEventListener('click', ()=>this.addGoal());
    el.querySelector('#rangeSeg').addEventListener('click', e => {
      const b = e.target.closest('[data-r]'); if(!b) return;
      this.range = b.dataset.r; App.refresh();
    });
    el.addEventListener('click', e => {
      const sg = e.target.closest('[data-saveg]'); if(sg){ this.saveMoney(sg.dataset.saveg); return; }
      const del = e.target.closest('[data-del]'); if(del){ UI.confirm('删除这笔支出？', ()=>{ Store.remove('expenses', del.dataset.del); App.refresh(); }, true); return; }
      const ea = e.target.closest('[data-editacct]'); if(ea){ this.addAccount(ea.dataset.editacct); return; }
      const da = e.target.closest('[data-delacct]'); if(da){ UI.confirm('删除该账户？余额数据会丢失。', ()=>{ Store.remove('accounts', da.dataset.delacct); App.refresh(); }, true); return; }
      const eg = e.target.closest('[data-editgoal]'); if(eg){ this.addGoal(eg.dataset.editgoal); return; }
      const dg = e.target.closest('[data-delgoal]'); if(dg){ UI.confirm('删除该目标？存钱记录也会一并删除。', ()=>{
        Store.d.savings = Store.d.savings.filter(g=>g.id !== dg.dataset.delgoal);
        if(Store.d.savingsRecords) Store.d.savingsRecords = Store.d.savingsRecords.filter(r=>r.goalId !== dg.dataset.delgoal);
        Store.save(); App.refresh();
      }, true); return; }
    });
  },

  renderExpenses(el){
    const tab = this.expTab;
    const rangeSeg = `<div class="seg" id="rangeSeg">
      ${[['week','近7天'],['month','本月'],['last','上月'],['all','全部']].map(([k,l])=>`<button data-r="${k}" class="${this.range===k?'on':''}">${l}</button>`).join('')}
    </div>`;
    const tabSeg = `<div class="seg" id="expTabSeg" style="margin-bottom:14px">
      <button data-et="expense" class="${tab==='expense'?'on':''}">💸 支出</button>
      <button data-et="income" class="${tab==='income'?'on':''}">💰 收入</button>
    </div>`;

    if(tab === 'income'){
      const list = U.sortBy(Store.d.incomes, e => e.date + ' ' + (e.ts||0)).reverse();
      el.innerHTML = `
        ${tabSeg}
        <div style="display:flex;gap:8px;margin-bottom:14px">
          <button class="btn btn-primary btn-sm" id="addInc" style="flex:1">＋ 记收入</button>
          ${rangeSeg}
        </div>
        <div class="list" id="incList">
          ${list.length ? list.map(e=>this.rowHTMLIncome(e)).join('') : UI.empty('还没有收入记录','💰')}
        </div>`;
      el.querySelector('#addInc').addEventListener('click', ()=>this.quickAdd({flow:'income'}));
    } else {
      const list = U.sortBy(this.list(), e => e.date + ' ' + (e.ts||0)).reverse();
      const uncounted = U.sortBy(this.uncountedList(), e => e.date + ' ' + (e.ts||0)).reverse();
      el.innerHTML = `
        ${tabSeg}
        <div style="display:flex;gap:8px;margin-bottom:14px">
          <button class="btn btn-primary btn-sm" id="addExp" style="flex:1">＋ 记一笔</button>
          ${rangeSeg}
        </div>
        <div class="list" id="expList">
          ${list.length ? list.map(e=>this.rowHTML(e)).join('') : UI.empty('还没有支出记录','🧾')}
        </div>
        ${uncounted.length ? `<div class="sec-title"><h2>不计入支出 <span style="font-size:13px;color:var(--text-3);font-weight:500">不进统计</span></h2></div>
          <div class="list">${uncounted.map(e=>this.rowHTML(e)).join('')}</div>` : ''}`;
      el.querySelector('#addExp').addEventListener('click', ()=>this.quickAdd());
    }
    el.querySelector('#expTabSeg').addEventListener('click', e=>{ const b=e.target.closest('[data-et]'); if(b){ this.expTab=b.dataset.et; App.refresh(); }});
    el.querySelector('#rangeSeg').addEventListener('click', e => { const b=e.target.closest('[data-r]');if(b){this.range=b.dataset.r;App.refresh();}});
    el.addEventListener('click', e => {
      const del = e.target.closest('[data-del]');
      if(del){ UI.confirm('删除这笔支出？', ()=>{ Store.remove('expenses', del.dataset.del); App.refresh(); }, true); return; }
      const deli = e.target.closest('[data-deli]');
      if(deli){ UI.confirm('删除这笔收入？', ()=>{ Store.remove('incomes', deli.dataset.deli); App.refresh(); }, true); }
    });
  },

  rowHTMLIncome(e){
    const c = this.incat(e.category);
    const main = e.currency === 'SGD' ? `S$${U.num(e.sgd).toFixed(2)}` : `¥${U.num(e.cny).toFixed(2)}`;
    const sub  = e.currency === 'SGD' ? `≈ ¥${U.num(e.cny).toFixed(2)}` : `≈ S$${U.num(e.sgd).toFixed(2)}`;
    const acct = e.accountId ? Store.get('accounts', e.accountId) : null;
    return `<div class="row">
      <div class="r-ico" style="background:${c.c}1a">${c.i}</div>
      ${e.photo ? `<img class="thumb" data-photo="${e.photo}" src="">` : ''}
      <div class="r-main">
        <div class="r-title">${U.esc(e.note || c.l)}</div>
        <div class="r-sub"><span>${U.fmtDate(e.date, true)}</span><span class="chip">${c.l}</span>${acct?`<span class="chip" style="background:${acct.color}18;color:${acct.color}">${U.esc(acct.name)}</span>`:''}</div>
      </div>
      <div class="r-right">
        <div class="r-amt" style="color:var(--green)">+${main}</div>
        <div style="font-size:11.5px;color:var(--text-3)">${sub}</div>
      </div>
      <button class="mini-btn" data-deli="${e.id}">✕</button>
    </div>`;
  },

  renderAccounts(el){
    const accts = Store.d.accounts;
    const assets = this.totalAssets();
    el.innerHTML = `
      <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,#eef0ff,#fdeef6);border:none">
        <div class="card-head"><h3>总资产</h3><button class="btn-add" id="editRate">汇率 / 预算</button></div>
        <div style="display:flex;gap:24px;flex-wrap:wrap">
          <div><b style="font-size:34px;letter-spacing:-1.2px">¥${assets.cny.toLocaleString()}</b><div style="font-size:12.5px;color:var(--text-2)">人民币</div></div>
          <div><b style="font-size:34px;letter-spacing:-1.2px">S$${assets.sgd.toLocaleString()}</b><div style="font-size:12.5px;color:var(--text-2)">新币</div></div>
        </div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:14px;font-size:12.5px;color:var(--text-2)">
          <span>🏦 人民币账户 ¥${assets.byCurrency.CNY.toLocaleString()}</span>
          <span>💵 新币账户 S$${assets.byCurrency.SGD.toLocaleString()}</span>
          <span>💱 汇率 1 SGD = ${this.rate()} CNY</span>
        </div>
      </div>

      <button class="btn btn-primary btn-block btn-sm" id="addAcct" style="margin-bottom:16px">＋ 添加账户</button>

      ${accts.length ? `<div class="list">${accts.map(a=>{
        const at = this.acctType(a.type);
        const exps = Store.d.expenses.filter(e=>e.accountId===a.id).length;
        return `<div class="row" style="align-items:flex-start">
          <div class="r-ico" style="background:${a.color}18;color:${a.color};font-size:17px">${at.i}</div>
          <div class="r-main">
            <div class="r-title">${U.esc(a.name)}</div>
            <div class="r-sub">
              <span class="chip" style="background:${a.color}18;color:${a.color}">${at.l}</span>
              <span>${a.currency}</span>
              ${a.note?`<span>${U.esc(a.note)}</span>`:''}
              <span>${exps} 笔支出</span>
            </div>
          </div>
          <div class="r-right">
            <div class="r-amt">${U.money(a.balance,a.currency)}</div>
            <div style="font-size:11px;color:var(--text-3)">≈ ${a.currency==='SGD'?U.money(U.round(U.num(a.balance)*this.rate(),2),'CNY'):U.money(U.round(U.num(a.balance)/this.rate(),2),'SGD')}</div>
          </div>
          <button class="mini-btn" data-editacct="${a.id}" style="font-size:13px">✎</button>
          <button class="mini-btn" data-delacct="${a.id}">✕</button>
        </div>`;}).join('')}</div>` : `<div class="card">${UI.empty('还没有账户','🏦')}</div>`}`;

    el.querySelector('#addAcct').addEventListener('click', ()=>this.addAccount());
    el.querySelector('#editRate').addEventListener('click', ()=>this.editRate());
    el.addEventListener('click', e => {
      const ea = e.target.closest('[data-editacct]'); if(ea){ this.addAccount(ea.dataset.editacct); return; }
      const da = e.target.closest('[data-delacct]'); if(da){ UI.confirm('删除该账户？', ()=>{ Store.remove('accounts', da.dataset.delacct); App.refresh(); }, true); return; }
    });
  },

  renderGoals(el){
    const goals = Store.d.savings;
    el.innerHTML = `
      <button class="btn btn-primary btn-block btn-sm" id="addGoal" style="margin-bottom:16px">＋ 新建存钱目标</button>
      ${goals.length ? `<div class="list">${goals.map(g=>{
        const saved = this.savedTotal(g.id);
        const pct = g.target > 0 ? U.clamp(saved/g.target, 0, 1) : 0;
        const wkTgt = this.weeklyTarget(g);
        const n = g.deadline ? U.fromToday(g.deadline) : null;
        const records = (Store.d.savingsRecords||[]).filter(r=>r.goalId===g.id).sort((a,b)=>b.ts-a.ts).slice(0,5);
        return `<div class="row" style="align-items:flex-start">
          <div class="r-ico" style="font-size:22px">${g.icon}</div>
          <div class="r-main">
            <div class="r-title">${U.esc(g.name)}${pct>=1?' <span class="chip green">已完成 🎉</span>':''}</div>
            <div class="r-sub">
              <span>${U.money(saved,g.currency)} / ${U.money(g.target,g.currency)}</span>
              <span style="font-weight:700;color:var(--green)">${Math.round(pct*100)}%</span>
              ${g.deadline?`<span>${U.relDate(g.deadline)}</span>`:''}
            </div>
            <div class="progress green" style="margin:8px 0 6px;width:100%"><i style="width:${pct*100}%"></i></div>
            ${wkTgt > 0 && pct < 1 ? `<div class="hint">每周建议存 ${U.money(wkTgt,g.currency)}${n&&n>0?`（还剩 ${n} 天）`:''}</div>` : ''}
            ${records.length ? `<div style="font-size:11.5px;color:var(--text-3);margin-top:6px">最近存入：${records.map(r=>U.money(r.amount,g.currency)+' '+U.fmtDate(r.date)).join('、')}</div>` : ''}
          </div>
          <div style="display:flex;gap:4px;flex-direction:column">
            <button class="btn btn-primary btn-sm" data-saveg="${g.id}" style="white-space:nowrap;font-size:12px;padding:6px 10px">＋ 存入</button>
            <button class="mini-btn" data-editgoal="${g.id}" style="font-size:13px">✎</button>
            <button class="mini-btn" data-delgoal="${g.id}">✕</button>
          </div>
        </div>`;}).join('')}</div>` : `<div class="card">${UI.empty('还没有存钱目标','🎯')}</div>`}`;

    el.querySelector('#addGoal').addEventListener('click', ()=>this.addGoal());
    el.addEventListener('click', e => {
      const sg = e.target.closest('[data-saveg]'); if(sg){ this.saveMoney(sg.dataset.saveg); return; }
      const eg = e.target.closest('[data-editgoal]'); if(eg){ this.addGoal(eg.dataset.editgoal); return; }
      const dg = e.target.closest('[data-delgoal]'); if(dg){ UI.confirm('删除该目标及所有存入记录？', ()=>{
        Store.d.savings = Store.d.savings.filter(g=>g.id !== dg.dataset.delgoal);
        if(Store.d.savingsRecords) Store.d.savingsRecords = Store.d.savingsRecords.filter(r=>r.goalId !== dg.dataset.delgoal);
        Store.save(); App.refresh();
      }, true); return; }
    });
  },

  rangeLabel(){ return {week:'近 7 天', month:'本月', last:'上月', all:'全部'}[this.range]; },
  daysLeft(){ const n = new Date(); return new Date(n.getFullYear(), n.getMonth()+1, 0).getDate() - n.getDate() + 1; },

  rowHTML(e){
    const c = this.cat(e.category);
    const main = e.currency === 'SGD' ? `S$${U.num(e.sgd).toFixed(2)}` : `¥${U.num(e.cny).toFixed(2)}`;
    const sub  = e.currency === 'SGD' ? `≈ ¥${U.num(e.cny).toFixed(2)}` : `≈ S$${U.num(e.sgd).toFixed(2)}`;
    const acct = e.accountId ? Store.get('accounts', e.accountId) : null;
    return `<div class="row">
      <div class="r-ico" style="background:${c.c}1a">${c.i}</div>
      ${e.photo ? `<img class="thumb" data-photo="${e.photo}" src="">` : ''}
      <div class="r-main">
        <div class="r-title">${U.esc(e.note || c.l)}</div>
        <div class="r-sub"><span>${U.fmtDate(e.date, true)}</span><span class="chip">${c.l}</span>${acct?`<span class="chip" style="background:${acct.color}18;color:${acct.color}">${U.esc(acct.name)}</span>`:''}${e.counted===false?`<span class="chip" style="background:#94a3b81a;color:#64748b">不计入</span>`:''}</div>
      </div>
      <div class="r-right">
        <div class="r-amt">${main}</div>
        <div style="font-size:11.5px;color:var(--text-3)">${sub}</div>
      </div>
      <button class="mini-btn" data-del="${e.id}">✕</button>
    </div>`;
  }
};
