/* =========================================================
   more.js — 经期记录 + 设置 + 数据备份
   ========================================================= */
const Cycle = {
  title: '经期',
  calMonth: null,
  SYMPTOMS: ['痛经','腰酸','头痛','情绪低落','长痘','胀气','乳房胀痛','疲劳','食欲大增','失眠'],
  FLOW: [{v:'light',l:'少'},{v:'normal',l:'正常'},{v:'heavy',l:'多'}],

  starts(){ return U.sortBy(Store.d.cycles, c=>c.start).map(c=>c.start); },
  /** 统计：平均周期、平均经期、上次、预测 */
  stats(){
    const cfg = Store.d.cycleCfg;
    const cs = U.sortBy(Store.d.cycles, c=>c.start);
    let avg = U.num(cfg.avgCycle, 28);
    if(cs.length >= 2){
      const diffs = [];
      for(let i=1;i<cs.length;i++){ const d = U.diffDays(cs[i-1].start, cs[i].start); if(d>=18 && d<=45) diffs.push(d); }
      if(diffs.length) avg = Math.round(diffs.reduce((a,b)=>a+b,0)/diffs.length);
    }
    let plen = U.num(cfg.avgPeriod, 5);
    const withEnd = cs.filter(c=>c.end);
    if(withEnd.length){ plen = Math.round(withEnd.reduce((s,c)=>s+U.diffDays(c.start,c.end)+1,0)/withEnd.length); }
    const last = cs.length ? cs[cs.length-1] : null;
    const next = last ? U.addDays(last.start, avg) : '';
    const ovu = next ? U.addDays(next, -14) : '';
    const dayOf = last ? U.diffDays(last.start, U.today()) + 1 : 0;
    let phase = '—';
    if(last){
      if(dayOf <= plen) phase = '月经期';
      else if(dayOf < avg-16) phase = '卵泡期';
      else if(dayOf <= avg-12) phase = '排卵期';
      else phase = '黄体期';
    }
    return { avg, plen, last, next, ovu, dayOf, phase, count: cs.length, toNext: next ? U.fromToday(next) : null };
  },

  /** 生成日历标记 */
  marks(y, m){
    const st = this.stats(), map = {};
    Store.d.cycles.forEach(c=>{
      const end = c.end || U.addDays(c.start, st.plen-1);
      let d = c.start; let guard = 0;
      while(d <= end && guard++ < 15){ map[d] = 'period'; d = U.addDays(d, 1); }
    });
    if(st.last){
      let s = st.next;
      for(let k=0;k<4 && s;k++){
        for(let i=0;i<st.plen;i++){ const d = U.addDays(s, i); if(!map[d]) map[d] = 'predict'; }
        const o = U.addDays(s, -14);
        for(let i=-2;i<=2;i++){ const d = U.addDays(o, i); if(!map[d]) map[d] = 'ovu'; }
        s = U.addDays(s, st.avg);
      }
    }
    return map;
  },

  add(id){
    const c = id ? Store.get('cycles', id) : null;
    const st = this.stats();
    UI.form({
      title: id ? '编辑记录' : '记录经期',
      fields:[
        { key:'start', label:'开始日期', type:'date', value:c?c.start:U.today(), required:true, half:true },
        { key:'end', label:'结束日期（可留空）', type:'date', value:c?c.end:'', half:true },
        { key:'flow', label:'量', type:'opts', value:c?c.flow:'normal', options:this.FLOW },
        { key:'symptoms', label:'不适症状', type:'opts', value:'', options:[] },
        { key:'note', label:'备注', type:'text', value:c?c.note:'', placeholder:'心情 / 用药 / 其它' }
      ],
      extraHTML:`<div class="field" style="margin-top:-52px"><div class="opts" id="symBox">
          ${this.SYMPTOMS.map(s=>`<button type="button" class="opt ${c&&(c.symptoms||[]).includes(s)?'on':''}" data-sym="${s}">${s}</button>`).join('')}
        </div></div>`,
      onSubmit(st2){
        const syms = Array.from(document.querySelectorAll('#symBox .opt.on')).map(b=>b.dataset.sym);
        const data = { start:st2.start, end:st2.end||'', flow:st2.flow, symptoms:syms, note:st2.note||'' };
        if(id) Store.update('cycles', id, data); else Store.add('cycles', data);
        UI.toast('已记录'); App.refresh();
      }
    });
    setTimeout(()=>{
      const f = document.querySelector('#f_symptoms'); if(f) f.parentElement.style.display='none';
      const box = document.getElementById('symBox');
      if(box) box.addEventListener('click', e=>{ const b = e.target.closest('[data-sym]'); if(b) b.classList.toggle('on'); });
    }, 20);
  },

  render(el){
    const st = this.stats();
    const now = this.calMonth ? U.pd(this.calMonth+'-01') : new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const marks = this.marks(y, m);
    const first = new Date(y, m, 1), startPad = (first.getDay()+6)%7;
    const dim = new Date(y, m+1, 0).getDate();
    const cells = [];
    for(let i=0;i<startPad;i++) cells.push(null);
    for(let d=1;d<=dim;d++) cells.push(U.ds(new Date(y,m,d)));

    const phaseTip = {
      '月经期':'注意保暖、多休息，适合轻度拉伸和散步，别做剧烈运动。',
      '卵泡期':'状态回升期，代谢好、力气足，最适合安排高强度训练和重要工作。',
      '排卵期':'精力和情绪都在高点，注意个人卫生，运动继续保持。',
      '黄体期':'容易水肿、嘴馋、情绪波动，控制盐糖，体重涨 1-2 斤是水分，别焦虑。'
    }[st.phase] || '记录 2 次以上就能预测下次日期。';

    el.innerHTML = `
      <div class="grid g2" style="margin-bottom:14px">
        <div class="card" style="background:linear-gradient(135deg,#fdeef6,#f6eeff);border:none">
          <div class="card-head"><h3>当前状态</h3><button class="btn-add" id="addC" style="background:var(--pink-soft);color:#c9257e">＋ 记录</button></div>
          ${st.last ? `
            <div style="display:flex;align-items:baseline;gap:10px">
              <b style="font-size:34px;letter-spacing:-1.4px">第 ${st.dayOf} 天</b>
              <span class="chip pink">${st.phase}</span>
            </div>
            <div style="font-size:13px;color:var(--text-2);margin-top:10px">
              上次开始：<b>${U.fmtDate(st.last.start, true)}</b><br>
              预计下次：<b style="color:#c9257e">${U.fmtDate(st.next, true)}</b>
              ${st.toNext!==null ? `（${st.toNext>0?'还有 '+st.toNext+' 天':st.toNext===0?'就是今天':'已推迟 '+Math.abs(st.toNext)+' 天'}）` : ''}<br>
              预计排卵：<b>${U.fmtDate(st.ovu)}</b>
            </div>
            <div class="progress pink" style="margin-top:12px"><i style="width:${U.clamp(st.dayOf/st.avg,0,1)*100}%"></i></div>
            <div style="font-size:11.5px;color:var(--text-3);margin-top:5px">周期 ${st.avg} 天 · 经期约 ${st.plen} 天 · 已记录 ${st.count} 次</div>
          ` : `<div class="empty" style="padding:18px">还没有记录，点右上角「＋ 记录」开始</div>`}
        </div>
        <div class="card">
          <div class="card-head"><h3>这个阶段的提示</h3></div>
          <div style="font-size:13.5px;color:var(--text-2);line-height:1.85">${phaseTip}</div>
          <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line-soft)">
            <div class="kv"><span>提前提醒天数</span><b>${Store.d.cycleCfg.remindDays} 天</b></div>
            <div class="kv"><span>平均周期</span><b>${st.avg} 天</b></div>
            <div class="kv"><span>平均经期长度</span><b>${st.plen} 天</b></div>
            <button class="btn btn-ghost btn-sm btn-block" id="cfgC" style="margin-top:10px">调整设置</button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-head">
          <h3>${y} 年 ${m+1} 月</h3>
          <div style="display:flex;gap:6px">
            <button class="mini-btn" id="prevM">‹</button><button class="mini-btn" id="nextM">›</button>
          </div>
        </div>
        <div class="cal">
          ${['一','二','三','四','五','六','日'].map(d=>`<div class="cal-h">${d}</div>`).join('')}
          ${cells.map(d=>{
            if(!d) return `<div></div>`;
            const cls = marks[d] || '';
            return `<div class="cal-d ${cls} ${d===U.today()?'today':''}" data-day="${d}">${U.pd(d).getDate()}</div>`;
          }).join('')}
        </div>
        <div class="legend">
          <span><i style="background:var(--pink)"></i>经期</span>
          <span><i style="background:var(--pink-soft);border:1px dashed #f4a7cd"></i>预测经期</span>
          <span><i style="background:var(--violet-soft)"></i>易孕/排卵</span>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>历史记录</h3><span class="sub">${Store.d.cycles.length} 次</span></div>
        ${Store.d.cycles.length ? `<div class="list">${U.sortBy(Store.d.cycles, c=>c.start).reverse().map((c,i,arr)=>{
          const prev = arr[i+1]; const gap = prev ? U.diffDays(prev.start, c.start) : null;
          const len = c.end ? U.diffDays(c.start, c.end)+1 : null;
          return `<div class="row">
            <div class="r-ico" style="background:var(--pink-soft)">🌸</div>
            <div class="r-main">
              <div class="r-title">${U.fmtDate(c.start, true)}${c.end?' – '+U.fmtDate(c.end):''}</div>
              <div class="r-sub">
                ${len?`<span>持续 ${len} 天</span>`:''}${gap?`<span>间隔 ${gap} 天</span>`:''}
                <span class="chip pink">${(Cycle.FLOW.find(f=>f.v===c.flow)||{l:'正常'}).l}</span>
                ${(c.symptoms||[]).slice(0,3).map(s=>`<span class="chip">${U.esc(s)}</span>`).join('')}
              </div>
              ${c.note?`<div style="font-size:12.5px;color:var(--text-2);margin-top:5px">${U.esc(c.note)}</div>`:''}
            </div>
            <button class="mini-btn" data-editc="${c.id}" style="font-size:13px">✎</button>
            <button class="mini-btn" data-delc="${c.id}">✕</button>
          </div>`;}).join('')}</div>` : UI.empty('还没有记录','🌸')}
      </div>`;

    el.querySelector('#addC').addEventListener('click', ()=>this.add());
    el.querySelector('#cfgC').addEventListener('click', ()=>{
      UI.form({ title:'经期设置', fields:[
        { key:'avgCycle', label:'平均周期（天）', type:'number', value:Store.d.cycleCfg.avgCycle, hint:'有 2 次以上记录后会自动按实际计算', half:true },
        { key:'avgPeriod', label:'平均经期（天）', type:'number', value:Store.d.cycleCfg.avgPeriod, half:true },
        { key:'remindDays', label:'提前几天提醒', type:'number', value:Store.d.cycleCfg.remindDays }
      ], onSubmit(s){ Store.d.cycleCfg = { avgCycle:U.num(s.avgCycle,28), avgPeriod:U.num(s.avgPeriod,5), remindDays:U.num(s.remindDays,3) }; Store.save(); UI.toast('已保存'); App.refresh(); } });
    });
    el.querySelector('#prevM').addEventListener('click', ()=>{ const d = new Date(y, m-1, 1); this.calMonth = d.getFullYear()+'-'+U.pad(d.getMonth()+1); this.render(el); });
    el.querySelector('#nextM').addEventListener('click', ()=>{ const d = new Date(y, m+1, 1); this.calMonth = d.getFullYear()+'-'+U.pad(d.getMonth()+1); this.render(el); });
    el.addEventListener('click', e=>{
      const ed = e.target.closest('[data-editc]'); if(ed){ this.add(ed.dataset.editc); return; }
      const dl = e.target.closest('[data-delc]'); if(dl){ UI.confirm('删除该记录？', ()=>{ Store.remove('cycles', dl.dataset.delc); App.refresh(); }, true); return; }
      const day = e.target.closest('[data-day]');
      if(day && !marks[day.dataset.day]){
        UI.confirm('把 '+U.fmtDate(day.dataset.day)+' 记为经期开始？', ()=>{ Store.add('cycles', { start:day.dataset.day, end:'', flow:'normal', symptoms:[], note:'' }); UI.toast('已记录'); App.refresh(); });
      }
    });
  }
};

