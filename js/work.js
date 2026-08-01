/* =========================================================
   work.js — 工作待办（项目制：每个项目有独立待办）
   ========================================================= */
const Work = {
  title: '工作',
  tab: 'projects',
  PROJ_COLORS: ['#6366f1','#ec4899','#14b8a6','#f59e0b','#8b5cf6','#3b82f6','#ef4444','#10b981'],
  STATUS: { todo:{l:'待开始',c:'blue',i:'○'}, doing:{l:'进行中',c:'amber',i:'◐'}, done:{l:'已完成',c:'green',i:'●'} },
  PRIO: { high:{l:'紧急',c:'red'}, normal:{l:'普通',c:'blue'}, low:{l:'不急',c:''} },

  /* ---- 项目 ---- */
  projects(){ return Store.d.projects; },
  proj(id){ return Store.get('projects', id); },
  projTasks(projId){ return U.sortBy(Store.d.works.filter(w=>w.projId===projId), w=>(w.priority==='high'?'0':w.priority==='normal'?'1':'2')+(w.due||'9999-99-99')); },
  allPending(){ return Store.d.works.filter(w=>w.status!=='done'); },
  pending(){ return this.allPending(); },
  upcoming(n){ return U.sortBy(this.pending().filter(w=>w.due && U.fromToday(w.due) <= n), w=>w.due); },

  editProject(id){
    const p = id ? this.proj(id) : null;
    UI.form({
      title: id ? '编辑项目' : '新建项目',
      fields:[
        { key:'name', label:'项目名称', type:'text', value:p?p.name:'', required:true, placeholder:'例：老板官网改版 / 客户A品牌设计' },
        { key:'client', label:'客户 / 老板', type:'text', value:p?p.client:'', placeholder:'例：王总 / XX公司' },
        { key:'color', label:'颜色标记', type:'opts', value:p?p.color:this.PROJ_COLORS[Store.d.projects.length % 8],
          options:this.PROJ_COLORS.map(x=>({v:x,l:'●'})) },
        { key:'status', label:'状态', type:'opts', value:p?p.status:'active',
          options:[{v:'active',l:'进行中'},{v:'paused',l:'暂停'},{v:'done',l:'已完成'}] },
        { key:'deadline', label:'截止日期', type:'date', value:p?p.deadline:'', half:true },
        { key:'pay', label:'报酬（可选）', type:'number', value:p?p.pay:'', step:'0.01', half:true,
          hint:'填了的话会显示已赚/目标进度' },
        { key:'note', label:'需求备注', type:'textarea', value:p?p.note:'', placeholder:'风格、尺寸、交付格式、对接人…' }
      ],
      onSubmit(st){
        const data = { name:st.name, client:st.client||'', color:st.color, status:st.status||'active',
          deadline:st.deadline||'', pay:U.num(st.pay,0), note:st.note||'' };
        if(id) Store.update('projects', id, data); else Store.add('projects', data);
        UI.toast(id?'项目已更新':'项目已创建'); App.refresh();
      }
    });
    setTimeout(()=>{ document.querySelectorAll('#f_color .opt').forEach(b=>{ b.style.color=b.dataset.v; b.style.fontSize='19px'; b.style.padding='4px 9px'; }); }, 20);
  },

  openProject(id){
    const p = this.proj(id); if(!p) return;
    const ts = this.projTasks(id);
    const pend = ts.filter(t=>t.status!=='done');
    const done = ts.filter(t=>t.status==='done');
    const totalPay = U.num(p.pay, 0);
    // 已完成任务的工时
    const doneHours = done.reduce((s,t)=>s+U.num(t.hours,0), 0);
    // 进度估算（按任务数）
    const pct = ts.length ? Math.round(done.length/ts.length*100) : 0;

    UI.sheet({
      title: p.name,
      sub: `${p.client?U.esc(p.client)+' · ':''}${p.deadline?U.fmtDate(p.deadline,true):''}`,
      bodyHTML:`
        <div class="card" style="margin-bottom:14px;border-left:4px solid ${p.color}">
          <div class="grid g3" style="gap:10px;text-align:center">
            <div class="stat" style="align-items:center"><b>${pend.length}</b><span>待办</span></div>
            <div class="stat" style="align-items:center"><b>${done.length}</b><span>已完成</span></div>
            ${totalPay>0?`<div class="stat" style="align-items:center"><b style="color:var(--green)">${Math.round(pct)}%</b><span>进度</span></div>`:`<div class="stat" style="align-items:center"><b>${ts.length}</b><span>全部</span></div>`}
          </div>
          ${totalPay>0?`<div class="progress green" style="margin-top:10px"><i style="width:${pct}%"></i></div>
            <div class="kv" style="font-size:12.5px;margin-top:6px"><span>目标报酬</span><b>${U.money(totalPay,p.payCurrency||'SGD')}</b></div>`:''}
          ${p.note?`<div class="hint" style="margin-top:10px">${U.esc(p.note)}</div>`:''}
          <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" data-newtask="todo" style="flex:1">＋ 待办</button>
            <button class="btn btn-ghost btn-sm" data-newtask="doing" style="flex:1">＋ 进行中</button>
            <button class="btn btn-ghost btn-sm" data-editp="1">编辑项目</button>
          </div>
        </div>

        <div class="sec-title"><h2 style="font-size:15px">「${U.esc(p.name)}」的待办</h2></div>
        ${ts.length ? `<div class="list">${ts.map(t=>{
          const st = this.STATUS[t.status] || this.STATUS.todo;
          return `<div class="task-item ${t.status==='done'?'done':''}">
            <button class="tick ${t.status==='done'?'on':''}" data-cyc="${t.id}" title="点击切换状态">${t.status==='done'?'✓':''}</button>
            <div class="r-main">
              <div class="t-title">${t.priority==='high'?'🔥 ':''}${U.esc(t.title)}</div>
              <div class="t-meta">
                <span class="chip ${st.c}">${st.l}</span>
                ${t.due?`<span style="color:${t.status!=='done'&&U.fromToday(t.due)<=2?'var(--red)':t.status!=='done'&&U.fromToday(t.due)<=7?'var(--amber)':'var(--text-3)'};font-weight:${U.fromToday(t.due)<=2?700:500}">${U.relDate(t.due)}</span>`:''}
                ${t.hours?`<span>约 ${t.hours}h</span>`:''}
              </div>
              ${t.note?`<div style="font-size:12.5px;color:var(--text-2);margin-top:6px;white-space:pre-wrap">${U.esc(t.note)}</div>`:''}
              ${t.photo?`<img class="thumb" style="margin-top:8px;width:66px;height:66px" data-photo="${t.photo}" src="">`:''}
            </div>
            <button class="mini-btn" data-edittask="${t.id}" style="font-size:13px">✎</button>
            <button class="mini-btn" data-deltask="${t.id}">✕</button>
          </div>`;}).join('')}</div>`
        : `<div class="list"><div class="empty" style="padding:26px">还没有待办，点上面按钮添加 🗂️</div></div>`}

        <button class="btn btn-danger btn-block btn-sm" data-delp="1" style="margin-top:22px">删除这个项目</button>`,
      onMount(r){
        r.querySelectorAll('[data-newtask]').forEach(b=>b.addEventListener('click', ()=>{ UI.closeSheet(); this.addTask(id, b.dataset.newtask); }));
        r.querySelector('[data-editp]').addEventListener('click', ()=>{ UI.closeSheet(); this.editProject(id); });
        r.querySelector('[data-delp]').addEventListener('click', ()=>{
          UI.confirm('删除项目「'+p.name+'」？所有相关待办也会被删除。', ()=>{
            Store.d.works = Store.d.works.filter(w=>w.projId!==id);
            Store.remove('projects', id); UI.closeSheet(); App.refresh();
          }, true);
        });
        r.addEventListener('click', e=>{
          const tk = e.target.closest('[data-tick]'); if(tk){ this.cycle(tk.dataset.tick); UI.closeSheet(); setTimeout(()=>this.openProject(id), 60); return; }
          const et = e.target.closest('[data-edittask]'); if(et){ UI.closeSheet(); this.editTask(et.dataset.edittask); return; }
          const dt = e.target.closest('[data-deltask]'); if(dt){ UI.confirm('删除该待办？', ()=>{ Store.remove('works', dt.dataset.deltask); UI.closeSheet(); App.refresh(); setTimeout(()=>this.openProject(id),60); }, true); return; }
        });
      }
    });
  },

  /* ---- 待办 CRUD ---- */
  addTask(projId, presetStatus){
    const p = projId ? this.proj(projId) : null;
    UI.form({
      title: presetStatus === 'doing' ? '新增进行中任务' : '新增待办',
      fields:[
        { key:'title', label:'任务内容', type:'text', value:'', required:true, placeholder:'例：首页视觉稿 v2' },
        { key:'status', label:'状态', type:'opts', value:presetStatus||'todo',
          options:Object.keys(this.STATUS).map(k=>({v:k,l:this.STATUS[k].l})) },
        { key:'projId', label:'所属项目', type:'select', value:projId||(Store.d.projects[0]&&Store.d.projects[0].id)||'',
          options:[{v:'',l:'不关联项目'}].concat(Store.d.projects.map(pr=>({v:pr.id, l:pr.name}))) },
        { key:'priority', label:'优先级', type:'opts', value:'normal',
          options:[{v:'high',l:'🔥 紧急'},{v:'normal',l:'普通'},{v:'low',l:'不急'}] },
        { key:'due', label:'截止日期', type:'date', value:U.today(), half:true },
        { key:'hours', label:'预计工时(h)', type:'number', value:'', half:true },
        { key:'link', label:'相关链接', type:'text', value:'', placeholder:'Figma / 网盘 / 需求文档' },
        { key:'note', label:'需求备注', type:'textarea', value:'', placeholder:'尺寸、风格、交付格式、对接人…' },
        { key:'photo', label:'参考图 / 截图', type:'photo', value:'' }
      ],
      onSubmit(st){
        Store.add('works', {
          projId: st.projId||'', title:st.title, status:st.status, priority:st.priority,
          due:st.due||'', hours:U.num(st.hours,0), link:st.link||'', note:st.note||'',
          photo:st.photo||'', created:U.today()
        });
        UI.toast('已添加'); App.refresh();
      }
    });
  },
  editTask(id){
    const w = Store.get('works', id);
    UI.form({
      title: '编辑待办',
      fields:[
        { key:'title', label:'任务内容', type:'text', value:w.title, required:true },
        { key:'status', label:'状态', type:'opts', value:w.status,
          options:Object.keys(this.STATUS).map(k=>({v:k,l:this.STATUS[k].l})) },
        { key:'priority', label:'优先级', type:'opts', value:w.priority,
          options:[{v:'high',l:'🔥 紧急'},{v:'normal',l:'普通'},{v:'low',l:'不急'}] },
        { key:'due', label:'截止日期', type:'date', value:w.due, half:true },
        { key:'hours', label:'预计工时(h)', type:'number', value:w.hours, half:true },
        { key:'link', label:'链接', type:'text', value:w.link },
        { key:'note', label:'备注', type:'textarea', value:w.note },
        { key:'photo', label:'��考图', type:'photo', value:w.photo }
      ],
      onSubmit(st){
        Store.update('works', id, {
          title:st.title, status:st.status, priority:st.priority,
          due:st.due||'', hours:U.num(st.hours,0), link:st.link||'',
          note:st.note||'', photo:st.photo||''
        });
        UI.toast('已更新'); App.refresh();
      }
    });
  },
  cycle(id){
    const w = Store.get('works', id); if(!w) return;
    const next = w.status==='todo' ? 'doing' : w.status==='doing' ? 'done' : 'todo';
    Store.update('works', id, { status:next, doneAt: next==='done'?U.today():'' });
    if(next==='done') UI.toast('交付完成 🎉');
    else if(next==='doing') UI.toast('开始干活 💪');
    App.refresh();
  },

  /* =================== 页面 =================== */
  render(el){
    el.innerHTML = `
      <div class="seg" id="wTab" style="margin-bottom:16px">
        ${[['projects','项目'],['tasks','全部待办']].map(([k,l])=>`<button data-t="${k}" class="${this.tab===k?'on':''}">${l}</button>`).join('')}
      </div>
      <div id="wBody"></div>`;
    el.querySelector('#wTab').addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if(!b) return;
      this.tab = b.dataset.t; this.render(el);
    });
    const body = el.querySelector('#wBody');
    ({ projects:()=>this.renderProjects(body), tasks:()=>this.renderAllTasks(body) })[this.tab]();
    Photos.hydrate(el);
  },

  renderProjects(el){
    const projs = Store.d.projects;
    const overdue = this.pending().filter(w=>w.due && U.fromToday(w.due)<0).length;
    const weekN = this.pending().filter(w=>w.due && U.fromToday(w.due)>=0 && U.fromToday(w.due)<=7).length;

    el.innerHTML = `
      <div class="grid g4" style="margin-bottom:16px">
        ${[['进行中', projs.filter(p=>p.status==='active').length, 'brand'],
           ['暂停', projs.filter(p=>p.status==='paused').length, 'text-3'],
           ['一周内到期', weekN, weekN&&overdue?'red':'violet'],
           ['已完成', projs.filter(p=>p.status==='done').length, 'green']]
          .map(([l,n,c])=>`<div class="card pad-s"><b style="font-size:24px;color:var(--${c})">${n}</b><div style="font-size:12px;color:var(--text-3)">${l}</div></div>`).join('')}
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" id="addP">＋ 新建项目</button>
        <button class="btn btn-ghost btn-sm" id="addT">＋ 单独添加待办</button>
      </div>

      ${projs.length ? (() => {
        const groups = {};
        projs.forEach(p => groups[p.status] = (groups[p.status] || []).concat([p]));
        let html = '';
        for(const [status, list] of Object.entries(groups)){
          html += `<div class="sec-title"><h2 style="font-size:15.5px">${
            status==='active'?'🔨 进行中的项目':status==='paused'?'⏸️ 暂停的项目':'✅ 已完成'
          } <span style="font-size:13px;color:var(--text-3);font-weight:500">${list.length}</span></h2></div>`;
          html += `<div class="grid g2" style="margin-bottom:16px">${list.map(p => {
            const pts = this.projTasks(p.id);
            const pend = pts.filter(t=>t.status!=='done');
            const doneN = pts.filter(t=>t.status==='done').length;
            const urgent = pend.filter(t=>t.due && U.fromToday(t.due)<=3).length;
            const over = pend.filter(t=>t.due && U.fromToday(t.due)<0).length;
            const pct = pts.length ? Math.round(doneN/pts.length*100) : 0;
            return `<div class="course-card" data-proj="${p.id}" style="border-left-color:${p.color};cursor:pointer">
              <div class="cc-top">
                <div><div class="cc-name">${U.esc(p.name)}</div>
                  <div class="cc-meta">${p.client?U.esc(p.client):''}${p.deadline?' · '+U.fmtDate(p.deadline):''}</div></div>
              </div>
              <div class="cc-stats">
                <span class="chip ${pend.length?'amber':'green'}">${pend.length?pend.length+' 项待办':'全部完成'}</span>
                ${urgent?`<span class="chip red">${urgent}项紧急</span>`:''}
                ${over?`<span class="chip red">${over}项逾期</span>`:''}
                ${pts.length?`<span style="font-size:11.5px;color:var(--text-3)">进度 ${pct}%</span>`:''}
              </div>
            </div>`;}).join('')}</div>`;
        }
        return html;
      })() : `<div class="card">${UI.empty('还没有项目，点上面新建','💼')}</div>`}`;

    el.querySelector('#addP').addEventListener('click', ()=>this.editProject());
    el.querySelector('#addT').addEventListener('click', ()=>this.addTask());
    el.addEventListener('click', e => {
      const pr = e.target.closest('[data-proj]');
      if(pr){ this.openProject(pr.dataset.proj); return; }
    });
  },

  renderAllTasks(el){
    const all = U.sortBy(Store.d.works, w => (w.priority==='high'?'0':w.priority==='normal'?'1':'2') + (w.due||'9999-99-99'));
    const pend = all.filter(w=>w.status!=='done');
    const overdue = pend.filter(w=>w.due && U.fromToday(w.due)<0).length;
    const week = pend.filter(w=>w.due && U.fromToday(w.due)>=0 && U.fromToday(w.due)<=7).length;
    const later = pend.filter(w=>!w.due || U.fromToday(w.due)>7);

    el.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" id="addT">＋ 添加待办</button>
        <button class="btn btn-ghost btn-sm" id="addP" style="margin-left:auto">＋ 新建项目</button>
      </div>

      <div class="grid g4" style="margin-bottom:6px">
        ${[['进行中', all.filter(w=>w.status==='doing').length, 'amber'],
           ['待开始', all.filter(w=>w.status==='todo').length, 'blue'],
           ['一周内到期', week, overdue?'red':'violet'],
           ['已完成', all.filter(w=>w.status==='done').length, 'green']]
          .map(([l,n,c])=>`<div class="card pad-s"><b style="font-size:24px;color:var(--${c})">${n}</b><div style="font-size:12px;color:var(--text-3)">${l}</div></div>`).join('')}
      </div>

      ${overdue ? `<div class="sec-title"><h2 style="font-size:15.5px;color:var(--red)">⚠️ 已逾期</h2></div>
        <div class="list" style="margin-bottom:14px">${pend.filter(w=>w.due&&U.fromToday(w.due)<0).map(w=>this.rowHTML(w)).join('')}</div>` : ''}
      ${week ? `<div class="sec-title"><h2 style="font-size:15.5px">📌 一周内到期</h2></div>
        <div class="list" style="margin-bottom:14px">${pend.filter(w=>w.due&&U.fromToday(w.due)>=0&&U.fromToday(w.due)<=7).map(w=>this.rowHTML(w)).join('')}</div>` : ''}
      ${later.length ? `<div class="sec-title"><h2 style="font-size:15.5px;color:var(--text-3)">后面的安排</h2></div>
        <div class="list" style="margin-bottom:14px">${later.map(w=>this.rowHTML(w)).join('')}</div>` : ''}
      ${all.filter(w=>w.status==='done').length ? `<div class="sec-title"><h2 style="font-size:15.5px;color:var(--text-3)">最近完成</h2></div>
        <div class="list">${all.filter(w=>w.status==='done').slice(0,20).map(w=>this.rowHTML(w)).join('')}</div>` : ''}
      ${!all.length ? `<div class="card">${UI.empty('还没有待办记录','💼')}</div>` : ''}`;

    el.querySelector('#addT').addEventListener('click', ()=>this.addTask());
    el.querySelector('#addP').addEventListener('click', ()=>this.editProject());
    el.addEventListener('click', e => {
      const cy = e.target.closest('[data-cyc]'); if(cy){ this.cycle(cy.dataset.cyc); return; }
      const ed = e.target.closest('[data-edit]'); if(ed){ this.editTask(ed.dataset.edit); return; }
      const dl = e.target.closest('[data-del]'); if(dl){ UI.confirm('删除该待办？', ()=>{ Store.remove('works', dl.dataset.del); App.refresh(); }, true); return; }
    });
    Photos.hydrate(el);
  },

  rowHTML(w){
    const st = this.STATUS[w.status] || this.STATUS.todo;
    const n = w.due ? U.fromToday(w.due) : null;
    const late = w.status!=='done' && n !== null && n < 0;
    const proj = w.projId ? this.proj(w.projId) : null;
    return `<div class="row" style="align-items:flex-start;${w.status==='done'?'opacity:.6':''}">
      <button class="tick ${w.status==='done'?'on':''}" data-cyc="${w.id}" title="点击切换状态" style="border-radius:50%">${w.status==='done'?'✓':w.status==='doing'?'<span style="font-size:11px;color:var(--amber)">◐</span>':''}</button>
      ${w.photo?`<img class="thumb" data-photo="${w.photo}" src="">`:''}
      <div class="r-main">
        <div class="r-title" style="${w.status==='done'?'text-decoration:line-through':''}">${w.priority==='high'?'🔥 ':''}${U.esc(w.title)}</div>
        <div class="r-sub">
          <span class="chip ${st.c}">${st.l}</span>
          ${proj?`<span class="chip" style="background:${proj.color}18;color:${proj.color}">${U.esc(proj.name)}</span>`:''}
          ${w.due?`<span style="color:${late?'var(--red)':n<=3?'var(--amber)':n<=7?'var(--amber)':'var(--text-3)'};font-weight:${late?700:n<=3?700:500}">${U.relDate(w.due)}</span>`:''}
          ${w.hours?`<span>约 ${w.hours}h</span>`:''}
          ${w.link?`<a href="${U.esc(w.link)}" target="_blank" rel="noopener">链接 ↗</a>`:''}
        </div>
        ${w.note?`<div style="font-size:12.5px;color:var(--text-2);margin-top:6px;white-space:pre-wrap">${U.esc(w.note)}</div>`:''}
      </div>
      <div style="display:flex;gap:4px;flex:none">
        <button class="mini-btn" data-edit="${w.id}" style="font-size:13px">✎</button>
        <button class="mini-btn" data-del="${w.id}">✕</button>
      </div>
    </div>`;
  }
};
