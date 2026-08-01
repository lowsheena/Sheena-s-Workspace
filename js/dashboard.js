/* =========================================================
   dashboard.js — 首页：时钟 + 提醒中心 + 今日概览
   ========================================================= */
const Dashboard = {
  title: '首页',

  greet(){
    const h = new Date().getHours();
    if(h < 6)  return '还没睡呀';
    if(h < 11) return '早上好';
    if(h < 14) return '中午好';
    if(h < 18) return '下午好';
    if(h < 23) return '晚上好';
    return '夜深了';
  },
  quotes: [
    '等风，不如去追风。',
    '今天做一点，明天就轻一点。',
    '别小看那 10 分钟，攒起来就是一整年。',
    '状态是练出来的，不是等出来的。',
    '把大事切小，就没那么难了。',
    '你已经比昨天的自己更靠近目标一点点了。'
  ],

  /** 汇总所有提醒 */
  alerts(){
    const out = [];
    const N = 7;

    // 学业
    Study.pending().forEach(t => {
      if(!t.due) return;
      const n = U.fromToday(t.due);
      if(n > N) return;
      const ty = Study.type(t.type);
      const c = t.courseId ? Study.course(t.courseId) : null;
      out.push({
        sort: n, level: n<0 ? 'red' : n<=1 ? 'red' : n<=3 ? 'amber' : 'blue',
        ico: ty.i,
        title: (n<0?'【逾期】':'') + t.title,
        sub: (c?c.name+' · ':'') + ty.l + ' · ' + U.relDate(t.due) + (t.time?' '+t.time:''),
        go: ()=>{ App.go('study'); Study.tab = t.type==='exam'?'exams':'tasks'; App.refresh(); }
      });
    });

    // 工作
    Work.pending().forEach(w => {
      if(!w.due) return;
      const n = U.fromToday(w.due);
      if(n > N) return;
      out.push({
        sort: n, level: n<0 ? 'red' : n<=2 ? 'amber' : 'blue', ico:'💼',
        title: (n<0?'【逾期】':'') + w.title,
        sub: (w.project?w.project+' · ':'') + U.relDate(w.due),
        go: ()=>App.go('work')
      });
    });

    // 经期
    const st = Cycle.stats();
    if(st.last){
      const cfg = Store.d.cycleCfg;
      if(st.dayOf >= 1 && st.dayOf <= st.plen){
        out.push({ sort:-0.5, level:'pink', ico:'🌸', title:'经期第 '+st.dayOf+' 天', sub:'注意保暖休息，运动强度降下来', go:()=>App.go('cycle') });
      } else if(st.toNext !== null && st.toNext >= 0 && st.toNext <= U.num(cfg.remindDays,3)){
        out.push({ sort:-0.4, level:'pink', ico:'🌸', title: st.toNext===0?'预计今天来姨妈':'姨妈预计 '+st.toNext+' 天后到访',
          sub:'提前备好卫生用品，注意别贪凉', go:()=>App.go('cycle') });
      } else if(st.toNext !== null && st.toNext < -3){
        out.push({ sort:-0.3, level:'amber', ico:'🌸', title:'姨妈已推迟 '+Math.abs(st.toNext)+' 天', sub:'如果长期推迟建议留意身体状况', go:()=>App.go('cycle') });
      }
    }

    // 预算
    const budget = U.num(Store.d.settings.monthlyBudgetCNY,0);
    if(budget > 0){
      const spent = Finance.sum(Store.d.expenses.filter(e=>e.counted!==false && U.monthKey(e.date)===U.monthKey(U.today())));
      if(spent > budget) out.push({ sort:5, level:'red', ico:'💸', title:'本月已超预算 ¥'+U.round(spent-budget,2), sub:'预算 ¥'+budget+' · 已花 ¥'+U.round(spent,2), go:()=>App.go('finance') });
      else if(spent > budget*0.85) out.push({ sort:5, level:'amber', ico:'💸', title:'本月预算已用 '+Math.round(spent/budget*100)+'%', sub:'剩余 ¥'+U.round(budget-spent,2), go:()=>App.go('finance') });
    }

    return U.sortBy(out, a=>a.sort);
  },

  render(el){
    const d = U.today(), p = Store.d.profile, pl = HealthPage.plan();
    const alerts = this.alerts();
    const inCal = HealthPage.dayIn(d), outCal = HealthPage.dayOut(d), water = HealthPage.dayWater(d);
    const net = inCal - outCal;
    const todayIdx = (new Date().getDay()+6)%7 + 1;
    const todayCourses = [];
    Store.d.courses.forEach(c => (c.slots||[]).forEach(s => { if(s.day === todayIdx) todayCourses.push({c, s}); }));
    todayCourses.sort((a,b)=>U.str2min(a.s.start)-U.str2min(b.s.start));
    const nowMin = new Date().getHours()*60 + new Date().getMinutes();
    const monthSpent = Finance.sum(Store.d.expenses.filter(e=>e.counted!==false && U.monthKey(e.date)===U.monthKey(d)));
    const todaySpent = Finance.sum(Store.d.expenses.filter(e=>e.counted!==false && e.date===d));
    const cur = HealthPage.curWeight();
    const start = U.num(p.startWeight, cur), target = U.num(p.targetWeight);
    const wpct = (start-target) > 0 ? U.clamp((start-cur)/(start-target),0,1) : 0;
    const week = Study.upcoming(7).concat([]).length + Work.upcoming(7).length;
    const q = this.quotes[new Date().getDate() % this.quotes.length];

    el.innerHTML = `
      <div class="hero" style="margin-bottom:16px">
        <div class="hero-inner">
          <div class="hero-time" id="hTime">--:--<small id="hSec"></small></div>
          <div class="hero-date" id="hDate"></div>
          <div class="hero-hello">${this.greet()}${p.name?'，'+U.esc(p.name):''} 👋</div>
          <div class="hero-quote">${q}</div>
          <div class="hero-stats">
            <div class="hero-stat"><b>${week}</b><span>一周内待办</span></div>
            <div class="hero-stat"><b>${todayCourses.length}</b><span>今日课程</span></div>
            <div class="hero-stat"><b>${net} <small style="font-size:11px;font-weight:400">/${pl.target}</small></b><span>今日净热量</span></div>
            <div class="hero-stat"><b>¥${U.round(todaySpent,0)}</b><span>今日支出</span></div>
          </div>
        </div>
      </div>

      <div class="sec-title"><h2>🔔 提醒中心</h2>${alerts.length?`<span class="chip ${alerts.some(a=>a.level==='red')?'red':'amber'}">${alerts.length} 条</span>`:''}</div>
      <div class="list" id="alertList" style="margin-bottom:6px">
        ${alerts.length ? alerts.map((a,i)=>`
          <div class="alert ${a.level}" data-al="${i}" style="cursor:pointer">
            <div class="a-ico">${a.ico}</div>
            <div class="a-body"><div class="a-t">${U.esc(a.title)}</div><div class="a-s">${U.esc(a.sub)}</div></div>
            <span style="color:var(--text-3);align-self:center">›</span>
          </div>`).join('')
        : `<div class="alert green"><div class="a-ico">✨</div><div class="a-body"><div class="a-t">一周内没有紧急事项</div><div class="a-s">保持节奏，做点让未来的自己感谢你的事</div></div></div>`}
      </div>

      <div class="sec-title"><h2>⚡ 快捷记录</h2></div>
      <div class="qa" style="margin-bottom:6px">
        ${[['exp','💸','记支出','#fef4e3'],['meal','🍽️','记饮食','#e7f8f2'],['water','💧','喝水+','#eaf2ff'],
           ['sport','🏃‍♀️','记运动','#f2edff'],['weight','⚖️','称体重','#fdeef6'],['task','📝','加作业','#eef0ff'],
           ['work','💼','加工作','#e6f8f6'],['cycle','🌸','记经期','#fdeef6']]
          .map(([k,i,l,bg])=>`<button data-qa="${k}"><span class="qa-ico" style="background:${bg}">${i}</span><span>${l}</span></button>`).join('')}
      </div>

      <div class="grid g2" style="margin-top:20px;margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>📚 今日课程</h3><span class="sub">${U.wd(new Date())}</span></div>
          ${todayCourses.length ? `<div class="list">${todayCourses.map(({c,s})=>{
            const over = U.str2min(s.end) < nowMin, ing = U.str2min(s.start) <= nowMin && nowMin <= U.str2min(s.end);
            const pend = Study.courseTasks(c.id).filter(t=>t.status!=='done').length;
            return `<div class="row" data-course="${c.id}" style="cursor:pointer;${over?'opacity:.5':''};border-left:3px solid ${c.color}">
              <div class="r-main"><div class="r-title">${U.esc(c.name)}${ing?' <span class="chip green">进行中</span>':''}</div>
                <div class="r-sub"><span>${s.start} - ${s.end}</span>${c.room?`<span>${U.esc(c.room)}</span>`:''}${pend?`<span class="chip amber">${pend} 项待办</span>`:''}</div></div>
              <span style="color:var(--text-3)">›</span>
            </div>`;}).join('')}</div>` : UI.empty('今天没有课，好好利用这一天','🌤️')}
        </div>

        <div class="card">
          <div class="card-head"><h3>🔥 今日健康</h3><a href="javascript:;" data-go="health" style="font-size:12.5px">详情 ›</a></div>
          <div class="ring-wrap">
            ${UI.ring(U.clamp(net/pl.target,0,1), Math.max(0, pl.target-net), '还可以吃', net>pl.target?'red':'green')}
            <div style="flex:1;min-width:0">
              <div class="kv"><span>摄入</span><b>${inCal} kcal</b></div>
              <div class="kv"><span>运动</span><b style="color:var(--green)">-${outCal}</b></div>
              <div class="kv"><span>饮水</span><b>${water} / ${pl.water} ml</b></div>
              <div class="progress blue" style="margin-top:6px"><i style="width:${U.clamp(water/pl.water,0,1)*100}%"></i></div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid g2" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>⚖️ 减重进度</h3><a href="javascript:;" data-go="health" style="font-size:12.5px">详情 ›</a></div>
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <b style="font-size:27px;letter-spacing:-1px">${cur} kg</b>
            <span style="font-size:13px;color:var(--text-2)">目标 ${target} kg</span>
          </div>
          <div class="progress green" style="margin:10px 0 7px"><i style="width:${wpct*100}%"></i></div>
          <div style="font-size:12.5px;color:var(--text-3)">已减 ${U.round(Math.max(0,start-cur),1)} kg · 还差 ${U.round(Math.max(0,cur-target),1)} kg${pl.finishDate?' · 预计 '+U.fmtDate(pl.finishDate)+' 达成':''}</div>
        </div>
        <div class="card">
          <div class="card-head"><h3>💰 本月支出</h3><a href="javascript:;" data-go="finance" style="font-size:12.5px">详情 ›</a></div>
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <b style="font-size:27px;letter-spacing:-1px">¥${U.round(monthSpent,2)}</b>
            <span style="font-size:13px;color:var(--text-2)">≈ S$${U.round(monthSpent/Finance.rate(),2)}</span>
          </div>
          ${U.num(Store.d.settings.monthlyBudgetCNY,0)>0?`
            <div class="progress ${monthSpent>U.num(Store.d.settings.monthlyBudgetCNY)?'red':'green'}" style="margin:10px 0 7px">
              <i style="width:${U.clamp(monthSpent/U.num(Store.d.settings.monthlyBudgetCNY),0,1)*100}%"></i></div>
            <div style="font-size:12.5px;color:var(--text-3)">预算 ¥${Store.d.settings.monthlyBudgetCNY} · 剩 ¥${U.round(U.num(Store.d.settings.monthlyBudgetCNY)-monthSpent,2)}</div>
          `:`<div style="font-size:12.5px;color:var(--text-3);margin-top:10px">未设置月度预算</div>`}
        </div>
      </div>

      <div class="sec-title"><h2>🗓️ 接下来 7 天</h2><a href="javascript:;" data-go="study" style="font-size:12.5px">全部作业 ›</a></div>
      <div class="card">
        ${(() => {
          const items = Study.upcoming(7).map(t=>({ d:t.due, html:Study.taskHTML(t, true) }))
            .concat(Work.upcoming(7).map(w=>({ d:w.due, html:Work.rowHTML(w) })));
          const sorted = U.sortBy(items, x=>x.d);
          return sorted.length ? `<div class="list">${sorted.map(x=>x.html).join('')}</div>` : UI.empty('这一周没有截止事项，可以喘口气','🍃');
        })()}
      </div>`;

    // 事件
    const alertEls = el.querySelector('#alertList');
    alertEls.addEventListener('click', e=>{ const a = e.target.closest('[data-al]'); if(a && alerts[+a.dataset.al]) alerts[+a.dataset.al].go(); });
    el.addEventListener('click', e=>{
      const qa = e.target.closest('[data-qa]');
      if(qa){
        ({ exp:()=>Finance.quickAdd(), meal:()=>HealthPage.addMeal(), water:()=>HealthPage.addWater(U.num(Store.d.settings.waterCup,250)),
           sport:()=>HealthPage.addWorkout(), weight:()=>HealthPage.addWeight(), task:()=>Study.addTask(),
           work:()=>Work.edit(), cycle:()=>Cycle.add() })[qa.dataset.qa]();
        return;
      }
      const go = e.target.closest('[data-go]'); if(go){ App.go(go.dataset.go); return; }
      const c = e.target.closest('[data-course]'); if(c){ Study.openCourse(c.dataset.course); return; }
      const tk = e.target.closest('[data-tick]'); if(tk){ Study.toggleTask(tk.dataset.tick); return; }
      const cy = e.target.closest('[data-cyc]'); if(cy){ Work.cycle(cy.dataset.cyc); return; }
      const dt = e.target.closest('[data-deltask]'); if(dt){ UI.confirm('删除该条目？', ()=>{ Store.remove('tasks', dt.dataset.deltask); App.refresh(); }, true); return; }
      const dw = e.target.closest('[data-del]'); if(dw){ UI.confirm('删除这项工作？', ()=>{ Store.remove('works', dw.dataset.del); App.refresh(); }, true); return; }
      const ew = e.target.closest('[data-edit]'); if(ew){ Work.edit(ew.dataset.edit); return; }
    });
    this.tick();
    Photos.hydrate(el);
  },

  tick(){
    const t = document.getElementById('hTime');
    if(!t) return;
    const n = new Date();
    t.firstChild ? null : null;
    t.innerHTML = U.pad(n.getHours())+':'+U.pad(n.getMinutes())+`<small>${U.pad(n.getSeconds())}</small>`;
    const dd = document.getElementById('hDate');
    if(dd) dd.textContent = n.getFullYear()+' 年 '+(n.getMonth()+1)+' 月 '+n.getDate()+' 日 · '+U.wd(n);
  }
};