/* ===================== 设置 ===================== */
const Settings = {
  title: '设置',
  render(el){
    const p = Store.d.profile, s = Store.d.settings;
    const size = (JSON.stringify(Store.d).length/1024).toFixed(1);
    el.innerHTML = `
      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>个人资料</h3><button class="btn-add" id="ep">编辑</button></div>
        <div class="kv"><span>称呼</span><b>${U.esc(p.name||'未设置')}</b></div>
        <div class="kv"><span>身高 / 体重</span><b>${p.height} cm / ${HealthPage.curWeight()} kg</b></div>
        <div class="kv"><span>目标体重</span><b>${p.targetWeight} kg</b></div>
        <div class="kv"><span>年龄 / 性别</span><b>${p.age} 岁 / ${p.gender==='male'?'男':'女'}</b></div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>偏好设置</h3></div>
        <div class="list">
          <div class="row" data-act="rate"><div class="r-ico">💱</div>
            <div class="r-main"><div class="r-title">汇率与预算</div><div class="r-sub">1 SGD = ${Finance.rate()} CNY · 月预算 ¥${s.monthlyBudgetCNY}</div></div><span style="color:var(--text-3)">›</span></div>
          <div class="row" data-act="cup"><div class="r-ico">🥤</div>
            <div class="r-main"><div class="r-title">一杯水的量</div><div class="r-sub">${s.waterCup} ml</div></div><span style="color:var(--text-3)">›</span></div>
          <div class="row" data-act="plan"><div class="r-ico">🎯</div>
            <div class="r-main"><div class="r-title">减肥计划</div><div class="r-sub">每日 ${HealthPage.plan().target} kcal · ${Health.PACE[p.pace].label}</div></div><span style="color:var(--text-3)">›</span></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>🤖 AI 饭菜热量估算</h3><button class="btn-add" id="gem">设置</button></div>
        <p style="font-size:12.5px;color:var(--text-2);line-height:1.7;margin:0 0 8px">
          拍一盘菜自动估算热量，需要 Google Gemini 的免费 API Key。Key 只存在你手机本地、仅发往 Google，不会经过本应用服务器。
        </p>
        <div class="kv"><span>状态</span><b>${s.geminiKey ? '已配置 ✅' : '未配置'}</b></div>
        <div class="kv"><span>模型</span><b>${U.esc(s.geminiModel || 'gemini-2.0-flash')}</b></div>
      </div>

      <div class="card" style="margin-bottom:14px;border:1px solid var(--brand)">
        <div class="card-head"><h3>☁️ 云同步（手机电脑自动联通）</h3><span class="sub" id="syncStat">${s.gistId?'已连接':'未连接'}</span></div>
        <p style="font-size:12.5px;color:var(--text-2);line-height:1.7;margin:0 0 10px">
          用你自己的 GitHub 私有 Gist 当「云盘」，电脑和手机读写同一份数据，自动保持一致。
          数据只存在你的 GitHub 账号里，不经过任何第三方服务器。
        </p>
        <div class="field" style="margin-bottom:8px">
          <label>GitHub Token（仅 gist 权限）</label>
          <input class="inp" id="gistToken" type="password" value="${s.gistToken||''}" placeholder="github_pat_..." autocomplete="off">
        </div>
        <details style="margin-bottom:10px">
          <summary style="font-size:12.5px;color:var(--brand);cursor:pointer">怎么获取 Token？（只勾 gist 一项）</summary>
          <div style="font-size:12.5px;color:var(--text-2);line-height:1.7;margin-top:6px">
            ① 打开 <b>github.com/settings/tokens</b> → 点「Generate new token (classic)」<br>
            ② 只勾选 <b>gist</b> 这一项（其它都不要勾，权限越小越安全）<br>
            ③ 生成后复制 Token 粘贴到上面<br>
            ⚠️ Token 只存在你本机浏览器，可随时到 GitHub 撤销。
          </div>
        </details>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          <button class="btn btn-primary btn-sm" id="syncNow">🔄 立即同步</button>
          <button class="btn btn-ghost btn-sm" id="syncUp">⬆️ 仅上传</button>
          <button class="btn btn-ghost btn-sm" id="syncDown">⬇️ 仅下载</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px">
          <button class="btn btn-ghost btn-sm" id="connTest">🔌 连接测试</button>
          <button class="btn btn-ghost btn-sm" id="forceReload">♻️ 强制刷新到最新版</button>
        </div>
        <div id="syncDiag" style="font-size:12px;color:var(--text-2);min-height:16px;margin-top:6px">正在读取当前版本…</div>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-2)">
          <input type="checkbox" id="autoSync" ${s.autoSync?'checked':''}> 自动同步（每次改动自动上传，进 App 时自动拉取）
        </label>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>数据备份（备用）</h3><span class="sub">${size} KB</span></div>
        <p style="font-size:13px;color:var(--text-2);line-height:1.75;margin:0 0 14px">
          数据保存在你自己的设备里，不会上传。换设备或想让手机电脑保持一致时，
          在一台设备上「导出备份」，把文件传给另一台设备后「导入备份」即可。
          （推荐优先用上面的云同步）
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" id="expData">⬇️ 导出备份（含照片）</button>
          <button class="btn btn-ghost btn-sm" id="expLite">⬇️ 导出（不含照片，体积小）</button>
          <label class="btn btn-ghost btn-sm">⬆️ 导入备份<input type="file" accept="application/json,.json" style="display:none" id="impData"></label>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>装到手机上（iPhone）</h3></div>
        <div style="font-size:13.5px;color:var(--text-2);line-height:1.9">
          1. 用 Safari 打开这个网址<br>
          2. 点底部「分享」按钮 <b>􀈂</b><br>
          3. 选「添加到主屏幕」<br>
          4. 之后从桌面图标打开，就是全屏 App 的样子，没有浏览器地址栏
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>危险区域</h3></div>
        <button class="btn btn-danger btn-block btn-sm" id="reset">清空所有数据</button>
      </div>`;

    el.querySelector('#ep').addEventListener('click', ()=>{
      UI.form({ title:'个人资料', fields:[
        { key:'name', label:'称呼', type:'text', value:p.name },
        { key:'height', label:'身高 cm', type:'number', value:p.height, half:true },
        { key:'age', label:'年龄', type:'number', value:p.age, half:true },
        { key:'gender', label:'性别', type:'opts', value:p.gender, options:[{v:'female',l:'女'},{v:'male',l:'男'}] }
      ], onSubmit(st){ Object.assign(Store.d.profile, { name:st.name, height:U.num(st.height), age:U.num(st.age), gender:st.gender }); Store.save(); UI.toast('已保存'); App.refresh(); } });
    });
    el.addEventListener('click', e=>{
      const r = e.target.closest('[data-act]'); if(!r) return;
      if(r.dataset.act==='rate') Finance.editRate();
      if(r.dataset.act==='plan') HealthPage.editPlan();
      if(r.dataset.act==='cup') UI.form({ title:'一杯水的量', fields:[{key:'v',label:'毫升',type:'number',value:s.waterCup}],
        onSubmit(st){ Store.d.settings.waterCup = U.num(st.v,250); Store.save(); App.refresh(); } });
    });
    el.querySelector('#gem').addEventListener('click', ()=>{
      UI.form({ title:'Gemini API Key', wide:true, fields:[
        { key:'key', label:'API Key', type:'text', value:s.geminiKey, placeholder:'AIza...', hint:'从 aistudio.google.com 免费获取（免费额度足够日常使用）' },
        { key:'model', label:'模型', type:'text', value:s.geminiModel||'gemini-2.0-flash', half:true, hint:'如 gemini-2.0-flash / gemini-1.5-flash' },
        { key:'help', label:'怎么拿 Key', type:'static', value:'<div style="font-size:12.5px;color:var(--text-2);line-height:1.7">① 打开 <b>aistudio.google.com</b> → 登录 Google 账号<br>② 左上角「Get API key」→「Create API key」<br>③ 复制 Key 粘贴到上面即可。Key 只存在你手机，不会上传到本应用。</div>' }
      ], onSubmit(st){ Store.d.settings.geminiKey = (st.key||'').trim(); Store.d.settings.geminiModel = (st.model||'').trim()||'gemini-2.0-flash'; Store.save(); UI.toast('已保存'); App.refresh(); } });
    });
    el.querySelector('#expData').addEventListener('click', async ()=>{
      UI.toast('打包中…');
      const photos = await Photos.all();
      U.download('追风工作台备份_'+U.today()+'.json', JSON.stringify({ app:'phub', ver:1, at:new Date().toISOString(), state:Store.d, photos }));
      UI.toast('已导出');
    });
    el.querySelector('#expLite').addEventListener('click', ()=>{
      U.download('追风工作台备份_精简_'+U.today()+'.json', JSON.stringify({ app:'phub', ver:1, at:new Date().toISOString(), state:Store.d }));
      UI.toast('已导出');
    });
    el.querySelector('#impData').addEventListener('change', e=>{
      const f = e.target.files[0]; if(!f) return;
      const fr = new FileReader();
      fr.onload = async () => {
        try{
          const j = JSON.parse(fr.result);
          if(!j.state) throw 0;
          UI.confirm('导入会覆盖当前设备上的全部数据，确定继续？', async ()=>{
            Store.d = j.state; Store.save();
            if(j.photos){ for(const k in j.photos) await Photos.put(k, j.photos[k]); }
            UI.toast('导入成功'); setTimeout(()=>location.reload(), 700);
          }, true);
        }catch(err){ UI.toast('文件格式不对'); }
      };
      fr.readAsText(f);
    });
    /* ---- 云同步 ---- */
    const syncStat = el.querySelector('#syncStat');
    const refreshStat = ()=>{
      const ss = Store.d.settings;
      const t = ss.lastSync ? ss.lastSync.replace('T',' ').slice(0,16) : '从未';
      syncStat.textContent = ss.gistId ? ('已连接 · '+t) : '未连接';
    };
    el.querySelector('#gistToken').addEventListener('change', e=>{ Store.d.settings.gistToken = Sync._clean(e.target.value); Store.save(); UI.toast('Token 已保存（已自动清洗隐藏字符）'); });
    el.querySelector('#autoSync').addEventListener('change', e=>{ Store.d.settings.autoSync = e.target.checked; Store.save(); UI.toast(e.target.checked?'已开启自动同步':'已关闭自动同步'); });
    el.querySelector('#syncNow').addEventListener('click', async ()=>{
      Store.d.settings.gistToken = Sync._clean(el.querySelector('#gistToken').value || ''); Store.save();
      const btn = el.querySelector('#syncNow'); btn.disabled = true; const old = btn.textContent; btn.textContent = '同步中…';
      try{
        const r = await Sync.sync();
        Store.d.settings.lastSync = new Date().toISOString(); Store.save();
        UI.toast(r.action==='merged' ? '同步成功（已合并双方数据）' : '已上传到云端');
        App.refresh();
      }catch(err){ UI.toast('同步失败：' + (err.message||err)); }
      finally { btn.disabled = false; btn.textContent = old; refreshStat(); }
    });
    el.querySelector('#syncUp').addEventListener('click', async ()=>{
      Store.d.settings.gistToken = Sync._clean(el.querySelector('#gistToken').value || ''); Store.save();
      try{ await Sync.upload(); Store.d.settings.lastSync = new Date().toISOString(); Store.save(); UI.toast('已上传到云端'); App.refresh(); }
      catch(err){ UI.toast('上传失败：' + (err.message||err)); }
    });
    el.querySelector('#syncDown').addEventListener('click', async ()=>{
      Store.d.settings.gistToken = Sync._clean(el.querySelector('#gistToken').value || ''); Store.save();
      try{
        const r = await Sync.download(); if(!r) throw new Error('云端没有数据');
        const lt = (Store.d.settings && Store.d.settings.gistToken) || '';
        const lid = (Store.d.settings && Store.d.settings.gistId) || '';
        UI.confirm('下载会覆盖本机数据，确定继续？', ()=>{
          Store.d = r;
          Store.d.settings = Store.d.settings || {};
          Store.d.settings.gistToken = lt || Store.d.settings.gistToken;
          Store.d.settings.gistId = lid || Store.d.settings.gistId;
          Store.d.settings.lastSync = new Date().toISOString();
          Store.save();
          UI.toast('已下载'); setTimeout(()=>location.reload(), 600);
        }, true);
      }catch(err){ UI.toast('下载失败：' + (err.message||err)); }
    });

    /* 🔌 连接测试：用本机 token 直连 GitHub，显示真实状态码+权限，定位是否 token/网络问题 */
    el.querySelector('#connTest').addEventListener('click', async ()=>{
      const tok = Sync._clean(el.querySelector('#gistToken').value || '');
      const box = el.querySelector('#syncDiag');
      if(!tok){ box.textContent='请先填写 Token 再点连接测试'; box.style.color='#e53'; return; }
      box.textContent='测试中…'; box.style.color='var(--text-2)';
      try{
        const r = await fetch('https://api.github.com/user', { headers:{ 'Authorization':'Bearer '+tok, 'Accept':'application/vnd.github+json' } });
        const scope = r.headers.get('X-OAuth-Scopes') || '(无)';
        const ok = r.ok;
        box.innerHTML = 'GitHub 返回 <b>'+r.status+'</b> ｜ 权限: '+scope+(ok?' ｜ ✅ Token 有效，可同步':' ｜ ❌ Token 无效（撤销/过期/非 gist 权限）');
        box.style.color = ok ? '#2a9' : '#e53';
      }catch(e){ box.textContent='请求失败：'+e.message+'（设备无法访问 api.github.com，或被浏览器拦截）'; box.style.color='#e53'; }
    });
    /* ♻️ 强制刷新：清掉所有 Service Worker 缓存，重新加载到最新版代码 */
    el.querySelector('#forceReload').addEventListener('click', async ()=>{
      try{ const ks = await caches.keys(); await Promise.all(ks.map(k=>caches.delete(k))); }catch(e){}
      location.reload(true);
    });

    /* 显示本机实际在跑的版本（从 SW 缓存名读取，避免和线上版本对不上） */
    (async()=>{ try{ const ks = await caches.keys(); const v = (ks.find(k=>k.indexOf('phub-v')===0)) || '未知'; const box = el.querySelector('#syncDiag'); if(box && /版本|测试|失败|有效|无效/.test(box.textContent)===false) box.textContent = '当前运行版本：'+v; }catch(e){} })();

    refreshStat();
    el.querySelector('#reset').addEventListener('click', ()=>{
      UI.confirm('将删除所有记录且无法恢复，建议先导出备份。确定清空？', ()=>{
        localStorage.removeItem(Store.KEY);
        indexedDB.deleteDatabase('phub_photos');
        location.reload();
      }, true);
    });
  }
};
